import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { JWK, JWTPayload, JWTVerifyGetKey, KeyLike } from 'jose';
import { ambiente } from '../src/config/ambiente';
import { VerificadorDeJwtService } from '../src/autenticacao/verificador-de-jwt.service';

// Par de chaves próprio, assinado aqui: prova a verificação de verdade
// (assinatura, emissor, audiência, expiração) sem depender de o projeto
// Supabase estar de pé nem de rede. É para isto que as chaves entram por token
// de injeção (CHAVES_JWT) em vez de o serviço montar o JWKS sozinho.
let chavePrivada: KeyLike;
let chavePublica: KeyLike;
let jwkPublica: JWK;

const EMISSOR = 'https://exemplo.supabase.co/auth/v1';
const AUDIENCIA = 'authenticated';

// O serviço lê `ambiente` direto, então o teste fixa os dois valores em vez de
// herdar o `.env` — idioma de `ambiente.HOST_OPERADOR` em
// test/host-resolucao.spec.ts. Sem isto a suíte dependeria de quem rodou ter as
// variáveis configuradas, e reprovaria no CI, que não as tem.
const emissorOriginal = ambiente.SUPABASE_JWT_EMISSOR;
const audienciaOriginal = ambiente.SUPABASE_JWT_AUDIENCIA;

beforeAll(async () => {
  ambiente.SUPABASE_JWT_EMISSOR = EMISSOR;
  ambiente.SUPABASE_JWT_AUDIENCIA = AUDIENCIA;

  const par = await generateKeyPair('ES256');
  chavePrivada = par.privateKey;
  chavePublica = par.publicKey;
  jwkPublica = await exportJWK(chavePublica);
});

afterAll(() => {
  ambiente.SUPABASE_JWT_EMISSOR = emissorOriginal;
  ambiente.SUPABASE_JWT_AUDIENCIA = audienciaOriginal;
});

/** Resolvedor de chaves no mesmo contrato de `createRemoteJWKSet`. */
function chaves(): JWTVerifyGetKey {
  return (() => Promise.resolve(chavePublica)) as unknown as JWTVerifyGetKey;
}

function criarVerificador() {
  return new VerificadorDeJwtService(chaves());
}

interface OpcoesToken {
  emissor?: string;
  audiencia?: string;
  expiraEm?: string | number;
  claims?: JWTPayload;
  algoritmo?: string;
}

async function assinar(opcoes: OpcoesToken = {}) {
  return new SignJWT({
    email: 'pessoa@exemplo.com.br',
    user_metadata: { email_verified: true },
    ...opcoes.claims,
  })
    .setProtectedHeader({ alg: opcoes.algoritmo ?? 'ES256' })
    .setSubject('sub-do-provedor')
    .setIssuer(opcoes.emissor ?? EMISSOR)
    .setAudience(opcoes.audiencia ?? AUDIENCIA)
    .setIssuedAt()
    .setExpirationTime(opcoes.expiraEm ?? '5m')
    .sign(chavePrivada);
}

describe('VerificadorDeJwtService (PRD §8.1, passo 2)', () => {
  it('token válido devolve só sub e email — nunca o nome, que a pessoa edita no provedor', async () => {
    const token = await assinar({
      claims: { name: 'Nome Que Deve Ser Ignorado', phone: '44999999999' },
    });

    const claims = await criarVerificador().verificar(token);

    expect(claims).toEqual({ sub: 'sub-do-provedor', email: 'pessoa@exemplo.com.br' });
  });

  it('recusa token expirado', async () => {
    // Fora da tolerância de relógio de 5s do serviço.
    const token = await assinar({ expiraEm: Math.floor(Date.now() / 1000) - 60 });

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/exp/i);
  });

  it('recusa emissor diferente do configurado', async () => {
    const token = await assinar({ emissor: 'https://outro-projeto.supabase.co/auth/v1' });

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/iss/i);
  });

  it('recusa emissor com barra no fim — o erro de configuração que custa caro', async () => {
    // A claim `iss` é comparada como string exata. Este teste existe porque o
    // sintoma em produção seria 401 em toda rota, sem nada apontar para a env.
    const token = await assinar({ emissor: `${EMISSOR}/` });

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/iss/i);
  });

  it('recusa audiência diferente da configurada', async () => {
    const token = await assinar({ audiencia: 'outra-audiencia' });

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/aud/i);
  });

  it('recusa assinatura de outra chave', async () => {
    const intrusa = await generateKeyPair('ES256');
    const token = await new SignJWT({ email: 'pessoa@exemplo.com.br' })
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject('sub-do-provedor')
      .setIssuer(EMISSOR)
      .setAudience(AUDIENCIA)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(intrusa.privateKey);

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/signature/i);
  });

  it('recusa HS256 assinado com a chave pública (confusão de algoritmo)', async () => {
    // O vetor clássico: a chave de verificação, sendo pública, serviria de
    // segredo de assinatura se HS256 fosse aceito. `algorithms` o exclui.
    const segredo = new TextEncoder().encode(JSON.stringify(jwkPublica));
    const token = await new SignJWT({ email: 'pessoa@exemplo.com.br' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('sub-do-provedor')
      .setIssuer(EMISSOR)
      .setAudience(AUDIENCIA)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(segredo);

    await expect(criarVerificador().verificar(token)).rejects.toThrow();
  });

  it('recusa sessão anônima do Supabase (is_anonymous)', async () => {
    const token = await assinar({ claims: { is_anonymous: true } });

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/anônima/i);
  });

  it('recusa token sem a claim email — é ela que resolve a conta (RN-017)', async () => {
    const token = await assinar({ claims: { email: undefined } });

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/email/i);
  });

  it('recusa e-mail explicitamente não confirmado no provedor', async () => {
    const token = await assinar({ claims: { user_metadata: { email_verified: false } } });

    await expect(criarVerificador().verificar(token)).rejects.toThrow(/não confirmado/i);
  });

  it('aceita quando user_metadata não traz email_verified — a claim não é garantida', async () => {
    // Contrapartida deliberada: exigir `true` recusaria conta legítima de
    // projeto que nunca gravou a claim. A garantia real passa a ser a
    // configuração de Auth do projeto (docs/pendencias-tecnicas.md).
    const token = await assinar({ claims: { user_metadata: {} } });

    await expect(criarVerificador().verificar(token)).resolves.toMatchObject({
      email: 'pessoa@exemplo.com.br',
    });
  });

  it('aceita quando não há user_metadata nenhum', async () => {
    const token = await assinar({ claims: { user_metadata: undefined } });

    await expect(criarVerificador().verificar(token)).resolves.toMatchObject({
      email: 'pessoa@exemplo.com.br',
    });
  });

  it('recusa TUDO se o emissor não estiver configurado — jose ignora issuer vazio', async () => {
    // O achado que este teste trava: `jwtVerify` com `issuer: ''` **não valida
    // o emissor** (string vazia é falsy), e passaria a aceitar token de
    // qualquer projeto Supabase. Em produção o esquema de ambiente barra o
    // vazio no boot; aqui se confere que, se chegar vazio, o verificador falha
    // fechado em vez de validar de menos em silêncio.
    const token = await assinar({ emissor: 'https://projeto-de-um-terceiro.supabase.co/auth/v1' });
    ambiente.SUPABASE_JWT_EMISSOR = '';
    try {
      await expect(criarVerificador().verificar(token)).rejects.toThrow(/não configurada/i);
    } finally {
      ambiente.SUPABASE_JWT_EMISSOR = EMISSOR;
    }
  });
});
