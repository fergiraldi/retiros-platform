import { Injectable } from '@nestjs/common';
import { ErroNoMercadoPago } from './oauth-mercado-pago';

/**
 * API de Payments do Checkout Transparente — conferida na documentação oficial
 * em 01/11/2026 (create-payment, integrate-pix, integrate-via-cardform,
 * improve-payment-approval, integrate-marketplace). O painel a marca como "será
 * descontinuada", e a substituta (Orders) não tem `application_fee`: o risco e
 * o plano estão em docs/proximos-passos.md. Por isso tudo que fala com ela
 * mora aqui, e só aqui.
 */
const URL_DE_PAGAMENTOS = 'https://api.mercadopago.com/v1/payments';
const TEMPO_LIMITE_MS = 15_000;

export interface PedidoDePagamento {
  /** Reais, decimal (`transaction_amount`). */
  valor: number;
  /** A taxa da plataforma, retida no split (`application_fee`, RN-321). */
  taxaDaPlataforma: number;
  descricao: string;
  /** O id da nossa cobrança — o que liga o pagamento a ela na conciliação. */
  referenciaExterna: string;
  pagador: {
    email: string;
    nome?: string;
    sobrenome?: string;
    identificacao?: { tipo: string; numero: string };
  };
  pix?: { expiraEm: Date };
  cartao?: { token: string; meioDePagamento: string; emissor?: string | null; parcelas: number };
}

export interface PagamentoCriado {
  id: string;
  status: string;
  statusDetalhe: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  ticketUrl?: string;
  bandeira?: string;
  ultimosQuatro?: string;
  parcelas?: number;
  valorParcela?: number;
}

/**
 * Sem resposta definitiva — timeout, rede ou 5xx. Não se sabe se o pagamento
 * nasceu: quem resolve é a mesma `X-Idempotency-Key`, nunca um pagamento novo
 * (RN-302, RN-143).
 */
export class GatewaySemResposta extends Error {}

@Injectable()
export class PagamentosMercadoPago {
  /**
   * Cria o pagamento **com o token da denominação** (marketplace): é o que faz
   * o dinheiro cair na conta dela, e não na da plataforma (RN-082t). `deviceId`
   * é o do script de segurança do front (RN-308).
   */
  async criar(
    accessToken: string,
    pedido: PedidoDePagamento,
    opcoes: { idempotencyKey: string; deviceId?: string | null },
  ): Promise<PagamentoCriado> {
    const corpo = {
      transaction_amount: pedido.valor,
      application_fee: pedido.taxaDaPlataforma,
      description: pedido.descricao,
      external_reference: pedido.referenciaExterna,
      payment_method_id: pedido.pix ? 'pix' : pedido.cartao!.meioDePagamento,
      ...(pedido.pix && { date_of_expiration: emHorarioDeBrasilia(pedido.pix.expiraEm) }),
      ...(pedido.cartao && {
        token: pedido.cartao.token,
        installments: pedido.cartao.parcelas,
        ...(pedido.cartao.emissor && { issuer_id: Number(pedido.cartao.emissor) }),
      }),
      payer: {
        email: pedido.pagador.email,
        first_name: pedido.pagador.nome,
        last_name: pedido.pagador.sobrenome,
        ...(pedido.pagador.identificacao && {
          identification: {
            type: pedido.pagador.identificacao.tipo,
            number: pedido.pagador.identificacao.numero,
          },
        }),
      },
    };

    let resposta: Response;
    try {
      resposta = await fetch(URL_DE_PAGAMENTOS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': opcoes.idempotencyKey,
          ...(opcoes.deviceId && { 'X-meli-session-id': opcoes.deviceId }),
        },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      });
    } catch (erro) {
      throw new GatewaySemResposta(erro instanceof Error ? erro.message : String(erro));
    }

    const json = (await resposta.json().catch(() => ({}))) as Record<string, any>;

    if (resposta.status >= 500) throw new GatewaySemResposta(`Mercado Pago respondeu ${resposta.status}`);
    if (!resposta.ok) {
      // O código útil vem em `cause[].code` (2006, 3003...): é ele que separa
      // token de cartão inválido de qualquer outra recusa da requisição.
      const causa = Array.isArray(json.cause) ? json.cause[0]?.code : undefined;
      throw new ErroNoMercadoPago(resposta.status, String(causa ?? json.error ?? 'sem_codigo'));
    }

    const transacao = json.point_of_interaction?.transaction_data;
    return {
      id: String(json.id),
      status: String(json.status),
      statusDetalhe: String(json.status_detail ?? ''),
      pixQrCode: transacao?.qr_code,
      pixQrCodeBase64: transacao?.qr_code_base64,
      ticketUrl: transacao?.ticket_url,
      bandeira: pedido.cartao ? json.payment_method_id : undefined,
      ultimosQuatro: json.card?.last_four_digits,
      parcelas: json.installments,
      valorParcela: json.transaction_details?.installment_amount,
    };
  }
}

/**
 * `date_of_expiration` no formato da documentação (`yyyy-MM-dd'T'HH:mm:ss.SSS-03:00`).
 *
 * ponytail: -03:00 fixo — o Brasil não tem horário de verão desde 2019. Se
 * voltar a ter, trocar por formatação com fuso `America/Sao_Paulo`.
 */
function emHorarioDeBrasilia(instante: Date): string {
  return new Date(instante.getTime() - 3 * 3_600_000).toISOString().replace('Z', '-03:00');
}
