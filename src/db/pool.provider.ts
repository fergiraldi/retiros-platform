import { Logger, Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { ambiente } from '../config/ambiente';
import { POOL } from './db.tokens';

export const poolProvider: Provider = {
  provide: POOL,
  useFactory: async (): Promise<Pool> => {
    const pool = new Pool({
      connectionString: ambiente.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });

    // Assert de sanidade no boot: nunca subir apontando pro schema errado
    // por um .env trocado (hom/prod nunca podem ser alcançados por engano).
    const { rows } = await pool.query('select current_schema() as schema');
    if (rows[0].schema !== ambiente.DB_SCHEMA_ESPERADO) {
      throw new Error(
        `Assert de schema falhou no boot: current_schema() = "${rows[0].schema}", ` +
          `esperado "${ambiente.DB_SCHEMA_ESPERADO}".`,
      );
    }

    Logger.log(`Conectado ao schema "${rows[0].schema}".`, 'PoolProvider');
    return pool;
  },
};
