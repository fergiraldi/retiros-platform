import { z } from 'zod';
import { ErroDeDominio } from '../src/erros/erro-de-dominio';
import { ZodValidationPipe } from '../src/validacao/zod-validation.pipe';

// RNF-011/item 2 — o pipe precisa devolver o valor parseado no caminho feliz
// e, no caminho de erro, lançar um ErroDeDominio DADOS_INVALIDOS já pronto
// pro envelope de erro (filtro do item 1), com um campo/mensagem por issue —
// inclusive em path aninhado, que é o formato real da ficha de inscrição.
const schema = z.object({
  pessoa: z.object({
    nome: z.string().min(1, 'Nome é obrigatório.'),
    cpf: z.string().length(11, 'CPF precisa ter 11 dígitos.'),
  }),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('retorna o valor parseado quando o payload é válido', () => {
    const valor = { pessoa: { nome: 'Maria', cpf: '11144477735' } };

    expect(pipe.transform(valor)).toEqual(valor);
  });

  it('lança ErroDeDominio DADOS_INVALIDOS com um campo/mensagem por issue, em path aninhado', () => {
    const valor = { pessoa: { nome: '', cpf: '123' } };

    let capturado: unknown;
    try {
      pipe.transform(valor);
    } catch (erro) {
      capturado = erro;
    }

    expect(capturado).toBeInstanceOf(ErroDeDominio);
    const erro = capturado as ErroDeDominio;
    expect(erro.getStatus()).toBe(422);
    expect(erro.codigo).toBe('DADOS_INVALIDOS');
    expect(erro.detalhes).toEqual({
      campos: [
        { campo: 'pessoa.nome', mensagem: 'Nome é obrigatório.' },
        { campo: 'pessoa.cpf', mensagem: 'CPF precisa ter 11 dígitos.' },
      ],
    });
  });
});
