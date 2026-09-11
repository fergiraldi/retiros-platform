import request from 'supertest';
import { criarAppDeTeste } from './ajuda/app-teste';
import type { AppDeTeste } from './ajuda/app-teste';
import { ModuloDeTesteController } from './ajuda/rota-de-teste.controller';

/**
 * Item 23 — fecha "ZodValidationPipe não é global e não tem teste de fiação"
 * (docs/pendencias-tecnicas.md). Não há controller de domínio real que use o
 * pipe ainda, então o cenário roda contra uma rota só de teste
 * (test/ajuda/rota-de-teste.controller.ts), isenta de host/autenticação —
 * o que se prova aqui é a fiação pipe -> EnvelopeDeErroFilter, não uma regra
 * de negócio.
 */
describe('ZodValidationPipe -> EnvelopeDeErroFilter, por HTTP real', () => {
  let ctx: AppDeTeste;

  beforeAll(async () => {
    ctx = await criarAppDeTeste([ModuloDeTesteController]);
  }, 30_000);

  afterAll(async () => {
    await ctx.fechar();
  }, 30_000);

  it('corpo inválido: 422 no envelope de RNF-011, não 201', async () => {
    const resposta = await request(ctx.app.getHttpServer())
      .post('/teste/validacao')
      .send({ nome: '' })
      .expect(422);

    expect(resposta.body).toEqual({
      erro: {
        codigo: 'DADOS_INVALIDOS',
        mensagem: 'Dados inválidos.',
        detalhes: { campos: [{ campo: 'nome', mensagem: 'Nome é obrigatório.' }] },
      },
    });
  });

  it('corpo válido: 201 com o valor parseado', async () => {
    await request(ctx.app.getHttpServer())
      .post('/teste/validacao')
      .send({ nome: 'Maria' })
      .expect(201, { nome: 'Maria' });
  });
});
