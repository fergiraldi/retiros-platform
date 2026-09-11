import { Global, Module } from '@nestjs/common';
import { AutenticacaoGuard } from './autenticacao.guard';
import { chavesJwtProvider } from './chaves-jwt.provider';
import { ResolvedorDeContaService } from './resolvedor-de-conta.service';
import { VerificadorDeJwtService } from './verificador-de-jwt.service';

const provedores = [
  chavesJwtProvider,
  VerificadorDeJwtService,
  ResolvedorDeContaService,
  AutenticacaoGuard,
];

@Global()
@Module({
  providers: provedores,
  exports: provedores,
})
export class AutenticacaoModule {}
