import { uuidV7 } from '../src/db/uuid-v7';

describe('uuidV7 (RNF-010)', () => {
  it('tem formato de uuid, versão 7 e variante RFC 9562', () => {
    expect(uuidV7()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('carrega o instante nos 48 bits iniciais, então ordena por tempo', () => {
    const instante = Date.UTC(2026, 9, 29, 12, 0, 0);
    const id = uuidV7(instante);

    expect(parseInt(id.replace(/-/g, '').slice(0, 12), 16)).toBe(instante);
    expect(uuidV7(instante) < uuidV7(instante + 1)).toBe(true);
  });
});
