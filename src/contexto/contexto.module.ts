import { Global, Module } from '@nestjs/common';
import { ContextoInterceptor } from './contexto.interceptor';
import { ResolvedorDeHostGuard } from './resolvedor-de-host.guard';
import { UnidadeDeTrabalhoService } from './unidade-de-trabalho.service';

@Global()
@Module({
  providers: [UnidadeDeTrabalhoService, ContextoInterceptor, ResolvedorDeHostGuard],
  exports: [UnidadeDeTrabalhoService, ContextoInterceptor, ResolvedorDeHostGuard],
})
export class ContextoModule {}
