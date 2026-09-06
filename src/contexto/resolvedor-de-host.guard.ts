import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ReconhecedorDeHostService } from './reconhecedor-de-host.service';
import type { RequisicaoComContexto } from './contexto.interceptor';

export const SEM_RESOLUCAO_DE_HOST = 'sem_resolucao_de_host';
/**
 * Marca uma rota (ou um controller inteiro) que não é servida por host de
 * inquilino — hoje só o healthcheck, que a Railway chama no host interno e que
 * sem isto passaria a responder 404 assim que o guard virou global.
 */
export const SemResolucaoDeHost = () => SetMetadata(SEM_RESOLUCAO_DE_HOST, true);

/**
 * RN-059t: área pública resolve o inquilino exclusivamente pelo host — nunca
 * por query, header ou corpo, que o cliente escolhe e viraria porta de
 * travessia entre inquilinos. Nunca criar atalho de dev por aqui: o host local
 * é uma linha em `inquilino_dominio` no schema dev, não uma exceção no código.
 *
 * RN-061t: host desconhecido, e encontro/inquilino `encerrado`, devolvem a
 * mesma coisa — 404 neutro, sem distinguir "não existe" de "encerrado". O
 * `EnvelopeDeErroFilter` transforma isto em `{ erro: { codigo:
 * 'NAO_ENCONTRADO' } }`, que não revela que a plataforma é multi-inquilino.
 *
 * Guard, e não middleware, porque é aqui que o `ContextoInterceptor` (RN-054t)
 * espera encontrar `req.contextoRetiros` pronto: no Nest, guard roda antes de
 * interceptor.
 */
@Injectable()
export class ResolvedorDeHostGuard implements CanActivate {
  constructor(
    private readonly reconhecedor: ReconhecedorDeHostService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;

    const isento = this.reflector.getAllAndOverride<boolean>(SEM_RESOLUCAO_DE_HOST, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isento) return true;

    const req = ctx.switchToHttp().getRequest<RequisicaoComContexto>();
    const reconhecido = await this.reconhecedor.reconhecer(req.hostname);

    if (!reconhecido) throw new NotFoundException();

    req.hostResolvido = reconhecido;

    // O host do operador não tem inquilino, e o papel continua nulo: este
    // guard não autentica ninguém. Gravar 'operador' aqui seria escalonamento
    // de privilégio por cabeçalho Host — quem promove o papel é a
    // autenticação, depois de validar o JWT. Com os quatro GUCs vazios a RLS
    // nega tudo (RN-058t), que é a falha fechada desejada.
    req.contextoRetiros =
      reconhecido.tipo === 'operador'
        ? { inquilinoId: null, centralId: null, pessoaId: null, papel: null }
        : {
            inquilinoId: reconhecido.inquilinoId,
            centralId: null,
            pessoaId: null,
            papel: 'publico',
          };

    return true;
  }
}
