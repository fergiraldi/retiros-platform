import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { ambiente } from '../src/config/ambiente';
import { UnidadeDeTrabalhoService } from '../src/contexto/unidade-de-trabalho.service';
import {
  InquilinoSemeado,
  removerInquilinoSemeado,
  semearInquilinoCompleto,
  TABELAS_COM_INQUILINO,
} from './ajuda/semear';

/**
 * CA-24a-e e §9 (testes 3, 4, 6) de 00-multi-inquilino.md: prova, com dado
 * real e pelo mecanismo real (UnidadeDeTrabalhoService), que o isolamento
 * entre inquilinos funciona nos dois sentidos — leitura e escrita — e que
 * uma política permissiva mal escrita não abre a fronteira.
 */
describe('Isolamento entre inquilinos', () => {
  const pool = new Pool({ connectionString: ambiente.DATABASE_URL, max: 5 });
  const uow = new UnidadeDeTrabalhoService(pool);

  let a: InquilinoSemeado;
  let b: InquilinoSemeado;

  beforeAll(async () => {
    a = await semearInquilinoCompleto(uow, `zzisoa${Date.now()}`);
    b = await semearInquilinoCompleto(uow, `zzisob${Date.now()}`);
  }, 30_000);

  afterAll(async () => {
    await removerInquilinoSemeado(uow, a.inquilinoId);
    await removerInquilinoSemeado(uow, b.inquilinoId);
    await pool.end();
  }, 30_000);

  async function contar(tabela: string, inquilinoId: string): Promise<number> {
    return uow.executar(
      { inquilinoId: a.inquilinoId, papel: 'admin_denominacao' },
      async (tx) => {
        const r = await tx.execute<{ n: string }>(
          sql.raw(`select count(*)::int as n from ${tabela} where inquilino_id = '${inquilinoId}'`),
        );
        return Number(r.rows[0].n);
      },
    );
  }

  it.each(TABELAS_COM_INQUILINO)(
    'CA-24a: no contexto de A, %s mostra só linhas de A (0 de B, >0 de A)',
    async (tabela) => {
      const deB = await contar(tabela, b.inquilinoId);
      const deA = await contar(tabela, a.inquilinoId);

      expect(deB).toBe(0); // a fronteira segura
      expect(deA).toBeGreaterThan(0); // controle positivo — sem isso, "0 de B" é trivial
    },
  );

  it('CA-24a (inquilino raiz): admin de A não enxerga a linha de inquilino de B', async () => {
    const vê = await uow.executar(
      { inquilinoId: a.inquilinoId, papel: 'admin_denominacao' },
      async (tx) => {
        const r = await tx.execute<{ n: string }>(
          sql`select count(*)::int as n from inquilino where id = ${b.inquilinoId}`,
        );
        return Number(r.rows[0].n);
      },
    );
    expect(vê).toBe(0);
  });

  it('§9.4 — sem contexto nenhum, toda tabela devolve zero linhas, sem lançar erro (RN-058t)', async () => {
    for (const tabela of TABELAS_COM_INQUILINO) {
      const n = await uow.executarSemContexto(async (tx) => {
        const r = await tx.execute<{ n: string }>(sql.raw(`select count(*)::int as n from ${tabela}`));
        return Number(r.rows[0].n);
      });
      expect(n).toBe(0);
    }
  });

  it('with check: inserir em pessoa com inquilino_id de outro inquilino é recusado (42501)', async () => {
    // drizzle envolve o erro original do pg em "Failed query: ..."; o texto
    // e o código de verdade (42501) vêm em err.cause, não em err.message.
    let erro: any;
    try {
      await uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, async (tx) => {
        await tx.execute(sql`
          insert into pessoa (id, inquilino_id, nome_completo, nome_cracha, data_nascimento,
            telefone, email, contato_emergencia_nome, contato_emergencia_fone)
          values (gen_random_uuid(), ${b.inquilinoId}, 'Invasor', 'Invasor', '1990-01-01',
            '00000000000', 'invasor@example.com', 'x', 'x')
        `);
      });
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeDefined();
    expect(erro.cause?.code).toBe('42501');
    expect(erro.cause?.message).toMatch(/row-level security/i);
  });

  describe('inquilino_dominio (leitura pública intencional de domínio verificado — §5)', () => {
    it('domínio verificado de B é visível no contexto de A (não é vazamento — é o design)', async () => {
      const vê = await uow.executar(
        { inquilinoId: a.inquilinoId, papel: 'admin_denominacao' },
        async (tx) => {
          const r = await tx.execute<{ n: string }>(
            sql`select count(*)::int as n from inquilino_dominio where inquilino_id = ${b.inquilinoId} and verificado = true`,
          );
          return Number(r.rows[0].n);
        },
      );
      expect(vê).toBe(1);
    });

    it('mas A não consegue ESCREVER um domínio em nome de B (with check tenant-scoped)', async () => {
      let erro: any;
      try {
        await uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, async (tx) => {
          await tx.execute(sql`
            insert into inquilino_dominio (id, inquilino_id, dominio, tipo, verificado)
            values (gen_random_uuid(), ${b.inquilinoId}, 'invasor.example.com', 'subdominio', true)
          `);
        });
      } catch (e) {
        erro = e;
      }
      expect(erro).toBeDefined();
      expect(erro.cause?.code).toBe('42501');
    });
  });

  it('RN-056t: política permissiva mal escrita, sozinha, não abre a fronteira restritiva do inquilino', async () => {
    const cliente = await pool.connect();
    try {
      await cliente.query('begin');
      // política de propósito ampla — se a fronteira dependesse só de
      // permissiva, isso vazaria tudo. A restritiva de inquilino continua
      // valendo por cima (AND), porque é `as restrictive` (RN-056t).
      await cliente.query(`
        create policy zz_teste_travessia on inscricao as permissive for all using (true) with check (true)
      `);
      await cliente.query("select set_config('app.inquilino_id', $1, true), set_config('app.papel','admin_denominacao',true)", [
        a.inquilinoId,
      ]);
      const r = await cliente.query('select count(*)::int as n from inscricao where inquilino_id = $1', [
        b.inquilinoId,
      ]);
      expect(r.rows[0].n).toBe(0);
    } finally {
      await cliente.query('rollback');
      cliente.release();
    }
  });
});
