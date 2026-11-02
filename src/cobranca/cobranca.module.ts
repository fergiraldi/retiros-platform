import { Module } from '@nestjs/common';
import { PagamentosMercadoPago } from '../mercado-pago/pagamentos-mercado-pago';
import { CobrancaPublicaService } from './cobranca-publica.service';
import { CobrancasPublicasController } from './cobrancas-publicas.controller';

@Module({
  controllers: [CobrancasPublicasController],
  providers: [CobrancaPublicaService, PagamentosMercadoPago],
})
export class CobrancaModule {}
