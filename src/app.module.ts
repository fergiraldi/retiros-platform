import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ContextoModule } from './contexto/contexto.module';
import { ContextoInterceptor } from './contexto/contexto.interceptor';
import { DbModule } from './db/db.module';
import { SaudeController } from './saude/saude.controller';

@Module({
  imports: [DbModule, ContextoModule],
  controllers: [SaudeController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ContextoInterceptor }],
})
export class AppModule {}
