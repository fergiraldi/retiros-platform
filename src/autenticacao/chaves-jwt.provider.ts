import { Logger, Provider } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { ambiente } from '../config/ambiente';

export const CHAVES_JWT = Symbol('CHAVES_JWT');

/**
 * O conjunto de chaves públicas com que o JWT é verificado, atrás de um token
 * de injeção (idioma do `POOL` em src/db/db.tokens.ts).
 *
 * Duas razões para não chamar `createRemoteJWKSet` dentro do verificador:
 *
 * 1. É o que deixa o teste injetar um par de chaves local e assinar os próprios
 *    tokens, sem rede e sem depender do projeto Supabase estar de pé.
 * 2. `createRemoteJWKSet` mantém cache e cuida sozinho da rotação de chave do
 *    Supabase — precisa ser uma instância só, viva o processo inteiro, não uma
 *    por requisição.
 */
export const chavesJwtProvider: Provider = {
  provide: CHAVES_JWT,
  useFactory: (): JWTVerifyGetKey => {
    if (ambiente.SUPABASE_JWKS_URL === '') {
      // Só alcançável fora de produção — lá o esquema de ambiente já derrubou o
      // boot. Falha fechada, e com mensagem que diz o que fazer: um resolvedor
      // que devolvesse chave nenhuma faria todo token virar 401, e o motivo
      // (env não configurada) não apareceria em lugar nenhum.
      new Logger('ChavesJwt').warn(
        'SUPABASE_JWKS_URL vazia: nenhuma rota autenticada vai funcionar. Ver .env.example.',
      );

      return () => {
        throw new Error(
          'Autenticação não configurada: defina SUPABASE_JWKS_URL e SUPABASE_JWT_EMISSOR.',
        );
      };
    }

    return createRemoteJWKSet(new URL(ambiente.SUPABASE_JWKS_URL));
  },
};
