import 'dotenv/config';
import type { Config } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida (verifique o .env).');
}

export default {
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
  schemaFilter: [process.env.DB_SCHEMA_ESPERADO ?? 'dev'],
  out: './src/db',
} satisfies Config;
