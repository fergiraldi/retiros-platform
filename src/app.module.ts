import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ContextoModule } from './contexto/contexto.module';
import { ContextoInterceptor } from './contexto/contexto.interceptor';
import { ResolvedorDeHostGuard } from './contexto/resolvedor-de-host.guard';
import { DbModule } from './db/db.module';
import { EnvelopeDeErroFilter } from './erros/envelope-de-erro.filter';
import { SaudeController } from './saude/saude.controller';

@Module({
  imports: [DbModule, ContextoModule],
  controllers: [SaudeController],
  providers: [
    // RNF-006: global, não por controller — toda rota, autenticada ou não,
    // resolve o inquilino pelo host antes de qualquer consulta. Guard roda
    // antes do interceptor, que é o que faz o `ContextoInterceptor` encontrar
    // `req.contextoRetiros` já preenchido (RN-054t).
    { provide: APP_GUARD, useClass: ResolvedorDeHostGuard },
    { provide: APP_INTERCEPTOR, useClass: ContextoInterceptor },
    { provide: APP_FILTER, useClass: EnvelopeDeErroFilter },
  ],
})
export class AppModule {}
