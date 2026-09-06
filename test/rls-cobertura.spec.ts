import type { Pool, PoolClient } from 'pg';
import { pool } from '../src/db/conexao';

/**
 * RN-141: existe teste automatizado que enumera as tabelas de domínio e falha
 * se alguma estiver sem `enable row level security` E `force row level security`.
 *
 * Exceções declaradas na spec (00-multi-inquilino.md §5 / RN-067t, RN-124, RN-135):
 * - identidade: global, fora do isolamento por inquilino. A spec manda RN-124 tirar o
 *   `select` da role de aplicação, mas isso ainda NÃO vale: as roles `app_api`/`app_publico`
 *   nunca foram criadas e a role de runtime, que é dona das tabelas, lê `identidade` direto
 *   (conferido no banco em 06/09/2026 — ver "RN-124 e RN-138 são letra morta" em
 *   docs/pendencias-tecnicas.md). Não confunda o que a spec pede com o que o banco faz.
 * - webhook_evento: nasce antes de sabermos de quem é o evento; acesso só do processador.
 */
const EXCECOES_DECLARADAS = ['identidade', 'webhook_evento'];

interface LinhaTabela {
  relname: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
}

async function tabelasDeDominio(executor: Pool | PoolClient): Promise<LinhaTabela[]> {
  const { rows } = await executor.query<LinhaTabela>(`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = current_schema()
      and c.relkind = 'r'
      and c.relname not in ('_migracoes')
    order by c.relname
  `);
  return rows;
}

function semRlsCompleta(tabelas: LinhaTabela[]): LinhaTabela[] {
  return tabelas.filter(
    (t) =>
      !EXCECOES_DECLARADAS.includes(t.relname) &&
      !(t.relrowsecurity && t.relforcerowsecurity),
  );
}

describe('RN-141 — cobertura de RLS', () => {
  it('toda tabela de domínio tem enable + force row level security, exceto as exceções declaradas', async () => {
    const tabelas = await tabelasDeDominio(pool);
    const violacoes = semRlsCompleta(tabelas);

    if (violacoes.length > 0) {
      const detalhe = violacoes
        .map((v) => `${v.relname} (rowsecurity=${v.relrowsecurity}, force=${v.relforcerowsecurity})`)
        .join(', ');
      throw new Error(`Tabela(s) sem RLS completo: ${detalhe}`);
    }

    expect(violacoes).toEqual([]);
  });

  it('as exceções declaradas continuam sendo exatamente identidade e webhook_evento', () => {
    // Hard-coded de propósito: ninguém deve conseguir "consertar" o teste acima
    // movendo uma tabela pra cá sem que o diff do PR mostre isso claramente.
    expect(EXCECOES_DECLARADAS.sort()).toEqual(['identidade', 'webhook_evento'].sort());
  });

  it('meta-teste: o teste acima sabe reprovar quando uma tabela real está sem RLS', async () => {
    const cliente = await pool.connect();
    try {
      await cliente.query('begin');
      await cliente.query('create table rn141_teste_meta (id int primary key)');

      const tabelas = await tabelasDeDominio(cliente);
      const violacoes = semRlsCompleta(tabelas);

      expect(violacoes.map((v) => v.relname)).toContain('rn141_teste_meta');
    } finally {
      await cliente.query('rollback');
      cliente.release();
    }
  });
});
