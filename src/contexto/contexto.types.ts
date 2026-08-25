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
