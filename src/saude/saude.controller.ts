import { Controller, Get } from '@nestjs/common';
import { SemAutenticacao } from '../autenticacao/autenticacao.guard';
import { SemTransacao } from '../contexto/contexto.interceptor';
import { SemResolucaoDeHost } from '../contexto/resolvedor-de-host.guard';

@Controller('saude')
export class SaudeController {
  // Healthcheck da Railway: chega pelo host interno do container, que não é
  // host de inquilino nenhum, e sem token nenhum. Sem as isenções, o guard de
  // host responderia 404 e o de autenticação 401 — e o deploy nunca ficaria
  // saudável. As três andam juntas, e o bloco `SaudeController — fiação das
  // isenções` de `test/sessao.controller.spec.ts` reprova se alguma sair.
  @Get()
  @SemTransacao()
  @SemResolucaoDeHost()
  @SemAutenticacao()
  status() {
    return { status: 'ok' };
  }
}
