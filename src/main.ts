import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ambiente } from './config/ambiente';
import { criarOpcoesDeCors } from './contexto/cors';
import { ReconhecedorDeHostService } from './contexto/reconhecedor-de-host.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // RNF-006/RN-211: sem isto o Express 5 ignora X-Forwarded-Host e
  // X-Forwarded-For, e atrás do proxy da Railway a resolução por host receberia
  // o host interno — 404 em toda rota.
  app.set('trust proxy', ambiente.PROXIES_CONFIAVEIS);

  // O CORS do Nest é middleware do Express: roda antes de guard e interceptor,
  // por isso o preflight não passa pelo `ResolvedorDeHostGuard` e precisa
  // consultar o mesmo reconhecedor por fora do pipeline (RN-061t).
  app.enableCors(criarOpcoesDeCors(app.get(ReconhecedorDeHostService)));

  await app.listen(ambiente.PORT);
  console.log(`API no ar em http://localhost:${ambiente.PORT}`);
}

bootstrap();
