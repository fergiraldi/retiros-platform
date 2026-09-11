import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { UnidadeDeTrabalhoService } from '../contexto/unidade-de-trabalho.service';
import type { ContextoRequisicao } from '../contexto/contexto.types';
import type { ContaDeAcesso, PapelConta, SituacaoConta } from './autenticacao.types';

/** A linha como o banco a devolve — snake_case. `type` e não `interface` porque
 *  `tx.execute<T>` exige `Record<string, unknown>`, e só alias de tipo ganha a
 *  index signature implícita (idioma de `LinhaResolucao` em
 *  src/contexto/reconhecedor-de-host.service.ts). */
type LinhaConta = {
  id: string;
  inquilino_id: string | null;
  central_id: string | null;
  pessoa_id: string | null;
  papel: PapelConta;
  situacao: SituacaoConta;
};

/**
 * PRD §8.1, passo 3: resolve a conta de acesso pelo par (inquilino do host,
 * e-mail verificado do JWT) — ou por (`papel = 'operador'`, e-mail), sem
 * inquilino, na rota do operador (RN-004, RN-017).
 *
 * ## Por que o contexto é elevado, e por que isso é seguro
 *
 * Ler a linha de `usuario` é ovo-e-galinha: as policies da 0001 leem o papel do
 * contexto, que é justamente o que se quer descobrir. Com o contexto que o
 * `ResolvedorDeHostGuard` deixa (`papel: 'publico'`, central nula), a linha de
 * um `admin_central` não aparece.
 *
 * Uma função `security definer` **não** resolve: medido em 07/09/2026, o
 * `force row level security` (RN-057t) alcança o dono da tabela, que é quem a
 * definer encarna — e `set row_security = off` é recusado com 42501, porque o
 * `force` existe para o dono não poder abrir mão dele. O caminho é abrir um
 * contexto deliberadamente elevado, no mesmo idioma que `test/ajuda/semear.ts`
 * já usa para escrever a linha de `inquilino`.
 *
 * O que segura a elevação **não é** este código: é a RLS. Sob
 * `{ inquilinoId: <host>, papel: 'admin_denominacao' }` a restritiva
 * `usuario_inquilino` continua valendo, e a consulta não alcança outro
 * inquilino nem se o `where` for esquecido (medido: escrita em nome de outro
 * inquilino é recusada com 42501). O escopo é garantido pelo banco.
 *
 * ## Sem cache, deliberadamente
 *
 * É o oposto do `ReconhecedorDeHostService`, e a diferença é a RN-018:
 * suspensão e revogação valem *no ato*, "a sessão viva não é confiada, e a
 * autorização é conferida a cada requisição". Um cache de 60s como o de host
 * transformaria revogação por incidente de segurança em "revogação em até um
 * minuto" — que é o que a regra recusa. O custo é uma consulta por requisição
 * autenticada, por índice único.
 */
@Injectable()
export class ResolvedorDeContaService {
  constructor(private readonly uow: UnidadeDeTrabalhoService) {}

  /**
   * A conta do escopo do host, ou `null`. `inquilinoId` nulo significa host do
   * operador — não "qualquer inquilino": o contexto usado é `{ papel:
   * 'operador' }`, sob o qual a restritiva só mostra linha com `inquilino_id`
   * nulo, e o check `usuario_operador_sem_inquilino` (0000) garante que isso é
   * o mesmo que `papel = 'operador'`.
   *
   * Devolve a `situacao` como está, sem filtrar: esconder conta inativa faria o
   * guard responder "não existe" onde a RN-018 pede 403 ("existe e não entra").
   */
  async resolver(inquilinoId: string | null, email: string): Promise<ContaDeAcesso | null> {
    const linha = await this.uow.executar(this.contextoDeResolucao(inquilinoId), async (tx) => {
      const r = await tx.execute<LinhaConta>(
        sql`select id, inquilino_id, central_id, pessoa_id, papel, situacao
              from usuario
             where lower(email) = lower(${email})
             limit 1`,
      );
      return r.rows[0];
    });

    if (!linha) return null;

    return {
      id: linha.id,
      inquilinoId: linha.inquilino_id,
      centralId: linha.central_id,
      pessoaId: linha.pessoa_id,
      papel: linha.papel,
      situacao: linha.situacao,
    };
  }

  /** `usuario.ultimo_acesso_em`, com a trava de 5 minutos que vive na função
   *  SQL. Precisa do mesmo contexto elevado da leitura: a função é comum, não
   *  `security definer`, então roda sob a RLS de quem a chama. */
  async registrarAcesso(conta: ContaDeAcesso): Promise<void> {
    await this.uow.executar(this.contextoDeResolucao(conta.inquilinoId), async (tx) => {
      await tx.execute(sql`select registrar_acesso_de_conta(${conta.id})`);
    });
  }

  /**
   * O contexto mínimo em que as duas policies de `usuario` mostram a linha.
   *
   * - `admin_denominacao` porque é o único papel que a permissiva
   *   `usuario_central` aceita sem saber a central — e a central é o que ainda
   *   não se sabe. Restringe-se ao inquilino do host pela restritiva.
   * - `operador` no host do operador, o único contexto em que a restritiva
   *   mostra linha de `inquilino_id` nulo.
   *
   * Nunca é o contexto da requisição: aquele é montado depois, pelo
   * `papelEfetivoDaConta`, com o papel que a conta de fato tem.
   */
  private contextoDeResolucao(inquilinoId: string | null): ContextoRequisicao {
    return inquilinoId === null
      ? { papel: 'operador' }
      : { inquilinoId, papel: 'admin_denominacao' };
  }
}
