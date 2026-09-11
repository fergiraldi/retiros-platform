import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { ambiente } from '../src/config/ambiente';
import { UnidadeDeTrabalhoService } from '../src/contexto/unidade-de-trabalho.service';
import { ResolvedorDeContaService } from '../src/autenticacao/resolvedor-de-conta.service';
import { pool as poolCompartilhado } from '../src/db/conexao';
import {
  semearContas,
  semearInquilinoCompleto,
  removerContasSemeadas,
  removerInquilinoSemeado,
  type ContasSemeadas,
  type InquilinoSemeado,
} from './ajuda/semear';

// Resolução da conta de acesso contra o banco de verdade. É o único teste que
// prova o ponto central do desenho: o contexto elevado enxerga a linha que a
// RLS esconderia do contexto público, **e continua sem atravessar inquilino**.

const pool = new Pool({ connectionString: ambiente.DATABASE_URL, max: 5 });
const uow = new UnidadeDeTrabalhoService(pool);
const resolvedor = new ResolvedorDeContaService(uow);

const prefixoA = `zzcontaa${Date.now()}`;
const prefixoB = `zzcontab${Date.now()}`;

let inquilinoA: InquilinoSemeado;
let inquilinoB: InquilinoSemeado;
let contasA: ContasSemeadas;

beforeAll(async () => {
  inquilinoA = await semearInquilinoCompleto(uow, prefixoA);
  inquilinoB = await semearInquilinoCompleto(uow, prefixoB);
  contasA = await semearContas(uow, inquilinoA, prefixoA);
}, 60_000);

afterAll(async () => {
  await removerContasSemeadas(uow, contasA);
  await removerInquilinoSemeado(uow, inquilinoA.inquilinoId);
  await removerInquilinoSemeado(uow, inquilinoB.inquilinoId);
  await pool.end();
}, 60_000);

describe('ResolvedorDeContaService.resolver (PRD §8.1, passo 3)', () => {
  it('resolve a conta pelo par (inquilino do host, e-mail)', async () => {
    const conta = await resolvedor.resolver(inquilinoA.inquilinoId, contasA.emails.adminCentral);

    expect(conta).toMatchObject({
      id: contasA.adminCentralId,
      inquilinoId: inquilinoA.inquilinoId,
      centralId: inquilinoA.centralId,
      papel: 'admin_central',
      situacao: 'ativa',
    });
  });

  it('enxerga a linha de admin_central, que a RLS esconde do contexto público', async () => {
    // O ovo-e-galinha que o contexto elevado resolve: a permissiva
    // `usuario_central` exige `app_papel() = 'admin_denominacao'` OU
    // `central_id = app_central_id()`, e no contexto que o guard de host deixa
    // (papel 'publico', central nula) a linha some. Sem a elevação, a
    // autenticação de admin_central simplesmente não existiria.
    const invisivelSemElevacao = await uow.executar(
      { inquilinoId: inquilinoA.inquilinoId, papel: 'publico' },
      async (tx) => {
        const r = await tx.execute<{ id: string }>(
          sql`select id from usuario where id = ${contasA.adminCentralId}`,
        );
        return r.rows;
      },
    );

    expect(invisivelSemElevacao).toHaveLength(0);
    await expect(
      resolvedor.resolver(inquilinoA.inquilinoId, contasA.emails.adminCentral),
    ).resolves.toMatchObject({ id: contasA.adminCentralId });
  });

  it('compara o e-mail sem sensibilidade de caixa', async () => {
    const conta = await resolvedor.resolver(
      inquilinoA.inquilinoId,
      contasA.emails.adminCentral.toUpperCase(),
    );

    expect(conta?.id).toBe(contasA.adminCentralId);
  });

  it('NÃO resolve conta de outro inquilino — quem manda é o host (RN-060t)', async () => {
    const conta = await resolvedor.resolver(inquilinoB.inquilinoId, contasA.emails.adminCentral);

    expect(conta).toBeNull();
  });

  it('e é a RLS que barra a travessia, não o `where` da consulta', async () => {
    // A garantia que sustenta o contexto elevado: no contexto de B, a linha de
    // A não aparece nem numa consulta sem filtro de inquilino nenhum. Se esta
    // prova cair, a elevação passou a ser um buraco de verdade.
    const linhas = await uow.executar(
      { inquilinoId: inquilinoB.inquilinoId, papel: 'admin_denominacao' },
      async (tx) => {
        const r = await tx.execute<{ id: string }>(
          sql`select id from usuario where lower(email) = lower(${contasA.emails.adminCentral})`,
        );
        return r.rows;
      },
    );

    expect(linhas).toHaveLength(0);
  });

  it('e-mail sem conta em lugar nenhum devolve null', async () => {
    const conta = await resolvedor.resolver(inquilinoA.inquilinoId, 'ninguem@example.com');

    expect(conta).toBeNull();
  });

  it('resolve o operador por (papel, e-mail), sem inquilino (RN-004, RN-017)', async () => {
    const conta = await resolvedor.resolver(null, contasA.emails.operador);

    expect(conta).toMatchObject({
      id: contasA.operadorId,
      inquilinoId: null,
      centralId: null,
      papel: 'operador',
    });
  });

  it('host do operador NÃO resolve conta de inquilino — inquilino nulo não é curinga', async () => {
    const conta = await resolvedor.resolver(null, contasA.emails.adminCentral);

    expect(conta).toBeNull();
  });

  it('host de inquilino NÃO resolve a conta de operador', async () => {
    const conta = await resolvedor.resolver(inquilinoA.inquilinoId, contasA.emails.operador);

    expect(conta).toBeNull();
  });

  it('devolve a situação como está, sem filtrar — quem decide o 403 é o guard', async () => {
    // Esconder conta inativa faria o guard dizer "não existe" onde a RN-018
    // pede 403 ("existe e não entra").
    const conta = await resolvedor.resolver(inquilinoA.inquilinoId, contasA.emails.suspensa);

    expect(conta).toMatchObject({ id: contasA.porSituacao.suspensa, situacao: 'suspensa' });
  });

  it('resolve conta servo com pessoa_id, sem central (RN-014)', async () => {
    const conta = await resolvedor.resolver(inquilinoA.inquilinoId, contasA.emails.servo);

    expect(conta).toMatchObject({
      papel: 'servo',
      pessoaId: inquilinoA.pessoaId,
      centralId: null,
    });
  });
});

describe('registrar_acesso_de_conta', () => {
  const lerUltimoAcesso = (usuarioId: string) =>
    uow.executar(
      { inquilinoId: inquilinoA.inquilinoId, papel: 'admin_denominacao' },
      async (tx) => {
        const r = await tx.execute<{ ultimo_acesso_em: string | null }>(
          sql`select ultimo_acesso_em from usuario where id = ${usuarioId}`,
        );
        return r.rows[0]?.ultimo_acesso_em ?? null;
      },
    );

  const contaDe = async (email: string) => {
    const conta = await resolvedor.resolver(inquilinoA.inquilinoId, email);
    if (!conta) throw new Error(`conta não semeada: ${email}`);
    return conta;
  };

  it('grava na primeira vez, quando a coluna está nula', async () => {
    const conta = await contaDe(contasA.emails.adminDenominacao);
    expect(await lerUltimoAcesso(conta.id)).toBeNull();

    await resolvedor.registrarAcesso(conta);

    expect(await lerUltimoAcesso(conta.id)).not.toBeNull();
  });

  it('NÃO grava de novo dentro dos 5 minutos — senão seria uma escrita por requisição', async () => {
    const conta = await contaDe(contasA.emails.servo);
    await resolvedor.registrarAcesso(conta);
    const primeiro = await lerUltimoAcesso(conta.id);

    await resolvedor.registrarAcesso(conta);

    expect(await lerUltimoAcesso(conta.id)).toBe(primeiro);
  });

  it('grava de novo quando o último acesso é mais velho que a janela', async () => {
    const conta = await contaDe(contasA.emails.adminCentral);
    await uow.executar(
      { inquilinoId: inquilinoA.inquilinoId, papel: 'admin_denominacao' },
      async (tx) => {
        await tx.execute(
          sql`update usuario set ultimo_acesso_em = now() - interval '10 minutes'
              where id = ${conta.id}`,
        );
      },
    );
    const antigo = await lerUltimoAcesso(conta.id);

    await resolvedor.registrarAcesso(conta);

    expect(await lerUltimoAcesso(conta.id)).not.toBe(antigo);
  });

  it('funciona para a conta de operador, sob o contexto de operador', async () => {
    const conta = await resolvedor.resolver(null, contasA.emails.operador);
    expect(conta).not.toBeNull();

    await resolvedor.registrarAcesso(conta!);

    const gravado = await uow.executar({ papel: 'operador' }, async (tx) => {
      const r = await tx.execute<{ ultimo_acesso_em: string | null }>(
        sql`select ultimo_acesso_em from usuario where id = ${conta!.id}`,
      );
      return r.rows[0]?.ultimo_acesso_em ?? null;
    });

    expect(gravado).not.toBeNull();
  });
});

describe('constraints da 0008', () => {
  it('recusa situacao fora das quatro da RN-018', async () => {
    await expect(
      uow.executar({ inquilinoId: inquilinoA.inquilinoId, papel: 'admin_denominacao' }, (tx) =>
        tx.execute(
          sql`update usuario set situacao = 'ativo' where id = ${contasA.adminDenominacaoId}`,
        ),
      ),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
  });

  it('recusa segunda conta de operador com o mesmo e-mail (usuario_operador_unico)', async () => {
    // Sem o índice parcial, `usuario_unico (inquilino_id, email)` não colidiria
    // — inquilino_id nulo não é considerado igual —, e a resolução do operador
    // por (papel, e-mail) viraria sorteio entre duas linhas.
    await expect(
      uow.executar({ papel: 'operador' }, (tx) =>
        tx.execute(
          sql`insert into usuario (id, email, papel, situacao)
              values (${randomUUID()}, ${contasA.emails.operador.toUpperCase()}, 'operador', 'ativa')`,
        ),
      ),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('registrar_acesso_de_conta tem search_path fixo e não é definer', async () => {
    const r = await poolCompartilhado.query<{
      prosecdef: boolean;
      proconfig: string[] | null;
      acl: string | null;
    }>(
      `select p.prosecdef, p.proconfig, array_to_string(p.proacl, ',') as acl
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = current_schema() and p.proname = 'registrar_acesso_de_conta'`,
    );

    expect(r.rows).toHaveLength(1);
    // Comum, não `security definer`: roda sob a RLS de quem chama. Uma definer
    // aqui não ganharia nada — o `force row level security` alcança o dono.
    expect(r.rows[0].prosecdef).toBe(false);
    expect(r.rows[0].proconfig?.[0]).toMatch(/^search_path=/);
    // Sem execute para PUBLIC (o default de `create function` concede).
    expect(r.rows[0].acl).not.toBeNull();
    expect(r.rows[0].acl).not.toMatch(/(^|,)=X\//);
  });

  it('nenhuma role tem BYPASSRLS — é o que torna a RLS a garantia real', async () => {
    // Se alguém conceder BYPASSRLS a uma role de aplicação, o isolamento do
    // RNF-001 cai inteiro e nada mais neste arquivo estaria medindo o que diz.
    const r = await poolCompartilhado.query<{ rolname: string }>(
      `select rolname from pg_roles where rolbypassrls and rolname like 'app_%'`,
    );

    expect(r.rows).toEqual([]);
  });
});
