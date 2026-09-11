import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErroDeDominio } from '../erros/erro-de-dominio';
import type { HostReconhecido } from '../contexto/contexto.types';
import type { RequisicaoComContexto } from '../contexto/contexto.interceptor';
import { VerificadorDeJwtService } from './verificador-de-jwt.service';
import { ResolvedorDeContaService } from './resolvedor-de-conta.service';
import { papelEfetivoDaConta } from './papel-efetivo';
import type { ContaDeAcesso } from './autenticacao.types';

/**
 * `mensagem` do envelope RNF-011 é o campo para o usuário, então vai em
 * português — o default do Nest é "Unauthorized". Igual para os três casos de
 * 401 (sem cabeçalho, token que não verifica, e-mail sem conta) de propósito: a
 * resposta não deve dizer ao cliente qual deles ocorreu, e a ação de quem tem
 * um token legítimo é a mesma nos três (renovar a sessão).
 */
const MENSAGEM_NAO_AUTENTICADO = 'Autenticação necessária.';

export const SEM_AUTENTICACAO = 'sem_autenticacao';
/**
 * Marca uma rota (ou um controller inteiro) que não exige conta — a área
 * pública da Fase 1 (ficha de inscrição, agenda, consulta por token) e o
 * healthcheck.
 *
 * O default é o oposto: **sem esta marca, a rota exige conta ativa**. Escolha
 * deliberada, no idioma da RN-058t — quem esquece o decorator numa rota pública
 * recebe 401 e descobre na primeira chamada; quem esquecesse de marcar uma rota
 * como autenticada, no desenho invertido, teria deixado a rota aberta em
 * silêncio.
 */
export const SemAutenticacao = () => SetMetadata(SEM_AUTENTICACAO, true);

/**
 * PRD §8.1, passos 2 a 4: valida o JWT do Supabase Auth, resolve a conta de
 * acesso e promove o papel efetivo no contexto que o `ContextoInterceptor` vai
 * gravar como GUC.
 *
 * Roda **depois** do `ResolvedorDeHostGuard` (a ordem dos `APP_GUARD` em
 * src/app.module.ts é a ordem de execução) e **antes** do interceptor: é o que
 * torna a RN-060t possível — o inquilino do host já está resolvido, e o vínculo
 * da conta é validado *contra* ele, nunca o contrário.
 *
 * Abre transação própria (`executarSemContexto`) antes da que o interceptor
 * abre, pelo mesmo motivo que o `ReconhecedorDeHostService`: a consulta precede
 * o contexto que ela mesma vai produzir.
 */
@Injectable()
export class AutenticacaoGuard implements CanActivate {
  private readonly logger = new Logger(AutenticacaoGuard.name);

  constructor(
    private readonly verificador: VerificadorDeJwtService,
    private readonly resolvedor: ResolvedorDeContaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;

    const isento = this.reflector.getAllAndOverride<boolean>(SEM_AUTENTICACAO, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isento) return true;

    const req = ctx.switchToHttp().getRequest<RequisicaoComContexto>();

    // Rota isenta de resolução de host mas não de autenticação: sem host não há
    // inquilino contra o qual validar o vínculo, e a RN-060t fica sem lado
    // esquerdo. É bug de fiação, não erro de cliente — por isso `Error` (500
    // ruidoso) e não 401, que pareceria problema de token.
    if (!req.hostResolvido) {
      throw new Error(
        'Rota com @SemResolucaoDeHost() sem @SemAutenticacao(): a RN-060t não tem host para validar.',
      );
    }

    const claims = await this.verificarToken(req);
    const conta = await this.resolverConta(req.hostResolvido, claims.email, claims.sub);

    if (conta.situacao !== 'ativa') {
      // RN-018: as duas situações valem no ato. Não distinguimos suspensa de
      // revogada na resposta — para quem está do lado de fora é o mesmo fato
      // ("esta conta não entra"), e o motivo é assunto de quem revogou.
      throw new ErroDeDominio('CONTA_INATIVA', 'Esta conta não está ativa.');
    }

    this.validarVinculo(req.hostResolvido, conta, claims.sub);

    await this.resolvedor.registrarAcesso(conta);

    req.contaAutenticada = conta;
    req.contextoRetiros = papelEfetivoDaConta(conta);

    return true;
  }

  private async verificarToken(req: RequisicaoComContexto) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho?.startsWith('Bearer ')) {
      throw new UnauthorizedException(MENSAGEM_NAO_AUTENTICADO);
    }

    try {
      return await this.verificador.verificar(cabecalho.slice('Bearer '.length));
    } catch (erro) {
      // O motivo vai para o log e não para a resposta: dizer ao cliente qual
      // validação reprovou ajuda quem está sondando, e não ajuda quem tem um
      // token legítimo — para esse, a ação é a mesma (renovar a sessão).
      this.logger.debug(`JWT recusado: ${erro instanceof Error ? erro.message : erro}`);
      throw new UnauthorizedException(MENSAGEM_NAO_AUTENTICADO);
    }
  }

  /**
   * Identidade válida sem conta neste host é **403**, não 401 — e a distinção
   * que o desenho original fazia é impossível, de propósito.
   *
   * A versão anterior perguntava ao banco "este e-mail tem conta em outro
   * inquilino?", para separar a travessia da RN-060t (403 e alerta, CA-24c) de
   * um e-mail sem conta nenhuma (401). Medido em 07/09/2026: **nenhum contexto
   * consegue fazer essa pergunta.** A restritiva `usuario_inquilino` é
   * `inquilino_id = app_inquilino_id()`, e `security definer` não escapa dela
   * porque o `force row level security` alcança o dono da tabela. A pergunta
   * era, ela mesma, a sondagem cross-inquilino que a RN-052t proíbe.
   *
   * Os dois casos passam a ter a mesma resposta, e é a certa para ambos: a
   * requisição **está** autenticada — o JWT é válido —, e o que falta é
   * autorização neste endereço, que é o que 403 significa. Satisfaz o 403 que
   * CA-24c exige e cabe no "401/403" que PRD §8.1 passo 3 admite.
   */
  private async resolverConta(
    host: HostReconhecido,
    email: string,
    sub: string,
  ): Promise<ContaDeAcesso> {
    const conta = await this.resolvedor.resolver(host.inquilinoId, email);

    if (conta) return conta;

    this.alertar('identidade valida sem conta neste host', host, sub);
    throw new ErroDeDominio('VINCULO_INVALIDO', 'Esta conta não tem acesso por este endereço.');
  }

  /**
   * RN-060t explícita. A RLS já garante o escopo — a consulta roda sob
   * `app.inquilino_id` do host, e a restritiva `usuario_inquilino` não deixa
   * outro inquilino aparecer nem se o `where` for esquecido. Esta conferência é
   * defesa em profundidade: a proteção não pode depender de uma única camada
   * cuja quebra (afrouxar aquela policy) seria silenciosa. É a mesma decisão que
   * a migration 0007 tomou para `central.inquilino_id`.
   */
  private validarVinculo(host: HostReconhecido, conta: ContaDeAcesso, sub: string): void {
    const divergente =
      host.tipo === 'operador'
        ? conta.papel !== 'operador' || conta.inquilinoId !== null
        : conta.inquilinoId !== host.inquilinoId;

    if (!divergente) return;

    this.alertar('vinculo divergente do host resolvido', host, sub);
    throw new ErroDeDominio('VINCULO_INVALIDO', 'Esta conta não tem acesso por este endereço.');
  }

  /**
   * O alerta de segurança que a RN-060t pede. Registra o `sub` do JWT e **nunca
   * o e-mail**, que é dado pessoal — o `sub` identifica a mesma sessão sem
   * carregar identidade para dentro do log.
   *
   * Log estruturado é o item 7 e a linha em `auditoria` é o item 18; até eles,
   * `warn` é o canal, e está registrado em docs/pendencias-tecnicas.md.
   */
  private alertar(motivo: string, host: HostReconhecido, sub: string): void {
    this.logger.warn(
      `RN-060t: ${motivo} (host=${host.host} tipo=${host.tipo} ` +
        `inquilinoDoHost=${host.inquilinoId ?? '-'} sub=${sub})`,
    );
  }
}
