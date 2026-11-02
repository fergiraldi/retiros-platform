import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { lerSegredo } from '../cofre/cofre';
import { UnidadeDeTrabalhoService } from '../contexto/unidade-de-trabalho.service';
import type { ContextoRequisicao } from '../contexto/contexto.types';
import type { Tx } from '../db/tipos';
import { uuidV7 } from '../db/uuid-v7';
import { ErroDeDominio } from '../erros/erro-de-dominio';
import { LimiteDeTaxaService } from '../limite-de-taxa/limite-de-taxa.service';
import { ErroNoMercadoPago } from '../mercado-pago/oauth-mercado-pago';
import { GatewaySemResposta, PagamentosMercadoPago } from '../mercado-pago/pagamentos-mercado-pago';
import type { PagamentoCriado } from '../mercado-pago/pagamentos-mercado-pago';
import { contextoDeLeituraPublica } from '../publico/encontros-publicos.service';
import { registrarPagamentoAprovado } from './confirmacao';
import { traduzirMotivoDeRecusa } from './motivos-de-recusa';
import type { PedidoDeCobranca } from './pedido-de-cobranca.schema';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** RN-041: o pagamento online acaba em `data_inicio`, à 0h de São Paulo. */
const CORTE = sql`(e.data_inicio::timestamp at time zone 'America/Sao_Paulo')`;

/** O Mercado Pago recusa vencimento de Pix a menos de 30 minutos da emissão. */
const VALIDADE_MINIMA_DO_PIX = '30 minutes';

/** `cobranca_viva_unica` — no máximo uma destas por inscrição. */
const SITUACOES_VIVAS = sql`('pendente_emissao', 'criada', 'aguardando_pagamento', 'em_analise')`;

/** Situação do Mercado Pago → nossa (03-cobranca.md §1). `approved` não está
 *  aqui: quem leva a `paga` é `registrarPagamentoAprovado`, a mesma função do
 *  webhook. */
const SITUACAO_DO_GATEWAY: Record<string, string> = {
  pending: 'aguardando_pagamento',
  in_process: 'em_analise',
  in_mediation: 'em_analise',
  rejected: 'recusada',
  cancelled: 'cancelada',
};

/** Token de cartão inválido, vencido ou já usado (referência do create-payment). */
const TOKEN_DE_CARTAO_INVALIDO = new Set(['2006', '2062', '3003', '3008']);

const COLUNAS = sql`id, metodo, situacao, valor, parcelas, expira_em, pix_qr_code, pix_qr_code_base64, link_pagamento`;

type LinhaCobranca = {
  id: string;
  metodo: string;
  situacao: string;
  valor: string;
  parcelas: number;
  expira_em: string | null;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  link_pagamento: string | null;
};

type LinhaParaCobrar = {
  situacao: string;
  valor: string;
  taxa_plataforma: string;
  taxa_plataforma_percentual: string;
  email: string;
  nome_completo: string;
  titulo: string;
  max_parcelas: number;
  parcela_minima: string;
  apos_o_corte: boolean;
  pix_expira_em: string;
  pix_sem_prazo: boolean;
};

/** O que a primeira transação deixa pronto para a chamada ao gateway. */
interface CobrancaRegistrada {
  cobranca: LinhaCobranca;
  conexaoId: string | null;
  accessToken: string | null;
  idempotencyKey: string;
  taxaDaPlataforma: number;
  pagador: { email: string; nomeCompleto: string };
  descricao: string;
}

export interface RespostaDeCobranca {
  status: 201 | 202;
  corpo: Record<string, unknown>;
}

/**
 * Cobrança pública da inscrição, pelo token de consulta (03-cobranca.md §2 e
 * §3.1, item 11). Pix ou cartão, com a taxa da plataforma retida no split
 * (RN-043, RN-321).
 *
 * Duas transações em volta da chamada ao gateway (§2.2): a cobrança é gravada
 * em `criada`, com a chave de idempotência, **antes** de chamar (RN-143) — em
 * timeout não se sabe se o pagamento nasceu, e repetir com a mesma chave
 * devolve o original. Rede nunca roda dentro de transação.
 */
@Injectable()
export class CobrancaPublicaService {
  private readonly logger = new Logger(CobrancaPublicaService.name);

  constructor(
    private readonly uow: UnidadeDeTrabalhoService,
    private readonly limite: LimiteDeTaxaService,
    private readonly pagamentos: PagamentosMercadoPago,
  ) {}

  async criar(
    inquilinoId: string,
    token: string,
    pedido: PedidoDeCobranca,
    ip: string,
  ): Promise<RespostaDeCobranca> {
    // RNF-012: rota pública que chama o gateway com cartão — sem limite, um
    // token de consulta vazado vira bancada de teste de cartão roubado.
    if (
      !this.limite.permitir(`cobranca:ip:${ip}`, 10, 10 * MINUTO) ||
      !this.limite.permitir(`cobranca:inscricao:${token}`, 10, HORA)
    ) {
      throw new ErroDeDominio('MUITAS_TENTATIVAS', 'Muitas tentativas de pagamento. Aguarde alguns minutos.');
    }

    const { inscricaoId, centralId } = await this.inscricaoDoToken(inquilinoId, token);
    const contexto: ContextoRequisicao = { inquilinoId, centralId, papel: 'publico' };

    const registrada = await this.uow.executar(contexto, (tx) => this.registrar(tx, inscricaoId, pedido));

    // RN-098: sem recebimento conectado a cobrança não falha — espera em
    // `pendente_emissao`, com a vaga reservada, e sai quando a conexão voltar.
    if (!registrada.accessToken) return { status: 201, corpo: resumo(registrada.cobranca) };

    let pagamento: PagamentoCriado;
    try {
      pagamento = await this.pagamentos.criar(
        registrada.accessToken,
        {
          valor: Number(registrada.cobranca.valor),
          taxaDaPlataforma: registrada.taxaDaPlataforma,
          descricao: registrada.descricao,
          referenciaExterna: registrada.cobranca.id,
          ...(pedido.metodo === 'pix'
            ? {
                pagador: nomeDoPagador(registrada.pagador),
                pix: { expiraEm: new Date(registrada.cobranca.expira_em!) },
              }
            : {
                pagador: {
                  email: pedido.pagador.email,
                  identificacao: { tipo: 'CPF', numero: pedido.pagador.identificacao.numero },
                },
                cartao: {
                  token: pedido.token,
                  meioDePagamento: pedido.paymentMethodId,
                  emissor: pedido.issuerId,
                  parcelas: pedido.parcelas,
                },
              }),
        },
        {
          idempotencyKey: registrada.idempotencyKey,
          deviceId: pedido.metodo === 'cartao_credito' ? pedido.deviceId : null,
        },
      );
    } catch (erro) {
      return this.tratarFalha(contexto, registrada, erro);
    }

    const cobranca = await this.uow.executar(contexto, async (tx) => {
      await tx.execute(sql`
        update cobranca
           set gateway_pagamento_id = ${pagamento.id},
               situacao = coalesce(${SITUACAO_DO_GATEWAY[pagamento.status] ?? null}::situacao_cobranca, situacao),
               pix_qr_code = ${pagamento.pixQrCode ?? null},
               pix_qr_code_base64 = ${pagamento.pixQrCodeBase64 ?? null},
               link_pagamento = ${pagamento.ticketUrl ?? null},
               motivo_recusa = ${pagamento.status === 'rejected' ? pagamento.statusDetalhe : null},
               atualizado_em_gateway = now(), atualizado_em = now()
         where id = ${registrada.cobranca.id}`);

      // §4: cartão aprovado já na criação confirma na hora — pela mesma
      // função do webhook, que depois chega e não faz nada.
      if (pagamento.status === 'approved' || pagamento.status === 'authorized') {
        await registrarPagamentoAprovado(tx, registrada.cobranca.id, 'sistema');
      }

      const r = await tx.execute<LinhaCobranca>(
        sql`select ${COLUNAS} from cobranca where id = ${registrada.cobranca.id}`,
      );
      return r.rows[0];
    });

    if (cobranca.situacao === 'recusada') {
      const motivoRecusa = traduzirMotivoDeRecusa(pagamento.statusDetalhe);
      throw new ErroDeDominio('PAGAMENTO_RECUSADO', motivoRecusa, { cobrancaId: cobranca.id, motivoRecusa });
    }

    return {
      status: 201,
      corpo: {
        ...resumo(cobranca),
        ...(pedido.metodo === 'cartao_credito' && {
          valorParcela: pagamento.valorParcela ?? null,
          bandeira: pagamento.bandeira ?? null,
          ultimosQuatro: pagamento.ultimosQuatro ?? null,
        }),
      },
    };
  }

  /** §3.3 — o polling da tela. RN-312: lê do nosso banco, nunca do gateway. */
  async consultar(inquilinoId: string, token: string, cobrancaId: string) {
    const linha = UUID.test(cobrancaId)
      ? await this.uow.executar(contextoDeLeituraPublica(inquilinoId), async (tx) => {
          const r = await tx.execute<LinhaCobranca>(sql`
            select ${COLUNAS} from cobranca
             where id = ${cobrancaId}
               and inscricao_id = (select id from inscricao where token_consulta = ${token})`);
          return r.rows[0];
        })
      : undefined;

    // Não distingue token inválido de cobrança de outra inscrição (CA-26).
    if (!linha) throw new ErroDeDominio('INSCRICAO_NAO_ENCONTRADA', 'Inscrição não encontrada.');
    return resumo(linha);
  }

  /** O token é credencial (RN-133) e cruza centrais: leitura elevada, curta,
   *  só para achar a inscrição e a central — a escrita usa o contexto dela. */
  private async inscricaoDoToken(inquilinoId: string, token: string) {
    const linha = await this.uow.executar(contextoDeLeituraPublica(inquilinoId), async (tx) => {
      const r = await tx.execute<{ id: string; central_id: string }>(
        sql`select id, central_id from inscricao where token_consulta = ${token}`,
      );
      return r.rows[0];
    });

    if (!linha) throw new ErroDeDominio('INSCRICAO_NAO_ENCONTRADA', 'Inscrição não encontrada.');
    return { inscricaoId: linha.id, centralId: linha.central_id };
  }

  /**
   * §2.1 e a gravação em `criada` (RN-143). O `for update` na inscrição
   * serializa o clique duplo: o segundo espera, vê a cobrança viva do primeiro
   * e recebe ela de volta (RN-310), em vez de colidir no índice.
   */
  private async registrar(tx: Tx, inscricaoId: string, pedido: PedidoDeCobranca): Promise<CobrancaRegistrada> {
    // RN-043/RN-096: a base da taxa é o `valor_devido`, com o percentual
    // congelado na inscrição; com repasse, o inscrito paga a taxa por cima.
    const r = await tx.execute<LinhaParaCobrar>(sql`
      select i.situacao, i.taxa_plataforma_percentual,
             round(i.valor_devido * i.taxa_plataforma_percentual / 100, 2) as taxa_plataforma,
             i.valor_devido + case when i.taxa_plataforma_repassada
                                   then round(i.valor_devido * i.taxa_plataforma_percentual / 100, 2)
                                   else 0 end as valor,
             p.email, p.nome_completo, e.titulo, c.max_parcelas, c.parcela_minima,
             now() >= ${CORTE} as apos_o_corte,
             least(now() + interval '24 hours', ${CORTE}) as pix_expira_em,
             least(now() + interval '24 hours', ${CORTE}) < now() + ${VALIDADE_MINIMA_DO_PIX}::interval as pix_sem_prazo
        from inscricao i
        join pessoa p on p.id = i.pessoa_id
        join encontro e on e.id = i.encontro_id
        join central c on c.id = i.central_id
       where i.id = ${inscricaoId}
         for update of i`);
    const linha = r.rows[0];

    // RN-033: lista de espera não cobra; confirmada já pagou.
    if (linha.situacao !== 'pendente_pagamento') {
      throw new ErroDeDominio('CONFLITO_DE_SITUACAO', 'Esta inscrição não está aguardando pagamento.', {
        situacao: linha.situacao,
      });
    }

    const viva = await tx.execute<LinhaCobranca>(
      sql`select ${COLUNAS} from cobranca where inscricao_id = ${inscricaoId} and situacao in ${SITUACOES_VIVAS}`,
    );
    if (viva.rows[0]) {
      throw new ErroDeDominio('COBRANCA_JA_EXISTE', 'Já existe um pagamento em aberto para esta inscrição.', {
        cobranca: resumo(viva.rows[0]),
      });
    }

    // RN-041: depois do marco, só na recepção. O Pix ainda precisa de 30
    // minutos de validade, que o Mercado Pago exige.
    if (linha.apos_o_corte || (pedido.metodo === 'pix' && linha.pix_sem_prazo)) {
      throw new ErroDeDominio(
        'PAGAMENTO_ONLINE_ENCERRADO',
        'O pagamento online deste encontro foi encerrado. O pagamento agora é feito na recepção.',
      );
    }

    const valor = Number(linha.valor);
    if (!(valor > 0)) {
      throw new ErroDeDominio('CONFLITO_DE_SITUACAO', 'Esta inscrição não tem valor a pagar.', {
        situacao: linha.situacao,
      });
    }

    // §2.3 — o máximo é o da central, limitado pela parcela mínima, e nunca
    // menos de 1.
    if (pedido.metodo === 'cartao_credito') {
      const maximo = Math.max(1, Math.min(linha.max_parcelas, Math.floor(valor / Number(linha.parcela_minima))));
      if (pedido.parcelas > maximo) {
        throw new ErroDeDominio('PARCELAS_INVALIDAS', `Este pagamento aceita no máximo ${maximo} parcelas.`, {
          maximo,
        });
      }
    }

    // RN-123/RN-331: a conexão sai do inquilino e da central da própria
    // cobrança, sob a RLS — nunca de parâmetro. A da central vem primeiro.
    const conexoes = await tx.execute<{ id: string; access_token_ref: string }>(sql`
      select id, access_token_ref from conexao_gateway
       where ativa and gateway = 'mercadopago'
       order by central_id nulls last
       limit 1`);
    const conexao = conexoes.rows[0];
    const accessToken = conexao ? await lerSegredo(tx, conexao.access_token_ref) : null;

    const idempotencyKey = randomUUID(); // a documentação pede UUID v4
    const inserida = await tx.execute<LinhaCobranca>(sql`
      insert into cobranca (
        id, inquilino_id, central_id, inscricao_id, conexao_gateway_id, metodo, parcelas, valor,
        taxa_plataforma, taxa_plataforma_percentual, situacao, idempotency_key, expira_em
      ) values (
        ${uuidV7()}, app_inquilino_id(), app_central_id(), ${inscricaoId},
        ${accessToken ? conexao.id : null}::uuid, ${pedido.metodo}::metodo_pagamento,
        ${pedido.metodo === 'cartao_credito' ? pedido.parcelas : 1}, ${linha.valor}::numeric,
        ${linha.taxa_plataforma}::numeric, ${linha.taxa_plataforma_percentual}::numeric,
        ${accessToken ? 'criada' : 'pendente_emissao'}::situacao_cobranca, ${idempotencyKey}::uuid,
        ${accessToken && pedido.metodo === 'pix' ? linha.pix_expira_em : null}::timestamptz
      ) returning ${COLUNAS}`);
    const cobranca = inserida.rows[0];

    // RN-320: toda operação de cobrança é auditada, com ator.
    await tx.execute(sql`
      insert into auditoria (id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo, depois)
      values (${uuidV7()}, app_inquilino_id(), app_central_id(), 'cobranca', ${cobranca.id}, 'criada', 'publico',
              ${JSON.stringify({
                situacao: cobranca.situacao,
                metodo: cobranca.metodo,
                valor: Number(linha.valor),
                taxaPlataforma: Number(linha.taxa_plataforma),
              })}::jsonb)`);

    return {
      cobranca,
      conexaoId: conexao?.id ?? null,
      accessToken,
      idempotencyKey,
      taxaDaPlataforma: Number(linha.taxa_plataforma),
      pagador: { email: linha.email, nomeCompleto: linha.nome_completo },
      descricao: `Inscrição — ${linha.titulo}`,
    };
  }

  private async tratarFalha(
    contexto: ContextoRequisicao,
    registrada: CobrancaRegistrada,
    erro: unknown,
  ): Promise<RespostaDeCobranca> {
    const id = registrada.cobranca.id;

    // RN-302: sem resposta não é falha. A cobrança fica `criada`, a tela faz
    // polling, e a reconciliação (item 12) descobre pela chave o que houve.
    if (erro instanceof GatewaySemResposta) {
      this.logger.warn(`Mercado Pago sem resposta na cobrança ${id}: ${erro.message}`);
      return { status: 202, corpo: resumo(registrada.cobranca) };
    }

    if (!(erro instanceof ErroNoMercadoPago)) throw erro;

    // RN-327: token revogado pela denominação no painel do Mercado Pago. A
    // conexão cai na hora, e a cobrança espera a reconexão em
    // `pendente_emissao` — a falha não é do inscrito, e a vaga continua dele
    // (RN-098). `criada → pendente_emissao` não está no diagrama de §1: é o
    // mesmo desfecho de "sem conexão", descoberto um passo depois.
    if (erro.status === 401) {
      const cobranca = await this.uow.executar(contexto, async (tx) => {
        await tx.execute(sql`
          update conexao_gateway
             set ativa = false, desativada_em = now(), motivo_desativacao = 'revogada_no_gateway'
           where id = ${registrada.conexaoId} and ativa`);
        const r = await tx.execute<LinhaCobranca>(sql`
          update cobranca
             set situacao = 'pendente_emissao', conexao_gateway_id = null, expira_em = null, atualizado_em = now()
           where id = ${id}
           returning ${COLUNAS}`);
        return r.rows[0];
      });
      this.logger.warn(`Conexão ${registrada.conexaoId} revogada no Mercado Pago (RN-327).`);
      return { status: 201, corpo: resumo(cobranca) };
    }

    // O gateway respondeu e recusou: a cobrança sai das vivas, e a pessoa
    // pode tentar de novo.
    const tokenInvalido = TOKEN_DE_CARTAO_INVALIDO.has(erro.codigo);
    await this.uow.executar(contexto, (tx) =>
      tx.execute(sql`
        update cobranca
           set situacao = 'recusada', motivo_recusa = ${tokenInvalido ? 'token_invalido' : `erro_${erro.codigo}`},
               atualizado_em = now()
         where id = ${id}`),
    );

    // RN-309: token vencido não é recusa do cartão — a mensagem é outra.
    if (tokenInvalido) {
      throw new ErroDeDominio('TOKEN_EXPIRADO', 'Os dados do cartão expiraram. Preencha o cartão de novo.');
    }

    this.logger.error(`Mercado Pago recusou a criação da cobrança ${id}: ${erro.message}`);
    throw new ErroDeDominio(
      'RECEBIMENTO_INDISPONIVEL',
      'Não foi possível gerar o pagamento agora. Tente de novo em alguns minutos.',
    );
  }
}

/** §3.1 — a forma da resposta, por método. */
function resumo(linha: LinhaCobranca) {
  const base = {
    cobrancaId: linha.id,
    metodo: linha.metodo,
    situacao: linha.situacao,
    valor: Number(linha.valor),
  };

  if (linha.metodo === 'pix') {
    return {
      ...base,
      expiraEm: linha.expira_em ? new Date(linha.expira_em).toISOString() : null,
      pixQrCode: linha.pix_qr_code,
      pixQrCodeBase64: linha.pix_qr_code_base64,
      ticketUrl: linha.link_pagamento,
    };
  }
  return { ...base, parcelas: linha.parcelas };
}

/** O Mercado Pago pede nome e sobrenome separados; o resto do nome vai inteiro
 *  no sobrenome. */
function nomeDoPagador(pagador: { email: string; nomeCompleto: string }) {
  const [nome, ...resto] = pagador.nomeCompleto.trim().split(/\s+/);
  return { email: pagador.email, nome, sobrenome: resto.join(' ') || undefined };
}
