/**
 * RN-311 — o `status_detail` da recusa em linguagem de quem está pagando.
 * Código cru do gateway nunca vai para a tela. Lista e sentido conferidos na
 * documentação oficial ("collection-results") em 01/11/2026.
 */
const MOTIVOS: Record<string, string> = {
  cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente.',
  insufficient_amount: 'Saldo ou limite insuficiente.',
  cc_rejected_bad_filled_security_code: 'Código de segurança incorreto.',
  cc_rejected_bad_filled_date: 'Data de validade incorreta.',
  cc_rejected_bad_filled_card_number: 'Número do cartão incorreto.',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
  cc_rejected_call_for_authorize: 'O banco pede que você autorize este pagamento. Ligue para o seu banco e tente de novo.',
  cc_rejected_card_disabled: 'O cartão está bloqueado ou inativo. Ligue para o seu banco para ativá-lo.',
  cc_rejected_duplicated_payment: 'Já existe um pagamento com esse valor neste cartão.',
  cc_rejected_invalid_installments: 'Este cartão não aceita esse número de parcelas.',
  cc_rejected_max_attempts: 'Você atingiu o limite de tentativas com este cartão. Use outro cartão ou pague com Pix.',
  cc_rejected_card_type_not_allowed: 'O cartão não tem a função crédito habilitada.',
  cc_rejected_3ds_mandatory: 'O banco exige uma confirmação adicional que não foi concluída. Tente de novo.',
};

const PADRAO = 'O pagamento não foi aprovado. Tente outro cartão ou pague com Pix.';

/** Alto risco, lista restrita, erro do banco e afins caem no texto padrão: o
 *  motivo real não ajuda quem paga, e às vezes não deve ser dito. */
export function traduzirMotivoDeRecusa(statusDetalhe: string): string {
  return MOTIVOS[statusDetalhe] ?? PADRAO;
}
