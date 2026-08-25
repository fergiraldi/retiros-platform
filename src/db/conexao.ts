import 'dotenv/config';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida (verifique o .env).');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export const SCHEMA_ESPERADO = process.env.DB_SCHEMA_ESPERADO ?? 'dev';
