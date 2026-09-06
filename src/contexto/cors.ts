import { Logger } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ambiente } from '../config/ambiente';
import { ReconhecedorDeHostService } from './reconhecedor-de-host.service';

const logger = new Logger('Cors');

/**
 * RN-061t / PRD §8.1 — a lista de `Access-Control-Allow-Origin` segue os mesmos
 * três hosts que a resolução de inquilino: subdomínio do curinga e domínio
 * próprio verificado como lista dinâmica, host do operador como entrada fixa.
 * Dinâmica porque domínio próprio é adicionado em tempo de execução por um
 * admin, não em deploy — daí a função de origem, e não uma lista de env.
 *
 * A verificação é por origem consultada, não por lista inteira carregada: o
 * `ReconhecedorDeHostService` resolve um host por vez, com cache, e é o mesmo
 * que o `ResolvedorDeHostGuard` usa. O preflight OPTIONS não passa pelo
 * pipeline do Nest (o CORS é middleware do Express, roda antes de guard e
 * interceptor), então esta é a única forma de os dois não divergirem.
 */
export function criarOpcoesDeCors(reconhecedor: ReconhecedorDeHostService): CorsOptions {
  const producao = ambiente.NODE_ENV === 'production';

  return {
    credentials: true,
    // Reduz preflight, que é o que bate no banco. 10 min é o teto que o
    // Chromium respeita; o Firefox corta em 24h.
    maxAge: 600,
    origin: (origem, callback) => {
      // Sem `Origin`: same-origin, curl, SSR e servidor-para-servidor — entre
      // eles o webhook do gateway, que não manda o cabeçalho. CORS não é
      // mecanismo de autenticação de webhook, e negar aqui quebraria o item 12
      // sem proteger nada.
      if (!origem) {
        callback(null, true);
        return;
      }

      let url: URL;
      try {
        url = new URL(origem);
      } catch {
        callback(null, false);
        return;
      }

      // Fora de produção o front local roda em http e em porta própria
      // (`http://localhost:5173`); em produção só https na porta padrão. É o
      // que dispensa uma allowlist paralela de origens de desenvolvimento — o
      // host em si continua vindo só de `inquilino_dominio`.
      const esquemaOk = url.protocol === 'https:' || (!producao && url.protocol === 'http:');
      const portaOk = !producao || url.port === '';
      if (!esquemaOk || !portaOk) {
        callback(null, false);
        return;
      }

      reconhecedor
        .reconhecer(url.hostname)
        // `false`, nunca um Error: o pacote `cors` transforma erro no callback
        // em 500, enquanto `false` apenas omite o cabeçalho e deixa o
        // navegador bloquear — a resposta neutra que a RN-061t pede.
        //
        // Com `false` o pacote `cors` chama `next()` em vez de encerrar o
        // preflight, então o OPTIONS segue para o roteador do Nest e volta 404
        // ("Cannot OPTIONS /rota"), não 204. É esperado e inofensivo: sem o
        // `Access-Control-Allow-Origin` o navegador bloqueia de qualquer forma,
        // e o 404 não revela nada. Só não estranhe o status ao depurar.
        .then((reconhecido) => callback(null, reconhecido !== null))
        .catch((erro: unknown) => {
          // Banco fora do ar. Repassar o erro ao pacote `cors` produziria um
          // 500 cru do Express, fora do envelope de RNF-011 (o CORS roda antes
          // do filtro global). Nega e registra: a requisição real que viesse
          // atrás falharia no guard de qualquer forma, aí sim no envelope.
          logger.error('Falha ao reconhecer a origem', erro instanceof Error ? erro.stack : erro);
          callback(null, false);
        });
    },
  };
}
