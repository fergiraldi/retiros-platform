import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { SemAutenticacao } from '../autenticacao/autenticacao.guard';
import { SemTransacao } from '../contexto/contexto.interceptor';
import type { RequisicaoComContexto } from '../contexto/contexto.interceptor';
import { ZodValidationPipe } from '../validacao/zod-validation.pipe';
import { EncontrosPublicosService } from './encontros-publicos.service';
import { fichaSchema } from './ficha.schema';
import type { Ficha } from './ficha.schema';
import { InscricaoPublicaService } from './inscricao-publica.service';

const filtrosDaAgendaSchema = z.object({
  uf: z.string().trim().toUpperCase().length(2).optional(),
  centralSlug: z.string().max(100).optional(),
  de: z.iso.date().optional(),
  ate: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Área pública da Fase 1 (02-inscricao.md §4.1 a §4.3). O inquilino vem do host
 * e de mais lugar nenhum (RN-059t) — nada aqui aceita `inquilinoId`.
 *
 * `@SemTransacao()` porque cada serviço abre a transação com o contexto que a
 * operação precisa: as leituras cruzam centrais, e a ficha só sabe a central
 * depois de ler o encontro (PRD §8.1). O contexto `publico` do guard não serve a
 * nenhuma das três.
 */
@Controller('api/publico/encontros')
@SemAutenticacao()
@SemTransacao()
export class EncontrosPublicosController {
  constructor(
    private readonly encontros: EncontrosPublicosService,
    private readonly inscricoes: InscricaoPublicaService,
  ) {}

  @Get()
  agenda(
    @Req() req: RequisicaoComContexto,
    @Query(new ZodValidationPipe(filtrosDaAgendaSchema)) filtros: z.infer<typeof filtrosDaAgendaSchema>,
  ) {
    return this.encontros.agenda(inquilinoDaAreaPublica(req), filtros);
  }

  @Get(':centralSlug/:encontroSlug')
  pagina(
    @Req() req: RequisicaoComContexto,
    @Param('centralSlug') centralSlug: string,
    @Param('encontroSlug') encontroSlug: string,
  ) {
    return this.encontros.pagina(inquilinoDaAreaPublica(req), centralSlug, encontroSlug);
  }

  @Post(':encontroId/inscricoes')
  inscrever(
    @Req() req: RequisicaoComContexto,
    @Param('encontroId') encontroId: string,
    @Body(new ZodValidationPipe(fichaSchema)) ficha: Ficha,
  ) {
    const inquilinoId = inquilinoDaAreaPublica(req);
    return this.inscricoes.inscrever(encontroId, ficha, {
      inquilinoId,
      ip: req.ip ?? req.socket.remoteAddress ?? '',
      userAgent: req.get('user-agent') ?? null,
      baseUrl: `${req.protocol}://${req.hostResolvido!.host}`,
    });
  }
}

/**
 * O inquilino do host, se a área pública dele está no ar. `em_implantacao`
 * responde como host desconhecido — "o subdomínio não entra no ar" até a
 * ativação (CA-34) —, e o host do operador não tem área pública.
 */
export function inquilinoDaAreaPublica(req: RequisicaoComContexto): string {
  const host = req.hostResolvido;
  if (!host?.inquilinoId || host.situacao === 'em_implantacao') throw new NotFoundException();
  return host.inquilinoId;
}
