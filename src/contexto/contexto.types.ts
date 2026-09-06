import type { situacaoInquilino } from '../db/schema';

// Os quatro papéis de conta (RN-017) mais 'publico' — o valor que a área
// pública grava no contexto de transação quando não há sessão nenhuma
// (PRD §8.1, "O mesmo contexto, sem sessão do Supabase Auth").
export type PapelContexto = 'servo' | 'admin_central' | 'admin_denominacao' | 'operador' | 'publico';

export interface ContextoRequisicao {
  inquilinoId?: string | null;
  centralId?: string | null;
  pessoaId?: string | null;
  papel?: PapelContexto | null;
}

/** Derivado do enum do banco: `db:pull` que mude a situação quebra aqui. */
export type SituacaoInquilino = (typeof situacaoInquilino.enumValues)[number];

/**
 * Os hosts que a plataforma reconhece (RN-061t, PRD §8.1 "Host do operador"):
 * `inquilino` cobre os dois conjuntos dinâmicos — subdomínio do curinga e
 * domínio próprio verificado, ambos linhas de `inquilino_dominio` — e
 * `operador` é a entrada fixa, que não pertence a inquilino nenhum.
 */
export type TipoHost = 'inquilino' | 'operador';

export interface HostReconhecido {
  /** Host normalizado (minúsculas, sem porta, sem ponto final de FQDN). */
  host: string;
  tipo: TipoHost;
  /** Sempre nulo no host do operador — RN-004/RN-017. */
  inquilinoId: string | null;
  /** Sempre nula no host do operador. */
  situacao: SituacaoInquilino | null;
}
