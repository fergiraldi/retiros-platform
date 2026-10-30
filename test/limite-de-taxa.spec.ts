import { LimiteDeTaxaService, MAX_CHAVES } from '../src/limite-de-taxa/limite-de-taxa.service';

// RNF-012 — a regra de RN-210 (3 por CPF por hora) como exemplo concreto.
const UMA_HORA = 3_600_000;

describe('LimiteDeTaxaService (RNF-012)', () => {
  it('deixa passar até o limite e recusa a tentativa seguinte', () => {
    const limite = new LimiteDeTaxaService();

    expect([1, 2, 3, 4].map(() => limite.permitir('cpf:x', 3, UMA_HORA, 1_000))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('a janela desliza: a tentativa mais antiga sai e libera uma vaga', () => {
    const limite = new LimiteDeTaxaService();
    limite.permitir('cpf:x', 3, UMA_HORA, 0);
    limite.permitir('cpf:x', 3, UMA_HORA, 10);
    limite.permitir('cpf:x', 3, UMA_HORA, 20);

    expect(limite.permitir('cpf:x', 3, UMA_HORA, UMA_HORA)).toBe(true); // a de t=0 saiu
    expect(limite.permitir('cpf:x', 3, UMA_HORA, UMA_HORA + 5)).toBe(false); // 10, 20 e a de agora
  });

  it('recusa não conta: quem insiste volta a passar quando a janela anda', () => {
    const limite = new LimiteDeTaxaService();
    limite.permitir('ip:x', 1, 100, 0);
    for (let t = 1; t < 100; t++) limite.permitir('ip:x', 1, 100, t);

    expect(limite.permitir('ip:x', 1, 100, 100)).toBe(true);
  });

  it('chaves são independentes', () => {
    const limite = new LimiteDeTaxaService();
    limite.permitir('ip:a', 1, UMA_HORA, 0);

    expect(limite.permitir('ip:a', 1, UMA_HORA, 1)).toBe(false);
    expect(limite.permitir('ip:b', 1, UMA_HORA, 1)).toBe(true);
  });

  it('no teto de chaves, descarta a de uso mais antigo — não a recém-usada', () => {
    const limite = new LimiteDeTaxaService();
    limite.permitir('antiga', 1, UMA_HORA, 0);
    limite.permitir('recente', 1, UMA_HORA, 0);
    limite.permitir('antiga', 1, UMA_HORA, 1); // recusada, mas conta como uso
    // A última destas encontra o Map cheio e descarta a primeira da fila.
    for (let i = 0; i < MAX_CHAVES - 1; i++) limite.permitir(`enchimento:${i}`, 1, UMA_HORA, 2);

    // `antiga` foi usada depois de `recente`, então sobreviveu com a contagem;
    // `recente` foi a de uso mais antigo: saiu, e volta a passar.
    expect(limite.permitir('antiga', 1, UMA_HORA, 3)).toBe(false);
    expect(limite.permitir('recente', 1, UMA_HORA, 3)).toBe(true);
  });
});
