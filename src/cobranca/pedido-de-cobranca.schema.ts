import { z } from 'zod';
import { cpfSchema } from '../validacao/cpf';

/**
 * Corpo de `POST /api/publico/inscricoes/:token/cobrancas` (03-cobranca.md §3.1).
 * Do cartão chega só o token do SDK do front: número, validade e código de
 * segurança nunca passam pela API (RN-042).
 */
export const pedidoDeCobrancaSchema = z.discriminatedUnion('metodo', [
  z.object({ metodo: z.literal('pix') }),
  z.object({
    metodo: z.literal('cartao_credito'),
    token: z.string().min(1).max(200),
    paymentMethodId: z.string().min(1).max(50),
    issuerId: z.string().max(50).nullish(),
    parcelas: z.number().int().min(1).max(12),
    // RN-308: sem ele a taxa de aprovação cai.
    deviceId: z.string().max(500).nullish(),
    pagador: z.object({
      email: z.email().max(200),
      identificacao: z.object({ tipo: z.literal('CPF'), numero: cpfSchema }),
    }),
  }),
]);

export type PedidoDeCobranca = z.infer<typeof pedidoDeCobrancaSchema>;
