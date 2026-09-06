import { Pool } from 'pg';
import { ambiente } from '../src/config/ambiente';
import { ReconhecedorDeHostService } from '../src/contexto/reconhecedor-de-host.service';
import { UnidadeDeTrabalhoService } from '../src/contexto/unidade-de-trabalho.service';
import {
  InquilinoSemeado,
  removerInquilinoSemeado,
  semearInquilinoCompleto,
} from './ajuda/semear';

/**
 * CA-24c (segunda metade) e §9 de 00-multi-inquilino.md: prova contra o banco
 * de verdade, pelo caminho real (`resolver_inquilino_por_host` +
 * `executarSemContexto`), que cada host verificado resolve o seu inquilino e
 * que host desconhecido não resolve nada — o insumo do 404 neutro.
 *
 * `semearInquilinoCompleto` já cria a linha de `inquilino_dominio` verificada
 * (`<prefixo>.example.com`, tipo `subdominio`), que é exatamente o formato que
 * o onboarding (item 8) vai gravar para o subdomínio do curinga.
 */
describe('Resolução de inquilino por host (RN-059t, RN-120)', () => {
  const pool = new Pool({ connectionString: ambiente.DATABASE_URL, max: 5 });
  const uow = new UnidadeDeTrabalhoService(pool);

  let a: InquilinoSemeado;
  let b: InquilinoSemeado;
  let hostA: string;
  let hostB: string;

  beforeAll(async () => {
    const prefixoA = `zzhosta${Date.now()}`;
    const prefixoB = `zzhostb${Date.now()}`;
    a = await semearInquilinoCompleto(uow, prefixoA);
    b = await semearInquilinoCompleto(uow, prefixoB);
    hostA = `${prefixoA}.example.com`;
    hostB = `${prefixoB}.example.com`;
  }, 30_000);

  afterAll(async () => {
    await removerInquilinoSemeado(uow, a.inquilinoId);
    await removerInquilinoSemeado(uow, b.inquilinoId);
    await pool.end();
  }, 30_000);

  // Instância nova por teste: o cache é por instância e falsearia o resultado.
  const reconhecedor = () => new ReconhecedorDeHostService(uow);

  it('cada host verificado resolve o SEU inquilino, e não o do vizinho', async () => {
    const resolvidoA = await reconhecedor().reconhecer(hostA);
    const resolvidoB = await reconhecedor().reconhecer(hostB);

    expect(resolvidoA?.inquilinoId).toBe(a.inquilinoId);
    expect(resolvidoB?.inquilinoId).toBe(b.inquilinoId);
    expect(resolvidoA?.inquilinoId).not.toBe(resolvidoB?.inquilinoId);
    expect(resolvidoA?.tipo).toBe('inquilino');
    expect(resolvidoA?.situacao).toBe('ativo');
  });

  it('host desconhecido não resolve nada — é o 404 neutro de RN-061t', async () => {
    expect(await reconhecedor().reconhecer(`nao-existe-${Date.now()}.example.com`)).toBeNull();
  });

  it('a normalização vale contra o banco: caixa, porta e ponto final resolvem igual', async () => {
    const variacoes = [hostA.toUpperCase(), `${hostA}:3000`, `${hostA}.`];

    for (const variacao of variacoes) {
      const r = await reconhecedor().reconhecer(variacao);
      expect(r?.inquilinoId).toBe(a.inquilinoId);
    }
  });

  it('a resolução acontece sem contexto de inquilino nenhum — é o que a RLS permite (§5)', async () => {
    // Se dependesse de contexto já existir, seria circular: a resolução é
    // justamente o que produz o contexto.
    const r = await reconhecedor().reconhecer(hostA);
    expect(r).not.toBeNull();
  });

  it('host do operador não precisa de linha em inquilino_dominio', async () => {
    const original = ambiente.HOST_OPERADOR;
    ambiente.HOST_OPERADOR = 'operador.teste.example.com';
    try {
      const r = await reconhecedor().reconhecer('operador.teste.example.com');

      expect(r?.tipo).toBe('operador');
      expect(r?.inquilinoId).toBeNull();
    } finally {
      ambiente.HOST_OPERADOR = original;
    }
  });
});
