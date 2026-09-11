import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequisicaoComContexto } from '../contexto/contexto.interceptor';
import type { ContaDeAcesso } from './autenticacao.types';

/**
 * A conta que o `AutenticacaoGuard` resolveu para esta requisição.
 *
 * É por aqui que o item 18 chega ao `auditoria.ator_id` e o item 20 ao papel de
 * quem está agindo — sem passar pelo `contextoAtual()`, que carrega só o que
 * vira GUC. Nunca é `undefined` num handler alcançável: rota sem
 * `@SemAutenticacao()` só executa depois de o guard ter gravado a conta, e rota
 * com o decorator não deveria pedir a conta.
 *
 * @example
 * ```ts
 * @Get()
 * status(@ContaAtual() conta: ContaDeAcesso) { return conta.papel; }
 * ```
 */
export const ContaAtual = createParamDecorator(
  (_dados: unknown, ctx: ExecutionContext): ContaDeAcesso => {
    const req = ctx.switchToHttp().getRequest<RequisicaoComContexto>();

    if (!req.contaAutenticada) {
      // Só acontece com @SemAutenticacao() na mesma rota que pede @ContaAtual()
      // — combinação contraditória, e melhor descoberta como 500 no primeiro
      // teste do que como `undefined` vazando para dentro de uma regra.
      throw new Error(
        '@ContaAtual() em rota sem autenticação: nenhuma conta foi resolvida para esta requisição.',
      );
    }

    return req.contaAutenticada;
  },
);
