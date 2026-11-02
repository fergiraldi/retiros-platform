import { sql } from 'drizzle-orm';
import { ambiente } from '../config/ambiente';
import type { Tx } from '../db/tipos';

/**
 * RN-104/RN-121 — o cofre de segredos: o Supabase Vault, isolado por ambiente.
 *
 * O Vault é um só para o banco inteiro, e os quatro ambientes são schemas do
 * mesmo banco. Acesso direto da role da aplicação a ele deixaria o `.env` de
 * dev ler o token de produção de uma denominação. Por isso nenhuma `app_*`
 * enxerga o Vault: cada ambiente tem uma role `cofre_<ambiente>`, sem login,
 * dona de três funções `security definer` que prefixam o nome com o ambiente —
 * o dev não tem como pedir um segredo `prod:`. Quem cria isso é
 * `infra/cofre-por-ambiente.sql`, rodado como `postgres`, fora das migrations
 * (a role da aplicação não cria role nem enxerga o Vault).
 *
 * Roda na transação de quem chama: gravar um segredo e a linha que aponta para
 * ele (`conexao_gateway.access_token_ref`) se confirmam ou se desfazem juntos.
 */
function cofre() {
  return sql.identifier(`cofre_${ambiente.DB_SCHEMA_ESPERADO}`);
}

export async function gravarSegredo(tx: Tx, nome: string, valor: string): Promise<void> {
  await tx.execute(sql`select ${cofre()}.gravar(${nome}, ${valor})`);
}

export async function lerSegredo(tx: Tx, nome: string): Promise<string | null> {
  const r = await tx.execute<{ valor: string | null }>(sql`select ${cofre()}.ler(${nome}) as valor`);
  return r.rows[0]?.valor ?? null;
}

export async function apagarSegredo(tx: Tx, nome: string): Promise<void> {
  await tx.execute(sql`select ${cofre()}.apagar(${nome})`);
}
