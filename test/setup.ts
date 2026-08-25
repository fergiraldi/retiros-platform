import { pool, SCHEMA_ESPERADO } from '../src/db/conexao';

// Trava de segurança: a suíte cria, altera e apaga dados/objetos de verdade.
// Nunca pode rodar contra hom/prod por causa de um .env trocado.
beforeAll(async () => {
  const { rows } = await pool.query('select current_schema() as schema, current_user as usuario');
  const schema = rows[0].schema;
  const usuario = rows[0].usuario;

  if (schema !== SCHEMA_ESPERADO) {
    throw new Error(
      `Suíte de testes abortada: current_schema() = "${schema}", esperado "${SCHEMA_ESPERADO}". ` +
        'Nunca rode os testes de integração contra hom/prod.',
    );
  }
  if (!usuario.startsWith('app_')) {
    throw new Error(
      `Suíte de testes abortada: current_user = "${usuario}", esperado uma role "app_*" sem privilégio de superusuário.`,
    );
  }
});

afterAll(async () => {
  await pool.end();
});
