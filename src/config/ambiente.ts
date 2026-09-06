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
});

export const ambiente = esquema.parse(process.env);
