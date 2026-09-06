import { ambiente } from '../src/config/ambiente';
import type { SituacaoInquilino } from '../src/contexto/contexto.types';
import {
  normalizarHost,
  ReconhecedorDeHostService,
  TTL_DESCONHECIDO_MS,
  TTL_RECONHECIMENTO_MS,
} from '../src/contexto/reconhecedor-de-host.service';
import type { UnidadeDeTrabalhoService } from '../src/contexto/unidade-de-trabalho.service';

// RN-061t — unitário, com a unidade de trabalho dublada: o que importa aqui é
// a decisão de reconhecimento (quais hosts entram, qual vira 404 neutro, o que
// o cache evita), não o SQL, que o teste de integração cobre contra o banco.
type Linha = { inquilino_id: string; situacao: SituacaoInquilino };

function criarUow(linhas: Linha[]) {
  const execute = jest.fn().mockResolvedValue({ rows: linhas });
  const uow = {
    executarSemContexto: jest.fn((trabalho: (tx: unknown) => Promise<unknown>) =>
      trabalho({ execute }),
    ),
  };
  return { uow: uow as unknown as UnidadeDeTrabalhoService, consultas: uow.executarSemContexto };
}

const LINHA_ATIVA: Linha = { inquilino_id: 'inq-1', situacao: 'ativo' };

describe('ReconhecedorDeHostService', () => {
  const hostOperadorOriginal = ambiente.HOST_OPERADOR;

  afterEach(() => {
    ambiente.HOST_OPERADOR = hostOperadorOriginal;
    jest.useRealTimers();
  });

  describe('host do operador — entrada fixa (PRD §8.1)', () => {
    it('é reconhecido antes do predicado de tenant, sem tocar no banco', async () => {
      ambiente.HOST_OPERADOR = 'operador.app.com.br';
      const { uow, consultas } = criarUow([]);

      const r = await new ReconhecedorDeHostService(uow).reconhecer('operador.app.com.br');

      expect(r).toEqual({
        host: 'operador.app.com.br',
        tipo: 'operador',
        inquilinoId: null,
        situacao: null,
      });
      expect(consultas).not.toHaveBeenCalled();
    });

    it('com HOST_OPERADOR vazio, nenhum host vira operador', async () => {
      ambiente.HOST_OPERADOR = '';
      const { uow } = criarUow([]);

      expect(await new ReconhecedorDeHostService(uow).reconhecer('')).toBeNull();
    });
  });

  describe('hosts de inquilino — lista dinâmica', () => {
    it('resolve o inquilino do host verificado', async () => {
      const { uow } = criarUow([LINHA_ATIVA]);

      expect(await new ReconhecedorDeHostService(uow).reconhecer('tenant.app.com.br')).toEqual({
        host: 'tenant.app.com.br',
        tipo: 'inquilino',
        inquilinoId: 'inq-1',
        situacao: 'ativo',
      });
    });

    it.each<SituacaoInquilino>(['em_implantacao', 'suspenso'])(
      'inquilino %s continua resolvendo, com a situacao no resultado',
      async (situacao) => {
        const { uow } = criarUow([{ inquilino_id: 'inq-1', situacao }]);

        const r = await new ReconhecedorDeHostService(uow).reconhecer('tenant.app.com.br');

        // Quem bloqueia inscrição (RN-063t) e área pública (CA-34) é a rota; se
        // o host morresse aqui, o admin não teria por onde concluir o onboarding.
        expect(r?.situacao).toBe(situacao);
        expect(r?.inquilinoId).toBe('inq-1');
      },
    );
  });

  describe('404 neutro (RN-061t)', () => {
    it('host sem linha em inquilino_dominio não é reconhecido', async () => {
      const { uow } = criarUow([]);

      expect(await new ReconhecedorDeHostService(uow).reconhecer('invasor.example.com')).toBeNull();
    });

    it('inquilino encerrado é indistinguível de host desconhecido', async () => {
      const { uow } = criarUow([{ inquilino_id: 'inq-1', situacao: 'encerrado' }]);
      const encerrado = await new ReconhecedorDeHostService(uow).reconhecer('tenant.app.com.br');

      const { uow: outra } = criarUow([]);
      const desconhecido = await new ReconhecedorDeHostService(outra).reconhecer('nada.example.com');

      expect(encerrado).toBeNull();
      expect(encerrado).toEqual(desconhecido);
    });
  });

  describe('normalização', () => {
    it.each([
      ['Tenant.App.com.BR', 'tenant.app.com.br'],
      ['tenant.app.com.br:3000', 'tenant.app.com.br'],
      ['tenant.app.com.br.', 'tenant.app.com.br'],
      ['  tenant.app.com.br  ', 'tenant.app.com.br'],
    ])('%s vira %s', (entrada, esperado) => {
      expect(normalizarHost(entrada)).toBe(esperado);
    });

    it('host vazio ou ausente não é reconhecido, e nem consulta o banco', async () => {
      const { uow, consultas } = criarUow([LINHA_ATIVA]);
      const servico = new ReconhecedorDeHostService(uow);

      expect(await servico.reconhecer('')).toBeNull();
      expect(await servico.reconhecer(undefined as unknown as string)).toBeNull();
      expect(consultas).not.toHaveBeenCalled();
    });

    it('a variação de caixa e porta cai na MESMA entrada de cache', async () => {
      const { uow, consultas } = criarUow([LINHA_ATIVA]);
      const servico = new ReconhecedorDeHostService(uow);

      await servico.reconhecer('tenant.app.com.br');
      await servico.reconhecer('TENANT.app.com.br:8080');

      expect(consultas).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache', () => {
    it('não reconsulta o banco dentro do TTL', async () => {
      const { uow, consultas } = criarUow([LINHA_ATIVA]);
      const servico = new ReconhecedorDeHostService(uow);

      await servico.reconhecer('tenant.app.com.br');
      await servico.reconhecer('tenant.app.com.br');

      expect(consultas).toHaveBeenCalledTimes(1);
    });

    it('reconsulta depois do TTL — domínio verificado em runtime tem de aparecer sem redeploy', async () => {
      jest.useFakeTimers();
      const { uow, consultas } = criarUow([LINHA_ATIVA]);
      const servico = new ReconhecedorDeHostService(uow);

      await servico.reconhecer('tenant.app.com.br');
      jest.advanceTimersByTime(TTL_RECONHECIMENTO_MS + 1);
      await servico.reconhecer('tenant.app.com.br');

      expect(consultas).toHaveBeenCalledTimes(2);
    });

    it('host desconhecido expira antes do reconhecido', async () => {
      jest.useFakeTimers();
      const { uow, consultas } = criarUow([]);
      const servico = new ReconhecedorDeHostService(uow);

      await servico.reconhecer('invasor.example.com');
      jest.advanceTimersByTime(TTL_DESCONHECIDO_MS + 1);
      await servico.reconhecer('invasor.example.com');

      expect(consultas).toHaveBeenCalledTimes(2);
      expect(TTL_DESCONHECIDO_MS).toBeLessThan(TTL_RECONHECIMENTO_MS);
    });

    it('esquecer(host) força a próxima consulta', async () => {
      const { uow, consultas } = criarUow([LINHA_ATIVA]);
      const servico = new ReconhecedorDeHostService(uow);

      await servico.reconhecer('tenant.app.com.br');
      servico.esquecer('TENANT.app.com.br');
      await servico.reconhecer('tenant.app.com.br');

      expect(consultas).toHaveBeenCalledTimes(2);
    });
  });
});
