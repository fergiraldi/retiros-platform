import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema';
import { UnidadeDeTrabalhoService } from '../../src/contexto/unidade-de-trabalho.service';
import type { Tx } from '../../src/db/tipos';

export interface InquilinoSemeado {
  inquilinoId: string;
  centralId: string;
  pessoaId: string;
  termoId: string;
  encontroId: string;
  inscricaoId: string;
  cobrancaId: string;
  consentimentoId: string;
  ids: Record<string, string>;
}

/**
 * Semeia um inquilino completo, com pelo menos uma linha em cada tabela com
 * `inquilino_id`, passando pelo mecanismo real (UnidadeDeTrabalhoService) —
 * não é bulk insert por fora: é o que prova, no ato, que o `with check` de
 * cada política aceita a escrita legítima (não só que a leitura filtra).
 */
export async function semearInquilinoCompleto(
  uow: UnidadeDeTrabalhoService,
  prefixo: string,
): Promise<InquilinoSemeado> {
  const inquilinoId = randomUUID();

  // passo 1: a linha de inquilino nasce sob o papel operador (RN-140/§5).
  await uow.executar({ papel: 'operador' }, async (tx) => {
    await tx.insert(schema.inquilino).values({
      id: inquilinoId,
      nome: `Teste ${prefixo}`,
      slug: `${prefixo}-inquilino`,
      situacao: 'ativo',
      contratoAceitoEm: new Date().toISOString(),
    });
  });

  // passo 2: tudo o mais nasce como admin_denominacao daquele inquilino —
  // é o papel que as políticas de central (helper) e as bespoke já cobrem.
  const ids = await uow.executar(
    { inquilinoId, papel: 'admin_denominacao' },
    async (tx: Tx) => {
      const [central] = await tx
        .insert(schema.central)
        .values({
          id: randomUUID(),
          inquilinoId,
          nome: `Central ${prefixo}`,
          cidade: 'Cascavel',
          uf: 'PR',
          slug: `${prefixo}-central`,
        })
        .returning();

      const [pessoa] = await tx
        .insert(schema.pessoa)
        .values({
          id: randomUUID(),
          inquilinoId,
          nomeCompleto: `Pessoa ${prefixo}`,
          nomeCracha: prefixo,
          dataNascimento: '1990-01-01',
          telefone: '45999998888',
          email: `${prefixo}@example.com`,
          contatoEmergenciaNome: 'Contato Emergencia',
          contatoEmergenciaFone: '45988887777',
        })
        .returning();

      await tx.insert(schema.pessoaDadoSensivel).values({
        pessoaId: pessoa.id,
        inquilinoId,
        restricaoAlimentar: 'nenhuma',
      });

      const [termo] = await tx
        .insert(schema.termo)
        .values({
          id: randomUUID(),
          inquilinoId,
          versao: '2026-01',
          titulo: 'Termo de teste',
          corpo: 'corpo do termo',
          finalidades: ['inscricao'],
          controladorNome: `Inquilino ${prefixo}`,
          controladorDocumento: '00000000000100',
          encarregadoNome: 'Encarregado Teste',
          encarregadoContato: 'encarregado@example.com',
          situacao: 'vigente',
        })
        .returning();

      const [consentimento] = await tx
        .insert(schema.consentimento)
        .values({
          id: randomUUID(),
          inquilinoId,
          pessoaId: pessoa.id,
          termoId: termo.id,
          versaoTermo: termo.versao,
          finalidades: ['inscricao'],
          aceitoEm: new Date().toISOString(),
          ip: '127.0.0.1',
          origem: 'area_administrativa',
        })
        .returning();

      await tx.insert(schema.inquilinoDominio).values({
        id: randomUUID(),
        inquilinoId,
        dominio: `${prefixo}.example.com`,
        tipo: 'subdominio',
        verificado: true,
      });

      const [conexao] = await tx
        .insert(schema.conexaoGateway)
        .values({
          id: randomUUID(),
          inquilinoId,
          gateway: 'mercadopago',
          contaExternaId: `conta-${prefixo}`,
          accessTokenRef: `ref-access-${prefixo}`,
          refreshTokenRef: `ref-refresh-${prefixo}`,
          expiraEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          conectadaPor: randomUUID(),
        })
        .returning();

      await tx.insert(schema.acessoSuporte).values({
        id: randomUUID(),
        inquilinoId,
        operadorId: randomUUID(),
        concedidoPor: randomUUID(),
        motivo: 'teste automatizado',
        expiraEm: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      const [encontro] = await tx
        .insert(schema.encontro)
        .values({
          id: randomUUID(),
          inquilinoId,
          centralId: central.id,
          numero: 1,
          titulo: `Encontro ${prefixo}`,
          slug: `${prefixo}-encontro`,
          dataInicio: '2027-01-01',
          dataFim: '2027-01-03',
          localNome: 'Sitio',
          localEndereco: 'Endereco',
          localCidade: 'Cascavel',
          localUf: 'PR',
          vagasParticipantes: 10,
          vagasServos: 10,
          taxaParticipante: '100.00',
          taxaServo: '50.00',
          inscricoesAbremEm: new Date().toISOString(),
          inscricoesFechamEm: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
        })
        .returning();

      const [inscricao] = await tx
        .insert(schema.inscricao)
        .values({
          id: randomUUID(),
          inquilinoId,
          centralId: central.id,
          encontroId: encontro.id,
          pessoaId: pessoa.id,
          tipo: 'participante',
          situacao: 'pendente_pagamento',
          valorDevido: '100.00',
          reembolsoFaixas: [{ antecedencia_minima_dias: 16, percentual: 100 }],
          tokenConsulta: `token-${randomUUID()}`,
        })
        .returning();

      const [cobranca] = await tx
        .insert(schema.cobranca)
        .values({
          id: randomUUID(),
          inquilinoId,
          centralId: central.id,
          inscricaoId: inscricao.id,
          conexaoGatewayId: conexao.id,
          metodo: 'pix',
          valor: '100.00',
          idempotencyKey: randomUUID(),
        })
        .returning();

      await tx.insert(schema.notificacao).values({
        id: randomUUID(),
        inquilinoId,
        pessoaId: pessoa.id,
        gatilho: 'inscricao_criada',
        canal: 'email',
        destinatario: pessoa.email,
        chaveUnica: `inscricao_criada:${inscricao.id}:1`,
      });

      const [usuario] = await tx
        .insert(schema.usuario)
        .values({
          id: randomUUID(),
          inquilinoId,
          pessoaId: pessoa.id,
          email: `servo-${prefixo}@example.com`,
          papel: 'servo',
          situacao: 'ativa',
        })
        .returning();

      const [auditoria] = await tx
        .insert(schema.auditoria)
        .values({
          id: randomUUID(),
          inquilinoId,
          centralId: central.id,
          entidade: 'inscricao',
          entidadeId: inscricao.id,
          acao: 'criada',
          atorTipo: 'publico',
        })
        .returning();

      return {
        central: central.id,
        pessoa: pessoa.id,
        pessoaDadoSensivel: pessoa.id,
        termo: termo.id,
        consentimento: consentimento.id,
        inquilinoDominio: inquilinoId, // não tem PK exposta simples aqui; usamos inquilinoId como marcador
        conexaoGateway: conexao.id,
        acessoSuporte: inquilinoId,
        encontro: encontro.id,
        inscricao: inscricao.id,
        cobranca: cobranca.id,
        notificacao: inquilinoId,
        usuario: usuario.id,
        auditoria: auditoria.id,
      };
    },
  );

  return {
    inquilinoId,
    centralId: ids.central,
    pessoaId: ids.pessoa,
    termoId: ids.termo,
    encontroId: ids.encontro,
    inscricaoId: ids.inscricao,
    cobrancaId: ids.cobranca,
    consentimentoId: ids.consentimento,
    ids,
  };
}

export async function removerInquilinoSemeado(uow: UnidadeDeTrabalhoService, inquilinoId: string) {
  // Igual à criação: tudo que não é a linha de `inquilino` só é visível (e
  // apagável) sob contexto de admin_denominacao daquele inquilino — um
  // `operador` sozinho, sem inquilino_id no contexto, não enxerga `central`
  // nem as demais (RLS filtra silenciosamente, não dá erro), e a FK de
  // `central` prende a linha de `inquilino` se essa ordem for invertida.
  await uow.executar({ inquilinoId, papel: 'admin_denominacao' }, async (tx) => {
    // ordem reversa de FK — filhas antes das mães.
    await tx.execute(sql`delete from auditoria where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from notificacao where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from cobranca where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from inscricao where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from encontro where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from acesso_suporte where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from conexao_gateway where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from inquilino_dominio where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from consentimento where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from termo where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from pessoa_dado_sensivel where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from usuario where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from pessoa where inquilino_id = ${inquilinoId}`);
    await tx.execute(sql`delete from central where inquilino_id = ${inquilinoId}`);
  });

  // só a linha raiz precisa do papel operador (inquilino_visibilidade, §5).
  await uow.executar({ papel: 'operador' }, async (tx) => {
    await tx.execute(sql`delete from inquilino where id = ${inquilinoId}`);
  });
}

/**
 * As 13 tabelas com `inquilino_id` cujo isolamento é "ninguém de fora enxerga,
 * ponto" — fora `inquilino` (fronteira é o próprio id, testado à parte),
 * `identidade`/`webhook_evento` (sem RLS por inquilino, exceções declaradas)
 * e `inquilino_dominio`, que tem leitura pública **intencional** de domínio
 * verificado (é o que a resolução por host precisa enxergar sem contexto
 * nenhum ainda — §5 do 01-modelo-de-dados.md) e por isso tem teste dedicado,
 * não a asserção genérica de "zero linhas de outro inquilino".
 */
export const TABELAS_COM_INQUILINO = [
  'conexao_gateway',
  'acesso_suporte',
  'pessoa',
  'pessoa_dado_sensivel',
  'termo',
  'consentimento',
  'central',
  'encontro',
  'inscricao',
  'cobranca',
  'notificacao',
  'usuario',
  'auditoria',
] as const;
