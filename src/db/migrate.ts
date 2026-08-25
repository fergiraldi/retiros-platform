import { readMigrationFiles } from 'drizzle-orm/migrator';
import { pool, SCHEMA_ESPERADO } from './conexao';

const PASTA_MIGRATIONS = './migrations';

async function main() {
  const cliente = await pool.connect();
  try {
    const { rows } = await cliente.query(
      'select current_schema() as schema, current_user as usuario',
    );
    console.log(`Aplicando migrations em "${rows[0].schema}" como "${rows[0].usuario}"`);

    if (rows[0].schema !== SCHEMA_ESPERADO) {
      throw new Error(
        `current_schema() = "${rows[0].schema}", esperado "${SCHEMA_ESPERADO}". Abortando.`,
      );
    }

    await cliente.query(`
      create table if not exists _migracoes (
        id serial primary key,
        hash text not null unique,
        criado_em bigint not null,
        aplicado_em timestamptz not null default now()
      )
    `);

    const aplicadas = new Set(
      (await cliente.query('select hash from _migracoes')).rows.map((r) => r.hash),
    );

    const migrations = readMigrationFiles({ migrationsFolder: PASTA_MIGRATIONS });
    let aplicouAlguma = false;

    for (const migration of migrations) {
      if (aplicadas.has(migration.hash)) continue;

      aplicouAlguma = true;
      console.log(`Aplicando ${migration.hash.slice(0, 8)}...`);

      await cliente.query('begin');
      try {
        for (const trecho of migration.sql) {
          const sql = trecho.trim();
          if (sql.length === 0) continue;
          await cliente.query(sql);
        }
        await cliente.query('insert into _migracoes (hash, criado_em) values ($1, $2)', [
          migration.hash,
          migration.folderMillis,
        ]);
        await cliente.query('commit');
      } catch (err) {
        await cliente.query('rollback');
        throw err;
      }
    }

    console.log(aplicouAlguma ? 'Migrations aplicadas.' : 'Nada para aplicar.');
  } finally {
    cliente.release();
  }
}

main()
  .catch((err) => {
    console.error('migrate FALHOU:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
