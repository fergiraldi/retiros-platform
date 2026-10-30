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

type LinhaEncontroTravado = {
  situacao: string;
  janela_aberta: boolean;
  vagas_participantes: number;
  vagas_servos: number;
  taxa_participante: string;
  taxa_servo: string;
  reembolso_faixas: unknown;
  situacao_inquilino: string;
  taxa_plataforma_percentual: string;
  taxa_repassada_ao_inscrito: boolean;
};

type LinhaFila = { ocupadas: number; ultima_posicao: number; na_fila: number };

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
        const encontro = await this.travarEncontro(tx, encontroId);
        const termo = await this.termoAceito(tx, consentimento);
        if (ficha.convidadorPessoaId) await this.exigirPessoaDoInquilino(tx, ficha.convidadorPessoaId);

        const pessoaId = await this.registrarPessoa(tx, ficha, centralId);
        await this.recusarSeJaInscrito(tx, encontroId, pessoaId);

        // 05-lista-de-espera.md §3: contagem sob o lock da linha do encontro,
        // tomado em `travarEncontro` — a decisão e o insert são atômicos.
        const fila = await tx.execute<LinhaFila>(sql`
          select count(*) filter (where situacao in ${SITUACOES_QUE_OCUPAM_VAGA})::int as ocupadas,
                 coalesce(max(posicao_espera) filter (where situacao = 'lista_espera'), 0)::int as ultima_posicao,
                 count(*) filter (where situacao = 'lista_espera')::int as na_fila
            from inscricao
           where encontro_id = ${encontroId} and tipo = ${ficha.tipo}`);
        const { ocupadas, ultima_posicao, na_fila } = fila.rows[0];

        const participante = ficha.tipo === 'participante';
        const temVaga = ocupadas < (participante ? encontro.vagas_participantes : encontro.vagas_servos);
        const situacao = temVaga ? 'pendente_pagamento' : 'lista_espera';
        const valorDevido = participante ? encontro.taxa_participante : encontro.taxa_servo;

        const inscricaoId = uuidV7();
        // RN-133: 32 bytes aleatórios em base64url, sem relação com o id.
        const token = randomBytes(32).toString('base64url');

        // RN-203/RN-065/RN-096: valor, âncora do preço e faixas de reembolso
        // congelados na inscrição — reajuste posterior não alcança ninguém.
        const inserida = await tx.execute<{ criado_em: string }>(sql`
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
          ) returning criado_em`);

        await this.registrarConsentimentos(tx, ficha, termo, { pessoaId, inscricaoId }, origem);

        // RN-136/RN-507: enfileirada aqui, enviada depois do commit — o envio é
        // o item 19. Até ele existir, a linha espera em `pendente`.
        const gatilho = temVaga ? 'inscricao_criada' : 'lista_espera_registrada';
        await tx.execute(sql`
          insert into notificacao (id, inquilino_id, central_id, inscricao_id, pessoa_id, gatilho, canal, destinatario, chave_unica)
          values (${uuidV7()}, ${origem.inquilinoId}, ${centralId}, ${inscricaoId}, ${pessoaId},
                  ${gatilho}, 'email', ${ficha.pessoa.email}, ${`${gatilho}:${inscricaoId}:1`})`);

        // RN-200/RN-139: inscrição pelo site é ato `publico`. Sem token nem dado
        // sensível em `depois` (01-modelo-de-dados.md §4.7).
        await tx.execute(sql`
          insert into auditoria (id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo, depois, ip, user_agent)
          values (${uuidV7()}, ${origem.inquilinoId}, ${centralId}, 'inscricao', ${inscricaoId}, 'criada', 'publico',
                  ${JSON.stringify({ situacao, tipo: ficha.tipo, valorDevido: Number(valorDevido) })}::jsonb,
                  ${origem.ip}, ${origem.userAgent})`);

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
   * Leitura sem lock, em transação própria, só para descobrir a central — o
   * contexto da escrita depende dela. Rascunho some aqui (CA-31); as outras
   * situações seguem, para a recusa sair como `INSCRICOES_FECHADAS` depois.
   */
  private async centralDoEncontro(inquilinoId: string, encontroId: string): Promise<string> {
    const centralId = UUID.test(encontroId)
      ? await this.uow.executar(contextoDeLeituraPublica(inquilinoId), async (tx) => {
          const r = await tx.execute<{ central_id: string }>(
            sql`select central_id from encontro where id = ${encontroId} and situacao <> 'rascunho'`,
          );
          return r.rows[0]?.central_id;
        })
      : undefined;

    if (!centralId) throw new ErroDeDominio('ENCONTRO_NAO_ENCONTRADO', 'Encontro não encontrado.');
    return centralId;
  }

  /** RN-503: o `for update` na linha do encontro serializa toda inscrição nele.
   *  RN-202 é conferida aqui, já sob o lock, com o relógio do banco. */
  private async travarEncontro(tx: Tx, encontroId: string): Promise<LinhaEncontroTravado> {
    const r = await tx.execute<LinhaEncontroTravado>(sql`
      select e.situacao, e.vagas_participantes, e.vagas_servos, e.taxa_participante, e.taxa_servo,
             (e.inscricoes_abrem_em <= now() and now() < e.inscricoes_fecham_em) as janela_aberta,
             c.reembolso_faixas, i.situacao as situacao_inquilino,
             i.taxa_plataforma_percentual, i.taxa_repassada_ao_inscrito
        from encontro e
        join central c on c.id = e.central_id
        join inquilino i on i.id = e.inquilino_id
       where e.id = ${encontroId}
         for update of e`);
    const encontro = r.rows[0];

    if (!encontro) throw new ErroDeDominio('ENCONTRO_NAO_ENCONTRADO', 'Encontro não encontrado.');

    // CA-37 / RN-063t: a mensagem orienta procurar a coordenação.
    if (encontro.situacao_inquilino === 'suspenso') {
      throw new ErroDeDominio(
        'INSCRICOES_SUSPENSAS',
        'As inscrições estão temporariamente suspensas. Procure a coordenação do encontro.',
      );
    }

    if (
      encontro.situacao_inquilino !== 'ativo' ||
      encontro.situacao !== 'publicado' ||
      !encontro.janela_aberta
    ) {
      throw new ErroDeDominio('INSCRICOES_FECHADAS', 'As inscrições para este encontro não estão abertas.');
    }

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
   * 02-inscricao.md §2.2. A identidade é global e só se chega a ela por
   * `resolver_identidade`, que devolve o uuid e nada mais (RN-124, RN-065t). A
   * pessoa é deste inquilino: reaproveitada se já existe aqui, criada do zero
   * se não — nada vem de outro inquilino (RN-013, CA-24d).
   */
  private async registrarPessoa(tx: Tx, ficha: Ficha, centralId: string): Promise<string> {
    const p = ficha.pessoa;
    const identidade = await tx.execute<{ id: string }>(
      sql`select resolver_identidade(${p.cpf}, ${p.nomeCompleto}, ${p.dataNascimento}::date) as id`,
    );
    const identidadeId = identidade.rows[0].id;

    const existente = await tx.execute<{ id: string }>(
      sql`select id from pessoa where identidade_id = ${identidadeId}`,
    );
    let pessoaId = existente.rows[0]?.id;

    if (pessoaId) {
      // Atualiza contato e endereço; `nome_completo` não — erro de digitação
      // não apaga o cadastro histórico (CA-03).
      await tx.execute(sql`
        update pessoa
           set telefone = ${p.telefone}, email = ${p.email}, cep = ${p.cep ?? null},
               logradouro = ${p.logradouro ?? null}, numero = ${p.numero ?? null},
               complemento = ${p.complemento ?? null}, bairro = ${p.bairro ?? null},
               cidade = ${p.cidade ?? null}, uf = ${p.uf ?? null}, atualizado_em = now()
         where id = ${pessoaId}`);
    } else {
      pessoaId = uuidV7();
      await tx.execute(sql`
        insert into pessoa (
          id, inquilino_id, identidade_id, central_origem_id, nome_completo, nome_cracha,
          data_nascimento, telefone, email, cep, logradouro, numero, complemento, bairro,
          cidade, uf, estado_civil, contato_emergencia_nome, contato_emergencia_fone
        ) values (
          ${pessoaId}, app_inquilino_id(), ${identidadeId}, ${centralId}, ${p.nomeCompleto},
          ${p.nomeCracha}, ${p.dataNascimento}::date, ${p.telefone}, ${p.email}, ${p.cep ?? null},
          ${p.logradouro ?? null}, ${p.numero ?? null}, ${p.complemento ?? null}, ${p.bairro ?? null},
          ${p.cidade ?? null}, ${p.uf ?? null}, ${p.estadoCivil ?? null},
          ${p.contatoEmergenciaNome}, ${p.contatoEmergenciaFone}
        )`);
    }

    // §2.2: dado sensível é sempre sobrescrito — o da inscrição atual é o que a
    // cozinha e a equipe de saúde precisam.
    const s = ficha.dadosSensiveis ?? {};
    await tx.execute(sql`
      insert into pessoa_dado_sensivel (
        pessoa_id, inquilino_id, restricao_alimentar, condicao_saude, medicamentos_uso_continuo, religiao_declarada
      ) values (
        ${pessoaId}, app_inquilino_id(), ${s.restricaoAlimentar ?? null}, ${s.condicaoSaude ?? null},
        ${s.medicamentosUsoContinuo ?? null}, ${s.religiaoDeclarada ?? null}
      )
      on conflict (pessoa_id) do update set
        restricao_alimentar = excluded.restricao_alimentar,
        condicao_saude = excluded.condicao_saude,
        medicamentos_uso_continuo = excluded.medicamentos_uso_continuo,
        religiao_declarada = excluded.religiao_declarada,
        atualizado_em = now()`);

    return pessoaId;
  }

  /**
   * RN-031 (CA-04). O índice `inscricao_ativa_unica` é a garantia; esta consulta
   * é o que transforma a colisão em `409` legível, e não tem corrida porque toda
   * criação no encontro passa pelo mesmo lock.
   *
   * A spec pede também "o link de consulta" na resposta. **Não vai**: o token é
   * credencial de acesso sem login (RN-133) e CPF não é segredo — devolvê-lo a
   * quem só digitou o CPF de outra pessoa entregaria a consulta e o cancelamento
   * da inscrição dela. O link chega pelo e-mail cadastrado (item 19).
   */
  private async recusarSeJaInscrito(tx: Tx, encontroId: string, pessoaId: string): Promise<void> {
    const r = await tx.execute<{ situacao: string }>(sql`
      select situacao from inscricao
       where encontro_id = ${encontroId} and pessoa_id = ${pessoaId} and situacao <> 'cancelada'`);

    if (r.rows[0]) {
      throw new ErroDeDominio('JA_INSCRITO', 'Já existe uma inscrição sua neste encontro.', {
        situacao: r.rows[0].situacao,
      });
    }
  }

  /** RN-090b: um registro por ato de aceite, finalidades copiadas da versão.
   *  RN-093a: a retenção, quando marcada, é linha própria — nunca finalidade
   *  dentro da obrigatória, para poder ser revogada sozinha. */
  private async registrarConsentimentos(
    tx: Tx,
    ficha: Ficha,
    termo: { id: string; versao: string; finalidades: string[] },
    alvo: { pessoaId: string; inscricaoId: string },
    origem: OrigemDaFicha,
  ): Promise<void> {
    const registrar = (finalidades: string[]) =>
      tx.execute(sql`
        insert into consentimento (
          id, inquilino_id, pessoa_id, inscricao_id, termo_id, versao_termo, finalidades,
          aceito_em, ip, user_agent, origem
        ) values (
          ${uuidV7()}, app_inquilino_id(), ${alvo.pessoaId}, ${alvo.inscricaoId}, ${termo.id},
          ${termo.versao}, ${sql.param(finalidades)}::text[], now(), ${origem.ip}, ${origem.userAgent}, 'site_publico'
        )`);

    await registrar(termo.finalidades);
    if (ficha.consentimentoRetencao) await registrar(['retencao']);
  }
}
