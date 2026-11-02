import { sql } from 'drizzle-orm';
import type { Tx } from '../db/tipos';
import { uuidV7 } from '../db/uuid-v7';

/**
 * RN-032/RN-051 — o pagamento foi aprovado: a cobrança fica `paga` e a
 * inscrição `confirmada`.
 *
 * É **a** função de confirmação: o cartão aprovado já na criação a chama
 * (03-cobranca.md §4, "a mesma função chamada de outro lugar"), e o webhook do
 * item 12 vai chamá-la também. Idempotente: cobrança que já saiu das situações
 * vivas não muda, e a notificação tem chave única (RN-136).
 *
 * Inscrição que já não está `pendente_pagamento` (cancelada, devolvida à fila)
 * **não é ressuscitada** (RN-208): a cobrança fica paga e o caso vira devolução
 * pendente — que é do item 12, junto com o resto do pagamento tardio.
 */
export async function registrarPagamentoAprovado(
  tx: Tx,
  cobrancaId: string,
  ator: 'sistema' | 'webhook',
): Promise<void> {
  const paga = await tx.execute<{ inscricao_id: string; inquilino_id: string; central_id: string }>(sql`
    update cobranca
       set situacao = 'paga', pago_em = coalesce(pago_em, now()), atualizado_em = now()
     where id = ${cobrancaId} and situacao in ('criada', 'aguardando_pagamento', 'em_analise')
     returning inscricao_id, inquilino_id, central_id`);
  const cobranca = paga.rows[0];
  if (!cobranca) return;

  const confirmada = await tx.execute<{ id: string; pessoa_id: string; email: string }>(sql`
    update inscricao i
       set situacao = 'confirmada', atualizado_em = now()
      from pessoa p
     where i.id = ${cobranca.inscricao_id} and i.situacao = 'pendente_pagamento' and p.id = i.pessoa_id
     returning i.id, i.pessoa_id, p.email`);
  const inscricao = confirmada.rows[0];

  if (inscricao) {
    await tx.execute(sql`
      insert into notificacao (id, inquilino_id, central_id, inscricao_id, pessoa_id, gatilho, canal, destinatario, chave_unica)
      values (${uuidV7()}, ${cobranca.inquilino_id}, ${cobranca.central_id}, ${inscricao.id}, ${inscricao.pessoa_id},
              'pagamento_aprovado', 'email', ${inscricao.email},
              ${`pagamento_aprovado:${inscricao.id}:${cobrancaId}`})
      on conflict (chave_unica) do nothing`);
  }

  // RN-320: toda operação de cobrança é auditada, com ator.
  await tx.execute(sql`
    insert into auditoria (id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo, depois)
    values (${uuidV7()}, ${cobranca.inquilino_id}, ${cobranca.central_id}, 'cobranca', ${cobrancaId}, 'paga', ${ator},
            ${JSON.stringify({ situacao: 'paga', inscricaoConfirmada: Boolean(inscricao) })}::jsonb)`);
}
