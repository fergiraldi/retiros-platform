import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { ambiente } from '../src/config/ambiente';
import { ReconhecedorDeHostService } from '../src/contexto/reconhecedor-de-host.service';
import * as schema from '../src/db/schema';
import { criarAppDeTeste } from './ajuda/app-teste';
import type { AppDeTeste } from './ajuda/app-teste';
import { removerInquilinoSemeado, semearInquilinoCompleto } from './ajuda/semear';
import type { InquilinoSemeado } from './ajuda/semear';

/**
 * Item 10 — PRD F1 por HTTP real: agenda, página do encontro e ficha, contra
 * inquilinos semeados de verdade. Cada caso usa IP e CPF próprios, porque o
 * limitador (item 6) é um só para a app inteira — o caso que testa o limite é o
 * único que repete um ou outro.
 */
describe('Área pública — agenda, página e ficha de inscrição (PRD F1)', () => {
  let ctx: AppDeTeste;
  let a: InquilinoSemeado;
  let b: InquilinoSemeado;
  let c: InquilinoSemeado;
  let hostA: string;
  let hostB: string;
  let hostC: string;
  const proxiesOriginal = ambiente.PROXIES_CONFIAVEIS;
  let sequencia = 100;

  beforeAll(async () => {
    // Um salto de proxy, como na Railway: é o que faz `X-Forwarded-For` virar
    // `req.ip` — cada caso escolhe o próprio IP, e a RN-211 fica testada junto.
    ambiente.PROXIES_CONFIAVEIS = 1;
    ctx = await criarAppDeTeste();
    // Servidor já escutando: sem isto o supertest abre e FECHA o servidor a
    // cada requisição, e no CA-15 a primeira que termina derruba as outras 49
    // em voo (ECONNRESET intermitente).
    await ctx.app.listen(0);

    const sufixo = Date.now();
    a = await semearInquilinoCompleto(ctx.uow, `zzfichaa${sufixo}`);
    b = await semearInquilinoCompleto(ctx.uow, `zzfichab${sufixo}`);
    c = await semearInquilinoCompleto(ctx.uow, `zzfichac${sufixo}`);
    hostA = `zzfichaa${sufixo}.example.com`;
    hostB = `zzfichab${sufixo}.example.com`;
    hostC = `zzfichac${sufixo}.example.com`;
  }, 30_000);

  afterAll(async () => {
    // `identidade` é global e fica para trás quando a pessoa sai; sem isto, cada
    // execução da suíte deixaria CPFs de teste no schema.
    const identidades: string[] = [];
    for (const s of [a, b, c]) {
      const r = await ctx.uow.executar({ inquilinoId: s.inquilinoId, papel: 'admin_denominacao' }, (tx) =>
        tx.execute<{ identidade_id: string }>(
          sql`select identidade_id from pessoa where identidade_id is not null`,
        ),
      );
      identidades.push(...r.rows.map((linha) => linha.identidade_id));
      await removerInquilinoSemeado(ctx.uow, s.inquilinoId);
    }
    await ctx.uow.executarSemContexto((tx) =>
      tx.execute(sql`delete from identidade where id = any(${sql.param(identidades)}::uuid[])`),
    );

    await ctx.fechar();
    ambiente.PROXIES_CONFIAVEIS = proxiesOriginal;
  }, 30_000);

  // ---------------------------------------------------------------- ajudantes

  let ultimoIp = 0;
  const novoIp = () => {
    ultimoIp += 1;
    return `10.${Math.floor(ultimoIp / 250)}.${ultimoIp % 250}.7`;
  };

  function gerarCpf(): string {
    const digitos = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    const verificador = (base: number[]) => {
      const resto = base.reduce((soma, d, i) => soma + d * (base.length + 1 - i), 0) % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    digitos.push(verificador(digitos));
    digitos.push(verificador(digitos));
    return digitos.join('');
  }

  function ficha(cpf: string, extra: Record<string, unknown> = {}) {
    const { pessoa, ...resto } = extra as { pessoa?: Record<string, unknown> };
    return {
      tipo: 'participante',
      pessoa: {
        nomeCompleto: 'João da Silva Souza',
        nomeCracha: 'João',
        cpf,
        dataNascimento: '1985-04-23',
        telefone: '45999998888',
        email: 'joao@exemplo.com',
        contatoEmergenciaNome: 'Maria de Souza',
        contatoEmergenciaFone: '45988887777',
        ...pessoa,
      },
      dadosSensiveis: { restricaoAlimentar: 'intolerante a lactose' },
      convidadorNome: 'Pedro Alves',
      consentimento: { versaoTermo: '2026-01', finalidades: ['inscricao'] },
      ...resto,
    };
  }

  function inscrever(host: string, encontroId: string, corpo: unknown, ip = novoIp()) {
    return request(ctx.app.getHttpServer())
      .post(`/api/publico/encontros/${encontroId}/inscricoes`)
      .set('Host', host)
      .set('X-Forwarded-For', ip)
      .set('User-Agent', 'jest-ficha')
      .send(corpo as object);
  }

  interface OpcoesEncontro {
    vagas?: number;
    abreEmMs?: number;
    fechaEmMs?: number;
    situacao?: 'publicado' | 'rascunho';
  }

  async function criarEncontro(s: InquilinoSemeado, opcoes: OpcoesEncontro = {}) {
    sequencia += 1;
    const id = randomUUID();
    const slug = `encontro-${sequencia}`;
    await ctx.uow.executar({ inquilinoId: s.inquilinoId, papel: 'admin_denominacao' }, (tx) =>
      tx.insert(schema.encontro).values({
        id,
        inquilinoId: s.inquilinoId,
        centralId: s.centralId,
        numero: sequencia,
        titulo: `${sequencia}º Encontro`,
        slug,
        dataInicio: '2027-03-05',
        dataFim: '2027-03-07',
        localNome: 'Recanto',
        localEndereco: 'Estrada do Recanto, km 3',
        localCidade: 'Cascavel',
        localUf: 'PR',
        vagasParticipantes: opcoes.vagas ?? 10,
        vagasServos: opcoes.vagas ?? 10,
        taxaParticipante: '350.00',
        taxaServo: '120.00',
        inscricoesAbremEm: new Date(Date.now() + (opcoes.abreEmMs ?? -3_600_000)).toISOString(),
        inscricoesFechamEm: new Date(Date.now() + (opcoes.fechaEmMs ?? 10 * 86_400_000)).toISOString(),
        situacao: opcoes.situacao ?? 'publicado',
        textoDivulgacao: 'Venha!',
      }),
    );
    return { id, slug };
  }

  /** Consulta como admin da denominação — o lado de quem confere o que ficou gravado. */
  function consultar<T extends Record<string, unknown>>(s: InquilinoSemeado, consulta: ReturnType<typeof sql>) {
    return ctx.uow
      .executar({ inquilinoId: s.inquilinoId, papel: 'admin_denominacao' }, (tx) => tx.execute<T>(consulta))
      .then((r) => r.rows);
  }

  // ------------------------------------------------------------------- ficha

  it('CA-01: com vaga, cria pendente_pagamento com valor, consentimento, notificação e auditoria', async () => {
    const encontro = await criarEncontro(a);
    const ip = novoIp();

    const resposta = await inscrever(hostA, encontro.id, ficha(gerarCpf(), { consentimentoRetencao: true }), ip)
      .expect(201);

    expect(resposta.body).toMatchObject({
      situacao: 'pendente_pagamento',
      valorDevido: 350,
      posicaoEspera: null,
      urlConsulta: `http://${hostA}/inscricao/${resposta.body.tokenConsulta}`,
    });
    expect(resposta.body.tokenConsulta).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes (RN-133)
    const prazo = new Date(resposta.body.prazoPagamentoAte).getTime() - Date.now();
    expect(prazo).toBeGreaterThan(71 * 3_600_000); // RN-052: 72h da inscrição
    expect(prazo).toBeLessThanOrEqual(72 * 3_600_000);

    const inscricaoId = resposta.body.inscricaoId;
    const consentimentos = await consultar<{ finalidades: string[]; ip: string; origem: string; user_agent: string }>(
      a,
      sql`select finalidades, ip::text as ip, origem, user_agent from consentimento
           where inscricao_id = ${inscricaoId} order by finalidades`,
    );
    // RN-090b: finalidades copiadas da versão; RN-093a: retenção em linha própria.
    expect(consentimentos).toEqual([
      { finalidades: ['inscricao'], ip: `${ip}/32`, origem: 'site_publico', user_agent: 'jest-ficha' },
      { finalidades: ['retencao'], ip: `${ip}/32`, origem: 'site_publico', user_agent: 'jest-ficha' },
    ]);

    const notificacoes = await consultar<{ chave_unica: string }>(
      a,
      sql`select chave_unica from notificacao where inscricao_id = ${inscricaoId}`,
    );
    expect(notificacoes).toEqual([{ chave_unica: `inscricao_criada:${inscricaoId}:1` }]);

    const auditoria = await consultar<{ ator_tipo: string; depois: unknown }>(
      a,
      sql`select ator_tipo, depois from auditoria where entidade_id = ${inscricaoId}`,
    );
    expect(auditoria).toEqual([
      { ator_tipo: 'publico', depois: { situacao: 'pendente_pagamento', tipo: 'participante', valorDevido: 350 } },
    ]);
  });

  it('CA-27: servo deve a taxa de servo', async () => {
    const encontro = await criarEncontro(a);

    const resposta = await inscrever(hostA, encontro.id, ficha(gerarCpf(), { tipo: 'servo' })).expect(201);

    expect(resposta.body.valorDevido).toBe(120);
  });

  it('CA-03: mesma pessoa em outro encontro do inquilino reaproveita o cadastro sem sobrescrever o nome', async () => {
    const [primeiro, segundo] = [await criarEncontro(a), await criarEncontro(a)];
    const cpf = gerarCpf();

    await inscrever(hostA, primeiro.id, ficha(cpf)).expect(201);
    await inscrever(
      hostA,
      segundo.id,
      ficha(cpf, { pessoa: { nomeCompleto: 'Joao da Silva Sousa', telefone: '44911112222' } }),
    ).expect(201);

    const pessoas = await consultar<{ nome_completo: string; telefone: string; inscricoes: number }>(
      a,
      sql`select p.nome_completo, p.telefone, count(i.id)::int as inscricoes
            from pessoa p join inscricao i on i.pessoa_id = p.id
           where i.encontro_id in (${primeiro.id}, ${segundo.id})
           group by p.id`,
    );
    expect(pessoas).toEqual([{ nome_completo: 'João da Silva Souza', telefone: '44911112222', inscricoes: 2 }]);
  });

  it('CA-04: segunda ficha no mesmo encontro é 409 JA_INSCRITO, sem o token na resposta', async () => {
    const encontro = await criarEncontro(a);
    const cpf = gerarCpf();
    await inscrever(hostA, encontro.id, ficha(cpf)).expect(201);

    const resposta = await inscrever(hostA, encontro.id, ficha(cpf)).expect(409);

    expect(resposta.body).toEqual({
      erro: {
        codigo: 'JA_INSCRITO',
        mensagem: 'Já existe uma inscrição sua neste encontro.',
        detalhes: { situacao: 'pendente_pagamento' },
      },
    });
    const linhas = await consultar(a, sql`select id from inscricao where encontro_id = ${encontro.id}`);
    expect(linhas).toHaveLength(1);
  });

  it('CA-05: fora da janela é 422 INSCRICOES_FECHADAS, e nenhum dado pessoal é gravado', async () => {
    const encerrado = await criarEncontro(a, { abreEmMs: -10 * 86_400_000, fechaEmMs: -86_400_000 });
    const futuro = await criarEncontro(a, { abreEmMs: 86_400_000, fechaEmMs: 10 * 86_400_000 });
    const nome = `Fora da Janela ${randomUUID()}`;

    for (const encontro of [encerrado, futuro]) {
      const resposta = await inscrever(hostA, encontro.id, ficha(gerarCpf(), { pessoa: { nomeCompleto: nome } }))
        .expect(422);
      expect(resposta.body.erro.codigo).toBe('INSCRICOES_FECHADAS');
    }
    expect(await consultar(a, sql`select id from pessoa where nome_completo = ${nome}`)).toHaveLength(0);
  });

  it('CA-32: sem aceite, ou com versão do termo que não é a vigente, é 422 CONSENTIMENTO_OBRIGATORIO', async () => {
    const encontro = await criarEncontro(a);
    const nome = `Sem Aceite ${randomUUID()}`;

    const semAceite = await inscrever(
      hostA,
      encontro.id,
      ficha(gerarCpf(), { consentimento: null, pessoa: { nomeCompleto: nome } }),
    ).expect(422);
    const versaoVelha = await inscrever(
      hostA,
      encontro.id,
      ficha(gerarCpf(), { consentimento: { versaoTermo: '2025-01', finalidades: ['inscricao'] } }),
    ).expect(422);
    const finalidadeFaltando = await inscrever(
      hostA,
      encontro.id,
      ficha(gerarCpf(), { consentimento: { versaoTermo: '2026-01', finalidades: [] } }),
    ).expect(422);

    expect(semAceite.body.erro.codigo).toBe('CONSENTIMENTO_OBRIGATORIO');
    expect(versaoVelha.body.erro).toMatchObject({
      codigo: 'CONSENTIMENTO_OBRIGATORIO',
      detalhes: { versaoVigente: '2026-01' },
    });
    expect(finalidadeFaltando.body.erro.codigo).toBe('CONSENTIMENTO_OBRIGATORIO');
    expect(await consultar(a, sql`select id from pessoa where nome_completo = ${nome}`)).toHaveLength(0);
    expect(await consultar(a, sql`select id from inscricao where encontro_id = ${encontro.id}`)).toHaveLength(0);
  });

  it('payload inválido é 422 DADOS_INVALIDOS com o campo', async () => {
    const encontro = await criarEncontro(a);

    const resposta = await inscrever(hostA, encontro.id, ficha('11144477736')).expect(422);

    expect(resposta.body.erro).toMatchObject({
      codigo: 'DADOS_INVALIDOS',
      detalhes: { campos: [{ campo: 'pessoa.cpf', mensagem: 'CPF inválido.' }] },
    });
  });

  it('CA-15/CA-16: 50 fichas simultâneas na última vaga — 1 pendente, 49 na fila com posições distintas', async () => {
    const encontro = await criarEncontro(a, { vagas: 1 });

    const respostas = await Promise.all(
      Array.from({ length: 50 }, () => inscrever(hostA, encontro.id, ficha(gerarCpf()))),
    );

    expect(respostas.map((r) => r.status)).toEqual(Array(50).fill(201));
    const situacoes = respostas.map((r) => r.body.situacao);
    expect(situacoes.filter((s) => s === 'pendente_pagamento')).toHaveLength(1);
    expect(situacoes.filter((s) => s === 'lista_espera')).toHaveLength(49);

    // Ordinal devolvido ao inscrito (RN-501, RN-516): 1 a 49, sem repetição.
    const posicoes = respostas.map((r) => r.body.posicaoEspera).filter((p) => p !== null);
    expect([...posicoes].sort((x, y) => x - y)).toEqual(Array.from({ length: 49 }, (_, i) => i + 1));

    const linhas = await consultar<{ situacao: string; posicao_espera: number | null; prazo: null }>(
      a,
      sql`select situacao, posicao_espera from inscricao where encontro_id = ${encontro.id}`,
    );
    const naFila = linhas.filter((l) => l.situacao === 'lista_espera').map((l) => l.posicao_espera);
    expect(new Set(naFila).size).toBe(49);
    // CA-16: lista de espera não gera cobrança, e a notificação é a da fila.
    expect(
      await consultar(a, sql`select id from cobranca where inscricao_id in (
        select id from inscricao where encontro_id = ${encontro.id})`),
    ).toHaveLength(0);
    expect(
      await consultar(a, sql`select id from notificacao where gatilho = 'lista_espera_registrada'
        and inscricao_id in (select id from inscricao where encontro_id = ${encontro.id})`),
    ).toHaveLength(49);
  }, 60_000);

  it('CA-24d: o mesmo CPF em outra denominação recebe resposta idêntica e cadastro só com o que digitou', async () => {
    const encontroA = await criarEncontro(a);
    const encontroB = await criarEncontro(b);
    const cpf = gerarCpf();

    const ineditaEmB = await inscrever(hostB, encontroB.id, ficha(gerarCpf(), { dadosSensiveis: null })).expect(201);
    await inscrever(hostA, encontroA.id, ficha(cpf, { pessoa: { telefone: '45900000001' } })).expect(201);
    const jaVistaEmA = await inscrever(
      hostB,
      encontroB.id,
      ficha(cpf, { pessoa: { telefone: '45900000002' }, dadosSensiveis: null }),
    ).expect(201);

    // RN-212: mesmo código e mesma forma de corpo — só os valores próprios mudam.
    expect(Object.keys(jaVistaEmA.body).sort()).toEqual(Object.keys(ineditaEmB.body).sort());
    expect(jaVistaEmA.body.situacao).toBe(ineditaEmB.body.situacao);

    const emB = await consultar<{ telefone: string; restricao_alimentar: string | null; identidade_id: string }>(
      b,
      sql`select p.telefone, s.restricao_alimentar, p.identidade_id
            from inscricao i join pessoa p on p.id = i.pessoa_id
            left join pessoa_dado_sensivel s on s.pessoa_id = p.id
           where i.id = ${jaVistaEmA.body.inscricaoId}`,
    );
    const emA = await consultar<{ identidade_id: string }>(
      a,
      sql`select p.identidade_id from inscricao i join pessoa p on p.id = i.pessoa_id
           where i.encontro_id = ${encontroA.id}`,
    );
    // Nada veio de A: nem o telefone, nem a restrição alimentar.
    expect(emB).toEqual([{ telefone: '45900000002', restricao_alimentar: null, identidade_id: emA[0].identidade_id }]);
  });

  it('CA-24a: encontro de outro inquilino, pelo host deste, é 404 — igual a inexistente', async () => {
    const encontroA = await criarEncontro(a);

    const deOutro = await inscrever(hostB, encontroA.id, ficha(gerarCpf())).expect(404);
    const inexistente = await inscrever(hostB, randomUUID(), ficha(gerarCpf())).expect(404);
    const naoUuid = await inscrever(hostB, 'nao-e-uuid', ficha(gerarCpf())).expect(404);

    expect(deOutro.body).toEqual(inexistente.body);
    expect(naoUuid.body).toEqual(inexistente.body);
    expect(inexistente.body.erro.codigo).toBe('ENCONTRO_NAO_ENCONTRADO');
  });

  // ---------------------------------------------------------- limite (item 6)

  it('RN-210: a 6ª ficha do mesmo IP em 10 minutos é 429', async () => {
    const encontro = await criarEncontro(a);
    const ip = novoIp();

    for (let i = 0; i < 5; i++) await inscrever(hostA, encontro.id, ficha(gerarCpf()), ip).expect(201);
    const resposta = await inscrever(hostA, encontro.id, ficha(gerarCpf()), ip).expect(429);

    expect(resposta.body.erro.codigo).toBe('MUITAS_TENTATIVAS');
  });

  it('RN-210: a 4ª ficha do mesmo CPF em 1 hora é 429, com a mesma resposta do limite por IP', async () => {
    const encontro = await criarEncontro(a);
    const cpf = gerarCpf();
    const ip = novoIp();
    for (let i = 0; i < 5; i++) await inscrever(hostA, encontro.id, ficha(gerarCpf()), ip);
    const porIp = await inscrever(hostA, encontro.id, ficha(gerarCpf()), ip).expect(429);

    // De IPs diferentes: a 2ª e a 3ª são JA_INSCRITO, e contam do mesmo jeito.
    await inscrever(hostA, encontro.id, ficha(cpf)).expect(201);
    await inscrever(hostA, encontro.id, ficha(cpf)).expect(409);
    await inscrever(hostA, encontro.id, ficha(cpf)).expect(409);
    const porCpf = await inscrever(hostA, encontro.id, ficha(cpf)).expect(429);

    // RN-094a: a resposta não diz qual dos dois limites estourou.
    expect(porCpf.body).toEqual(porIp.body);
  });

  it('RN-210: o limite por CPF é de cada inquilino — usar o CPF em outra denominação não o consome', async () => {
    const [encontroA, encontroB] = [await criarEncontro(a), await criarEncontro(b)];
    const cpf = gerarCpf();
    await inscrever(hostB, encontroB.id, ficha(cpf)).expect(201);
    await inscrever(hostB, encontroB.id, ficha(cpf)).expect(409);
    await inscrever(hostB, encontroB.id, ficha(cpf)).expect(409);

    await inscrever(hostA, encontroA.id, ficha(cpf)).expect(201);
  });

  // ------------------------------------------------------------ agenda/página

  it('agenda: só encontros publicados do inquilino do host, com vagas e o bloco do inquilino', async () => {
    const publicado = await criarEncontro(a, { vagas: 3 });
    await criarEncontro(a, { situacao: 'rascunho' });
    await criarEncontro(b);
    await inscrever(hostA, publicado.id, ficha(gerarCpf())).expect(201);

    const resposta = await request(ctx.app.getHttpServer())
      .get('/api/publico/encontros')
      .query({ tamanho: 50 })
      .set('Host', hostA)
      .expect(200);

    const item = resposta.body.itens.find((i: { id: string }) => i.id === publicado.id);
    expect(item).toMatchObject({
      slug: publicado.slug,
      dataInicio: '2027-03-05',
      taxaParticipante: 350,
      vagasRestantesParticipante: 2,
      inscricoesAbertas: true,
      central: { slug: expect.any(String), uf: 'PR' },
    });
    expect(resposta.body.inquilino).toMatchObject({ nome: expect.stringContaining('Teste'), corPrimaria: '#1f2937' });
    // CA-31 e RN-016: rascunho e encontro de outro inquilino não aparecem.
    const encontrosDeA = await consultar<{ id: string }>(a, sql`select id from encontro where situacao = 'publicado'`);
    expect(resposta.body.itens.map((i: { id: string }) => i.id).sort()).toEqual(
      encontrosDeA.map((e) => e.id).sort(),
    );
    expect(resposta.body.total).toBe(encontrosDeA.length);
  });

  it('página: devolve o encontro com o termo vigente; rascunho é 404 (CA-31)', async () => {
    const publicado = await criarEncontro(a);
    const rascunho = await criarEncontro(a, { situacao: 'rascunho' });
    const [central] = await consultar<{ slug: string }>(a, sql`select slug from central limit 1`);

    const resposta = await request(ctx.app.getHttpServer())
      .get(`/api/publico/encontros/${central.slug}/${publicado.slug}`)
      .set('Host', hostA)
      .expect(200);

    expect(resposta.body).toMatchObject({
      id: publicado.id,
      taxaServo: 120,
      vagasRestantesServo: 10,
      localEndereco: 'Estrada do Recanto, km 3',
      termo: { versao: '2026-01', finalidades: ['inscricao'] },
    });

    const naoPublicado = await request(ctx.app.getHttpServer())
      .get(`/api/publico/encontros/${central.slug}/${rascunho.slug}`)
      .set('Host', hostA)
      .expect(404);
    expect(naoPublicado.body.erro.codigo).toBe('ENCONTRO_NAO_ENCONTRADO');
    await inscrever(hostA, rascunho.id, ficha(gerarCpf())).expect(404);
  });

  // ---------------------------------------------------- situação do inquilino

  it('CA-37 e CA-34: suspenso lê a agenda e não inscreve; em implantação não tem área pública', async () => {
    const encontro = await criarEncontro(c);
    const mudarSituacao = async (situacao: 'suspenso' | 'em_implantacao') => {
      await ctx.uow.executar({ papel: 'operador' }, (tx) =>
        tx.execute(sql`update inquilino set situacao = ${situacao} where id = ${c.inquilinoId}`),
      );
      ctx.app.get(ReconhecedorDeHostService).esquecer(); // o cache guarda a situação por 60s
    };

    await mudarSituacao('suspenso');
    const suspenso = await inscrever(hostC, encontro.id, ficha(gerarCpf())).expect(503);
    expect(suspenso.body.erro.codigo).toBe('INSCRICOES_SUSPENSAS');
    const agenda = await request(ctx.app.getHttpServer()).get('/api/publico/encontros').set('Host', hostC).expect(200);
    expect(agenda.body.itens).toEqual([expect.objectContaining({ id: encontro.id, inscricoesAbertas: false })]);

    await mudarSituacao('em_implantacao');
    await request(ctx.app.getHttpServer()).get('/api/publico/encontros').set('Host', hostC).expect(404);
    await inscrever(hostC, encontro.id, ficha(gerarCpf())).expect(404);
  });
});
