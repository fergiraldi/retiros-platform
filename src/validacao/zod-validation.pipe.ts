import { PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { ErroDeDominio } from '../erros/erro-de-dominio';

/**
 * RNF-011/RN item 2 — valida `@Body()`/`@Query()` contra um schema Zod.
 * Cada rota declara o próprio schema; não há pipe global equivalente ao
 * `ValidationPipe` do class-validator, porque cada endpoint tem um shape
 * diferente (RN-116 — obrigatoriedade de campo varia por inquilino em
 * runtime — e a união Pix/cartão da cobrança são exatamente os casos que
 * schema-como-valor resolve melhor que decorator estático).
 *
 * @example
 * @Post()
 * criar(@Body(new ZodValidationPipe(criarInscricaoSchema)) corpo: z.infer<typeof criarInscricaoSchema>) { ... }
 */
export class ZodValidationPipe implements PipeTransform<unknown> {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const resultado = this.schema.safeParse(value);
    if (resultado.success) return resultado.data;

    const campos = resultado.error.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensagem: issue.message,
    }));

    throw new ErroDeDominio('DADOS_INVALIDOS', 'Dados inválidos.', { campos });
  }
}
