import 'dotenv/config';
import { z } from 'zod';

const esquema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DB_SCHEMA_ESPERADO: z.string().default('dev'),
});

export const ambiente = esquema.parse(process.env);
