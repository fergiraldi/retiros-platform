import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { apagarSegredo, gravarSegredo } from '../src/cofre/cofre';
import { ambiente } from '../src/config/ambiente';
import * as schema from '../src/db/schema';
import { ErroNoMercadoPago } from '../src/mercado-pago/oauth-mercado-pago';
import { GatewaySemResposta, PagamentosMercadoPago } from '../src/mercado-pago/pagamentos-mercado-pago';
import type { PagamentoCriado, PedidoDePagamento } from '../src/mercado-pago/pagamentos-mercado-pago';
import { criarAppDeTeste } from './ajuda/app-teste';
import type { AppDeTeste } from './ajuda/app-teste';
import { removerInquilinoSemeado, semearInquilinoCompleto } from './ajuda/semear';
import type { InquilinoSemeado } from './ajuda/semear';

type Chamada = {
  accessToken: string;
  pedido: PedidoDePagamento;
  opcoes: { idempotencyKey: string; deviceId?: string | null };
};

/** O Mercado Pago de mentira: cada caso diz o que ele responde. */
const gateway = {
  chamadas: [] as Chamada[],
  responder: (_c: Chamada): Promise<PagamentoCriado> =>
    Promise.resolve({ id: randomUUID(), status: 'pending', statusDetalhe: 'pending_waiting_transfer' }),
};
const pagamentosFalso: Pick<PagamentosMercadoPago, 'criar'> = {
  criar: (accessToken, pedido, opcoes) => {
    const chamada = { accessToken, pedido, opcoes };
    gateway.chamadas.push(chamada);
    return gateway.responder(chamada);
  },
};

const pixPendente = (): Promise<PagamentoCriado> =>
  Promise.resolve({
    id: `mp-${randomUUID()}`,
    status: 'pending',
    statusDetalhe: 'pending_waiting_transfer',
    pixQrCode: '00020126580014BR.GOV.BCB.PIX',
    pixQrCodeBase64: 'iVBORw0KGgo=',
    ticketUrl: 'https://www.mercadopago.com.br/payments/1/ticket',
  });

const cartao = (parcelas = 1) => ({
  metodo: 'cartao_credito',
  token: 'tok-cartao',
  paymentMethodId: 'master',
  issuerId: '24',
  parcelas,
  deviceId: 'armor.abc123',
  pagador: { email: 'pagador@exemplo.com', identificacao: { tipo: 'CPF', numero: '11144477735' } },
});

/** Dia de hoje em São Paulo, deslocado — `data_inicio` é data local (RN-041). */
function diaEmSaoPaulo(deslocamentoEmDias: number): string {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const dia = new Date(`${hoje}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + deslocamentoEmDias);
  return dia.toISOString().slice(0, 10);
}

/**
 * Item 11 — cobrança pública da inscrição (03-cobranca.md §2 e §3), por HTTP
 * real, contra o cofre de verdade do ambiente e um Mercado Pago falso.
 */
describe('Cobrança pública da inscrição (item 11)', () => {
  let ctx: AppDeTeste;
  let a: InquilinoSemeado;
  let b: InquilinoSemeado;
  let hostA: string;
  let hostB: string;
  let prefixoA: string;
  let sequencia = 500;
  let ultimoIp = 0;
  const proxiesOriginal = ambiente.PROXIES_CONFIAVEIS;
  const segredos: string[] = [];

  beforeAll(async () => {
    ambiente.PROXIES_CONFIAVEIS = 1; // cada requisição com IP próprio, por causa do limitador
    ctx = await criarAppDeTeste([], [{ provide: PagamentosMercadoPago, useValue: pagamentosFalso }]);
    const sufixo = Date.now();
    prefixoA = `zzcobraa${sufixo}`;
    a = await semearInquilinoCompleto(ctx.uow, prefixoA);
    b = await semearInquilinoCompleto(ctx.uow, `zzcobrab${sufixo}`);
    hostA = `${prefixoA}.example.com`;
    hostB = `zzcobrab${sufixo}.example.com`;

    // A conexão que a semente cria aponta para um segredo que não existe:
    // em A ele passa a existir; em B a conexão é desligada (caso "sem conexão").
    await gravar(a, `ref-access-${prefixoA}`, 'token-da-denominacao-a');
    await comoAdmin(b, sql`update conexao_gateway set ativa = false, desativada_em = now()`);
  }, 30_000);

  afterAll(async () => {
    await ctx.uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, async (tx) => {
      for (const nome of segredos) await apagarSegredo(tx, nome);
    });
    await removerInquilinoSemeado(ctx.uow, a.inquilinoId);
    await removerInquilinoSemeado(ctx.uow, b.inquilinoId);
    await ctx.fechar();
    ambiente.PROXIES_CONFIAVEIS = proxiesOriginal;
  }, 30_000);

  beforeEach(() => {
    gateway.chamadas = [];
    gateway.responder = pixPendente;
  });

  // ---------------------------------------------------------------- ajudantes

  function comoAdmin<T extends Record<string, unknown>>(s: InquilinoSemeado, consulta: ReturnType<typeof sql>) {
    return ctx.uow
      .executar({ inquilinoId: s.inquilinoId, papel: 'admin_denominacao' }, (tx) => tx.execute<T>(consulta))
      .then((r) => r.rows);
  }

  async function gravar(s: InquilinoSemeado, nome: string, valor: string) {
    segredos.push(nome);
    await ctx.uow.executar({ inquilinoId: s.inquilinoId, papel: 'admin_denominacao' }, (tx) =>
      gravarSegredo(tx, nome, valor),
    );
  }

  interface OpcoesInscricao {
    valorDevido?: string;
    percentual?: string;
    repassada?: boolean;
    dataInicio?: string;
    situacao?: 'pendente_pagamento' | 'lista_espera';
  }

  /** Uma inscrição pronta para cobrar, num encontro próprio — sem passar pela
   *  ficha, que é testada em ficha-publica.spec.ts. */
  async function novaInscricao(s: InquilinoSemeado, opcoes: OpcoesInscricao = {}) {
    sequencia += 1;
    const ids = { encontro: randomUUID(), pessoa: randomUUID(), inscricao: randomUUID() };
    const token = randomBytes(32).toString('base64url');
    await ctx.uow.executar({ inquilinoId: s.inquilinoId, papel: 'admin_denominacao' }, async (tx) => {
      await tx.insert(schema.encontro).values({
        id: ids.encontro,
        inquilinoId: s.inquilinoId,
        centralId: s.centralId,
        numero: sequencia,
        titulo: `${sequencia}º Encontro`,
        slug: `cobranca-${sequencia}`,
        dataInicio: opcoes.dataInicio ?? diaEmSaoPaulo(30),
        dataFim: opcoes.dataInicio ?? diaEmSaoPaulo(32),
        localNome: 'Recanto',
        localEndereco: 'Estrada',
        localCidade: 'Cascavel',
        localUf: 'PR',
        vagasParticipantes: 10,
        vagasServos: 10,
        taxaParticipante: '350.00',
        taxaServo: '120.00',
        inscricoesAbremEm: new Date(Date.now() - 86_400_000).toISOString(),
        inscricoesFechamEm: new Date(Date.now() + 86_400_000).toISOString(),
        situacao: 'publicado',
      });
      await tx.insert(schema.pessoa).values({
        id: ids.pessoa,
        inquilinoId: s.inquilinoId,
        nomeCompleto: 'Maria das Graças Souza',
        nomeCracha: 'Maria',
        dataNascimento: '1980-01-01',
        telefone: '45999990000',
        email: 'maria@exemplo.com',
        contatoEmergenciaNome: 'José',
        contatoEmergenciaFone: '45999991111',
      });
      const situacao = opcoes.situacao ?? 'pendente_pagamento';
      await tx.insert(schema.inscricao).values({
        id: ids.inscricao,
        inquilinoId: s.inquilinoId,
        centralId: s.centralId,
        encontroId: ids.encontro,
        pessoaId: ids.pessoa,
        tipo: 'participante',
        situacao,
        valorDevido: opcoes.valorDevido ?? '350.00',
        taxaPlataformaPercentual: opcoes.percentual ?? '2.500',
        taxaPlataformaRepassada: opcoes.repassada ?? false,
        reembolsoFaixas: [],
        tokenConsulta: token,
        posicaoEspera: situacao === 'lista_espera' ? 1 : null,
      });
    });
    return { ...ids, token };
  }

  function cobrar(token: string, corpo: unknown, host = hostA) {
    ultimoIp += 1;
    return request(ctx.app.getHttpServer())
      .post(`/api/publico/inscricoes/${token}/cobrancas`)
      .set('Host', host)
      .set('X-Forwarded-For', `10.9.${Math.floor(ultimoIp / 250)}.${ultimoIp % 250}`)
      .send(corpo as object);
  }

  const cobrancasDe = (s: InquilinoSemeado, inscricaoId: string) =>
    comoAdmin<{ id: string; situacao: string; valor: string; taxa_plataforma: string; gateway_pagamento_id: string | null }>(
      s,
      sql`select id, situacao, valor, taxa_plataforma, gateway_pagamento_id from cobranca
           where inscricao_id = ${inscricaoId} order by criado_em`,
    );

  // --------------------------------------------------------------------- Pix

  it('Pix: cria no gateway com o token da denominação e a taxa da plataforma no split (RN-043, RN-321)', async () => {
    const inscricao = await novaInscricao(a);

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' }).expect(201);

    expect(resposta.body).toMatchObject({
      metodo: 'pix',
      situacao: 'aguardando_pagamento',
      valor: 350,
      pixQrCode: '00020126580014BR.GOV.BCB.PIX',
      ticketUrl: 'https://www.mercadopago.com.br/payments/1/ticket',
    });
    const [chamada] = gateway.chamadas;
    expect(chamada.accessToken).toBe('token-da-denominacao-a');
    expect(chamada.pedido).toMatchObject({
      valor: 350,
      taxaDaPlataforma: 8.75, // 2,5% de 350
      referenciaExterna: resposta.body.cobrancaId,
      pagador: { email: 'maria@exemplo.com', nome: 'Maria', sobrenome: 'das Graças Souza' },
    });
    expect(chamada.opcoes.idempotencyKey).toMatch(/^[0-9a-f-]{8}-[0-9a-f-]{4}-4/); // UUID v4
    const validade = new Date(resposta.body.expiraEm).getTime() - Date.now();
    expect(validade).toBeGreaterThan(23.9 * 3_600_000);

    expect(await cobrancasDe(a, inscricao.inscricao)).toEqual([
      expect.objectContaining({ situacao: 'aguardando_pagamento', valor: '350.00', taxa_plataforma: '8.75' }),
    ]);
  });

  it('com repasse, o inscrito paga a taxa por cima, e a base dela continua sendo o valor devido (RN-096)', async () => {
    const inscricao = await novaInscricao(a, { repassada: true });

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' }).expect(201);

    expect(resposta.body.valor).toBe(358.75);
    expect(gateway.chamadas[0].pedido).toMatchObject({ valor: 358.75, taxaDaPlataforma: 8.75 });
  });

  it('o Pix vence no marco de corte quando ele chega antes de 24h (RN-041)', async () => {
    const amanha = diaEmSaoPaulo(1);
    const inscricao = await novaInscricao(a, { dataInicio: amanha });
    const corte = Date.parse(`${amanha}T00:00:00-03:00`);

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' });

    // A menos de 30 minutos do corte o Mercado Pago não aceita o vencimento.
    if (corte - Date.now() < 31 * 60_000) {
      expect(resposta.status).toBe(422);
    } else {
      expect(resposta.status).toBe(201);
      expect(new Date(resposta.body.expiraEm).getTime()).toBe(corte);
    }
  });

  it('depois do marco de corte não há pagamento online (RN-041)', async () => {
    const inscricao = await novaInscricao(a, { dataInicio: diaEmSaoPaulo(0) });

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' }).expect(422);

    expect(resposta.body.erro.codigo).toBe('PAGAMENTO_ONLINE_ENCERRADO');
    expect(gateway.chamadas).toHaveLength(0);
  });

  it('cobrança viva devolve a mesma, em vez de criar outra (RN-310)', async () => {
    const inscricao = await novaInscricao(a);
    const primeira = await cobrar(inscricao.token, { metodo: 'pix' }).expect(201);

    const segunda = await cobrar(inscricao.token, { metodo: 'pix' }).expect(409);

    expect(segunda.body.erro).toMatchObject({
      codigo: 'COBRANCA_JA_EXISTE',
      detalhes: { cobranca: { cobrancaId: primeira.body.cobrancaId, pixQrCode: primeira.body.pixQrCode } },
    });
    expect(gateway.chamadas).toHaveLength(1);
  });

  it('clique duplo simultâneo: uma cobrança só, e o segundo recebe a do primeiro', async () => {
    const inscricao = await novaInscricao(a);
    let respostas!: Promise<request.Response[]>;

    // Trava a inserção em `cobranca` enquanto as duas chegam: sem o `for
    // update` na inscrição, as duas passariam juntas pela checagem de cobrança
    // viva e a segunda estouraria `cobranca_viva_unica` (500). Com ele, a
    // segunda espera a primeira terminar e recebe a cobrança dela.
    await ctx.uow.executar({ inquilinoId: a.inquilinoId, papel: 'admin_denominacao' }, async (tx) => {
      await tx.execute(sql`lock table cobranca in share row exclusive mode`);
      respostas = Promise.all([
        cobrar(inscricao.token, { metodo: 'pix' }),
        cobrar(inscricao.token, { metodo: 'pix' }),
      ]);
      await new Promise((resolver) => setTimeout(resolver, 3_000));
    });

    expect((await respostas).map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await cobrancasDe(a, inscricao.inscricao)).toHaveLength(1);
  });

  it('lista de espera não cobra (RN-033)', async () => {
    const inscricao = await novaInscricao(a, { situacao: 'lista_espera' });

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' }).expect(409);

    expect(resposta.body.erro).toMatchObject({
      codigo: 'CONFLITO_DE_SITUACAO',
      detalhes: { situacao: 'lista_espera' },
    });
  });

  // ------------------------------------------------------------------ cartão

  it('cartão aprovado na criação confirma a inscrição na hora, pela função do webhook (§4)', async () => {
    const inscricao = await novaInscricao(a);
    gateway.responder = () =>
      Promise.resolve({
        id: `mp-${randomUUID()}`,
        status: 'approved',
        statusDetalhe: 'accredited',
        bandeira: 'master',
        ultimosQuatro: '1234',
        parcelas: 3,
        valorParcela: 121.5,
      });

    const resposta = await cobrar(inscricao.token, cartao(3)).expect(201);

    expect(resposta.body).toMatchObject({
      situacao: 'paga',
      parcelas: 3,
      valorParcela: 121.5,
      bandeira: 'master',
      ultimosQuatro: '1234',
    });
    expect(gateway.chamadas[0].opcoes.deviceId).toBe('armor.abc123'); // RN-308
    expect(gateway.chamadas[0].pedido.pagador.identificacao).toEqual({ tipo: 'CPF', numero: '11144477735' });
    const [estado] = await comoAdmin<{ situacao: string; notificacoes: number }>(
      a,
      sql`select i.situacao,
                 (select count(*)::int from notificacao n
                   where n.inscricao_id = i.id and n.gatilho = 'pagamento_aprovado') as notificacoes
            from inscricao i where i.id = ${inscricao.inscricao}`,
    );
    expect(estado).toEqual({ situacao: 'confirmada', notificacoes: 1 });
  });

  it('cartão recusado: 402 com o motivo em português, e a pessoa pode tentar de novo (RN-311)', async () => {
    const inscricao = await novaInscricao(a);
    gateway.responder = () =>
      Promise.resolve({ id: `mp-${randomUUID()}`, status: 'rejected', statusDetalhe: 'cc_rejected_insufficient_amount' });

    const recusa = await cobrar(inscricao.token, cartao()).expect(402);
    gateway.responder = pixPendente;
    await cobrar(inscricao.token, { metodo: 'pix' }).expect(201);

    expect(recusa.body.erro).toMatchObject({
      codigo: 'PAGAMENTO_RECUSADO',
      detalhes: { motivoRecusa: 'Saldo ou limite insuficiente.' },
    });
    expect((await cobrancasDe(a, inscricao.inscricao)).map((c) => c.situacao)).toEqual([
      'recusada',
      'aguardando_pagamento',
    ]);
  });

  it('token de cartão vencido é 422 TOKEN_EXPIRADO, não recusa do cartão (RN-309)', async () => {
    const inscricao = await novaInscricao(a);
    gateway.responder = () => Promise.reject(new ErroNoMercadoPago(400, '3003'));

    const resposta = await cobrar(inscricao.token, cartao()).expect(422);

    expect(resposta.body.erro.codigo).toBe('TOKEN_EXPIRADO');
    expect((await cobrancasDe(a, inscricao.inscricao))[0].situacao).toBe('recusada');
  });

  it('parcelas acima do máximo da central são recusadas (§2.3)', async () => {
    const inscricao = await novaInscricao(a);

    const resposta = await cobrar(inscricao.token, cartao(8)).expect(422);

    // R$ 350 com parcela mínima de R$ 50 e máximo de 12 na central: 7.
    expect(resposta.body.erro).toMatchObject({ codigo: 'PARCELAS_INVALIDAS', detalhes: { maximo: 7 } });
    expect(gateway.chamadas).toHaveLength(0);
  });

  // ---------------------------------------------------- gateway e recebimento

  it('gateway sem resposta: 202, a cobrança fica criada e o polling a mostra assim (RN-302)', async () => {
    const inscricao = await novaInscricao(a);
    gateway.responder = () => Promise.reject(new GatewaySemResposta('timeout'));

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' }).expect(202);
    const polling = await request(ctx.app.getHttpServer())
      .get(`/api/publico/inscricoes/${inscricao.token}/cobrancas/${resposta.body.cobrancaId}`)
      .set('Host', hostA)
      .expect(200);
    const outra = await cobrar(inscricao.token, { metodo: 'pix' }).expect(409);

    expect(polling.body.situacao).toBe('criada');
    expect(outra.body.erro.detalhes.cobranca.cobrancaId).toBe(resposta.body.cobrancaId);
  });

  it('sem conexão ativa, a cobrança nasce pendente_emissao e o gateway não é chamado (RN-098)', async () => {
    const inscricao = await novaInscricao(b);

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' }, hostB).expect(201);

    expect(resposta.body).toMatchObject({ situacao: 'pendente_emissao', pixQrCode: null });
    expect(gateway.chamadas).toHaveLength(0);
  });

  it('a conexão da central vem antes da do inquilino (RN-123)', async () => {
    const conexaoId = randomUUID();
    await gravar(a, `mercadopago:${conexaoId}:access`, 'token-da-central');
    await comoAdmin(
      a,
      sql`insert into conexao_gateway (id, inquilino_id, central_id, conta_externa_id, access_token_ref,
                                       refresh_token_ref, expira_em, conectada_por)
          values (${conexaoId}, ${a.inquilinoId}, ${a.centralId}, 'conta-central',
                  ${`mercadopago:${conexaoId}:access`}, 'x', now() + interval '100 days', ${randomUUID()})`,
    );
    const inscricao = await novaInscricao(a);

    try {
      await cobrar(inscricao.token, { metodo: 'pix' }).expect(201);
      expect(gateway.chamadas[0].accessToken).toBe('token-da-central');
    } finally {
      await comoAdmin(a, sql`update conexao_gateway set ativa = false where id = ${conexaoId}`);
    }
  });

  it('401 do gateway derruba a conexão (RN-327) e a cobrança espera em pendente_emissao', async () => {
    const conexaoId = randomUUID();
    await gravar(a, `mercadopago:${conexaoId}:access`, 'token-revogado');
    await comoAdmin(
      a,
      sql`insert into conexao_gateway (id, inquilino_id, central_id, conta_externa_id, access_token_ref,
                                       refresh_token_ref, expira_em, conectada_por)
          values (${conexaoId}, ${a.inquilinoId}, ${a.centralId}, 'conta-revogada',
                  ${`mercadopago:${conexaoId}:access`}, 'x', now() + interval '100 days', ${randomUUID()})`,
    );
    const inscricao = await novaInscricao(a);
    gateway.responder = () => Promise.reject(new ErroNoMercadoPago(401, 'unauthorized'));

    const resposta = await cobrar(inscricao.token, { metodo: 'pix' }).expect(201);

    expect(resposta.body.situacao).toBe('pendente_emissao');
    const [conexao] = await comoAdmin<{ ativa: boolean; motivo_desativacao: string }>(
      a,
      sql`select ativa, motivo_desativacao from conexao_gateway where id = ${conexaoId}`,
    );
    expect(conexao).toEqual({ ativa: false, motivo_desativacao: 'revogada_no_gateway' });
  });

  it('token de consulta inválido, ou de outro inquilino, é 404 (CA-26)', async () => {
    const deB = await novaInscricao(b);

    const inexistente = await cobrar('token-que-nao-existe', { metodo: 'pix' }).expect(404);
    const deOutro = await cobrar(deB.token, { metodo: 'pix' }).expect(404);

    expect(inexistente.body).toEqual(deOutro.body);
    expect(inexistente.body.erro.codigo).toBe('INSCRICAO_NAO_ENCONTRADA');
  });
});
