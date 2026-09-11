import { Controller, Get } from '@nestjs/common';
import { SemTransacao } from '../contexto/contexto.interceptor';
import { ContaAtual } from './conta-atual.decorator';
import { papelEfetivoDaConta } from './papel-efetivo';
import type { ContaDeAcesso } from './autenticacao.types';

/**
 * Quem sou eu nesta origem. É o que o front pede depois do login do Supabase
 * Auth para montar a área administrativa — e, antes disso, o único jeito de
 * exercitar a cadeia inteira de PRD §8.1 à mão, incluindo o CA-24c (mesmo token
 * no host de outro inquilino devolve 403).
 *
 * Caminho literal `api/sessao`, sem `setGlobalPrefix`: mover o prefixo global
 * levaria `/saude` junto, que é o caminho configurado no healthcheck da Railway.
 */
@Controller('api/sessao')
export class SessaoController {
  /**
   * Devolve o **papel efetivo**, pela mesma função que produz o contexto de
   * transação — não a linha crua de `usuario`. Duas consequências boas: o front
   * não recebe um `central_id` de conta `servo` do qual poderia concluir que a
   * pessoa pertence a uma central (RN-017), e a resposta é literalmente o que
   * foi para os GUCs, o que faz deste endpoint a prova da cadeia inteira.
   *
   * Não devolve o e-mail: o front já o tem da própria sessão do Supabase, e
   * repeti-lo aqui criaria segunda fonte para o mesmo dado.
   *
   * `@SemTransacao()` porque nada aqui toca tabela — todo o dado veio do guard.
   * Precisar de uma consulta seria sinal de que o guard resolveu de menos.
   */
  @Get()
  @SemTransacao()
  sessao(@ContaAtual() conta: ContaDeAcesso) {
    return papelEfetivoDaConta(conta);
  }
}
