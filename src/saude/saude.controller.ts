import { Controller, Get } from '@nestjs/common';
import { SemTransacao } from '../contexto/contexto.interceptor';

@Controller('saude')
export class SaudeController {
  @Get()
  @SemTransacao()
  status() {
    return { status: 'ok' };
  }
}
