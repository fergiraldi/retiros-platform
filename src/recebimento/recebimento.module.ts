import { Module } from '@nestjs/common';
import { OAuthMercadoPago } from '../mercado-pago/oauth-mercado-pago';
import { ConexaoRecebimentoController } from './conexao-recebimento.controller';
import { ConexaoRecebimentoService } from './conexao-recebimento.service';

@Module({
  controllers: [ConexaoRecebimentoController],
  providers: [ConexaoRecebimentoService, OAuthMercadoPago],
})
export class RecebimentoModule {}
