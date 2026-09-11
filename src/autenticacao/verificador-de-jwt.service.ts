import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify } from 'jose';
import type { JWTPayload, JWTVerifyGetKey } from 'jose';
import { ambiente } from '../config/ambiente';
import { CHAVES_JWT } from './chaves-jwt.provider';
import type { ClaimsAutenticacao } from './autenticacao.types';

/**
 * Algoritmos aceitos. O JWKS do projeto tem uma chave ES256; RS256 fica junto
 * para uma rotação para RSA não exigir deploy. `HS256` está fora de propósito:
 * é simétrico, e aceitá-lo ao lado de chave pública é o caminho clássico da
 * confusão de algoritmo, em que a chave de verificação passa a servir de chave
 * de assinatura.
 */
const ALGORITMOS = ['ES256', 'RS256'];

/** Cinco segundos de folga para relógio do servidor fora de sincronia — sem
 *  isto um token recém-emitido pode ser recusado por `nbf`/`iat` no futuro. */
const TOLERANCIA_DE_RELOGIO_S = 5;

/**
 * PRD §8.1, passo 2: valida assinatura, emissor e expiração do JWT do Supabase
 * Auth e lê o e-mail verificado.
 *
 * Lança `Error` e não `HttpException`: quem traduz para 401 é o guard. Aqui só
 * se sabe de JWT, e a mensagem existe para o log — nunca para a resposta, que
 * não deve dizer ao cliente qual das validações reprovou.
 */
@Injectable()
export class VerificadorDeJwtService {
  constructor(@Inject(CHAVES_JWT) private readonly chaves: JWTVerifyGetKey) {}

  async verificar(token: string): Promise<ClaimsAutenticacao> {
    // Falha fechada, e não é zelo: com `issuer: ''` o `jwtVerify` **ignora a
    // validação de emissor em silêncio** — string vazia é falsy para ele —, e
    // passaria a aceitar token de qualquer projeto Supabase. Em produção o
    // esquema de ambiente já barra o vazio no boot; isto cobre o caso de a
    // chave existir e o emissor não, que nenhuma outra camada pega.
    if (ambiente.SUPABASE_JWT_EMISSOR === '' || ambiente.SUPABASE_JWT_AUDIENCIA === '') {
      throw new Error(
        'Autenticação não configurada: defina SUPABASE_JWT_EMISSOR e SUPABASE_JWT_AUDIENCIA.',
      );
    }

    const { payload } = await jwtVerify(token, this.chaves, {
      issuer: ambiente.SUPABASE_JWT_EMISSOR,
      audience: ambiente.SUPABASE_JWT_AUDIENCIA,
      algorithms: ALGORITMOS,
      clockTolerance: TOLERANCIA_DE_RELOGIO_S,
    });

    // Sessão anônima do Supabase: JWT válido, assinado pelo mesmo projeto, sem
    // pessoa nenhuma atrás. Sem esta recusa, um `signInAnonymously()` no front
    // chegaria aqui com token que passa em tudo e e-mail vazio.
    if (payload.is_anonymous === true) {
      throw new Error('JWT de sessão anônima não autentica conta.');
    }

    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw new Error('JWT sem `sub`.');
    }

    // O e-mail é a chave que resolve a conta (RN-017). Sem ele não há o que
    // resolver, e cair em outra claim seria inventar identidade.
    if (typeof payload.email !== 'string' || payload.email === '') {
      throw new Error('JWT sem a claim `email`.');
    }

    if (this.emailNaoConfirmado(payload)) {
      throw new Error('JWT com e-mail não confirmado no provedor.');
    }

    return { sub: payload.sub, email: payload.email };
  }

  /**
   * O Supabase publica a confirmação em `user_metadata.email_verified`, e a
   * claim **não é garantida** — projeto antigo, ou login por provedor que não
   * a devolve, chega aqui sem ela.
   *
   * Por isso a pergunta é "está explicitamente `false`?", e não "é `true`?":
   * exigir `true` recusaria conta legítima de projeto que nunca gravou a
   * claim. A contrapartida é que a garantia real de e-mail confirmado passa a
   * ser a configuração de Auth do projeto Supabase, não este código — está
   * registrado em docs/pendencias-tecnicas.md.
   */
  private emailNaoConfirmado(payload: JWTPayload): boolean {
    const metadados = payload.user_metadata;

    if (typeof metadados !== 'object' || metadados === null) return false;

    return (metadados as Record<string, unknown>).email_verified === false;
  }
}
