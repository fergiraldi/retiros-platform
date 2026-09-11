import { ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AutenticacaoGuard } from '../src/autenticacao/autenticacao.guard';
import type { ResolvedorDeContaService } from '../src/autenticacao/resolvedor-de-conta.service';
import type { VerificadorDeJwtService } from '../src/autenticacao/verificador-de-jwt.service';
import type { ContaDeAcesso } from '../src/autenticacao/autenticacao.types';
import type { HostReconhecido } from '../src/contexto/contexto.types';
import type { RequisicaoComContexto } from '../src/contexto/contexto.interceptor';
import { ErroDeDominio } from '../src/erros/erro-de-dominio';

// Mesmo padrão de test/resolvedor-de-host.guard.spec.ts: ExecutionContext falso
// (infra e2e é o item 23) e conferência do que o guard grava na requisição, que
// é o insumo do ContextoInterceptor logo em seguida.

const HOST_DE_INQUILINO: HostReconhecido = {
  host: 'homens-de-fe.app.com.br',
  tipo: 'inquilino',
  inquilinoId: 'inq-1',
  situacao: 'ativo',
};

const HOST_DO_OPERADOR: HostReconhecido = {
  host: 'operador.app.com.br',
  tipo: 'operador',
  inquilinoId: null,
  situacao: null,
};

const CONTA_ADMIN_CENTRAL: ContaDeAcesso = {
  id: 'usr-1',
  inquilinoId: 'inq-1',
  centralId: 'cen-1',
  pessoaId: null,
  papel: 'admin_central',
  situacao: 'ativa',
};

function criarCtx(cabecalhos: Record<string, string>, host?: HostReconhecido) {
  const req = {
    headers: cabecalhos,
    hostResolvido: host,
  } as unknown as RequisicaoComContexto;

  const ctx = {
    getType: () => 'http',
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;

  return { ctx, req };
}

interface Dubles {
  conta?: ContaDeAcesso | null;
  isento?: boolean;
  erroDeJwt?: Error;
}

function criarGuard(d: Dubles = {}) {
  const verificar = d.erroDeJwt
    ? jest.fn().mockRejectedValue(d.erroDeJwt)
    : jest.fn().mockResolvedValue({ sub: 'sub-1', email: 'pessoa@exemplo.com.br' });

  const resolver = jest.fn().mockResolvedValue(d.conta ?? null);
  const registrarAcesso = jest.fn().mockResolvedValue(undefined);
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(d.isento ?? false) };

  const guard = new AutenticacaoGuard(
    { verificar } as unknown as VerificadorDeJwtService,
    { resolver, registrarAcesso } as unknown as ResolvedorDeContaService,
    reflector as unknown as Reflector,
  );

  return { guard, verificar, resolver, registrarAcesso };
}

/** Silencia o `Logger.warn` do alerta e devolve o espião, para os casos que o
 *  conferem. Sem isto o alerta polui a saída da suíte. */
function espiarAlerta() {
  return jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
}

const COM_TOKEN = { authorization: 'Bearer token-qualquer' };

describe('AutenticacaoGuard', () => {
  describe('falha fechada', () => {
    it('sem cabeçalho Authorization: 401, e nem chega a consultar conta', async () => {
      const { guard, resolver } = criarGuard();
      const { ctx } = criarCtx({}, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      expect(resolver).not.toHaveBeenCalled();
    });

    it('cabeçalho sem o prefixo Bearer: 401', async () => {
      const { guard } = criarGuard();
      const { ctx } = criarCtx({ authorization: 'token-cru-sem-bearer' }, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('JWT que não verifica: 401, sem revelar qual validação reprovou', async () => {
      const { guard } = criarGuard({ erroDeJwt: new Error('exp inválido') });
      const { ctx } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rota isenta de host mas não de autenticação: 500, porque é bug de fiação', async () => {
      const { guard } = criarGuard({ conta: CONTA_ADMIN_CENTRAL });
      const { ctx } = criarCtx(COM_TOKEN, undefined);

      // Não 401: token não é o problema, e mascarar isto como erro de cliente
      // deixaria uma rota administrativa sem a RN-060t sem ninguém notar.
      await expect(guard.canActivate(ctx)).rejects.toThrow(/@SemResolucaoDeHost/);
    });
  });

  describe('RN-060t — travessia por host', () => {
    it('identidade válida sem conta neste host: 403 VINCULO_INVALIDO e alerta (CA-24c)', async () => {
      // É o cenário do CA-24c: token legítimo da Homens de Fé no host da Tabor.
      // 403 e não 401 porque a distinção "tem conta em outro inquilino?" é
      // impossível de propósito — a restritiva de RLS é por inquilino, e
      // perguntar seria a sondagem cross-inquilino que a RN-052t proíbe. A
      // requisição está autenticada; falta autorização neste endereço.
      const alerta = espiarAlerta();
      const { guard } = criarGuard({ conta: null });
      const { ctx } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).rejects.toMatchObject({
        codigo: 'VINCULO_INVALIDO',
        status: 403,
      });
      expect(alerta).toHaveBeenCalledWith(expect.stringContaining('RN-060t'));
      alerta.mockRestore();
    });

    it('o alerta registra o sub do JWT e nunca o e-mail, que é dado pessoal', async () => {
      const alerta = espiarAlerta();
      const { guard } = criarGuard({ conta: null });
      const { ctx } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ErroDeDominio);

      const mensagem = alerta.mock.calls[0][0] as string;
      expect(mensagem).toContain('sub=sub-1');
      expect(mensagem).not.toContain('pessoa@exemplo.com.br');
      alerta.mockRestore();
    });

    it('conta de inquilino no host do operador: 403', async () => {
      const alerta = espiarAlerta();
      // Defesa em profundidade: a RLS não deveria ter deixado esta linha
      // aparecer no contexto de operador. A conferência existe porque a quebra
      // daquela policy seria silenciosa.
      const { guard } = criarGuard({ conta: CONTA_ADMIN_CENTRAL });
      const { ctx } = criarCtx(COM_TOKEN, HOST_DO_OPERADOR);

      await expect(guard.canActivate(ctx)).rejects.toMatchObject({
        codigo: 'VINCULO_INVALIDO',
      });
      alerta.mockRestore();
    });

    it('conta de operador em host de inquilino: 403', async () => {
      const alerta = espiarAlerta();
      const { guard } = criarGuard({
        conta: {
          id: 'usr-op',
          inquilinoId: null,
          centralId: null,
          pessoaId: null,
          papel: 'operador',
          situacao: 'ativa',
        },
      });
      const { ctx } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).rejects.toMatchObject({
        codigo: 'VINCULO_INVALIDO',
      });
      alerta.mockRestore();
    });
  });

  describe('RN-018 — situação vale no ato', () => {
    it.each(['convidada', 'suspensa', 'revogada'] as const)(
      'conta %s: 403 CONTA_INATIVA, sem esperar sessão expirar',
      async (situacao) => {
        const { guard } = criarGuard({ conta: { ...CONTA_ADMIN_CENTRAL, situacao } });
        const { ctx } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

        await expect(guard.canActivate(ctx)).rejects.toMatchObject({
          codigo: 'CONTA_INATIVA',
          status: 403,
        });
      },
    );

    it('não registra acesso de conta inativa', async () => {
      const { guard, registrarAcesso } = criarGuard({
        conta: { ...CONTA_ADMIN_CENTRAL, situacao: 'suspensa' },
      });
      const { ctx } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ErroDeDominio);
      expect(registrarAcesso).not.toHaveBeenCalled();
    });
  });

  describe('papel efetivo (PRD §8.1, passo 4)', () => {
    it('admin_central: contexto com a central da conta', async () => {
      const { guard, registrarAcesso } = criarGuard({ conta: CONTA_ADMIN_CENTRAL });
      const { ctx, req } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(req.contextoRetiros).toEqual({
        inquilinoId: 'inq-1',
        centralId: 'cen-1',
        pessoaId: null,
        papel: 'admin_central',
      });
      expect(req.contaAutenticada).toBe(CONTA_ADMIN_CENTRAL);
      // A conta inteira, não só o id: `registrarAcesso` precisa do
      // `inquilinoId` para abrir o contexto sob o qual a RLS deixa o update
      // passar.
      expect(registrarAcesso).toHaveBeenCalledWith(CONTA_ADMIN_CENTRAL);
    });

    it('admin_denominacao: central nula — escopo é o inquilino inteiro', async () => {
      const { guard } = criarGuard({
        conta: {
          ...CONTA_ADMIN_CENTRAL,
          centralId: null,
          papel: 'admin_denominacao',
        },
      });
      const { ctx, req } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await guard.canActivate(ctx);

      expect(req.contextoRetiros).toMatchObject({ papel: 'admin_denominacao', centralId: null });
    });

    it('servo: leva pessoaId e NÃO leva central, mesmo se a coluna vier preenchida (RN-014)', async () => {
      // Fixar a central na conta `servo` impediria quem serviu em Cascavel de
      // servir em Maringá sem segunda conta (RN-017).
      const { guard } = criarGuard({
        conta: {
          ...CONTA_ADMIN_CENTRAL,
          centralId: 'cen-1',
          pessoaId: 'pes-1',
          papel: 'servo',
        },
      });
      const { ctx, req } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await guard.canActivate(ctx);

      expect(req.contextoRetiros).toEqual({
        inquilinoId: 'inq-1',
        centralId: null,
        pessoaId: 'pes-1',
        papel: 'servo',
      });
    });

    it('operador no host do operador: contexto sem inquilino e sem central', async () => {
      const { guard } = criarGuard({
        conta: {
          id: 'usr-op',
          inquilinoId: null,
          centralId: null,
          pessoaId: null,
          papel: 'operador',
          situacao: 'ativa',
        },
      });
      const { ctx, req } = criarCtx(COM_TOKEN, HOST_DO_OPERADOR);

      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(req.contextoRetiros).toEqual({
        inquilinoId: null,
        centralId: null,
        pessoaId: null,
        papel: 'operador',
      });
    });

    it('nunca concede papel que a conta não tem — o papel vem da conta, não do host', async () => {
      // Irmão do controle negativo de test/resolvedor-de-host.guard.spec.ts: o
      // guard de host não pode conceder 'operador'; este não pode promover
      // ninguém acima do que a linha de `usuario` diz.
      const { guard } = criarGuard({
        conta: { ...CONTA_ADMIN_CENTRAL, papel: 'servo', pessoaId: 'pes-1' },
      });
      const { ctx, req } = criarCtx(COM_TOKEN, HOST_DE_INQUILINO);

      await guard.canActivate(ctx);

      expect(req.contextoRetiros?.papel).toBe('servo');
    });
  });

  describe('isenções', () => {
    it('@SemAutenticacao() passa sem token e sem consultar nada', async () => {
      const { guard, verificar, resolver } = criarGuard({ isento: true });
      const { ctx, req } = criarCtx({}, HOST_DE_INQUILINO);

      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(verificar).not.toHaveBeenCalled();
      expect(resolver).not.toHaveBeenCalled();
      // Não sobrescreve o contexto público que o guard de host deixou.
      expect(req.contaAutenticada).toBeUndefined();
    });

    it('lê o metadado do handler E da classe (marcar o controller inteiro funciona)', async () => {
      const { guard } = criarGuard({ isento: true });
      const { ctx } = criarCtx({}, HOST_DE_INQUILINO);
      const reflector = (guard as unknown as { reflector: Reflector }).reflector;

      await guard.canActivate(ctx);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('sem_autenticacao', [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('contexto não-HTTP passa sem tocar em nada', async () => {
      const { guard, verificar } = criarGuard();
      const ctx = { getType: () => 'rpc' } as unknown as ExecutionContext;

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(verificar).not.toHaveBeenCalled();
    });
  });
});
