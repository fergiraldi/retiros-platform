import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ambiente } from './config/ambiente';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(ambiente.PORT);
  console.log(`API no ar em http://localhost:${ambiente.PORT}`);
}

bootstrap();
