import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { criarAppDeTeste } from './ajuda/app-teste';
import type { AppDeTeste } from './ajuda/app-teste';
import {
  removerContasSemeadas,
  removerInquilinoSemeado,
  semearContas,
  semearInquilinoCompleto,
} from './ajuda/semear';
import type { ContasSemeadas, InquilinoSemeado } from './ajuda/semear';

/**
 * Item 23 — cadeia HTTP inteira por supertest, cobrindo as duas pendências
 * abertas em docs/pendencias-tecnicas.md que dependiam deste item:
 *
 * - "Guard e CORS não têm cobertura automatizada ponta a ponta"
 * - "Fiação do novo APP_GUARD sem cobertura ponta a ponta"
 *
 * Sobe a AppModule real (guard de host → guard de autenticação → interceptor
 * de contexto → filtro de erro, na mesma ordem de src/app.module.ts) contra
 * dois inquilinos semeados de verdade no banco.
 */
describe('Pipeline HTTP: host -> autenticação -> contexto', () => {
  let ctx: AppDeTeste;
  let a: InquilinoSemeado;
  let b: InquilinoSemeado;
  let contasA: ContasSemeadas;
  let hostA: string;
  let hostB: string;

  beforeAll(async () => {
    ctx = await criarAppDeTeste();

    const prefixoA = `zzpipea${Date.now()}`;
    const prefixoB = `zzpipeb${Date.now()}`;
    a = await semearInquilinoCompleto(ctx.uow, prefixoA);
    b = await semearInquilinoCompleto(ctx.uow, prefixoB);
    contasA = await semearContas(ctx.uow, a, prefixoA);
    hostA = `${prefixoA}.example.com`;
    hostB = `${prefixoB}.example.com`;
  }, 30_000);

  afterAll(async () => {
    await removerContasSemeadas(ctx.uow, contasA);
    await removerInquilinoSemeado(ctx.uow, a.inquilinoId);
    await removerInquilinoSemeado(ctx.uow, b.inquilinoId);
    await ctx.fechar();
  }, 30_000);

  describe('/saude — isento de host, autenticação e transação', () => {
    it('responde 200 mesmo com Host desconhecido', async () => {
      await request(ctx.app.getHttpServer())
        .get('/saude')
        .set('Host', `nao-existe-${Date.now()}.example.com`)
        .expect(200, { status: 'ok' });
    });
  });

  describe('resolução de host (RN-059t/RN-061t)', () => {
    it('host desconhecido: 404 neutro, no envelope de RNF-011', async () => {
      const resposta = await request(ctx.app.getHttpServer())
        .get('/api/sessao')
        .set('Host', `nao-existe-${Date.now()}.example.com`)
        .expect(404);

      expect(resposta.body).toEqual({
        erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Not Found' },
      });
    });
  });

  describe('CORS dinâmico no preflight real (RN-061t)', () => {
    it('origem de host reconhecido recebe Access-Control-Allow-Origin', async () => {
      const resposta = await request(ctx.app.getHttpServer())
        .options('/api/sessao')
        .set('Origin', `http://${hostA}`)
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(resposta.headers['access-control-allow-origin']).toBe(`http://${hostA}`);
    });

    it('origem desconhecida não recebe Access-Control-Allow-Origin', async () => {
      const resposta = await request(ctx.app.getHttpServer())
        .options('/api/sessao')
        .set('Origin', 'https://invasor.example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('AutenticacaoGuard — ordem dos APP_GUARD e RN-060t, por HTTP real', () => {
    it('sem Authorization: 401', async () => {
      await request(ctx.app.getHttpServer()).get('/api/sessao').set('Host', hostA).expect(401);
    });

    it('token válido no host certo: 200 com o papel efetivo (host conhecido resolve)', async () => {
      const token = await ctx.assinarToken({
        sub: randomUUID(),
        email: contasA.emails.adminDenominacao,
      });

      const resposta = await request(ctx.app.getHttpServer())
        .get('/api/sessao')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body).toEqual({
        inquilinoId: a.inquilinoId,
        centralId: null,
        pessoaId: null,
        papel: 'admin_denominacao',
      });
    });

    // CA-24c: o mesmo token da Homens de Fé no host da Tabor. Depende da
    // ordem certa dos guards em src/app.module.ts — se alguém inverter
    // ResolvedorDeHostGuard/AutenticacaoGuard, req.hostResolvido não existe
    // ainda quando este guard roda, e o teste acima (200) passa a falhar com
    // 500 (o Error de fiação que o próprio guard lança nesse caso), não em
    // silêncio.
    it('token válido de um inquilino no host de outro: 403 VINCULO_INVALIDO', async () => {
      const token = await ctx.assinarToken({
        sub: randomUUID(),
        email: contasA.emails.adminDenominacao,
      });

      const resposta = await request(ctx.app.getHttpServer())
        .get('/api/sessao')
        .set('Host', hostB)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(resposta.body).toEqual({
        erro: {
          codigo: 'VINCULO_INVALIDO',
          mensagem: 'Esta conta não tem acesso por este endereço.',
        },
      });
    });
  });
});
