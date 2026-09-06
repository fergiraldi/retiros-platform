import { ExecutionContext, NotFoundException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { HostReconhecido } from '../src/contexto/contexto.types';
import type { RequisicaoComContexto } from '../src/contexto/contexto.interceptor';
import type { ReconhecedorDeHostService } from '../src/contexto/reconhecedor-de-host.service';
import { ResolvedorDeHostGuard } from '../src/contexto/resolvedor-de-host.guard';

// Mesmo padrão de test/envelope-de-erro.spec.ts: sem HTTP real (infra e2e é o
// item 23), monta um ExecutionContext falso e confere o que o guard grava na
// requisição — que é o insumo do ContextoInterceptor logo em seguida.
function criarCtx(hostname: string) {
  const req = { hostname } as RequisicaoComContexto;
  const ctx = {
    getType: () => 'http',
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

function criarGuard(reconhecido: HostReconhecido | null, isento = false) {
  const reconhecer = jest.fn().mockResolvedValue(reconhecido);
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(isento) };
  const guard = new ResolvedorDeHostGuard(
    { reconhecer } as unknown as ReconhecedorDeHostService,
    reflector as unknown as Reflector,
  );
  return { guard, reconhecer };
}

const HOST_DE_INQUILINO: HostReconhecido = {
  host: 'tenant.app.com.br',
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

describe('ResolvedorDeHostGuard', () => {
  it('host de inquilino: grava o contexto público com o inquilino resolvido (RN-059t)', async () => {
    const { guard } = criarGuard(HOST_DE_INQUILINO);
    const { ctx, req } = criarCtx('tenant.app.com.br');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(req.contextoRetiros).toEqual({
      inquilinoId: 'inq-1',
      centralId: null,
      pessoaId: null,
      papel: 'publico',
    });
  });

  it('expõe o host resolvido na requisição, com a situacao, para as regras de rota', async () => {
    const { guard } = criarGuard({ ...HOST_DE_INQUILINO, situacao: 'suspenso' });
    const { ctx, req } = criarCtx('tenant.app.com.br');

    await guard.canActivate(ctx);

    // RN-063t: quem bloqueia a inscrição do inquilino suspenso é a rota, e é
    // daqui que ela lê a situação.
    expect(req.hostResolvido?.situacao).toBe('suspenso');
    expect(req.hostResolvido?.tipo).toBe('inquilino');
  });

  describe('host do operador', () => {
    it('resolve sem inquilino_id nenhum no contexto (RN-004, RN-017)', async () => {
      const { guard } = criarGuard(HOST_DO_OPERADOR);
      const { ctx, req } = criarCtx('operador.app.com.br');

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(req.contextoRetiros?.inquilinoId).toBeNull();
      expect(req.hostResolvido?.tipo).toBe('operador');
    });

    it('NÃO concede o papel de operador — o guard não autentica ninguém', async () => {
      const { guard } = criarGuard(HOST_DO_OPERADOR);
      const { ctx, req } = criarCtx('operador.app.com.br');

      await guard.canActivate(ctx);

      // Gravar 'operador' aqui seria escalonamento de privilégio por cabeçalho
      // Host: quem promove o papel é a autenticação, depois de validar o JWT.
      // Com os quatro GUCs vazios a RLS nega tudo (RN-058t).
      expect(req.contextoRetiros?.papel).not.toBe('operador');
      expect(req.contextoRetiros?.papel).toBeNull();
    });
  });

  it('host desconhecido: 404 neutro, sem contexto nenhum gravado (RN-061t)', async () => {
    const { guard } = criarGuard(null);
    const { ctx, req } = criarCtx('invasor.example.com');

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(NotFoundException);
    expect(req.contextoRetiros).toBeUndefined();
    expect(req.hostResolvido).toBeUndefined();
  });

  it('rota marcada com @SemResolucaoDeHost() passa sem consultar host nenhum', async () => {
    const { guard, reconhecer } = criarGuard(null, true);
    const { ctx, req } = criarCtx('healthcheck.railway.internal');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(reconhecer).not.toHaveBeenCalled();
    expect(req.contextoRetiros).toBeUndefined();
  });

  it('contexto não-HTTP (cron, webhook interno) não é barrado por host', async () => {
    const { guard, reconhecer } = criarGuard(null);
    const ctx = { getType: () => 'rpc' } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(reconhecer).not.toHaveBeenCalled();
  });
});
