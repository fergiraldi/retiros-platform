import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { apagarSegredo, lerSegredo } from '../src/cofre/cofre';
import { ErroNoMercadoPago, OAuthMercadoPago } from '../src/mercado-pago/oauth-mercado-pago';
import type { TokensMercadoPago } from '../src/mercado-pago/oauth-mercado-pago';
import { ConexaoRecebimentoService } from '../src/recebimento/conexao-recebimento.service';
import { criarAppDeTeste } from './ajuda/app-teste';
import type { AppDeTeste } from './ajuda/app-teste';
import {
  removerContasSemeadas,
  removerInquilinoSemeado,
  semearContas,
  semearInquilinoCompleto,
} from './ajuda/semear';
import type { ContasSemeadas, InquilinoSemeado } from './ajuda/semear';

const tokensDe = (codigo: string): TokensMercadoPago => ({
  accessToken: `access-${codigo}`,
  refreshToken: `refresh-${codigo}`,
  expiraEmSegundos: 15_552_000,
  escopos: ['read', 'write', 'offline_access'],
  contaExternaId: `conta-${codigo}`,
});

/** O Mercado Pago de mentira: nenhum teste fala com o de verdade. */
const mercadoPago = {
  configurado: true,
  renovacaoFalha: false,
  renovacoes: 0,
};
const oauthFalso: Pick<OAuthMercadoPago, 'configurado' | 'urlDeAutorizacao' | 'trocarCodigo' | 'renovar'> = {
  configurado: () => mercadoPago.configurado,
  urlDeAutorizacao: (state) => `https://auth.exemplo/authorization?state=${state}`,
  trocarCodigo: async (code) => {
    if (code === 'recusado-pelo-mp') throw new ErroNoMercadoPago(400, 'invalid_grant');
    return tokensDe(code);
  },
  renovar: async () => {
    if (mercadoPago.renovacaoFalha) throw new ErroNoMercadoPago(400, 'invalid_grant');
    mercadoPago.renovacoes += 1;
    return tokensDe(`renovado-${mercadoPago.renovacoes}`);
  },
};

type LinhaConexao = {
  id: string;
  central_id: string | null;
  ativa: boolean;
  motivo_desativacao: string | null;
  conta_externa_id: string;
  access_token_ref: string;
  refresh_token_ref: string;
  falhas_refresh: number;
  dias_para_vencer: number;
};

/**
 * Item 9 — a conexão de recebimento com o Mercado Pago (03-cobranca.md §7.3,
 * RN-104, RN-105, RN-121, RN-122), por HTTP real e contra o cofre de verdade
 * do ambiente (`cofre_<schema>`).
 */
describe('Conexão de recebimento com o Mercado Pago (item 9)', () => {
  let ctx: AppDeTeste;
  let a: InquilinoSemeado;
  let contas: ContasSemeadas;
  let host: string;

  beforeAll(async () => {
    ctx = await criarAppDeTeste([], [{ provide: OAuthMercadoPago, useValue: oauthFalso }]);
    const prefixo = `zzrecebe${Date.now()}`;
    a = await semearInquilinoCompleto(ctx.uow, prefixo);
    contas = await semearContas(ctx.uow, a, prefixo);
    host = `${prefixo}.example.com`;
  }, 30_000);

  afterAll(async () => {
    // O cofre não é limpo junto com o inquilino: são segredos, não linhas dele.
    const conexoes = await consultar<{ access_token_ref: string; refresh_token_ref: string }>(
      sql`select access_token_ref, refresh_token_ref from conexao_gateway`,
    );
    await ctx.uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, async (tx) => {
      for (const c of conexoes) {
        await apagarSegredo(tx, c.access_token_ref);
        await apagarSegredo(tx, c.refresh_token_ref);
      }
    });
    await removerContasSemeadas(ctx.uow, contas);
    await removerInquilinoSemeado(ctx.uow, a.inquilinoId);
    await ctx.fechar();
  }, 30_000);

  function consultar<T extends Record<string, unknown>>(consulta: ReturnType<typeof sql>) {
    return ctx.uow
      .executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, (tx) => tx.execute<T>(consulta))
      .then((r) => r.rows);
  }

  const conexoes = () =>
    consultar<LinhaConexao>(sql`
      select id, central_id, ativa, motivo_desativacao, conta_externa_id, access_token_ref,
             refresh_token_ref, falhas_refresh,
             extract(day from expira_em - now())::int as dias_para_vencer
        from conexao_gateway order by criado_em, id`);

  const segredo = (nome: string) =>
    ctx.uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, (tx) => lerSegredo(tx, nome));

  async function iniciar(email: string) {
    const token = await ctx.assinarToken({ sub: randomUUID(), email });
    return request(ctx.app.getHttpServer())
      .post('/api/admin/recebimento/conexao')
      .set('Host', host)
      .set('Authorization', `Bearer ${token}`);
  }

  async function stateDe(email: string): Promise<string> {
    const resposta = await iniciar(email);
    expect(resposta.status).toBe(201);
    return new URL(resposta.body.urlAutorizacao).searchParams.get('state')!;
  }

  function voltar(query: Record<string, string>) {
    return request(ctx.app.getHttpServer()).get('/api/recebimento/mercadopago/retorno').query(query);
  }

  it('admin da denominação conecta: token só no cofre, e a conexão anterior fica desativada (RN-105, RN-121)', async () => {
    const [semeada] = await conexoes();
    const state = await stateDe(contas.emails.adminDenominacao);

    const volta = await voltar({ state, code: 'codigo-1' }).expect(302);

    expect(volta.headers.location).toBe(`http://${host}/admin/recebimento?conexao=ok`);
    const linhas = await conexoes();
    const nova = linhas.find((l) => l.conta_externa_id === 'conta-codigo-1')!;
    expect(nova).toMatchObject({ central_id: null, ativa: true, falhas_refresh: 0 });
    expect(nova.dias_para_vencer).toBeGreaterThanOrEqual(179);
    expect(linhas.find((l) => l.id === semeada.id)).toMatchObject({
      ativa: false,
      motivo_desativacao: 'desconectada_pelo_inquilino',
    });

    // RN-121: na tabela, o nome; no cofre, o token.
    expect(JSON.stringify(nova)).not.toContain('access-codigo-1');
    expect(await segredo(nova.access_token_ref)).toBe('access-codigo-1');
    expect(await segredo(nova.refresh_token_ref)).toBe('refresh-codigo-1');

    const auditoria = await consultar<{ acao: string; ator_id: string }>(
      sql`select acao, ator_id from auditoria where entidade_id = ${nova.id}`,
    );
    expect(auditoria).toEqual([{ acao: 'conectada', ator_id: contas.adminDenominacaoId }]);
  });

  it('o state é de uso único; desconhecido é 400', async () => {
    const state = await stateDe(contas.emails.adminDenominacao);
    await voltar({ state, code: 'codigo-2' }).expect(302);

    const reusado = await voltar({ state, code: 'codigo-3' }).expect(400);
    await voltar({ state: 'inventado', code: 'codigo-4' }).expect(400);

    expect(reusado.body.erro.codigo).toBe('REQUISICAO_INVALIDA');
    expect((await conexoes()).some((l) => l.conta_externa_id === 'conta-codigo-3')).toBe(false);
  });

  it('admin da central conecta só a própria central, e reconectar troca a dela sem tocar a do inquilino', async () => {
    for (const code of ['central-1', 'central-2']) {
      await voltar({ state: await stateDe(contas.emails.adminCentral), code }).expect(302);
    }

    const linhas = await conexoes();
    const daCentral = linhas.filter((l) => l.central_id === a.centralId);
    expect(daCentral.map((l) => [l.conta_externa_id, l.ativa])).toEqual([
      ['conta-central-1', false],
      ['conta-central-2', true],
    ]);
    expect(linhas.filter((l) => l.central_id === null && l.ativa)).toHaveLength(1);
  });

  it('o banco recusa duas conexões ativas no mesmo escopo, inclusive o do inquilino (0010)', async () => {
    const segunda = ctx.uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, (tx) =>
      tx.execute(sql`
        insert into conexao_gateway (id, inquilino_id, gateway, conta_externa_id, access_token_ref,
                                     refresh_token_ref, expira_em, conectada_por)
        values (${randomUUID()}, ${a.inquilinoId}, 'mercadopago', 'x', 'x', 'x', now(), ${randomUUID()})`),
    );

    // O drizzle embrulha o erro do pg: o motivo exato fica em `cause`.
    await expect(segunda).rejects.toMatchObject({
      cause: expect.objectContaining({ code: '23505', constraint: 'conexao_gateway_ativa_unica' }),
    });
  });

  it('só admin conecta (RN-105): servo recebe 403', async () => {
    const resposta = await iniciar(contas.emails.servo);

    expect([resposta.status, resposta.body.erro.codigo]).toEqual([403, 'ACESSO_NEGADO']);
  });

  it('Mercado Pago recusa o código, ou a pessoa recusa a autorização: volta sem gravar nada', async () => {
    const antes = (await conexoes()).length;

    const recusadoPeloMp = await voltar({
      state: await stateDe(contas.emails.adminDenominacao),
      code: 'recusado-pelo-mp',
    }).expect(302);
    const recusadoPelaPessoa = await voltar({ state: await stateDe(contas.emails.adminDenominacao) }).expect(302);

    expect(recusadoPeloMp.headers.location).toBe(`http://${host}/admin/recebimento?conexao=erro`);
    expect(recusadoPelaPessoa.headers.location).toBe(`http://${host}/admin/recebimento?conexao=recusada`);
    expect(await conexoes()).toHaveLength(antes);
  });

  it('conta suspensa entre a ida e a volta não conecta (RN-018 no ato)', async () => {
    const state = await stateDe(contas.emails.adminDenominacao);
    const mudarSituacao = (situacao: string) =>
      consultar(sql`update usuario set situacao = ${situacao} where id = ${contas.adminDenominacaoId}`);

    await mudarSituacao('suspensa');
    try {
      const volta = await voltar({ state, code: 'codigo-suspenso' }).expect(302);
      expect(volta.headers.location).toContain('conexao=erro');
    } finally {
      await mudarSituacao('ativa');
    }
    expect((await conexoes()).some((l) => l.conta_externa_id === 'conta-codigo-suspenso')).toBe(false);
  });

  it('sem credenciais da aplicação configuradas, a conexão responde 503 RECEBIMENTO_INDISPONIVEL', async () => {
    mercadoPago.configurado = false;
    try {
      const resposta = await iniciar(contas.emails.adminDenominacao);
      expect([resposta.status, resposta.body.erro.codigo]).toEqual([503, 'RECEBIMENTO_INDISPONIVEL']);
    } finally {
      mercadoPago.configurado = true;
    }
  });

  describe('renovação (RN-122)', () => {
    const servico = () => ctx.app.get(ConexaoRecebimentoService);
    const ativaDoInquilino = async () =>
      (await conexoes()).find((l) => l.central_id === null && l.ativa)!;

    it('renova o que vence em menos de 15 dias, rotacionando os dois tokens; o resto não é tocado', async () => {
      const alvo = await ativaDoInquilino();
      const daCentral = (await conexoes()).find((l) => l.central_id === a.centralId && l.ativa)!;
      await consultar(sql`update conexao_gateway set expira_em = now() + interval '10 days' where id = ${alvo.id}`);
      const refreshDaCentral = await segredo(daCentral.refresh_token_ref);

      await servico().renovarConexoesAVencer();

      const depois = (await conexoes()).find((l) => l.id === alvo.id)!;
      expect(depois.dias_para_vencer).toBeGreaterThanOrEqual(179);
      expect(await segredo(alvo.access_token_ref)).toMatch(/^access-renovado-/);
      expect(await segredo(alvo.refresh_token_ref)).toMatch(/^refresh-renovado-/);
      expect(await segredo(daCentral.refresh_token_ref)).toBe(refreshDaCentral);
    });

    it('na terceira falha seguida, desativa com motivo falha_renovacao', async () => {
      const alvo = await ativaDoInquilino();
      await consultar(sql`update conexao_gateway set expira_em = now() + interval '10 days' where id = ${alvo.id}`);

      mercadoPago.renovacaoFalha = true;
      try {
        const falhas: Array<Pick<LinhaConexao, 'falhas_refresh' | 'ativa' | 'motivo_desativacao'>> = [];
        for (let i = 0; i < 3; i++) {
          await servico().renovarConexoesAVencer();
          const linha = (await conexoes()).find((l) => l.id === alvo.id)!;
          falhas.push({
            falhas_refresh: linha.falhas_refresh,
            ativa: linha.ativa,
            motivo_desativacao: linha.motivo_desativacao,
          });
        }

        expect(falhas).toEqual([
          { falhas_refresh: 1, ativa: true, motivo_desativacao: null },
          { falhas_refresh: 2, ativa: true, motivo_desativacao: null },
          { falhas_refresh: 3, ativa: false, motivo_desativacao: 'falha_renovacao' },
        ]);
      } finally {
        mercadoPago.renovacaoFalha = false;
      }
    });
  });
});
