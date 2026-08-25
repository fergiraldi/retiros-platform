import { pool, SCHEMA_ESPERADO } from './conexao';

async function main() {
  const info = await pool.query(`
    select
      current_user,
      current_schema() as schema,
      current_setting('search_path') as search_path,
      version(),
      has_database_privilege(current_user, current_database(), 'CREATE') as pode_criar_schema,
      has_schema_privilege(current_user, current_schema(), 'CREATE') as pode_criar_objeto
  `);
  const linha = info.rows[0];

  const extensoes = await pool.query(`
    select e.extname, n.nspname
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    order by e.extname
  `);

  const funcoesRelevantes = await pool.query(`
    select proname, pronamespace::regnamespace as schema
    from pg_proc
    where proname in ('digest', 'gen_random_uuid', 'sha256')
    order by proname
  `);

  console.log('--- doctor ---');
  console.log('current_user:', linha.current_user);
  console.log('schema atual:', linha.schema, '(esperado:', SCHEMA_ESPERADO + ')');
  console.log('search_path:', linha.search_path);
  console.log('postgres:', linha.version.split(',')[0]);
  console.log('pode criar schema no database:', linha.pode_criar_schema, '(esperado: false — achado 1)');
  console.log('pode criar objeto no schema atual:', linha.pode_criar_objeto, '(esperado: true)');
  console.log('extensões instaladas:', extensoes.rows.map((r) => `${r.extname}@${r.nspname}`));
  console.log(
    'funções disponíveis:',
    funcoesRelevantes.rows.map((r) => `${r.proname}@${r.schema}`),
  );

  const temPgcrypto = extensoes.rows.some((r) => r.extname === 'pgcrypto');
  const digestFn = funcoesRelevantes.rows.find((r) => r.proname === 'digest');
  console.log('---');
  if (temPgcrypto && digestFn) {
    console.log(
      `achado 2: pgcrypto presente em "${digestFn.schema}" — resolver_identidade precisa de ` +
        `"set search_path = ${linha.schema}, public, ${digestFn.schema}" na função (ou trocar por sha256(convert_to(...))).`,
    );
  } else {
    console.log('achado 2: pgcrypto/digest não encontrado — usar sha256(convert_to(p_cpf,\'UTF8\')) na resolver_identidade.');
  }

  if (linha.schema !== SCHEMA_ESPERADO) {
    throw new Error(`current_schema() = "${linha.schema}", esperado "${SCHEMA_ESPERADO}".`);
  }
  if (linha.pode_criar_schema) {
    console.warn(
      'ATENÇÃO: a role tem CREATE no database — diferente do esperado (achado 1 assumia false). ' +
        'Revisar se o migrator embutido do Drizzle passa a ser viável.',
    );
  }
  if (!linha.pode_criar_objeto) {
    throw new Error('A role não consegue criar objetos no próprio schema — migrations vão falhar.');
  }

  console.log('--- doctor OK ---');
}

main()
  .catch((err) => {
    console.error('doctor FALHOU:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
