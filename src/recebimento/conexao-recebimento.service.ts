import { randomBytes } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { ContaDeAcesso } from '../autenticacao/autenticacao.types';
import { gravarSegredo, lerSegredo } from '../cofre/cofre';
import { UnidadeDeTrabalhoService } from '../contexto/unidade-de-trabalho.service';
import type { ContextoRequisicao } from '../contexto/contexto.types';
import { uuidV7 } from '../db/uuid-v7';
import { ErroDeDominio } from '../erros/erro-de-dominio';
import { OAuthMercadoPago } from '../mercado-pago/oauth-mercado-pago';
import type { TokensMercadoPago } from '../mercado-pago/oauth-mercado-pago';

/** O `code` do Mercado Pago vale 10 minutos; o `state` não precisa durar mais. */
const VALIDADE_DO_ESTADO_MS = 10 * 60_000;
const MAX_ESTADOS = 1_000;

/** RN-122: renova o que vence em menos de 15 dias; na 3ª falha, desativa. */
const ANTECEDENCIA_DA_RENOVACAO = '15 days';
const FALHAS_ATE_DESATIVAR = 3;

/** Página do front para onde o navegador volta depois do Mercado Pago. */
export const CAMINHO_DE_VOLTA = '/admin/recebimento';

/** Quem pediu a conexão — o que o `state` recupera na volta. */
interface Pedido {
  inquilinoId: string;
  centralId: string | null;
  usuarioId: string;
  /** `protocolo://host` do inquilino onde o admin estava. */
  origem: string;
  expiraEm: number;
}

type ConexaoAVencer = {
  id: string;
  access_token_ref: string;
  refresh_token_ref: string;
  falhas_refresh: number;
};

/**
 * A conexão de recebimento com o Mercado Pago (03-cobranca.md §7.3, RN-104,
 * RN-105, RN-122). O dinheiro da inscrição vai para a conta da denominação (ou
 * da central) que autorizou — nunca passa pela do operador.
 *
 * O retorno do Mercado Pago chega pelo navegador, sem sessão nenhuma: o que
 * liga a volta à ida é o `state`, guardado aqui em memória.
 *
 * ponytail: `state` em memória do processo — uma réplica por ambiente hoje
 * (README). Com mais de uma, a volta pode cair noutra réplica e falhar: mover
 * para uma tabela com validade.
 */
@Injectable()
export class ConexaoRecebimentoService {
  private readonly logger = new Logger(ConexaoRecebimentoService.name);
  private readonly pedidos = new Map<string, Pedido>();

  constructor(
    private readonly uow: UnidadeDeTrabalhoService,
    private readonly oauth: OAuthMercadoPago,
  ) {}

  iniciar(conta: ContaDeAcesso, origem: string): { urlAutorizacao: string } {
    const centralId = centralDaConexao(conta);

    if (!this.oauth.configurado()) {
      throw new ErroDeDominio(
        'RECEBIMENTO_INDISPONIVEL',
        'O recebimento ainda não foi configurado na plataforma.',
      );
    }

    const state = randomBytes(32).toString('base64url');
    this.guardar(state, {
      inquilinoId: conta.inquilinoId!,
      centralId,
      usuarioId: conta.id,
      origem,
      expiraEm: Date.now() + VALIDADE_DO_ESTADO_MS,
    });

    return { urlAutorizacao: this.oauth.urlDeAutorizacao(state) };
  }

  /**
   * A volta do Mercado Pago. Devolve para onde mandar o navegador: a página de
   * recebimento do inquilino onde o admin estava, com o desfecho na query.
   * `state` desconhecido, vencido ou já usado é `400`: não se sabe de que
   * inquilino ele veio, então não há para onde voltar.
   */
  async concluir(state: string | undefined, code: string | undefined): Promise<string> {
    const pedido = state ? this.pedidos.get(state) : undefined;
    if (state) this.pedidos.delete(state); // uso único

    if (!pedido || pedido.expiraEm < Date.now()) {
      throw new BadRequestException('Pedido de conexão inválido ou vencido. Comece de novo.');
    }

    const volta = (desfecho: string) => `${pedido.origem}${CAMINHO_DE_VOLTA}?conexao=${desfecho}`;

    // Sem `code`, a pessoa recusou a autorização no Mercado Pago.
    if (!code) return volta('recusada');

    try {
      const tokens = await this.oauth.trocarCodigo(code);
      await this.gravarConexao(pedido, tokens);
      return volta('ok');
    } catch (erro) {
      this.logger.warn(`Conexão com o Mercado Pago falhou: ${erro instanceof Error ? erro.message : erro}`);
      return volta('erro');
    }
  }

  /**
   * RN-122 — percorre as conexões ativas que vencem em menos de 15 dias e
   * renova cada uma. O agendamento diário é o item 16; até lá, isto é chamado
   * por quem precisar.
   *
   * Inquilino por inquilino porque a restritiva de `conexao_gateway` não tem
   * exceção nenhuma, nem para operador: nenhum contexto lista conexões de dois
   * inquilinos de uma vez.
   */
  async renovarConexoesAVencer(): Promise<{ renovadas: number; falhas: number }> {
    const inquilinos = await this.uow.executar({ papel: 'operador' }, (tx) =>
      tx.execute<{ id: string }>(sql`select id from inquilino where situacao <> 'encerrado'`),
    );

    let renovadas = 0;
    let falhas = 0;
    for (const { id: inquilinoId } of inquilinos.rows) {
      const contexto: ContextoRequisicao = { inquilinoId, papel: 'admin_denominacao' };
      const aVencer = await this.uow.executar(contexto, (tx) =>
        tx.execute<ConexaoAVencer>(sql`
          select id, access_token_ref, refresh_token_ref, falhas_refresh from conexao_gateway
           where ativa and expira_em < now() + ${ANTECEDENCIA_DA_RENOVACAO}::interval`),
      );

      for (const conexao of aVencer.rows) {
        if (await this.renovar(contexto, conexao)) renovadas += 1;
        else falhas += 1;
      }
    }

    return { renovadas, falhas };
  }

  /** Lê o refresh token, chama o Mercado Pago **fora** de transação — rede
   *  lenta não segura conexão do pool — e grava o resultado em outra. */
  private async renovar(contexto: ContextoRequisicao, conexao: ConexaoAVencer): Promise<boolean> {
    const refreshToken = await this.uow.executar(contexto, (tx) =>
      lerSegredo(tx, conexao.refresh_token_ref),
    );

    let tokens: TokensMercadoPago | undefined;
    try {
      if (refreshToken) tokens = await this.oauth.renovar(refreshToken);
    } catch (erro) {
      this.logger.warn(
        `Renovação da conexão ${conexao.id} falhou: ${erro instanceof Error ? erro.message : erro}`,
      );
    }

    await this.uow.executar(contexto, async (tx) => {
      if (tokens) {
        // O refresh token é rotacionado: o antigo deixou de valer agora.
        await gravarSegredo(tx, conexao.access_token_ref, tokens.accessToken);
        await gravarSegredo(tx, conexao.refresh_token_ref, tokens.refreshToken);
        await tx.execute(sql`
          update conexao_gateway
             set expira_em = now() + make_interval(secs => ${tokens.expiraEmSegundos}),
                 ultimo_refresh_em = now(), falhas_refresh = 0
           where id = ${conexao.id}`);
        return;
      }

      // O alerta a operador e admin (RN-122) depende do envio de notificação,
      // item 19 — até lá, o registro é este e o log acima.
      const desativar = conexao.falhas_refresh + 1 >= FALHAS_ATE_DESATIVAR;
      await tx.execute(sql`
        update conexao_gateway
           set falhas_refresh = falhas_refresh + 1,
               ativa = ${!desativar},
               desativada_em = ${desativar ? sql`now()` : sql`desativada_em`},
               motivo_desativacao = ${desativar ? 'falha_renovacao' : null}
         where id = ${conexao.id}`);
    });

    return tokens !== undefined;
  }

  /**
   * Grava a conexão sob o contexto de quem a pediu. RN-105: reconectar
   * substitui a anterior **no mesmo ato** — a antiga fica `ativa = false`, não
   * é apagada, porque cobrança emitida por ela continua viva no gateway.
   */
  private async gravarConexao(pedido: Pedido, tokens: TokensMercadoPago): Promise<void> {
    const contexto: ContextoRequisicao = {
      inquilinoId: pedido.inquilinoId,
      centralId: pedido.centralId,
      papel: pedido.centralId ? 'admin_central' : 'admin_denominacao',
    };

    await this.uow.executar(contexto, async (tx) => {
      // RN-018 vale no ato: conta suspensa entre a ida e a volta não conecta.
      const conta = await tx.execute<{ situacao: string }>(
        sql`select situacao from usuario where id = ${pedido.usuarioId}`,
      );
      if (conta.rows[0]?.situacao !== 'ativa') {
        throw new Error('a conta que pediu a conexão não está mais ativa');
      }

      await tx.execute(sql`
        update conexao_gateway
           set ativa = false, desativada_em = now(), motivo_desativacao = 'desconectada_pelo_inquilino'
         where ativa and gateway = 'mercadopago' and central_id is not distinct from ${pedido.centralId}::uuid`);

      // RN-121: na tabela, só o nome do segredo. O token vai para o cofre, na
      // mesma transação — os dois se confirmam ou se desfazem juntos.
      const id = uuidV7();
      const acesso = `mercadopago:${id}:access`;
      const renovacao = `mercadopago:${id}:refresh`;
      await gravarSegredo(tx, acesso, tokens.accessToken);
      await gravarSegredo(tx, renovacao, tokens.refreshToken);

      await tx.execute(sql`
        insert into conexao_gateway (
          id, inquilino_id, central_id, gateway, conta_externa_id, access_token_ref,
          refresh_token_ref, expira_em, escopos, conectada_por
        ) values (
          ${id}, ${pedido.inquilinoId}, ${pedido.centralId}, 'mercadopago', ${tokens.contaExternaId},
          ${acesso}, ${renovacao}, now() + make_interval(secs => ${tokens.expiraEmSegundos}),
          ${sql.param(tokens.escopos)}::text[], ${pedido.usuarioId}
        )`);

      await tx.execute(sql`
        insert into auditoria (id, inquilino_id, central_id, entidade, entidade_id, acao, ator_tipo, ator_id, depois)
        values (${uuidV7()}, ${pedido.inquilinoId}, ${pedido.centralId}, 'conexao_gateway', ${id}, 'conectada',
                'usuario', ${pedido.usuarioId},
                ${JSON.stringify({ contaExternaId: tokens.contaExternaId, escopos: tokens.escopos })}::jsonb)`);
    });
  }

  private guardar(state: string, pedido: Pedido): void {
    const agora = Date.now();
    for (const [chave, existente] of this.pedidos) {
      if (existente.expiraEm < agora) this.pedidos.delete(chave);
    }
    if (this.pedidos.size >= MAX_ESTADOS) {
      const maisAntigo = this.pedidos.keys().next();
      if (!maisAntigo.done) this.pedidos.delete(maisAntigo.value);
    }
    this.pedidos.set(state, pedido);
  }
}

/**
 * RN-105 — quem conecta, e o escopo vem do papel, não de parâmetro: admin da
 * denominação conecta o inquilino inteiro (`central_id` nulo), admin da central
 * conecta a própria central. Ninguém mais — nem o operador, que capaz de
 * conectar seria capaz de redirecionar o dinheiro de um retiro.
 */
function centralDaConexao(conta: ContaDeAcesso): string | null {
  if (conta.papel === 'admin_denominacao') return null;
  if (conta.papel === 'admin_central' && conta.centralId) return conta.centralId;
  throw new ForbiddenException('Só o admin da denominação ou da central conecta o recebimento.');
}
