import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { Pool, type PoolClient } from 'pg';
import { ambiente } from '../src/config/ambiente';
import { UnidadeDeTrabalhoService } from '../src/contexto/unidade-de-trabalho.service';
import type { Tx } from '../src/db/tipos';
import {
  InquilinoSemeado,
  removerInquilinoSemeado,
  semearInquilinoCompleto,
} from './ajuda/semear';

/**
 * RN-051t: `central_id` acompanha `inquilino_id` em toda tabela abaixo de
 * central, e o trigger `validar_central_do_inquilino_trg` barra a combinação
 * impossível — linha que aponta para central de outro inquilino.
 *
 * A regra existia desde a 0003 sem nenhum teste, e foi assim que `usuario`
 * ficou de fora do trigger por cinco migrations (docs/pendencias-tecnicas.md).
 * O último bloco daqui é o teste de catálogo que teria pego isso.
 */
describe('RN-051t — integridade do par inquilino/central', () => {
  const pool = new Pool({ connectionString: ambiente.DATABASE_URL, max: 5 });
  const uow = new UnidadeDeTrabalhoService(pool);

  let a: InquilinoSemeado;
  let b: InquilinoSemeado;

  beforeAll(async () => {
    a = await semearInquilinoCompleto(uow, `zzrn051a${Date.now()}`);
    b = await semearInquilinoCompleto(uow, `zzrn051b${Date.now()}`);
  }, 30_000);

  afterAll(async () => {
    await removerInquilinoSemeado(uow, a.inquilinoId);
    await removerInquilinoSemeado(uow, b.inquilinoId);
    await pool.end();
  }, 30_000);

  /** admin_denominacao de A: o papel que a RLS de `usuario` deixa passar. */
  function comoAdminDeA<T>(trabalho: (tx: Tx) => Promise<T>): Promise<T> {
    return uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, trabalho);
  }

  async function capturar(trabalho: () => Promise<unknown>): Promise<any> {
    try {
      await trabalho();
    } catch (e) {
      return e;
    }
    return undefined;
  }

  describe('usuario (o buraco que a 0005 fechou)', () => {
    it('admin_central com central_id de outro inquilino é recusado', async () => {
      // A RLS não barra este caso: a permissiva `usuario_central` dá passe
      // livre a admin_denominacao e a restritiva só confere inquilino_id = A.
      // Sem o trigger, a linha era gravada.
      const erro = await capturar(() =>
        comoAdminDeA(async (tx) => {
          await tx.execute(sql`
            insert into usuario (id, inquilino_id, central_id, email, papel, situacao)
            values (${randomUUID()}, ${a.inquilinoId}, ${b.centralId},
                    ${`invasor-${randomUUID()}@example.com`}, 'admin_central', 'convidada')
          `);
        }),
      );

      expect(erro).toBeDefined();
      // drizzle embrulha o erro do pg em "Failed query: ..."; código e texto
      // reais vêm em err.cause. `raise exception` sem errcode é P0001.
      expect(erro.cause?.code).toBe('P0001');
      expect(erro.cause?.message).toMatch(/RN-051t/);
    });

    it('admin_central com central_id do próprio inquilino passa (controle positivo)', async () => {
      await comoAdminDeA(async (tx) => {
        const id = randomUUID();
        await tx.execute(sql`
          insert into usuario (id, inquilino_id, central_id, email, papel, situacao)
          values (${id}, ${a.inquilinoId}, ${a.centralId},
                  ${`legitimo-${randomUUID()}@example.com`}, 'admin_central', 'convidada')
        `);
        // apagado na mesma transação: o que se prova aqui é que a escrita
        // atravessou o trigger, não que a linha deva ficar.
        await tx.execute(sql`delete from usuario where id = ${id}`);
      });
    });
  });

  describe('as cinco tabelas da 0003 continuam guardadas', () => {
    it('mover encontro de A para uma central de B é recusado (caminho de update)', async () => {
      const erro = await capturar(() =>
        comoAdminDeA(async (tx) => {
          await tx.execute(sql`
            update encontro set central_id = ${b.centralId} where id = ${a.encontroId}
          `);
        }),
      );

      expect(erro).toBeDefined();
      expect(erro.cause?.code).toBe('P0001');
      expect(erro.cause?.message).toMatch(/RN-051t/);
    });

    it('reafirmar a central legítima do próprio encontro passa (controle positivo)', async () => {
      await comoAdminDeA(async (tx) => {
        await tx.execute(sql`
          update encontro set central_id = ${a.centralId} where id = ${a.encontroId}
        `);
      });
    });
  });

  describe('auditoria (o buraco que a 0006 fechou)', () => {
    it('linha de auditoria com central de outro inquilino é recusada', async () => {
      const erro = await capturar(() =>
        comoAdminDeA(async (tx) => {
          await tx.execute(sql`
            insert into auditoria (id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo)
            values (${randomUUID()}, ${a.inquilinoId}, ${b.centralId},
                    'inscricao', ${a.inscricaoId}, 'criada', 'publico')
          `);
        }),
      );

      expect(erro).toBeDefined();
      expect(erro.cause?.code).toBe('P0001');
      expect(erro.cause?.message).toMatch(/RN-051t/);
    });

    it('linha de auditoria com a central legítima passa (controle positivo)', async () => {
      await comoAdminDeA(async (tx) => {
        const id = randomUUID();
        await tx.execute(sql`
          insert into auditoria (id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo)
          values (${id}, ${a.inquilinoId}, ${a.centralId},
                  'inscricao', ${a.inscricaoId}, 'criada', 'publico')
        `);
        await tx.execute(sql`delete from auditoria where id = ${id}`);
      });
    });

    it('auditoria de escopo de plataforma (sem inquilino e sem central) continua passando', async () => {
      // Convite, mudança de papel e revogação de conta `operador` são atos
      // sobre quem vive fora de qualquer inquilino (spec §4.7) — os dois
      // campos vazios caem no primeiro ramo da função e não são barrados.
      await uow.executar({ papel: 'operador' }, async (tx) => {
        const id = randomUUID();
        await tx.execute(sql`
          insert into auditoria (id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo)
          values (${id}, null, null, 'usuario', ${randomUUID()}, 'papel_alterado', 'operador')
        `);
        await tx.execute(sql`delete from auditoria where id = ${id}`);
      });
    });
  });

  describe('central sem inquilino — o ramo que só `usuario` alcança', () => {
    /**
     * `usuario` é a única tabela coberta em que `inquilino_id` também é nulável
     * (papel `operador`). A RLS de `usuario` já barra operador com central por
     * outro caminho — a permissiva exige `central_id = app_central_id()`, e
     * operador não tem central —, então a regra é exercitada direto na função,
     * numa tabela descartável.
     *
     * `create temp table`: vive em pg_temp, fora de current_schema(), e por
     * isso não aparece nem para o teste de RN-141 nem para o de catálogo
     * abaixo se as suítes rodarem em paralelo.
     */
    async function comTabelaDescartavel<T>(
      trabalho: (cliente: PoolClient) => Promise<T>,
    ): Promise<T> {
      const cliente = await pool.connect();
      try {
        await cliente.query('begin');
        await cliente.query(`
          create temp table zz_rn051t_descartavel (
            inquilino_id uuid,
            central_id   uuid
          ) on commit drop
        `);
        await cliente.query(`
          create trigger validar_central_do_inquilino_trg
            before insert or update on zz_rn051t_descartavel
            for each row execute function validar_central_do_inquilino()
        `);
        // a função consulta `central` sob RLS: sem contexto, nem a central
        // legítima de A apareceria.
        await cliente.query(
          "select set_config('app.inquilino_id', $1, true), set_config('app.papel', 'admin_denominacao', true)",
          [a.inquilinoId],
        );
        return await trabalho(cliente);
      } finally {
        await cliente.query('rollback');
        cliente.release();
      }
    }

    it('central_id preenchido com inquilino_id nulo é recusado', async () => {
      await comTabelaDescartavel(async (cliente) => {
        const erro = await capturar(() =>
          cliente.query('insert into zz_rn051t_descartavel values (null, $1)', [a.centralId]),
        );

        expect(erro).toBeDefined();
        // aqui a query é crua (pg, não drizzle): o código vem no próprio erro.
        expect(erro.code).toBe('P0001');
        expect(erro.message).toMatch(/RN-051t.*inquilino_id nulo/);
      });
    });

    it('os dois nulos passam — é a conta de `operador`, que não tem central', async () => {
      await comTabelaDescartavel(async (cliente) => {
        await cliente.query('insert into zz_rn051t_descartavel values (null, null)');
        const { rows } = await cliente.query('select count(*)::int as n from zz_rn051t_descartavel');
        expect(rows[0].n).toBe(1);
      });
    });
  });

  describe('`central.inquilino_id` é imutável (0007)', () => {
    /**
     * A RLS já barrava este caminho — a restritiva `central_inquilino` tem
     * `using` e `with check` iguais a `inquilino_id = app_inquilino_id()`. O
     * trigger é defesa em profundidade, para o dia em que alguém afrouxar
     * aquela policy sem saber que ela sustentava a RN-051t inteira.
     *
     * Quem responde aqui é o trigger, não a RLS: no Postgres, BEFORE ROW roda
     * antes da verificação do `with check`, então o erro é P0001, não 42501.
     */
    it('mover a central para outro inquilino é recusado', async () => {
      const erro = await capturar(() =>
        comoAdminDeA(async (tx) => {
          await tx.execute(sql`
            update central set inquilino_id = ${b.inquilinoId} where id = ${a.centralId}
          `);
        }),
      );

      expect(erro).toBeDefined();
      expect(erro.cause?.code).toBe('P0001');
      expect(erro.cause?.message).toMatch(/inquilino_id de central e imutavel/);
    });

    it('editar outro campo da central continua passando (controle positivo)', async () => {
      await comoAdminDeA(async (tx) => {
        await tx.execute(sql`
          update central set telefone_contato = '4530000000' where id = ${a.centralId}
        `);
      });
    });

    it('reafirmar o mesmo inquilino_id passa — só a troca é barrada', async () => {
      // `is distinct from` e não `<>`: reescrever o mesmo valor não é troca.
      await comoAdminDeA(async (tx) => {
        await tx.execute(sql`
          update central set inquilino_id = ${a.inquilinoId} where id = ${a.centralId}
        `);
      });
    });
  });

  describe('cobertura do trigger (o teste que teria pego a falta em `usuario`)', () => {
    /**
     * Nenhuma. `auditoria` era a única, até a 0006: ela não tem FK (é log
     * polimórfico, por design da spec), mas central não é apagada — usa
     * `ativa` — e, sob RLS, tolerar "central não encontrada" seria aceitar em
     * silêncio a central de outro inquilino, que é justamente o que a RN-051t
     * barra. As sete tabelas com o par têm o trigger.
     */
    const EXCECOES_DECLARADAS: string[] = [];

    async function nomes(consulta: string): Promise<string[]> {
      const { rows } = await pool.query<{ relname: string }>(consulta);
      return rows.map((r) => r.relname);
    }

    const TABELAS_COM_O_PAR = `
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = current_schema()
        and c.relkind = 'r'
        and (
          select count(*) from pg_attribute a
          where a.attrelid = c.oid and not a.attisdropped
            and a.attname in ('inquilino_id', 'central_id')
        ) = 2
      order by c.relname
    `;

    const TABELAS_COM_O_TRIGGER = `
      select c.relname
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = current_schema()
        and t.tgname = 'validar_central_do_inquilino_trg'
        and not t.tgisinternal
      order by c.relname
    `;

    it('toda tabela com inquilino_id + central_id tem o trigger, exceto as exceções declaradas', async () => {
      const comOPar = await nomes(TABELAS_COM_O_PAR);
      const comOTrigger = await nomes(TABELAS_COM_O_TRIGGER);

      const descobertas = comOPar.filter(
        (t) => !comOTrigger.includes(t) && !EXCECOES_DECLARADAS.includes(t),
      );

      expect(descobertas).toEqual([]);
      // controle positivo: sem isto, um catálogo vazio passaria trivialmente.
      expect(comOTrigger).toContain('usuario');
      expect(comOTrigger.length).toBe(comOPar.length - EXCECOES_DECLARADAS.length);
    });

    it('não há exceção declarada nenhuma', () => {
      // Hard-coded de propósito, igual à RN-141: ninguém deve conseguir
      // "consertar" o teste acima movendo uma tabela pra cá sem que o diff
      // do PR mostre isso claramente.
      expect(EXCECOES_DECLARADAS).toEqual([]);
    });

    it('a função tem search_path fixo (mesma blindagem da 0004)', async () => {
      const { rows } = await pool.query<{ proconfig: string[] | null }>(`
        select proconfig from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = current_schema() and p.proname = 'validar_central_do_inquilino'
      `);

      expect(rows).toHaveLength(1);
      expect(rows[0].proconfig?.join(',')).toMatch(/^search_path=/);
    });
  });
});
