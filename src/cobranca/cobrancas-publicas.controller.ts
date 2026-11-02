import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SemAutenticacao } from '../autenticacao/autenticacao.guard';
import { SemTransacao } from '../contexto/contexto.interceptor';
import type { RequisicaoComContexto } from '../contexto/contexto.interceptor';
import { inquilinoDaAreaPublica } from '../publico/encontros-publicos.controller';
import { ZodValidationPipe } from '../validacao/zod-validation.pipe';
import { CobrancaPublicaService } from './cobranca-publica.service';
import { pedidoDeCobrancaSchema } from './pedido-de-cobranca.schema';
import type { PedidoDeCobranca } from './pedido-de-cobranca.schema';

/**
 * Pagamento da inscrição pelo link de consulta (03-cobranca.md §3.1 e §3.3).
 * Quem chega aqui não tem conta: o token da inscrição é a credencial (RN-133),
 * e o inquilino vem do host (RN-059t). `@SemTransacao()` porque o serviço abre
 * as transações em volta da chamada ao gateway, nunca uma só por cima dela.
 */
@Controller('api/publico/inscricoes/:token/cobrancas')
@SemAutenticacao()
@SemTransacao()
export class CobrancasPublicasController {
  constructor(private readonly cobrancas: CobrancaPublicaService) {}

  /** `201` com os dados de pagamento, ou `202` quando o gateway não respondeu
   *  a tempo (RN-302) — a tela faz polling no `GET`. */
  @Post()
  async criar(
    @Req() req: RequisicaoComContexto,
    @Param('token') token: string,
    @Body(new ZodValidationPipe(pedidoDeCobrancaSchema)) pedido: PedidoDeCobranca,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { status, corpo } = await this.cobrancas.criar(
      inquilinoDaAreaPublica(req),
      token,
      pedido,
      req.ip ?? req.socket.remoteAddress ?? '',
    );
    res.status(status);
    return corpo;
  }

  @Get(':id')
  consultar(@Req() req: RequisicaoComContexto, @Param('token') token: string, @Param('id') id: string) {
    return this.cobrancas.consultar(inquilinoDaAreaPublica(req), token, id);
  }
}
