import { z } from 'zod';
import { cpfSchema } from '../validacao/cpf';

const obrigatorio = (max: number) => z.string().trim().min(1, 'Campo obrigatório.').max(max);
const opcional = (max: number) => z.string().trim().max(max).nullish();
const soDigitos = (valor: string) => valor.replace(/\D/g, '');

/**
 * Ficha de inscrição pública — contrato de `POST
 * /api/publico/encontros/:encontroId/inscricoes` (specs/fase-1/02-inscricao.md
 * §4.3). Os tetos de tamanho existem porque o endpoint é anônimo: sem eles,
 * um script grava texto arbitrário no banco de cada inquilino.
 *
 * `consentimento` é opcional **aqui** de propósito: ficha sem aceite não é
 * `DADOS_INVALIDOS`, é `CONSENTIMENTO_OBRIGATORIO` (CA-32), e quem decide isso
 * é o serviço, que conhece a versão vigente do termo.
 */
export const fichaSchema = z.object({
  tipo: z.enum(['participante', 'servo']),
  pessoa: z.object({
    nomeCompleto: obrigatorio(200),
    nomeCracha: obrigatorio(60),
    cpf: cpfSchema,
    dataNascimento: z.iso.date(),
    telefone: obrigatorio(20),
    email: z.email().max(200),
    // `char(8)` e `char(2)` no banco: valor maior falha no insert, então a
    // forma é conferida aqui, antes de qualquer escrita.
    cep: z.string().transform(soDigitos).pipe(z.string().length(8)).nullish(),
    logradouro: opcional(200),
    numero: opcional(20),
    complemento: opcional(100),
    bairro: opcional(100),
    cidade: opcional(100),
    uf: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/)
      .nullish(),
    estadoCivil: opcional(30),
    contatoEmergenciaNome: obrigatorio(200),
    contatoEmergenciaFone: obrigatorio(20),
  }),
  dadosSensiveis: z
    .object({
      restricaoAlimentar: opcional(500),
      condicaoSaude: opcional(500),
      medicamentosUsoContinuo: opcional(500),
      religiaoDeclarada: opcional(100),
    })
    .nullish(),
  convidadorPessoaId: z.uuid().nullish(),
  convidadorNome: opcional(200),
  areaPretendida: opcional(100),
  // RN-116: texto livre, "sem validação além do tamanho".
  camposExtras: z
    .array(z.object({ label: obrigatorio(100), valor: z.string().max(500) }))
    .max(20)
    .default([]),
  consentimento: z
    .object({ versaoTermo: z.string().max(50), finalidades: z.array(z.string().max(50)).max(20) })
    .nullish(),
  consentimentoRetencao: z.boolean().default(false),
});

export type Ficha = z.infer<typeof fichaSchema>;
