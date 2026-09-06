import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { ambiente } from '../config/ambiente';
import type { HostReconhecido, SituacaoInquilino } from './contexto.types';
import { UnidadeDeTrabalhoService } from './unidade-de-trabalho.service';

type LinhaResolucao = {
  inquilino_id: string;
  situacao: SituacaoInquilino;
};

/**
 * TTL do cache de reconhecimento. Curto de propósito: domínio próprio é
 * adicionado em tempo de execução por um admin, não em deploy (PRD §8.1,
 * RNF-006), então a lista precisa refletir a mudança sem redeploy. Sem cache
 * nenhum, cada preflight OPTIONS viraria uma transação no Postgres.
 */
export const TTL_RECONHECIMENTO_MS = 60_000;
/** Host desconhecido expira antes: é o caso que um atacante consegue provocar à vontade. */
export const TTL_DESCONHECIDO_MS = 10_000;
/** Teto de entradas — impede que origens aleatórias inflem a memória do processo. */
export const MAX_ENTRADAS_CACHE = 1_000;

interface Entrada {
  valor: HostReconhecido | null;
  expiraEm: number;
}

/**
 * Fonte única de reconhecimento de host, para o guard (RN-059t) e para a lista
 * de `Access-Control-Allow-Origin` (RN-061t) nunca divergirem: são caminhos
 * independentes — o CORS do Nest é middleware do Express e roda antes do
 * pipeline, então o preflight não passa pelo guard — resolvendo o mesmo host
 * pelas mesmas regras.
 *
 * RN-061t: os três hosts reconhecidos são o subdomínio do curinga, o domínio
 * próprio verificado (os dois dinâmicos, linhas de `inquilino_dominio`) e o
 * host do operador, entrada fixa própria. Qualquer outro é indistinguível de
 * inquilino `encerrado`: os dois devolvem `null` e viram o mesmo 404 neutro.
 */
@Injectable()
export class ReconhecedorDeHostService {
  private readonly cache = new Map<string, Entrada>();

  constructor(private readonly uow: UnidadeDeTrabalhoService) {}

  async reconhecer(host: string): Promise<HostReconhecido | null> {
    const normalizado = normalizarHost(host);
    if (!normalizado) return null;

    const emCache = this.cache.get(normalizado);
    if (emCache && emCache.expiraEm > Date.now()) {
      return emCache.valor;
    }

    const valor = await this.resolver(normalizado);
    this.guardar(normalizado, valor);
    return valor;
  }

  /** Esvazia o cache — usar quando um domínio for verificado ou revogado (item 8). */
  esquecer(host?: string): void {
    if (host === undefined) {
      this.cache.clear();
      return;
    }
    const normalizado = normalizarHost(host);
    if (normalizado) this.cache.delete(normalizado);
  }

  private async resolver(host: string): Promise<HostReconhecido | null> {
    // PRD §8.1: o host do operador é reconhecido ANTES de aplicar o predicado
    // de tenant, e sem `inquilino_id` nenhum — é a única conta que vive fora
    // de um inquilino (RN-004, RN-017). Comparação em memória: não existe
    // linha de `inquilino_dominio` para ele, e nem deveria.
    const hostOperador = normalizarHost(ambiente.HOST_OPERADOR);
    if (hostOperador && host === hostOperador) {
      return { host, tipo: 'operador', inquilinoId: null, situacao: null };
    }

    const linha = await this.uow.executarSemContexto(async (tx) => {
      const r = await tx.execute<LinhaResolucao>(
        sql`select * from resolver_inquilino_por_host(${host})`,
      );
      return r.rows[0];
    });

    // RN-063t: `encerrado` devolve o mesmo que host desconhecido. `suspenso` e
    // `em_implantacao` resolvem — quem bloqueia inscrição (RN-063t) e área
    // pública (CA-34) é a rota, com a `situacao` que vai junto daqui. Se o host
    // morresse em `em_implantacao`, o admin não teria por onde concluir o
    // onboarding: RNF-006 não admite rota administrativa neutra.
    if (!linha || linha.situacao === 'encerrado') return null;

    return {
      host,
      tipo: 'inquilino',
      inquilinoId: linha.inquilino_id,
      situacao: linha.situacao,
    };
  }

  private guardar(host: string, valor: HostReconhecido | null): void {
    if (this.cache.size >= MAX_ENTRADAS_CACHE) {
      // Descarte simples da entrada mais antiga: o Map do JS itera na ordem de
      // inserção. Não é LRU, e não precisa ser — o TTL é de segundos.
      const maisAntiga = this.cache.keys().next();
      if (!maisAntiga.done) this.cache.delete(maisAntiga.value);
    }

    this.cache.set(host, {
      valor,
      expiraEm: Date.now() + (valor ? TTL_RECONHECIMENTO_MS : TTL_DESCONHECIDO_MS),
    });
  }
}

/**
 * `tenant.App.com.br.:443` e `tenant.app.com.br` são o mesmo host, e só o
 * segundo casa com a linha de `inquilino_dominio`. Sem normalizar, o ponto
 * final de FQDN vira 404 e o CORS nega uma origem legítima.
 */
export function normalizarHost(host: string | undefined | null): string {
  if (!host) return '';
  return host.trim().toLowerCase().split(':')[0].replace(/\.$/, '');
}
