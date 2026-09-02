import { cpfValido, normalizarCpf } from '../src/validacao/cpf';

// RN-010a — onze dígitos e nada mais, dígito verificador é recusa (não
// aviso), e as dez sequências de dígito repetido são rejeitadas à parte
// porque fecham a conta do dígito verificador normalmente.
describe('normalizarCpf', () => {
  it('remove máscara e espaço, preservando zero à esquerda', () => {
    expect(normalizarCpf('111.444.777-35')).toBe('11144477735');
    expect(normalizarCpf(' 011 444 777 35 ')).toBe('01144477735');
  });
});

describe('cpfValido', () => {
  it('aceita CPF com dígito verificador correto', () => {
    expect(cpfValido('11144477735')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(cpfValido('11144477736')).toBe(false);
  });

  it('rejeita as dez sequências de dígito repetido', () => {
    for (let d = 0; d <= 9; d++) {
      expect(cpfValido(String(d).repeat(11))).toBe(false);
    }
  });

  it('rejeita valor que não normalizou pra 11 dígitos', () => {
    expect(cpfValido('123')).toBe(false);
    expect(cpfValido('111.444.777-35')).toBe(false); // precisa vir normalizado
  });
});
