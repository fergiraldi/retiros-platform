import { AsyncLocalStorage } from 'node:async_hooks';
import type { Tx } from '../db/tipos';
import type { ContextoRequisicao } from './contexto.types';

/**
 * AsyncLocalStorage, não provider REQUEST-scoped (RN-054t): um provider
 * scoped contaminaria toda a árvore de DI acima dele, e simplesmente não
 * existe fora do ciclo HTTP — a rotina de renovação de token (RN-122), o
 * processador de webhook e a rotina de retenção (RN-093) precisam do mesmo
 * mecanismo de transação sem requisição HTTP nenhuma por trás.
 */
interface Armazenado {
  tx: Tx;
  contexto: ContextoRequisicao;
}

export const armazenamento = new AsyncLocalStorage<Armazenado>();

export function transacaoAtual(): Tx {
  const entrada = armazenamento.getStore();
  if (!entrada) {
    throw new Error(
      'RN-054t: nenhuma transação ativa. Repositório chamado fora do ' +
        'ContextoInterceptor/UnidadeDeTrabalhoService.executar(...).',
    );
  }
  return entrada.tx;
}

export function contextoAtual(): ContextoRequisicao {
  const entrada = armazenamento.getStore();
  if (!entrada) {
    throw new Error('RN-054t: nenhum contexto de requisição ativo.');
  }
  return entrada.contexto;
}
