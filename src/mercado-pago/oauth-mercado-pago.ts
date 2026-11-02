import { Injectable } from '@nestjs/common';
import { ambiente } from '../config/ambiente';

/**
 * Endereços e campos conferidos na documentação oficial em 01/11/2026
 * (developers/en/docs/security/oauth/creation e /renewal, e a referência de
 * `POST /oauth/token`). A spec manda conferir de novo antes de mexer: é
 * integração externa e muda sem avisar (03-cobranca.md, nota do topo).
 */
const URL_DE_AUTORIZACAO = 'https://auth.mercadopago.com/authorization';
const URL_DO_TOKEN = 'https://api.mercadopago.com/oauth/token';
const TEMPO_LIMITE_MS = 10_000;

export interface TokensMercadoPago {
  accessToken: string;
  /** Rotacionado a cada renovação: o anterior deixa de valer. */
  refreshToken: string;
  /** 180 dias (15552000 s) por padrão. */
  expiraEmSegundos: number;
  escopos: string[];
  /** `user_id` da conta conectada — `conexao_gateway.conta_externa_id`. */
  contaExternaId: string;
}

/** Recusa do Mercado Pago. Só status e código (`invalid_grant`, ...): a
 *  mensagem vai para log, e nada aqui carrega token nem segredo. */
export class ErroNoMercadoPago extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
  ) {
    super(`Mercado Pago respondeu ${status} ${codigo}`);
  }
}

/**
 * O fluxo OAuth com que a denominação autoriza a plataforma a cobrar em nome
 * dela (03-cobranca.md §7.3). Classe injetável, e não funções soltas, para o
 * teste trocá-la por uma falsa — nenhum teste fala com o Mercado Pago.
 */
@Injectable()
export class OAuthMercadoPago {
  configurado(): boolean {
    return Boolean(
      ambiente.MERCADO_PAGO_CLIENT_ID &&
        ambiente.MERCADO_PAGO_CLIENT_SECRET &&
        ambiente.MERCADO_PAGO_REDIRECT_URI,
    );
  }

  /** `state` é o que identifica, na volta, quem pediu a conexão — aleatório e
   *  sem dado nenhum, como a documentação manda. */
  urlDeAutorizacao(state: string): string {
    const url = new URL(URL_DE_AUTORIZACAO);
    url.search = new URLSearchParams({
      client_id: ambiente.MERCADO_PAGO_CLIENT_ID,
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: ambiente.MERCADO_PAGO_REDIRECT_URI,
    }).toString();
    return url.toString();
  }

  /** O `code` vale 10 minutos e uma vez só. */
  trocarCodigo(code: string): Promise<TokensMercadoPago> {
    return this.pedirToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ambiente.MERCADO_PAGO_REDIRECT_URI,
      test_token: String(ambiente.MERCADO_PAGO_TOKEN_DE_TESTE),
    });
  }

  renovar(refreshToken: string): Promise<TokensMercadoPago> {
    return this.pedirToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  private async pedirToken(corpo: Record<string, string>): Promise<TokensMercadoPago> {
    const resposta = await fetch(URL_DO_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: ambiente.MERCADO_PAGO_CLIENT_ID,
        client_secret: ambiente.MERCADO_PAGO_CLIENT_SECRET,
        ...corpo,
      }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    const json = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;

    if (!resposta.ok) {
      throw new ErroNoMercadoPago(resposta.status, String(json.error ?? 'sem_codigo'));
    }

    // Sem refresh token a conexão morre em 180 dias sem aviso: ele só vem com
    // o escopo `offline_access` autorizado, e a renovação diária (RN-122)
    // depende dele. Melhor recusar a conexão agora do que descobrir no dia.
    if (typeof json.access_token !== 'string' || typeof json.refresh_token !== 'string') {
      throw new ErroNoMercadoPago(resposta.status, 'sem_refresh_token');
    }

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiraEmSegundos: Number(json.expires_in),
      escopos: typeof json.scope === 'string' ? json.scope.split(' ') : [],
      contaExternaId: String(json.user_id),
    };
  }
}
