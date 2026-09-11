import type { papelUsuario } from '../db/schema';

/** Os quatro papéis que uma conta grava (RN-017). Derivado do enum do banco,
 *  para não haver segunda lista a manter — `PapelContexto` acrescenta a estes o
 *  `'publico'`, que não é conta e por isso não existe em `papel_usuario`. */
export type PapelConta = (typeof papelUsuario.enumValues)[number];

/** As quatro situações de `usuario.situacao` (RN-018, RN-140). O banco recusa
 *  qualquer outro valor desde a migration 0008. */
export type SituacaoConta = 'convidada' | 'ativa' | 'suspensa' | 'revogada';

/**
 * Uma linha de `usuario`, como `resolver_conta_de_acesso` a devolve — nem mais
 * nem menos. Não traz o e-mail: a função resolve *por* e-mail, então repeti-lo
 * na volta só criaria uma segunda fonte para o mesmo dado.
 */
export interface ContaDeAcesso {
  id: string;
  inquilinoId: string | null;
  centralId: string | null;
  pessoaId: string | null;
  papel: PapelConta;
  situacao: SituacaoConta;
}

/**
 * O que a API aceita ler de um JWT do Supabase Auth: o identificador do
 * usuário no provedor e o e-mail verificado. **Nunca o nome** — a pessoa o
 * edita no provedor à vontade (PRD §8.1, passo 2).
 *
 * `sub` não é usado para resolver a conta (o par é (inquilino, e-mail), RN-017)
 * e existe aqui para o alerta da RN-060t ter um identificador que não seja dado
 * pessoal.
 */
export interface ClaimsAutenticacao {
  sub: string;
  email: string;
}
