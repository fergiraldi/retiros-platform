import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AutenticacaoModule } from './autenticacao/autenticacao.module';
import { AutenticacaoGuard } from './autenticacao/autenticacao.guard';
import { SessaoController } from './autenticacao/sessao.controller';
import { ContextoModule } from './contexto/contexto.module';
import { ContextoInterceptor } from './contexto/contexto.interceptor';
import { ResolvedorDeHostGuard } from './contexto/resolvedor-de-host.guard';
import { DbModule } from './db/db.module';
import { EnvelopeDeErroFilter } from './erros/envelope-de-erro.filter';
import { SaudeController } from './saude/saude.controller';

@Module({
  imports: [DbModule, ContextoModule, AutenticacaoModule],
  controllers: [SaudeController, SessaoController],
  providers: [
    // RNF-006: global, não por controller — toda rota, autenticada ou não,
    // resolve o inquilino pelo host antes de qualquer consulta. Guard roda
    // antes do interceptor, que é o que faz o `ContextoInterceptor` encontrar
    // `req.contextoRetiros` já preenchido (RN-054t).
    { provide: APP_GUARD, useClass: ResolvedorDeHostGuard },
    // A ORDEM IMPORTA, e é esta lista que a define: a autenticação (PRD §8.1,
    // passos 2 a 4) precisa do inquilino do host já resolvido para validar o
    // vínculo da conta *contra* ele — é a RN-060t. Invertê-los faria a conta
    // decidir o inquilino, que é exatamente o que a regra proíbe.
    { provide: APP_GUARD, useClass: AutenticacaoGuard },
    { provide: APP_INTERCEPTOR, useClass: ContextoInterceptor },
    { provide: APP_FILTER, useClass: EnvelopeDeErroFilter },
  ],
})
export class AppModule {}
