import { Injectable } from '@nestjs/common';

/** Teto de chaves em memória — impede que IPs/CPFs aleatórios inflem o processo. */
export const MAX_CHAVES = 10_000;

/**
 * RNF-012 — limite de taxa por janela deslizante: guarda o instante de cada
 * tentativa aceita e recusa quando já há `limite` delas dentro da janela.
 *
 * Em memória, e não no banco, porque a Railway roda **uma** instância por
 * ambiente (README, "O edge da Railway é o único caminho de entrada"): o
 * contador do processo é o contador do ambiente. Reiniciar zera a contagem, o
 * que para proteção contra abuso é aceitável — não é fronteira de segurança.
 *
 * ponytail: contador por processo; com mais de uma réplica, o limite real vira
 * `limite × réplicas` — mover para uma tabela (ou Redis) se escalar horizontal.
 */
@Injectable()
export class LimiteDeTaxaService {
  private readonly tentativas = new Map<string, number[]>();

  /**
   * `true` conta a tentativa e deixa passar; `false` recusa **sem** contá-la —
   * senão quem insiste ficaria bloqueado para sempre, em vez de esperar a
   * janela andar.
   */
  permitir(chave: string, limite: number, janelaMs: number, agora = Date.now()): boolean {
    const recentes = (this.tentativas.get(chave) ?? []).filter((t) => t > agora - janelaMs);

    // Reinserir põe a chave no fim da ordem de inserção do Map, então a
    // primeira chave é sempre a de uso mais antigo — é ela que sai no teto.
    this.tentativas.delete(chave);
    if (this.tentativas.size >= MAX_CHAVES) {
      const maisAntiga = this.tentativas.keys().next();
      if (!maisAntiga.done) this.tentativas.delete(maisAntiga.value);
    }

    const permitido = recentes.length < limite;
    if (permitido) recentes.push(agora);
    this.tentativas.set(chave, recentes);

    return permitido;
  }
}
