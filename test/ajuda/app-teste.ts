import type { Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { generateKeyPair, SignJWT } from 'jose';
import type { JWTPayload, KeyLike } from 'jose';
import { AppModule } from '../../src/app.module';
import { ambiente } from '../../src/config/ambiente';
import { CHAVES_JWT } from '../../src/autenticacao/chaves-jwt.provider';
import { criarOpcoesDeCors } from '../../src/contexto/cors';
import { ReconhecedorDeHostService } from '../../src/contexto/reconhecedor-de-host.service';
import { UnidadeDeTrabalhoService } from '../../src/contexto/unidade-de-trabalho.service';

export const EMISSOR_DE_TESTE = 'https://exemplo.supabase.co/auth/v1';
export const AUDIENCIA_DE_TESTE = 'authenticated';

export interface AppDeTeste {
  app: NestExpressApplication;
  /** Mesmo `UnidadeDeTrabalhoService` do container do app — mesmo Pool que os
   *  guards usam. Semear com ele evita abrir uma segunda conexão ao banco. */
  uow: UnidadeDeTrabalhoService;
  /** Assina um JWT de teste com a chave local injetada em `CHAVES_JWT`. */
  assinarToken(claims: { sub: string; email: string } & Partial<JWTPayload>): Promise<string>;
  /** Fecha a app (aciona `DbModule.onModuleDestroy` → `pool.end()`) e restaura
   *  o `ambiente` global para o estado anterior a `criarAppDeTeste`. */
  fechar(): Promise<void>;
}

/**
 * Sobe a `AppModule` real — os mesmos guards/interceptor/filter/CORS de
 * `src/main.ts` — para exercitar a cadeia HTTP inteira via supertest (item 23).
 *
 * As chaves de JWT são substituídas por um par local gerado aqui, no mesmo
 * idioma de `test/verificador-de-jwt.spec.ts`: sem rede, sem depender do
 * projeto Supabase estar de pé, e assinando token de qualquer conta semeada
 * pelo teste. `ambiente.SUPABASE_JWT_EMISSOR`/`AUDIENCIA` são sobrescritos para
 * casar com o que `assinarToken` assina.
 *
 * `modulosExtras` permite registrar um controller só de teste (ex.:
 * `test/ajuda/rota-de-teste.controller.ts`) — os providers globais
 * (`APP_GUARD`/`APP_INTERCEPTOR`/`APP_FILTER` de `src/app.module.ts`) valem
 * para toda a aplicação, não só para os controllers declarados na `AppModule`.
 */
export async function criarAppDeTeste(modulosExtras: Type[] = []): Promise<AppDeTeste> {
  const emissorOriginal = ambiente.SUPABASE_JWT_EMISSOR;
  const audienciaOriginal = ambiente.SUPABASE_JWT_AUDIENCIA;
  ambiente.SUPABASE_JWT_EMISSOR = EMISSOR_DE_TESTE;
  ambiente.SUPABASE_JWT_AUDIENCIA = AUDIENCIA_DE_TESTE;

  const { privateKey, publicKey } = await generateKeyPair('ES256');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...modulosExtras],
  })
    .overrideProvider(CHAVES_JWT)
    .useValue(() => Promise.resolve(publicKey as KeyLike))
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();

  // Reproduz os dois passos de bootstrap de src/main.ts que não vêm de
  // dentro da AppModule: `trust proxy` é `NestExpressApplication#set`, e o
  // CORS é middleware do Express, registrado fora do pipeline do Nest.
  app.set('trust proxy', ambiente.PROXIES_CONFIAVEIS);
  app.enableCors(criarOpcoesDeCors(app.get(ReconhecedorDeHostService)));

  await app.init();

  return {
    app,
    uow: app.get(UnidadeDeTrabalhoService),
    async assinarToken(claims) {
      const { sub, email, ...resto } = claims;
      return new SignJWT({
        email,
        user_metadata: { email_verified: true },
        ...resto,
      })
        .setProtectedHeader({ alg: 'ES256' })
        .setSubject(sub)
        .setIssuer(EMISSOR_DE_TESTE)
        .setAudience(AUDIENCIA_DE_TESTE)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey);
    },
    async fechar() {
      await app.close();
      ambiente.SUPABASE_JWT_EMISSOR = emissorOriginal;
      ambiente.SUPABASE_JWT_AUDIENCIA = audienciaOriginal;
    },
  };
}
