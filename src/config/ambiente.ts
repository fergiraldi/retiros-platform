import 'dotenv/config';
import { z } from 'zod';

const esquema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DB_SCHEMA_ESPERADO: z.string().default('dev'),

  // Host da área do operador (PRD §8.1) — entrada fixa da resolução por host e
  // da lista de CORS, fora dos dois conjuntos dinâmicos de inquilino. Vazio
  // significa "nenhum host de operador reconhecido", que é o correto enquanto
  // a área do operador não existir (item 21).
  HOST_OPERADOR: z.string().default(''),

  // Saltos de proxy confiáveis (`trust proxy` do Express). Sem isto,
  // `req.hostname` ignora X-Forwarded-Host e atrás da Railway a resolução por
  // host receberia o host interno — 404 em tudo. 0 desliga, para o dev local
  // que fala direto com o processo; na Railway é 1.
  PROXIES_CONFIAVEIS: z.coerce.number().int().min(0).default(0),

  // Autenticação (PRD §8.1, passo 2). O JWKS do projeto Supabase é o conjunto
  // de chaves públicas com que a API verifica a assinatura do JWT — assimétrico,
  // então nenhum segredo de assinatura vive aqui nem na Railway, e a rotação de
  // chave do Supabase é acompanhada sozinha pelo cache do `jose`.
  SUPABASE_JWKS_URL: z.string().default(''),

  // Emissor esperado na claim `iss`, comparado como string EXATA. Vai sem barra
  // no fim: o discovery do projeto (/auth/v1/.well-known/openid-configuration)
  // publica `.../auth/v1`, e uma barra a mais recusaria todo token válido, com
  // 401 em tudo e nenhuma pista da causa.
  SUPABASE_JWT_EMISSOR: z.string().default(''),

  // Audiência esperada na claim `aud`. O Supabase Auth emite `authenticated`
  // para sessão de usuário logado.
  SUPABASE_JWT_AUDIENCIA: z.string().default('authenticated'),
})
  // Default vazio mantém a suíte e o CI verdes (não há JWT real ali: o teste
  // injeta o próprio par de chaves). Em produção, vazio é configuração
  // incompleta, e derrubar o boot é a falha ruidosa desejada — o mesmo idioma
  // da trava de `current_schema()` em src/db/pool.provider.ts. O alternativo
  // seria subir e responder 401 em tudo, que se parece com bug de aplicação.
  .superRefine((valores, ctx) => {
    if (valores.NODE_ENV !== 'production') return;

    for (const chave of ['SUPABASE_JWKS_URL', 'SUPABASE_JWT_EMISSOR'] as const) {
      if (valores[chave] === '') {
        ctx.addIssue({
          code: 'custom',
          path: [chave],
          message: `${chave} é obrigatória quando NODE_ENV=production (autenticação, PRD §8.1).`,
        });
      }
    }
  });

export const ambiente = esquema.parse(process.env);
