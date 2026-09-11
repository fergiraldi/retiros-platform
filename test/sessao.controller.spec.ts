import { Reflector } from '@nestjs/core';
import { SessaoController } from '../src/autenticacao/sessao.controller';
import { SaudeController } from '../src/saude/saude.controller';
import { SEM_AUTENTICACAO } from '../src/autenticacao/autenticacao.guard';
import { SEM_TRANSACAO } from '../src/contexto/contexto.interceptor';
import { SEM_RESOLUCAO_DE_HOST } from '../src/contexto/resolvedor-de-host.guard';
import type { ContaDeAcesso } from '../src/autenticacao/autenticacao.types';

const reflector = new Reflector();

describe('SessaoController', () => {
  it('devolve o papel efetivo de um admin_central', () => {
    const conta: ContaDeAcesso = {
      id: 'usr-1',
      inquilinoId: 'inq-1',
      centralId: 'cen-1',
      pessoaId: null,
      papel: 'admin_central',
      situacao: 'ativa',
    };

    expect(new SessaoController().sessao(conta)).toEqual({
      inquilinoId: 'inq-1',
      centralId: 'cen-1',
      pessoaId: null,
      papel: 'admin_central',
    });
  });

  it('não devolve a central de uma conta servo, mesmo se a coluna vier preenchida', () => {
    // Vazaria a conclusão errada para o front — que a pessoa pertence a uma
    // central (RN-014, RN-017). O controller usa a mesma função que monta o
    // contexto de transação, então não há como as duas divergirem.
    const conta: ContaDeAcesso = {
      id: 'usr-2',
      inquilinoId: 'inq-1',
      centralId: 'cen-1',
      pessoaId: 'pes-1',
      papel: 'servo',
      situacao: 'ativa',
    };

    expect(new SessaoController().sessao(conta)).toEqual({
      inquilinoId: 'inq-1',
      centralId: null,
      pessoaId: 'pes-1',
      papel: 'servo',
    });
  });

  it('não devolve o e-mail — o front já o tem da própria sessão do Supabase', () => {
    const conta: ContaDeAcesso = {
      id: 'usr-1',
      inquilinoId: 'inq-1',
      centralId: null,
      pessoaId: null,
      papel: 'admin_denominacao',
      situacao: 'ativa',
    };

    expect(new SessaoController().sessao(conta)).not.toHaveProperty('email');
  });

  it('é @SemTransacao(): não toca tabela nenhuma', () => {
    const semTransacao = reflector.get<boolean>(
      SEM_TRANSACAO,
      SessaoController.prototype.sessao,
    );

    expect(semTransacao).toBe(true);
  });

  it('NÃO é isenta de autenticação nem de resolução de host', () => {
    // O contrário do healthcheck: é justamente a rota que exerce a cadeia
    // inteira. Se alguém a isentar, o único cenário executável do CA-24c morre.
    expect(
      reflector.get<boolean>(SEM_AUTENTICACAO, SessaoController.prototype.sessao),
    ).toBeUndefined();
    expect(
      reflector.get<boolean>(SEM_RESOLUCAO_DE_HOST, SessaoController.prototype.sessao),
    ).toBeUndefined();
  });
});

describe('SaudeController — fiação das isenções', () => {
  // As três andam juntas e nenhum teste unitário de guard/interceptor as
  // alcança: com o guard de autenticação global, faltar `@SemAutenticacao()`
  // aqui faz o healthcheck da Railway responder 401 e o deploy nunca ficar
  // saudável. Não substitui o e2e do item 23 — fecha a rota que quebra o deploy.
  it.each([
    ['SemTransacao', SEM_TRANSACAO],
    ['SemResolucaoDeHost', SEM_RESOLUCAO_DE_HOST],
    ['SemAutenticacao', SEM_AUTENTICACAO],
  ])('mantém @%s() no handler', (_nome, chave) => {
    expect(reflector.get<boolean>(chave, SaudeController.prototype.status)).toBe(true);
  });
});
