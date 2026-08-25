import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../db/schema';
import { POOL } from '../db/db.tokens';
import type { Tx } from '../db/tipos';
import { armazenamento } from './contexto.storage';
import type { ContextoRequisicao } from './contexto.types';

/**
 * O núcleo de segurança do produto: RN-053t (SET LOCAL, nunca SET),
 * RN-054t (contexto aplicado num único lugar, transação aberta antes de
 * qualquer repositório rodar) e RN-055t (discard all ao devolver a conexão).
 */
@Injectable()
export class UnidadeDeTrabalhoService {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async executar<T>(contexto: ContextoRequisicao, trabalho: (tx: Tx) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      const db = drizzle(cliente, { schema });

      return await db.transaction(async (tx) => {
        // set_config(nome, valor, true) É o SET LOCAL com bind parameter —
        // "SET LOCAL app.x = $1" não é SQL válido, e interpolar o uuid no
        // texto da query seria injeção no ponto mais crítico do sistema.
        // String vazia (não null) pra valor ausente, casando com o
        // nullif(current_setting(...,true), '') das funções app_*() (RN-058t).
        await tx.execute(sql`
          select
            set_config('app.inquilino_id', ${contexto.inquilinoId ?? ''}, true),
            set_config('app.central_id',   ${contexto.centralId ?? ''}, true),
            set_config('app.pessoa_id',    ${contexto.pessoaId ?? ''}, true),
            set_config('app.papel',        ${contexto.papel ?? ''}, true)
        `);

        return armazenamento.run({ tx, contexto }, () => trabalho(tx));
      });
    } finally {
      // RN-055t: cinto e suspensório sobre RN-053t. DISCARD ALL não roda
      // dentro de bloco de transação — por isso pool.connect() explícito em
      // vez de db.transaction() direto sobre o Pool, que não dá acesso ao
      // PoolClient depois do commit/rollback.
      try {
        await cliente.query('discard all');
      } catch {
        // conexão pode ter caído — nada a fazer além de liberar abaixo.
      }
      cliente.release();
    }
  }

  /**
   * Mesmo mecanismo com os quatro GUCs vazios — RLS nega tudo por padrão
   * (RN-058t), e só funções security definer (resolver_identidade,
   * resolver_inquilino_por_host) respondem. É por aqui que o resolvedor de
   * host e o processador de webhook trabalham, antes de existir qualquer
   * contexto de inquilino.
   */
  executarSemContexto<T>(trabalho: (tx: Tx) => Promise<T>): Promise<T> {
    return this.executar({}, trabalho);
  }
}
