import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ContextoModule } from './contexto/contexto.module';
import { ContextoInterceptor } from './contexto/contexto.interceptor';
import { DbModule } from './db/db.module';
import { EnvelopeDeErroFilter } from './erros/envelope-de-erro.filter';
import { SaudeController } from './saude/saude.controller';

@Module({
  imports: [DbModule, ContextoModule],
  controllers: [SaudeController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ContextoInterceptor },
    { provide: APP_FILTER, useClass: EnvelopeDeErroFilter },
  ],
})
export class AppModule {}
