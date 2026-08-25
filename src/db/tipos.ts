import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

export type Banco = NodePgDatabase<typeof schema>;

// Extrai o tipo do parâmetro que db.transaction(async (tx) => ...) recebe,
// direto da própria tipagem do drizzle — evita depender de um nome de tipo
// interno que pode mudar de versão pra versão.
export type Tx = Parameters<Parameters<Banco['transaction']>[0]>[0];
