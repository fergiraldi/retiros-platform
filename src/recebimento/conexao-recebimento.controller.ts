import { Controller, Get, Post, Query, Redirect, Req } from '@nestjs/common';
import { ContaAtual } from '../autenticacao/conta-atual.decorator';
import { SemAutenticacao } from '../autenticacao/autenticacao.guard';
import type { ContaDeAcesso } from '../autenticacao/autenticacao.types';
import { SemTransacao } from '../contexto/contexto.interceptor';
import type { RequisicaoComContexto } from '../contexto/contexto.interceptor';
import { SemResolucaoDeHost } from '../contexto/resolvedor-de-host.guard';
import { ConexaoRecebimentoService } from './conexao-recebimento.service';

/**
 * Conexão do recebimento com o Mercado Pago por OAuth (03-cobranca.md §7.3).
 * `@SemTransacao()` nas duas: a ida não toca o banco, e a volta abre a
 * transação com o contexto de quem pediu, que só se conhece pelo `state`.
 */
@Controller('api')
@SemTransacao()
export class ConexaoRecebimentoController {
  constructor(private readonly conexoes: ConexaoRecebimentoService) {}

  /** O front manda o navegador para `urlAutorizacao`. */
  @Post('admin/recebimento/conexao')
  iniciar(@ContaAtual() conta: ContaDeAcesso, @Req() req: RequisicaoComContexto) {
    return this.conexoes.iniciar(conta, `${req.protocol}://${req.hostResolvido!.host}`);
  }

  /**
   * A `redirect_uri` cadastrada na aplicação do Mercado Pago. Chega pelo
   * navegador, no host da API e sem token: isenta de host e de autenticação,
   * e quem diz de que inquilino ela é é o `state`.
   */
  @Get('recebimento/mercadopago/retorno')
  @SemResolucaoDeHost()
  @SemAutenticacao()
  @Redirect()
  async retorno(@Query('state') state?: string, @Query('code') code?: string) {
    return { url: await this.conexoes.concluir(state, code) };
  }
}
