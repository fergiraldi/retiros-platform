import { randomBytes } from 'node:crypto';

/**
 * RNF-010 — `uuid v7` gerado pela aplicação (specs/fase-1/README.md): os 48
 * bits iniciais são o instante em milissegundos, então ids novos caem no fim
 * do índice em vez de espalhados por ele, como o v4 do `randomUUID()`. O resto
 * é aleatório — não dá para enumerar nem estimar volume de outro inquilino.
 */
export function uuidV7(agora = Date.now()): string {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(agora, 0, 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // versão 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 9562

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
