import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { ErroDeDominio } from '../src/erros/erro-de-dominio';
import { EnvelopeDeErroFilter } from '../src/erros/envelope-de-erro.filter';

// RNF-011 — teste unitário do filtro, sem HTTP real (infra e2e é o item 23,
// ainda não implementada): monta um ArgumentsHost falso com res.status/res.json
// mockados e confere o envelope produzido para os três casos que o filtro trata.
function criarHostFalso() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
  return { res, host };
}

describe('EnvelopeDeErroFilter', () => {
  const filtro = new EnvelopeDeErroFilter();

  it('usa status/codigo/mensagem/detalhes do ErroDeDominio', () => {
    const { res, host } = criarHostFalso();
    const erro = new ErroDeDominio('JA_INSCRITO', 'Você já está inscrito neste encontro.', {
      encontroId: 'abc',
    });

    filtro.catch(erro, host);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      erro: {
        codigo: 'JA_INSCRITO',
        mensagem: 'Você já está inscrito neste encontro.',
        detalhes: { encontroId: 'abc' },
      },
    });
  });

  it('omite "detalhes" quando o ErroDeDominio não passou nenhum', () => {
    const { res, host } = criarHostFalso();
    const erro = new ErroDeDominio('INSCRICOES_FECHADAS', 'As inscrições já encerraram.');

    filtro.catch(erro, host);

    expect(res.json).toHaveBeenCalledWith({
      erro: { codigo: 'INSCRICOES_FECHADAS', mensagem: 'As inscrições já encerraram.' },
    });
  });

  it('mapeia HttpException genérica do Nest (ex.: NotFoundException nu) para um codigo de fallback', () => {
    const { res, host } = criarHostFalso();

    filtro.catch(new NotFoundException(), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Not Found' },
    });
  });

  it('responde 500 genérico para erro não tratado, sem vazar a mensagem original', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { res, host } = criarHostFalso();

    filtro.catch(new Error('detalhe interno sensível'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno. Tente novamente.' },
    });
    expect(JSON.stringify((res.json as jest.Mock).mock.calls[0][0])).not.toContain(
      'detalhe interno sensível',
    );

    logSpy.mockRestore();
  });
});
