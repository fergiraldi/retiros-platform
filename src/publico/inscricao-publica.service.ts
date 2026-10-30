import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { UnidadeDeTrabalhoService } from '../contexto/unidade-de-trabalho.service';
import type { Tx } from '../db/tipos';
import { uuidV7 } from '../db/uuid-v7';
import { ErroDeDominio } from '../erros/erro-de-dominio';
import { LimiteDeTaxaService } from '../limite-de-taxa/limite-de-taxa.service';
import { contextoDeLeituraPublica, SITUACOES_QUE_OCUPAM_VAGA } from './encontros-publicos.service';
import type { Ficha } from './ficha.schema';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

/** RN-052: prazo de pagamento da inscrição comum, contado da inscrição. */
const PRAZO_DE_PAGAMENTO_MS = 72 * HORA;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** De onde a ficha veio — o que vai para o consentimento (RN-090) e a auditoria. */
export interface OrigemDaFicha {
  inquilinoId: string;
  /** RN-211: `req.ip`, que respeita o `trust proxy` de `PROXIES_CONFIAVEIS`. */
  ip: string;
  userAgent: string | null;
  /** `protocolo://host` da requisição — a área pública do próprio inquilino. */
  baseUrl: string;
}

/** O que decide se o encontro aceita inscrição (RN-202, RN-063t). */
const COLUNAS_DA_JANELA = sql`
  e.situacao, i.situacao as situacao_inquilino,
  (e.inscricoes_abrem_em <= now() and now() < e.inscricoes_fecham_em) as janela_aberta`;

type LinhaJanela = { situacao: string; situacao_inquilino: string; janela_aberta: boolean };

type LinhaEncontroTravado = LinhaJanela & {
  vagas_participantes: number;
  vagas_servos: number;
  taxa_participante: string;
  taxa_servo: string;
  reembolso_faixas: unknown;
  taxa_plataforma_percentual: string;
  taxa_repassada_ao_inscrito: boolean;
};

type LinhaFila = {
  ocupadas: number;
  ultima_posicao: number;
  na_fila: number;
  /** Situação da inscrição viva desta pessoa no encontro, se houver (RN-031). */
  ja_inscrito: string | null;
};

/**
 * PRD F1, passos 3 a 6 — a ficha de inscrição pública (02-inscricao.md §2 e
 * §4.3). Não cria cobrança: a transação que decide a vaga termina na inscrição
 * (RN-504), e a cobrança é o item 11, em requisição separada.
 */
@Injectable()
export class InscricaoPublicaService {
  constructor(
    private readonly uow: UnidadeDeTrabalhoService,
    private readonly limite: LimiteDeTaxaService,
  ) {}

  async inscrever(encontroId: string, ficha: Ficha, origem: OrigemDaFicha) {
    // RN-210, antes de qualquer consulta: a recusa não pode depender do que o
    // banco sabe sobre o CPF (RN-094a). A chave do CPF é por inquilino pelo
    // mesmo motivo — global, a inscrição dele em outra denominação faria o
    // limite estourar mais cedo aqui, e isso é sinal de existência.
    const { cpf } = ficha.pessoa;
    if (
      !this.limite.permitir(`ficha:ip:${origem.ip}`, 5, 10 * MINUTO) ||
      !this.limite.permitir(`ficha:cpf:${origem.inquilinoId}:${cpf}`, 3, HORA)
    ) {
      throw new ErroDeDominio(
        'MUITAS_TENTATIVAS',
        'Muitas tentativas de inscrição. Aguarde alguns minutos e tente de novo.',
      );
    }

    const consentimento = ficha.consentimento;
    if (!consentimento) {
      throw new ErroDeDominio('CONSENTIMENTO_OBRIGATORIO', 'É preciso aceitar o termo para se inscrever.');
    }

    const centralId = await this.centralDoEncontro(origem.inquilinoId, encontroId);

    // PRD §8.1, "O mesmo contexto, sem sessão do Supabase Auth": a central do
    // encontro, resolvida acima, e `publico`. A escrita casa por `central_id` e
    // não atravessa central nenhuma — é a RLS quem garante, não este código.
    return this.uow.executar(
      { inquilinoId: origem.inquilinoId, centralId, papel: 'publico' },
      async (tx) => {
        // Antes do lock: nada aqui depende da vaga, e cada ida ao banco feita
        // com o encontro travado é espera de todo mundo na fila. Com a API na
        // Railway (sem região na América do Sul) e o banco em São Paulo, cada
        // uma custa ~150 ms — é o que faz a abertura de um encontro concorrido
        // virar fila (RNF-013).
        const termo = await this.termoAceito(tx, consentimento);
        if (ficha.convidadorPessoaId) await this.exigirPessoaDoInquilino(tx, ficha.convidadorPessoaId);
        const pessoaId = await this.registrarPessoa(tx, ficha, centralId);

        // Daqui ao commit o encontro está travado (RN-503): só a decisão da
        // vaga e o que precisa nascer na mesma transação que a inscrição.
        const encontro = await this.travarEncontro(tx, encontroId);

        // 05-lista-de-espera.md §3: contagem sob o lock — decisão e insert
        // atômicos. A mesma consulta confere a RN-031 sem corrida, porque toda
        // criação no encontro passa por este lock; o índice
        // `inscricao_ativa_unica` continua sendo a garantia de banco.
        const fila = await tx.execute<LinhaFila>(sql`
          select count(*) filter (where tipo = ${ficha.tipo} and situacao in ${SITUACOES_QUE_OCUPAM_VAGA})::int as ocupadas,
                 coalesce(max(posicao_espera) filter (where tipo = ${ficha.tipo} and situacao = 'lista_espera'), 0)::int as ultima_posicao,
                 count(*) filter (where tipo = ${ficha.tipo} and situacao = 'lista_espera')::int as na_fila,
                 min(situacao::text) filter (where pessoa_id = ${pessoaId} and situacao <> 'cancelada') as ja_inscrito
            from inscricao
           where encontro_id = ${encontroId}`);
        const { ocupadas, ultima_posicao, na_fila, ja_inscrito } = fila.rows[0];

        // CA-04. A spec pede também "o link de consulta" na resposta. **Não
        // vai**: o token é credencial de acesso sem login (RN-133) e CPF não é
        // segredo — devolvê-lo a quem só digitou o CPF de outra pessoa
        // entregaria a consulta e o cancelamento da inscrição dela. O link
        // chega pelo e-mail cadastrado (item 19).
        if (ja_inscrito) {
          throw new ErroDeDominio('JA_INSCRITO', 'Já existe uma inscrição sua neste encontro.', {
            situacao: ja_inscrito,
          });
        }

        const participante = ficha.tipo === 'participante';
        const temVaga = ocupadas < (participante ? encontro.vagas_participantes : encontro.vagas_servos);
        const situacao = temVaga ? 'pendente_pagamento' : 'lista_espera';
        const valorDevido = participante ? encontro.taxa_participante : encontro.taxa_servo;

        const inscricaoId = uuidV7();
        // RN-133: 32 bytes aleatórios em base64url, sem relação com o id.
        const token = randomBytes(32).toString('base64url');
        const gatilho = temVaga ? 'inscricao_criada' : 'lista_espera_registrada';

        // RN-090b: um registro por ato de aceite, finalidades copiadas da
        // versão. RN-093a: a retenção, quando marcada, é linha própria — nunca
        // finalidade dentro da obrigatória, para poder ser revogada sozinha.
        const consentimentos = [
          { id: uuidV7(), finalidades: termo.finalidades },
          ...(ficha.consentimentoRetencao ? [{ id: uuidV7(), finalidades: ['retencao'] }] : []),
        ];

        // Um comando só, pelo mesmo motivo do "antes do lock" acima. As FKs
        // entre as CTEs (consentimento → inscricao) são conferidas no fim do
        // comando, quando a inscrição já existe.
        const inserida = await tx.execute<{ criado_em: string }>(sql`
          with inscricao_nova as (
            -- RN-203/RN-065/RN-096: valor, âncora do preço e faixas de reembolso
            -- congelados na inscrição — reajuste posterior não alcança ninguém.
            insert into inscricao (
              id, inquilino_id, central_id, encontro_id, pessoa_id, tipo, situacao,
              convidador_pessoa_id, convidador_nome, area_pretendida, valor_devido,
              taxa_plataforma_repassada, taxa_plataforma_percentual, reembolso_faixas,
              campos_extras, token_consulta, posicao_espera
            ) values (
              ${inscricaoId}, ${origem.inquilinoId}, ${centralId}, ${encontroId}, ${pessoaId},
              ${ficha.tipo}, ${situacao}, ${ficha.convidadorPessoaId ?? null},
              ${ficha.convidadorNome ?? null}, ${ficha.areaPretendida ?? null}, ${valorDevido},
              ${encontro.taxa_repassada_ao_inscrito}, ${encontro.taxa_plataforma_percentual},
              ${JSON.stringify(encontro.reembolso_faixas)}::jsonb,
              ${JSON.stringify(ficha.camposExtras)}::jsonb, ${token},
              ${temVaga ? null : ultima_posicao + 1}
            ) returning criado_em
          ), consentimento_novo as (
            insert into consentimento (
              id, inquilino_id, pessoa_id, inscricao_id, termo_id, versao_termo, finalidades,
              aceito_em, ip, user_agent, origem
            )
            select c.id, app_inquilino_id(), ${pessoaId}::uuid, ${inscricaoId}::uuid, ${termo.id}::uuid,
                   ${termo.versao}::text, c.finalidades, now(), ${origem.ip}::inet,
                   ${origem.userAgent}::text, 'site_publico'
              from jsonb_to_recordset(${JSON.stringify(consentimentos)}::jsonb) as c(id uuid, finalidades text[])
          ), notificacao_nova as (
            -- RN-136/RN-507: enfileirada aqui, enviada depois do commit — o
            -- envio é o item 19. Até ele existir, a linha espera em 'pendente'.
            insert into notificacao (
              id, inquilino_id, central_id, inscricao_id, pessoa_id, gatilho, canal, destinatario, chave_unica
            ) values (
              ${uuidV7()}, ${origem.inquilinoId}, ${centralId}, ${inscricaoId}, ${pessoaId},
              ${gatilho}, 'email', ${ficha.pessoa.email}, ${`${gatilho}:${inscricaoId}:1`}
            )
          ), auditoria_nova as (
            -- RN-200/RN-139: inscrição pelo site é ato 'publico'. Sem token nem
            -- dado sensível em 'depois' (01-modelo-de-dados.md §4.7).
            insert into auditoria (
              id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo, depois, ip, user_agent
            ) values (
              ${uuidV7()}, ${origem.inquilinoId}, ${centralId}, 'inscricao', ${inscricaoId}, 'criada', 'publico',
              ${JSON.stringify({ situacao, tipo: ficha.tipo, valorDevido: Number(valorDevido) })}::jsonb,
              ${origem.ip}, ${origem.userAgent}
            )
          )
          select criado_em from inscricao_nova`);

        const criadoEm = new Date(inserida.rows[0].criado_em).getTime();
        return {
          inscricaoId,
          situacao,
          valorDevido: Number(valorDevido),
          tokenConsulta: token,
          urlConsulta: `${origem.baseUrl}/inscricao/${token}`,
          // RN-501: posição ordinal, não o valor cru da coluna.
          posicaoEspera: temVaga ? null : na_fila + 1,
          prazoPagamentoAte: temVaga ? new Date(criadoEm + PRAZO_DE_PAGAMENTO_MS).toISOString() : null,
        };
      },
    );
  }

  /**
   * Leitura sem lock, em transação própria, para descobrir a central — o
   * contexto da escrita depende dela. Rascunho some aqui (CA-31). A janela é
   * conferida já aqui para recusar cedo, sem gravar nada (CA-05), e de novo sob
   * o lock, que é a conferência que vale.
   */
  private async centralDoEncontro(inquilinoId: string, encontroId: string): Promise<string> {
    const linha = UUID.test(encontroId)
      ? await this.uow.executar(contextoDeLeituraPublica(inquilinoId), async (tx) => {
          const r = await tx.execute<LinhaJanela & { central_id: string }>(sql`
            select e.central_id, ${COLUNAS_DA_JANELA}
              from encontro e join inquilino i on i.id = e.inquilino_id
             where e.id = ${encontroId} and e.situacao <> 'rascunho'`);
          return r.rows[0];
        })
      : undefined;

    if (!linha) throw new ErroDeDominio('ENCONTRO_NAO_ENCONTRADO', 'Encontro não encontrado.');
    exigirInscricoesAbertas(linha);
    return linha.central_id;
  }

  /** RN-503: o `for update` na linha do encontro serializa toda inscrição nele. */
  private async travarEncontro(tx: Tx, encontroId: string): Promise<LinhaEncontroTravado> {
    const r = await tx.execute<LinhaEncontroTravado>(sql`
      select ${COLUNAS_DA_JANELA},
             e.vagas_participantes, e.vagas_servos, e.taxa_participante, e.taxa_servo,
             c.reembolso_faixas, i.taxa_plataforma_percentual, i.taxa_repassada_ao_inscrito
        from encontro e
        join central c on c.id = e.central_id
        join inquilino i on i.id = e.inquilino_id
       where e.id = ${encontroId}
         for update of e`);
    const encontro = r.rows[0];

    if (!encontro) throw new ErroDeDominio('ENCONTRO_NAO_ENCONTRADO', 'Encontro não encontrado.');
    exigirInscricoesAbertas(encontro);
    return encontro;
  }

  /**
   * RN-090/RN-204: o aceite tem de ser da versão **vigente**, e cobrir todas as
   * finalidades dela. Quem leu uma versão que entretanto foi substituída não
   * consentiu com o texto em vigor, e recebe a versão nova para aceitar.
   */
  private async termoAceito(tx: Tx, consentimento: NonNullable<Ficha['consentimento']>) {
    const r = await tx.execute<{ id: string; versao: string; finalidades: string[] }>(
      sql`select id, versao, finalidades from termo where situacao = 'vigente'`,
    );
    const termo = r.rows[0];

    // RN-015: sem termo vigente não há inscrição. Inquilino `ativo` sempre tem
    // um; chegar aqui sem ele é inquilino mal implantado, não ficha errada.
    if (!termo) {
      throw new ErroDeDominio('INSCRICOES_FECHADAS', 'As inscrições para este encontro não estão abertas.');
    }

    const cobreTudo = termo.finalidades.every((f) => consentimento.finalidades.includes(f));
    if (consentimento.versaoTermo !== termo.versao || !cobreTudo) {
      throw new ErroDeDominio('CONSENTIMENTO_OBRIGATORIO', 'É preciso aceitar a versão vigente do termo.', {
        versaoVigente: termo.versao,
      });
    }

    return termo;
  }

  /** O campo é contrato (§4.3), mas aponta para `pessoa` por FK — e FK não
   *  passa pela RLS. Conferir sob a RLS impede gravar ponteiro para pessoa de
   *  outro inquilino, e responde igual para "não existe" e "é de outro". */
  private async exigirPessoaDoInquilino(tx: Tx, pessoaId: string): Promise<void> {
    const r = await tx.execute(sql`select 1 from pessoa where id = ${pessoaId}`);
    if (r.rows.length === 0) {
      throw new ErroDeDominio('DADOS_INVALIDOS', 'Dados inválidos.', {
        campos: [{ campo: 'convidadorPessoaId', mensagem: 'Pessoa não encontrada.' }],
      });
    }
  }

  /**
   * 02-inscricao.md §2.2, num comando só. A identidade é global e só se chega a
   * ela por `resolver_identidade`, que devolve o uuid e nada mais (RN-124,
   * RN-065t). A pessoa é deste inquilino: reaproveitada se já existe aqui —
   * atualizando contato e endereço, nunca `nome_completo` (CA-03) —, criada do
   * zero se não — nada vem de outro inquilino (RN-013, CA-24d). Dado sensível é
   * sempre sobrescrito: o da inscrição atual é o que a cozinha precisa.
   *
   * Isto roda fora do lock do encontro, então duas fichas do mesmo CPF ao mesmo
   * tempo (clique duplo) chegariam juntas a `resolver_identidade`, que faz
   * select-e-insert e não pode ser reescrita (0002: cópia da spec). O advisory
   * lock por CPF, até o commit, serializa só esse caso.
   */
  private async registrarPessoa(tx: Tx, ficha: Ficha, centralId: string): Promise<string> {
    const p = ficha.pessoa;
    const s = ficha.dadosSensiveis ?? {};

    const r = await tx.execute<{ pessoa_id: string }>(sql`
      with trava as (
        select pg_advisory_xact_lock(hashtextextended(${`identidade:${p.cpf}`}, 0))
      ), identidade as (
        select resolver_identidade(${p.cpf}, ${p.nomeCompleto}, ${p.dataNascimento}::date) as id from trava
      ), pessoa_gravada as (
        insert into pessoa (
          id, inquilino_id, identidade_id, central_origem_id, nome_completo, nome_cracha,
          data_nascimento, telefone, email, cep, logradouro, numero, complemento, bairro,
          cidade, uf, estado_civil, contato_emergencia_nome, contato_emergencia_fone
        )
        select ${uuidV7()}::uuid, app_inquilino_id(), identidade.id, ${centralId}::uuid,
               ${p.nomeCompleto}::text, ${p.nomeCracha}::text, ${p.dataNascimento}::date,
               ${p.telefone}::text, ${p.email}::text, ${p.cep ?? null}::text,
               ${p.logradouro ?? null}::text, ${p.numero ?? null}::text, ${p.complemento ?? null}::text,
               ${p.bairro ?? null}::text, ${p.cidade ?? null}::text, ${p.uf ?? null}::text,
               ${p.estadoCivil ?? null}::text, ${p.contatoEmergenciaNome}::text,
               ${p.contatoEmergenciaFone}::text
          from identidade
        on conflict (inquilino_id, identidade_id) do update set
          telefone = excluded.telefone, email = excluded.email, cep = excluded.cep,
          logradouro = excluded.logradouro, numero = excluded.numero,
          complemento = excluded.complemento, bairro = excluded.bairro,
          cidade = excluded.cidade, uf = excluded.uf, atualizado_em = now()
        returning id
      )
      insert into pessoa_dado_sensivel (
        pessoa_id, inquilino_id, restricao_alimentar, condicao_saude, medicamentos_uso_continuo, religiao_declarada
      )
      select id, app_inquilino_id(), ${s.restricaoAlimentar ?? null}::text, ${s.condicaoSaude ?? null}::text,
             ${s.medicamentosUsoContinuo ?? null}::text, ${s.religiaoDeclarada ?? null}::text
        from pessoa_gravada
      on conflict (pessoa_id) do update set
        restricao_alimentar = excluded.restricao_alimentar,
        condicao_saude = excluded.condicao_saude,
        medicamentos_uso_continuo = excluded.medicamentos_uso_continuo,
        religiao_declarada = excluded.religiao_declarada,
        atualizado_em = now()
      returning pessoa_id`);

    return r.rows[0].pessoa_id;
  }
}

/** RN-202 e RN-063t, conferidas antes e sob o lock — por isso uma função só. */
function exigirInscricoesAbertas(linha: LinhaJanela): void {
  // CA-37: a mensagem orienta procurar a coordenação.
  if (linha.situacao_inquilino === 'suspenso') {
    throw new ErroDeDominio(
      'INSCRICOES_SUSPENSAS',
      'As inscrições estão temporariamente suspensas. Procure a coordenação do encontro.',
    );
  }

  if (linha.situacao_inquilino !== 'ativo' || linha.situacao !== 'publicado' || !linha.janela_aberta) {
    throw new ErroDeDominio('INSCRICOES_FECHADAS', 'As inscrições para este encontro não estão abertas.');
  }
}
