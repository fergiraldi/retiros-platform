import { Body, Controller, Module, Post } from '@nestjs/common';
import { z } from 'zod';
import { SemAutenticacao } from '../../src/autenticacao/autenticacao.guard';
import { SemTransacao } from '../../src/contexto/contexto.interceptor';
import { SemResolucaoDeHost } from '../../src/contexto/resolvedor-de-host.guard';
import { ZodValidationPipe } from '../../src/validacao/zod-validation.pipe';

const schemaDeTeste = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.'),
});

/**
 * Rota que existe só para o item 23 provar, por HTTP real, que
 * `ZodValidationPipe` + `EnvelopeDeErroFilter` produzem o envelope de RNF-011
 * esperado — nenhum controller de domínio real usa o pipe ainda
 * (docs/pendencias-tecnicas.md, "ZodValidationPipe não é global e não tem
 * teste de fiação"). Nunca importada de `src/`.
 */
@Controller('teste/validacao')
@SemAutenticacao()
@SemResolucaoDeHost()
@SemTransacao()
export class RotaDeTesteController {
  @Post()
  criar(@Body(new ZodValidationPipe(schemaDeTeste)) corpo: z.infer<typeof schemaDeTeste>) {
    return corpo;
  }
}

@Module({ controllers: [RotaDeTesteController] })
export class ModuloDeTesteController {}
