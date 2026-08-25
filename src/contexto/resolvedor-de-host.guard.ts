import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { UnidadeDeTrabalhoService } from './unidade-de-trabalho.service';
import type { RequisicaoComContexto } from './contexto.interceptor';

type LinhaResolucao = Record<string, unknown> & {
  inquilino_id: string;
  situacao: string;
};

/**
 * RN-059t: área pública resolve o inquilino exclusivamente pelo host — nunca
 * por query, header ou corpo, que o cliente escolhe e viraria porta de
 * travessia entre inquilinos. Nunca criar atalho de dev por aqui.
 *
 * RN-061t: host desconhecido, e encontro/inquilino `encerrado`, devolvem a
 * mesma coisa — 404 neutro, sem distinguir "não existe" de "encerrado".
 */
@Injectable()
export class ResolvedorDeHostGuard implements CanActivate {
  constructor(private readonly uow: UnidadeDeTrabalhoService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequisicaoComContexto>();
    const host = req.hostname;

    const resultado = await this.uow.executarSemContexto(async (tx) => {
      const r = await tx.execute<LinhaResolucao>(
        sql`select * from resolver_inquilino_por_host(${host})`,
      );
      return r.rows[0];
    });

    if (!resultado || resultado.situacao === 'encerrado') {
      throw new NotFoundException();
    }

    req.contextoRetiros = {
      inquilinoId: resultado.inquilino_id,
      centralId: null,
      pessoaId: null,
      papel: 'publico',
    };
    return true;
  }
}
