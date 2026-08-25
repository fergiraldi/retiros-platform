import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { ambiente } from '../src/config/ambiente';
import { UnidadeDeTrabalhoService } from '../src/contexto/unidade-de-trabalho.service';

async function lerInquilinoIdDaSessao(tx: Parameters<Parameters<UnidadeDeTrabalhoService['executar']>[1]>[0]) {
  const r = await tx.execute<{ v: string }>(sql`select current_setting('app.inquilino_id', true) as v`);
  return r.rows[0]?.v;
}

describe('Contexto de transação (RN-053t a RN-055t)', () => {
  // max: 1 força a mesma conexão física entre chamadas — é o cenário que
  // prova (ou desmente) o vazamento de contexto entre requisições (CA-24b).
  const pool = new Pool({ connectionString: ambiente.DATABASE_URL, max: 1 });
  const uow = new UnidadeDeTrabalhoService(pool);

  afterAll(async () => {
    await pool.end();
  });

  it('SET LOCAL aplica o contexto dentro da transação', async () => {
    const valor = await uow.executar(
      { inquilinoId: '11111111-1111-1111-1111-111111111111' },
      lerInquilinoIdDaSessao,
    );
    expect(valor).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('o contexto NÃO sobrevive entre duas chamadas na mesma conexão física (RN-055t)', async () => {
    await uow.executar({ inquilinoId: '22222222-2222-2222-2222-222222222222' }, async () => undefined);

    const valorDepois = await uow.executar({}, lerInquilinoIdDaSessao);
    expect(valorDepois).toBe('');
  });

  it('contexto de uma transação que lança erro não sobrevive à próxima (discard all limpa mesmo em rollback)', async () => {
    await expect(
      uow.executar({ inquilinoId: '33333333-3333-3333-3333-333333333333' }, async () => {
        throw new Error('falha proposital');
      }),
    ).rejects.toThrow('falha proposital');

    const valorDepois = await uow.executar({}, lerInquilinoIdDaSessao);
    expect(valorDepois).toBe('');
  });
});
