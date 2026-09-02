import { z } from 'zod';

/**
 * RN-010a — normalização de CPF: só os 11 dígitos, preservando zero à
 * esquerda. Remove máscara, espaço ou qualquer outro caractere.
 */
export function normalizarCpf(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * RN-010a — dígito verificador é recusa, não aviso. Calcula os dois dígitos
 * pelo algoritmo padrão do CPF e rejeita à parte as dez sequências de dígito
 * repetido (`00000000000`, `11111111111`, ...), que fecham a conta do
 * dígito verificador normalmente e por isso não seriam pegas só pela fórmula.
 *
 * Espera `cpf` já normalizado (11 dígitos, ver `normalizarCpf`).
 */
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digitos = cpf.split('').map(Number);

  const digitoVerificador = (base: number[]): number => {
    const pesoInicial = base.length + 1;
    const soma = base.reduce((acc, digito, indice) => acc + digito * (pesoInicial - indice), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = digitoVerificador(digitos.slice(0, 9));
  const segundoDigito = digitoVerificador(digitos.slice(0, 10));

  return primeiroDigito === digitos[9] && segundoDigito === digitos[10];
}

/**
 * Peça reaproveitável para todo DTO com campo CPF (ficha pública,
 * `pagador.identificacao.numero` da cobrança por cartão, etc.): normaliza e
 * valida em um só passo.
 */
export const cpfSchema = z
  .string()
  .transform(normalizarCpf)
  .refine(cpfValido, { message: 'CPF inválido.' });
