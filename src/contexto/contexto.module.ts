import { Global, Module } from '@nestjs/common';
import { ContextoInterceptor } from './contexto.interceptor';
import { ReconhecedorDeHostService } from './reconhecedor-de-host.service';
import { ResolvedorDeHostGuard } from './resolvedor-de-host.guard';
import { UnidadeDeTrabalhoService } from './unidade-de-trabalho.service';

const provedores = [
  UnidadeDeTrabalhoService,
  ContextoInterceptor,
  ReconhecedorDeHostService,
  ResolvedorDeHostGuard,
];

@Global()
@Module({
  providers: provedores,
  exports: provedores,
})
export class ContextoModule {}
