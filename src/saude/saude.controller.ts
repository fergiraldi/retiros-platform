import { Controller, Get } from '@nestjs/common';
import { SemTransacao } from '../contexto/contexto.interceptor';
import { SemResolucaoDeHost } from '../contexto/resolvedor-de-host.guard';

@Controller('saude')
export class SaudeController {
  // Healthcheck da Railway: chega pelo host interno do container, que não é
  // host de inquilino nenhum. Sem a isenção, o guard global responderia 404 e o
  // deploy nunca ficaria saudável.
  @Get()
  @SemTransacao()
  @SemResolucaoDeHost()
  status() {
    return { status: 'ok' };
  }
}
