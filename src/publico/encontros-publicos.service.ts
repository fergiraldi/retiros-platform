import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { UnidadeDeTrabalhoService } from '../contexto/unidade-de-trabalho.service';
import type { ContextoRequisicao } from '../contexto/contexto.types';
import type { Tx } from '../db/tipos';
import { ErroDeDominio } from '../erros/erro-de-dominio';

/** Situações que ocupam vaga (05-lista-de-espera.md §1). */
export const SITUACOES_QUE_OCUPAM_VAGA = sql`('pendente_pagamento', 'confirmada', 'presente')`;

/**
 * O contexto das leituras da área pública — e por que ele é elevado.
 *
 * O `ResolvedorDeHostGuard` deixa `{ inquilino do host, papel: 'publico' }`,
 * sem central. Sob esse contexto as permissivas de `encontro`, `central` e
 * `inscricao` (template da 0001) não mostram linha nenhuma: elas liberam
 * `admin_denominacao` ou a central do contexto, e a agenda não tem central — ela
 * cruza todas as do inquilino (PRD F1, passo 1). E a contagem de vagas precisa
 * ler `inscricao`, que não pode ganhar policy pública: a linha carrega pessoa.
 *
 * É o mesmo idioma de `ResolvedorDeContaService.contextoDeResolucao`, e pelo
 * mesmo motivo é seguro: quem segura a fronteira do inquilino é a restritiva
 * `*_inquilino`, que continua valendo — nenhuma consulta daqui alcança outro
 * inquilino, nem com o `where` esquecido. O que fica por conta do código é o
 * que é público **dentro** do inquilino: só `publicado`, só colunas de
 * divulgação, e de `inscricao` só contagem. Por isso este contexto vive numa
 * transação curta e própria, que nunca escreve.
 */
export function contextoDeLeituraPublica(inquilinoId: string): ContextoRequisicao {
  return { inquilinoId, papel: 'admin_denominacao' };
}

type LinhaInquilino = {
  nome: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_texto_sobre_primaria: string;
  rotulos: unknown;
  situacao: string;
};

type LinhaEncontro = {
  id: string;
  numero: number;
  titulo: string;
  slug: string;
  data_inicio: string;
  data_fim: string;
  local_nome: string;
  local_cidade: string;
  local_uf: string;
  imagem_capa_url: string | null;
  taxa_participante: string;
  vagas_participantes: number;
  ocupadas_participante: number;
  janela_aberta: boolean;
  central_slug: string;
  central_nome: string;
  central_cidade: string;
  central_uf: string;
};

type LinhaPagina = LinhaEncontro & {
  texto_divulgacao: string | null;
  local_endereco: string;
  taxa_servo: string;
  vagas_servos: number;
  ocupadas_servo: number;
  inscricoes_abrem_em: string;
  inscricoes_fecham_em: string;
  max_parcelas: number;
  parcela_minima: string;
};

type LinhaTermo = {
  versao: string;
  titulo: string;
  corpo: string;
  finalidades: string[];
  controlador_nome: string;
  controlador_documento: string;
  encarregado_nome: string;
  encarregado_contato: string;
};

export interface FiltrosDaAgenda {
  uf?: string;
  centralSlug?: string;
  de?: string;
  ate?: string;
  pagina: number;
  tamanho: number;
}

const ocupadas = (tipo: 'participante' | 'servo') => sql`(
  select count(*) from inscricao x
   where x.encontro_id = e.id and x.tipo = ${tipo} and x.situacao in ${SITUACOES_QUE_OCUPAM_VAGA}
)::int`;

const COLUNAS_DO_ITEM = sql`
  e.id, e.numero, e.titulo, e.slug, e.data_inicio, e.data_fim,
  e.local_nome, e.local_cidade, e.local_uf, e.imagem_capa_url,
  e.taxa_participante, e.vagas_participantes,
  ${ocupadas('participante')} as ocupadas_participante,
  (e.inscricoes_abrem_em <= now() and now() < e.inscricoes_fecham_em) as janela_aberta,
  c.slug as central_slug, c.nome as central_nome, c.cidade as central_cidade, c.uf as central_uf`;

/** Agenda e página do encontro — PRD F1, passos 1 e 2 (02-inscricao.md §4.1, §4.2). */
@Injectable()
export class EncontrosPublicosService {
  constructor(private readonly uow: UnidadeDeTrabalhoService) {}

  async agenda(inquilinoId: string, filtros: FiltrosDaAgenda) {
    return this.uow.executar(contextoDeLeituraPublica(inquilinoId), async (tx) => {
      const inquilino = await this.inquilino(tx);

      // RN-022: só `publicado` — rascunho nunca, e o que já passou da fase de
      // inscrição sai da agenda. RN-016: só do inquilino do host, pela RLS.
      const filtro = sql`
        e.situacao = 'publicado'
        and (${filtros.uf ?? null}::text is null or e.local_uf = ${filtros.uf ?? null})
        and (${filtros.centralSlug ?? null}::text is null or c.slug = ${filtros.centralSlug ?? null})
        and (${filtros.de ?? null}::date is null or e.data_inicio >= ${filtros.de ?? null}::date)
        and (${filtros.ate ?? null}::date is null or e.data_inicio <= ${filtros.ate ?? null}::date)`;

      const total = await tx.execute<{ total: number }>(
        sql`select count(*)::int as total from encontro e join central c on c.id = e.central_id where ${filtro}`,
      );
      const linhas = await tx.execute<LinhaEncontro>(sql`
        select ${COLUNAS_DO_ITEM}
          from encontro e join central c on c.id = e.central_id
         where ${filtro}
         order by e.data_inicio, e.id
         limit ${filtros.tamanho} offset ${(filtros.pagina - 1) * filtros.tamanho}`);

      return {
        inquilino: blocoDoInquilino(inquilino),
        itens: linhas.rows.map((linha) => itemDaAgenda(linha, inquilino)),
        total: total.rows[0].total,
        pagina: filtros.pagina,
      };
    });
  }

  async pagina(inquilinoId: string, centralSlug: string, encontroSlug: string) {
    return this.uow.executar(contextoDeLeituraPublica(inquilinoId), async (tx) => {
      const inquilino = await this.inquilino(tx);

      const r = await tx.execute<LinhaPagina>(sql`
        select ${COLUNAS_DO_ITEM},
               e.texto_divulgacao, e.local_endereco, e.taxa_servo, e.vagas_servos,
               ${ocupadas('servo')} as ocupadas_servo,
               e.inscricoes_abrem_em, e.inscricoes_fecham_em,
               c.max_parcelas, c.parcela_minima
          from encontro e join central c on c.id = e.central_id
         where c.slug = ${centralSlug} and e.slug = ${encontroSlug} and e.situacao = 'publicado'`);

      // 02-inscricao.md §4.2: não distingue "não existe" de "não publicado".
      const linha = r.rows[0];
      if (!linha) throw new ErroDeDominio('ENCONTRO_NAO_ENCONTRADO', 'Encontro não encontrado.');

      const termo = await tx.execute<LinhaTermo>(sql`
        select versao, titulo, corpo, finalidades, controlador_nome, controlador_documento,
               encarregado_nome, encarregado_contato
          from termo where situacao = 'vigente'`);

      return {
        inquilino: blocoDoInquilino(inquilino),
        ...itemDaAgenda(linha, inquilino),
        textoDivulgacao: linha.texto_divulgacao,
        localEndereco: linha.local_endereco,
        taxaServo: Number(linha.taxa_servo),
        vagasRestantesServo: Math.max(linha.vagas_servos - linha.ocupadas_servo, 0),
        inscricoesAbremEm: new Date(linha.inscricoes_abrem_em).toISOString(),
        inscricoesFechamEm: new Date(linha.inscricoes_fecham_em).toISOString(),
        maxParcelas: linha.max_parcelas,
        parcelaMinima: Number(linha.parcela_minima),
        // Fora do payload de §4.2, e necessário: a ficha só consegue coletar o
        // aceite (RN-090) mostrando o termo e devolvendo a versão que leu.
        termo: termo.rows[0] ? blocoDoTermo(termo.rows[0]) : null,
      };
    });
  }

  private async inquilino(tx: Tx): Promise<LinhaInquilino> {
    const r = await tx.execute<LinhaInquilino>(sql`
      select nome, logo_url, cor_primaria, cor_texto_sobre_primaria, rotulos, situacao from inquilino`);
    return r.rows[0];
  }
}

/** RN-214: marca e rótulos na mesma resposta, para o SSR não fazer segunda ida. */
function blocoDoInquilino(inquilino: LinhaInquilino) {
  return {
    nome: inquilino.nome,
    logoUrl: inquilino.logo_url,
    corPrimaria: inquilino.cor_primaria,
    corTextoSobrePrimaria: inquilino.cor_texto_sobre_primaria,
    rotulos: inquilino.rotulos,
  };
}

function itemDaAgenda(linha: LinhaEncontro, inquilino: LinhaInquilino) {
  return {
    id: linha.id,
    central: {
      slug: linha.central_slug,
      nome: linha.central_nome,
      cidade: linha.central_cidade,
      uf: linha.central_uf,
    },
    numero: linha.numero,
    titulo: linha.titulo,
    slug: linha.slug,
    dataInicio: linha.data_inicio,
    dataFim: linha.data_fim,
    localNome: linha.local_nome,
    localCidade: linha.local_cidade,
    localUf: linha.local_uf,
    imagemCapaUrl: linha.imagem_capa_url,
    taxaParticipante: Number(linha.taxa_participante),
    // RN-209: informativo, pode estar defasado em segundos de pico — quem
    // decide a vaga é a criação, sob lock.
    vagasRestantesParticipante: Math.max(linha.vagas_participantes - linha.ocupadas_participante, 0),
    // RN-063t: inquilino suspenso mantém a área pública em leitura, sem inscrição.
    inscricoesAbertas: linha.janela_aberta && inquilino.situacao === 'ativo',
  };
}

function blocoDoTermo(termo: LinhaTermo) {
  return {
    versao: termo.versao,
    titulo: termo.titulo,
    corpo: termo.corpo,
    finalidades: termo.finalidades,
    controladorNome: termo.controlador_nome,
    controladorDocumento: termo.controlador_documento,
    encarregadoNome: termo.encarregado_nome,
    encarregadoContato: termo.encarregado_contato,
  };
}
