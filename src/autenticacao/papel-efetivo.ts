import type { ContextoRequisicao } from '../contexto/contexto.types';
import type { ContaDeAcesso } from './autenticacao.types';

/**
 * PRD §8.1, passo 4: o contexto de transação que a conta produz — o "papel
 * efetivo". Não é `usuario.papel` copiado: `central_id` sai do *tipo* de conta,
 * e não da coluna, e é essa distinção que a função existe para não deixar
 * implícita.
 *
 * | Papel | `centralId` | Por quê |
 * |---|---|---|
 * | `operador` | nulo | vive fora de inquilino (RN-004); `central_id` só tem sentido dentro de um |
 * | `admin_denominacao` | nulo | escopo é o inquilino inteiro; o check `usuario_denominacao_sem_central` já garante a coluna nula |
 * | `admin_central` | o da conta | a única conta que grava `central_id` (RN-017) |
 * | `servo` | **nulo** | a pessoa é do inquilino, não da central (RN-014): fixar a central impediria quem serviu em Cascavel de servir em Maringá sem segunda conta |
 *
 * `pessoaId` só vai para a conta `servo`, que é a única em que ele é obrigatório
 * (check `usuario_servo_com_pessoa`) — nas administrativas é opcional, e mandar
 * um valor às vezes presente e às vezes não para o GUC criaria contexto que
 * varia por conta e não por papel.
 *
 * ## O papel de encontro não passa por aqui, e é de propósito
 *
 * Coordenador do encontro e coordenador de área (RN-025, RN-046) **não são**
 * papel de conta: são papel *de um encontro*, derivados dos ponteiros de
 * coordenação, e quem coordena a cozinha no 3º Encontro é membro comum no 4º
 * (RN-017). Promovê-los aqui exigiria saber qual encontro a requisição está
 * tocando — que nenhuma rota informa até o item 20.
 *
 * Quando a primeira rota de encontro existir, a promoção é **por requisição**,
 * a partir do `encontroId` da rota, e nunca:
 *   - no guard, que não sabe qual encontro a rota vai tocar;
 *   - em cache ou na sessão, que é o que a RN-017 recusa ao dizer que "o poder
 *     termina no ato em que o ponteiro muda".
 * Ou seja: uma segunda chamada, já dentro da transação do handler, sobre o
 * contexto que esta função montou — não uma alteração desta função.
 */
export function papelEfetivoDaConta(conta: ContaDeAcesso): ContextoRequisicao {
  return {
    inquilinoId: conta.inquilinoId,
    centralId: conta.papel === 'admin_central' ? conta.centralId : null,
    pessoaId: conta.papel === 'servo' ? conta.pessoaId : null,
    papel: conta.papel,
  };
}
