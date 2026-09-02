import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErroDeDominio } from './erro-de-dominio';

/**
 * RNF-011 — filtro global de exceção. Garante que toda resposta de erro,
 * mapeada ou não, saia no mesmo envelope:
 *
 * ```json
 * { "erro": { "codigo": "...", "mensagem": "...", "detalhes": { ... } } }
 * ```
 *
 * Nunca deixa passar um 500 cru nem um corpo de formato diferente por rota —
 * inclusive para exceção do próprio Nest (ex.: `NotFoundException()` nu no
 * `ResolvedorDeHostGuard`) e para erro inesperado (bug, driver do Postgres).
 */
@Catch()
export class EnvelopeDeErroFilter implements ExceptionFilter {
  private readonly logger = new Logger(EnvelopeDeErroFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, codigo, mensagem, detalhes } = this.resolver(exception);

    res.status(status).json({
      erro: {
        codigo,
        mensagem,
        ...(detalhes !== undefined ? { detalhes } : {}),
      },
    });
  }

  private resolver(exception: unknown): {
    status: number;
    codigo: string;
    mensagem: string;
    detalhes?: Record<string, unknown>;
  } {
    if (exception instanceof ErroDeDominio) {
      return {
        status: exception.getStatus(),
        codigo: exception.codigo,
        mensagem: exception.mensagem,
        detalhes: exception.detalhes,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        codigo: CODIGO_POR_STATUS[status] ?? 'ERRO',
        mensagem: this.mensagemDe(exception),
      };
    }

    this.logger.error(
      'Erro não tratado',
      exception instanceof Error ? exception.stack : exception,
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      codigo: 'ERRO_INTERNO',
      mensagem: 'Erro interno. Tente novamente.',
    };
  }

  /** `ValidationPipe` (item 2) lança `message` como array de erros por campo. */
  private mensagemDe(exception: HttpException): string {
    const resposta = exception.getResponse();
    const mensagem =
      typeof resposta === 'string' ? resposta : (resposta as { message?: unknown }).message;

    if (Array.isArray(mensagem)) return mensagem.join('; ');
    if (typeof mensagem === 'string') return mensagem;
    return exception.message;
  }
}

/** Fallback de `codigo` para exceção HTTP do Nest sem `ErroDeDominio` associado. */
const CODIGO_POR_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'REQUISICAO_INVALIDA',
  [HttpStatus.UNAUTHORIZED]: 'NAO_AUTENTICADO',
  [HttpStatus.FORBIDDEN]: 'ACESSO_NEGADO',
  [HttpStatus.NOT_FOUND]: 'NAO_ENCONTRADO',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'METODO_NAO_PERMITIDO',
  [HttpStatus.TOO_MANY_REQUESTS]: 'MUITAS_TENTATIVAS',
};
