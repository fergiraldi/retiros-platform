import { HttpStatus } from '@nestjs/common';

/**
 * RNF-011 — códigos de erro de domínio já citados nas specs da Fase 1.
 * `codigo` é contrato estável: front decide comportamento por ele, nunca pelo
 * texto de `mensagem`. Lançar um erro de domínio deve sempre usar um destes
 * valores — nunca uma string solta — para não divergir do que a spec já fixou.
 */
export type CodigoErro =
  /** Exemplo canônico da própria RNF-011 (PRD.md:1346). Status real depende
   *  de como o item 10/11 (controle de vagas) vier a modelar o conflito. */
  | 'VAGAS_ESGOTADAS'
  /** Transição de máquina de estados fora da tabela prevista (RN-200/RN-030,
   *  PRD.md:1358; specs/fase-1/02-inscricao.md, 03-cobranca.md). */
  | 'CONFLITO_DE_SITUACAO'
  /** Violação do índice parcial de uma inscrição ativa por encontro (RN-031,
   *  specs/fase-1/02-inscricao.md). */
  | 'JA_INSCRITO'
  /** Fora da janela inscricoes_abrem_em/inscricoes_fecham_em (RN-202,
   *  specs/fase-1/02-inscricao.md). */
  | 'INSCRICOES_FECHADAS'
  /** Estorno recusado pelo gateway (RN-316, specs/fase-1/03-cobranca.md). */
  | 'FALHA_NO_ESTORNO'
  /** Parcelamento acima do máximo calculado (specs/fase-1/03-cobranca.md). */
  | 'PARCELAS_INVALIDAS'
  /** Ficha enviada sem aceite do termo LGPD (RN-090, RN-204,
   *  specs/fase-1/02-inscricao.md). */
  | 'CONSENTIMENTO_OBRIGATORIO'
  /** Erro genérico de validação de payload da ficha pública
   *  (specs/fase-1/02-inscricao.md) — cai em desuso quando o item 2
   *  (ValidationPipe) chegar a mapear cada campo. */
  | 'DADOS_INVALIDOS'
  /** Encontro inexistente ou não publicado (specs/fase-1/02-inscricao.md). */
  | 'ENCONTRO_NAO_ENCONTRADO'
  /** Rate limit da ficha pública (RNF-012/RN-210) e de reemissão de cobrança. */
  | 'MUITAS_TENTATIVAS'
  /** Inquilino suspenso (RN-063t) — bloqueia nova inscrição, mantém consulta. */
  | 'INSCRICOES_SUSPENSAS'
  /** Token de consulta inválido (specs/fase-1/02-inscricao.md). */
  | 'INSCRICAO_NAO_ENCONTRADA'
  /** Token de cartão do Mercado Pago expirado (specs/fase-1/03-cobranca.md). */
  | 'TOKEN_EXPIRADO'
  /** Já existe cobrança viva para a inscrição (RN-310,
   *  specs/fase-1/03-cobranca.md) — resposta devolve a cobrança existente. */
  | 'COBRANCA_JA_EXISTE'
  /** Recusa do emissor do cartão (RN-311, specs/fase-1/03-cobranca.md). */
  | 'PAGAMENTO_RECUSADO'
  /** Publicação de encontro sem os campos obrigatórios
   *  (specs/fase-1/01-modelo-de-dados.md). */
  | 'ENCONTRO_INCOMPLETO'
  /** Conexão de recebimento indisponível (RN-098, PRD.md) — a RN-098 muda o
   *  desfecho conforme o endpoint (inscrição segue aceita; cobrança nova é
   *  que fica bloqueada), revisar contra a regra ao implementar o item 9/11. */
  | 'RECEBIMENTO_INDISPONIVEL';

/**
 * Status HTTP de cada código, para quem lançar `ErroDeDominio` nunca precisar
 * adivinhar. Inferido do contexto de cada citação nas specs — os dois casos
 * comentados acima como ambíguos entram com o status mais provável hoje.
 */
export const CATALOGO_ERROS: Record<CodigoErro, HttpStatus> = {
  VAGAS_ESGOTADAS: HttpStatus.CONFLICT,
  CONFLITO_DE_SITUACAO: HttpStatus.CONFLICT,
  JA_INSCRITO: HttpStatus.CONFLICT,
  INSCRICOES_FECHADAS: HttpStatus.UNPROCESSABLE_ENTITY,
  FALHA_NO_ESTORNO: HttpStatus.BAD_GATEWAY,
  PARCELAS_INVALIDAS: HttpStatus.UNPROCESSABLE_ENTITY,
  CONSENTIMENTO_OBRIGATORIO: HttpStatus.UNPROCESSABLE_ENTITY,
  DADOS_INVALIDOS: HttpStatus.UNPROCESSABLE_ENTITY,
  ENCONTRO_NAO_ENCONTRADO: HttpStatus.NOT_FOUND,
  MUITAS_TENTATIVAS: HttpStatus.TOO_MANY_REQUESTS,
  INSCRICOES_SUSPENSAS: HttpStatus.SERVICE_UNAVAILABLE,
  INSCRICAO_NAO_ENCONTRADA: HttpStatus.NOT_FOUND,
  TOKEN_EXPIRADO: HttpStatus.UNPROCESSABLE_ENTITY,
  COBRANCA_JA_EXISTE: HttpStatus.CONFLICT,
  PAGAMENTO_RECUSADO: HttpStatus.PAYMENT_REQUIRED,
  ENCONTRO_INCOMPLETO: HttpStatus.UNPROCESSABLE_ENTITY,
  RECEBIMENTO_INDISPONIVEL: HttpStatus.SERVICE_UNAVAILABLE,
};
