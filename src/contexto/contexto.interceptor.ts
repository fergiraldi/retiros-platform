import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { from, lastValueFrom, Observable } from 'rxjs';
import type { ContaDeAcesso } from '../autenticacao/autenticacao.types';
import type { ContextoRequisicao, HostReconhecido } from './contexto.types';
import { UnidadeDeTrabalhoService } from './unidade-de-trabalho.service';

export const SEM_TRANSACAO = 'sem_transacao';
/**
 * Marca uma rota (ou um controller inteiro) que não precisa de contexto de
 * transação — hoje só o healthcheck.
 */
export const SemTransacao = () => SetMetadata(SEM_TRANSACAO, true);

export interface RequisicaoComContexto extends Request {
  contextoRetiros?: ContextoRequisicao;
  /**
   * O que o `ResolvedorDeHostGuard` reconheceu. Separado de `contextoRetiros`
   * de propósito: aquele é o contrato dos quatro GUCs que a transação escreve,
   * e a situação do inquilino não é GUC — é o que as rotas consultam para
   * bloquear inscrição em inquilino `suspenso` (RN-063t) e área pública em
   * `em_implantacao` (CA-34).
   */
  hostResolvido?: HostReconhecido;
  /**
   * A conta que o `AutenticacaoGuard` resolveu, pelo mesmo motivo de
   * `hostResolvido`: nada disto é GUC. `id` é o `auditoria.ator_id` do item 18 e
   * `situacao` já foi conferida pelo guard — quem lê aqui não precisa reconferir.
   * Acesso pelo `@ContaAtual()`, não por `req` direto.
   */
  contaAutenticada?: ContaDeAcesso;
}

/**
 * RN-054t: interceptor, não middleware nem guard. Middleware roda antes dos
 * guards, quando papel/pessoa ainda não foram resolvidos (PRD §8.1, passos
 * 2 a 4 dependem do JWT já validado); guard é autorização pura e não
 * envolve o handler numa transação. Interceptor é o único ponto que roda
 * depois dos guards e em volta do handler inteiro.
 */
@Injectable()
export class ContextoInterceptor implements NestInterceptor {
  constructor(
    private readonly uow: UnidadeDeTrabalhoService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') {
      return next.handle();
    }

    // `getAllAndOverride`, não `get`: o decorator vale tanto no handler quanto
    // no controller inteiro, igual ao `@SemResolucaoDeHost()`. Com `get` no
    // handler, marcar a classe não surtia efeito nenhum, em silêncio.
    const semTransacao = this.reflector.getAllAndOverride<boolean>(SEM_TRANSACAO, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (semTransacao) {
      return next.handle();
    }

    const req = ctx.switchToHttp().getRequest<RequisicaoComContexto>();
    const contexto = req.contextoRetiros ?? {};

    return from(this.uow.executar(contexto, () => lastValueFrom(next.handle())));
  }
}
