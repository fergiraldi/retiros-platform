import { HttpException } from '@nestjs/common';
import { CATALOGO_ERROS, CodigoErro } from './codigos-erro';

/**
 * RNF-011 — exceção de erro de domínio. Todo controller/service que precisar
 * recusar uma requisição por regra de negócio lança isto, nunca `HttpException`
 * genérica: o status HTTP vem sozinho do `CATALOGO_ERROS`, e o
 * `EnvelopeDeErroFilter` (global) transforma em `{ erro: { codigo, mensagem,
 * detalhes } }`.
 *
 * @example
 * throw new ErroDeDominio('JA_INSCRITO', 'Você já está inscrito neste encontro.', { encontroId });
 */
export class ErroDeDominio extends HttpException {
  constructor(
    public readonly codigo: CodigoErro,
    public readonly mensagem: string,
    public readonly detalhes?: Record<string, unknown>,
  ) {
    super(mensagem, CATALOGO_ERROS[codigo]);
  }
}
