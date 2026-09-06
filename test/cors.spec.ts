import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { Logger } from '@nestjs/common';
import { ambiente } from '../src/config/ambiente';
import type { HostReconhecido } from '../src/contexto/contexto.types';
import { criarOpcoesDeCors } from '../src/contexto/cors';
import type { ReconhecedorDeHostService } from '../src/contexto/reconhecedor-de-host.service';

// RN-061t — a lista de Access-Control-Allow-Origin segue os mesmos três hosts
// da resolução de inquilino. Aqui o reconhecedor é dublado: o que se testa é a
// política de origem (esquema, porta, origem ausente, origem negada).
const RECONHECIDO: HostReconhecido = {
  host: 'tenant.app.com.br',
  tipo: 'inquilino',
  inquilinoId: 'inq-1',
  situacao: 'ativo',
};

function criarOpcoes(reconhecido: HostReconhecido | null = RECONHECIDO) {
  const reconhecer = jest.fn().mockResolvedValue(reconhecido);
  const opcoes = criarOpcoesDeCors({ reconhecer } as unknown as ReconhecedorDeHostService);
  return { opcoes, reconhecer };
}

/** Chama a função de origem do pacote `cors` e devolve o que ela liberou. */
function permitir(opcoes: CorsOptions, origem: string | undefined): Promise<unknown> {
  type FuncaoDeOrigem = (
    origem: string | undefined,
    callback: (erro: Error | null, permitido?: unknown) => void,
  ) => void;

  return new Promise((resolve, reject) => {
    (opcoes.origin as unknown as FuncaoDeOrigem)(origem, (erro, permitido) =>
      erro ? reject(erro) : resolve(permitido),
    );
  });
}

describe('CORS dinâmico', () => {
  const ambienteOriginal = ambiente.NODE_ENV;

  afterEach(() => {
    ambiente.NODE_ENV = ambienteOriginal;
  });

  it('origem de host reconhecido é liberada', async () => {
    const { opcoes, reconhecer } = criarOpcoes();

    await expect(permitir(opcoes, 'https://tenant.app.com.br')).resolves.toBe(true);
    expect(reconhecer).toHaveBeenCalledWith('tenant.app.com.br');
  });

  it('origem de host desconhecido é negada sem erro — 500 no preflight seria pior', async () => {
    const { opcoes } = criarOpcoes(null);

    // `false` só omite o cabeçalho e deixa o navegador bloquear; um Error no
    // callback do pacote `cors` viraria 500 fora do envelope de RNF-011.
    await expect(permitir(opcoes, 'https://invasor.example.com')).resolves.toBe(false);
  });

  it('requisição sem Origin é liberada (webhook do gateway, curl, same-origin)', async () => {
    const { opcoes, reconhecer } = criarOpcoes(null);

    await expect(permitir(opcoes, undefined)).resolves.toBe(true);
    expect(reconhecer).not.toHaveBeenCalled();
  });

  it('Origin malformada é negada', async () => {
    const { opcoes, reconhecer } = criarOpcoes();

    await expect(permitir(opcoes, 'nao-e-uma-url')).resolves.toBe(false);
    expect(reconhecer).not.toHaveBeenCalled();
  });

  describe('em produção', () => {
    beforeEach(() => {
      ambiente.NODE_ENV = 'production';
    });

    it('exige https, mesmo em host reconhecido', async () => {
      const { opcoes, reconhecer } = criarOpcoes();

      await expect(permitir(opcoes, 'http://tenant.app.com.br')).resolves.toBe(false);
      expect(reconhecer).not.toHaveBeenCalled();
    });

    it('recusa porta fora da padrão', async () => {
      const { opcoes } = criarOpcoes();

      await expect(permitir(opcoes, 'https://tenant.app.com.br:8443')).resolves.toBe(false);
    });
  });

  describe('fora de produção', () => {
    it('libera http e porta própria — é o front local, sem allowlist paralela', async () => {
      ambiente.NODE_ENV = 'development';
      const { opcoes, reconhecer } = criarOpcoes();

      await expect(permitir(opcoes, 'http://localhost:5173')).resolves.toBe(true);
      // O host continua vindo de inquilino_dominio: nada de atalho no código.
      expect(reconhecer).toHaveBeenCalledWith('localhost');
    });
  });

  it('falha ao consultar o banco nega a origem e registra, sem derrubar o preflight', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const reconhecer = jest.fn().mockRejectedValue(new Error('banco fora do ar'));
    const opcoes = criarOpcoesDeCors({ reconhecer } as unknown as ReconhecedorDeHostService);

    await expect(permitir(opcoes, 'https://tenant.app.com.br')).resolves.toBe(false);
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('credentials ligado — a sessão do front viaja entre origens distintas', () => {
    const { opcoes } = criarOpcoes();
    expect(opcoes.credentials).toBe(true);
  });
});
