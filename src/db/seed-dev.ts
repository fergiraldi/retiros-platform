import { and, eq } from 'drizzle-orm';
import { UnidadeDeTrabalhoService } from '../contexto/unidade-de-trabalho.service';
import { pool } from './conexao';
import * as schema from './schema';

/**
 * Semente do ambiente de desenvolvimento.
 *
 * O dado que existia no schema `dev` veio de um script temporário que não foi
 * versionado — recriar o ambiente, ou entrar um segundo dev na equipe, e a
 * resolução por host parava de funcionar sem pista do motivo (o sintoma é 404
 * em toda rota, idêntico ao de host desconhecido). Este arquivo fecha isso.
 *
 * Escreve pelo `UnidadeDeTrabalhoService`, não por bulk insert: é o mesmo
 * caminho da aplicação, então a semente prova de passagem que o `with check` de
 * cada política aceita a escrita legítima. Mesma escolha de `test/ajuda/semear.ts`,
 * que serviu de base — não dá para importar de lá, porque `tsconfig.build.json`
 * exclui `test/`.
 *
 * Idempotente: UUIDs fixos e `on conflict do nothing` sem alvo, que ignora
 * conflito em qualquer constraint (id, slug, domínio, versão do termo). Rodar
 * duas vezes não duplica nada e não sobrescreve alteração feita à mão.
 */

// Todo domínio nasce `verificado: true` de propósito. `resolver_inquilino_por_host`
// filtra por `d.verificado = true` (migrations/0002_funcoes_de_dominio.sql:62):
// semear sem a flag reproduz exatamente o 404 que esta semente existe para evitar.
const VERIFICADO = true;

const CONTRATO_ACEITO_EM = '2026-01-15T10:00:00.000Z';

/** RN-090: sem termo vigente não há inscrição. Uma versão só, igual para todos. */
const VERSAO_DO_TERMO = '2026-01';

/** A janela de inscrição é relativa ao momento da semeadura — fixa, ela venceria. */
const agora = Date.now();
const DIA = 24 * 3600 * 1000;
const INSCRICOES_ABREM_EM = new Date(agora - 5 * DIA).toISOString();
const INSCRICOES_FECHAM_EM = new Date(agora + 45 * DIA).toISOString();

interface Central {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  slug: string;
}

interface Encontro {
  id: string;
  centralId: string;
  numero: number;
  titulo: string;
  slug: string;
  cidade: string;
  situacao: 'rascunho' | 'publicado';
}

interface Inquilino {
  id: string;
  nome: string;
  slug: string;
  situacao: 'ativo' | 'em_implantacao' | 'suspenso' | 'encerrado';
  /** `inquilino_ativo_tem_contrato`: só `em_implantacao` pode ficar sem. */
  contratoAceitoEm: string | null;
  dominios: { id: string; dominio: string }[];
  centrais: Central[];
  /** Sem termo vigente, RN-090 impede qualquer inscrição. */
  termo?: { id: string; controladorNome: string };
  encontros: Encontro[];
}

/**
 * Os quatro inquilinos cobrem as situações que a resolução por host precisa
 * distinguir: dois `ativo` (um deles em `localhost`, que é o host do dev),
 * um `em_implantacao` e um `suspenso`. Falta `encerrado` de propósito — pela
 * RN-063t ele é indistinguível de host desconhecido, e um host que resolve para
 * 404 na semente só confundiria quem estivesse depurando.
 */
const INQUILINOS: Inquilino[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    nome: 'Homens de Fé',
    slug: 'homens-de-fe',
    situacao: 'ativo',
    contratoAceitoEm: CONTRATO_ACEITO_EM,
    dominios: [
      { id: '40000000-0000-4000-8000-000000000001', dominio: 'localhost' },
      { id: '40000000-0000-4000-8000-000000000002', dominio: 'homens-de-fe.app.com.br' },
    ],
    centrais: [
      {
        id: '20000000-0000-4000-8000-000000000001',
        nome: 'Central de Cascavel',
        cidade: 'Cascavel',
        uf: 'PR',
        slug: 'cascavel',
      },
      {
        id: '20000000-0000-4000-8000-000000000002',
        nome: 'Central de Maringá',
        cidade: 'Maringá',
        uf: 'PR',
        slug: 'maringa',
      },
    ],
    termo: {
      id: '50000000-0000-4000-8000-000000000001',
      controladorNome: 'Associação Homens de Fé',
    },
    encontros: [
      {
        id: '30000000-0000-4000-8000-000000000001',
        centralId: '20000000-0000-4000-8000-000000000001',
        numero: 3,
        titulo: '3º Encontro Homens de Fé de Cascavel',
        slug: '3-encontro-cascavel',
        cidade: 'Cascavel',
        situacao: 'publicado',
      },
      {
        id: '30000000-0000-4000-8000-000000000002',
        centralId: '20000000-0000-4000-8000-000000000002',
        numero: 1,
        titulo: '1º Encontro Homens de Fé de Maringá',
        slug: '1-encontro-maringa',
        cidade: 'Maringá',
        // Rascunho de propósito: é o contraste que a área pública precisa
        // esconder, ao lado do publicado da mesma denominação.
        situacao: 'rascunho',
      },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    nome: 'Tabor',
    slug: 'tabor',
    situacao: 'ativo',
    contratoAceitoEm: CONTRATO_ACEITO_EM,
    dominios: [
      { id: '40000000-0000-4000-8000-000000000003', dominio: 'tabor.localhost' },
      { id: '40000000-0000-4000-8000-000000000004', dominio: 'tabor.app.com.br' },
    ],
    centrais: [
      {
        id: '20000000-0000-4000-8000-000000000003',
        nome: 'Central de Maringá',
        cidade: 'Maringá',
        uf: 'PR',
        // Mesmo slug da central de Maringá do outro inquilino: `central_slug_unico_por_inquilino`
        // é por inquilino, e a semente exercita isso.
        slug: 'maringa',
      },
    ],
    termo: { id: '50000000-0000-4000-8000-000000000002', controladorNome: 'Associação Tabor' },
    encontros: [
      {
        id: '30000000-0000-4000-8000-000000000003',
        centralId: '20000000-0000-4000-8000-000000000003',
        numero: 2,
        titulo: '2º Encontro Tabor de Maringá',
        slug: '2-encontro-maringa',
        cidade: 'Maringá',
        situacao: 'publicado',
      },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    nome: 'Casa de Betânia',
    slug: 'casa-de-betania',
    situacao: 'em_implantacao',
    contratoAceitoEm: null,
    dominios: [{ id: '40000000-0000-4000-8000-000000000005', dominio: 'betania.localhost' }],
    centrais: [],
    encontros: [],
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    nome: 'Monte Sião',
    slug: 'monte-siao',
    situacao: 'suspenso',
    contratoAceitoEm: CONTRATO_ACEITO_EM,
    dominios: [{ id: '40000000-0000-4000-8000-000000000006', dominio: 'siao.localhost' }],
    centrais: [],
    encontros: [],
  },
];

async function main() {
  const cliente = await pool.connect();
  try {
    const { rows } = await cliente.query(
      'select current_schema() as schema, current_user as usuario',
    );
    // Trava em 'dev' literal, não em DB_SCHEMA_ESPERADO: um .env trocado leva
    // junto a variável, e esta semente nunca pode alcançar hom/prod.
    if (rows[0].schema !== 'dev') {
      throw new Error(
        `current_schema() = "${rows[0].schema}", esperado "dev". ` +
          'A semente de desenvolvimento não roda em outro schema.',
      );
    }
    console.log(`Semeando "${rows[0].schema}" como "${rows[0].usuario}"`);
  } finally {
    cliente.release();
  }

  const uow = new UnidadeDeTrabalhoService(pool);
  const contagem = { inquilino: 0, dominio: 0, central: 0, termo: 0, encontro: 0 };

  for (const inq of INQUILINOS) {
    // A linha de `inquilino` nasce sob o papel operador (RN-140, §5) — é a
    // única conta que enxerga inquilino de fora de um inquilino.
    await uow.executar({ papel: 'operador' }, async (tx) => {
      const criados = await tx
        .insert(schema.inquilino)
        .values({
          id: inq.id,
          nome: inq.nome,
          slug: inq.slug,
          situacao: inq.situacao,
          contratoAceitoEm: inq.contratoAceitoEm,
        })
        .onConflictDoNothing()
        .returning();
      contagem.inquilino += criados.length;
    });

    // Todo o resto nasce como admin_denominacao daquele inquilino.
    await uow.executar({ inquilinoId: inq.id, papel: 'admin_denominacao' }, async (tx) => {
      for (const dom of inq.dominios) {
        const criados = await tx
          .insert(schema.inquilinoDominio)
          .values({
            id: dom.id,
            inquilinoId: inq.id,
            dominio: dom.dominio,
            tipo: 'subdominio',
            verificado: VERIFICADO,
          })
          .onConflictDoNothing()
          .returning();
        contagem.dominio += criados.length;
      }

      for (const central of inq.centrais) {
        const criados = await tx
          .insert(schema.central)
          .values({
            id: central.id,
            inquilinoId: inq.id,
            nome: central.nome,
            cidade: central.cidade,
            uf: central.uf,
            slug: central.slug,
          })
          .onConflictDoNothing()
          .returning();
        contagem.central += criados.length;
      }

      // `termo` é a única tabela da semente SEM constraint unique natural
      // (nem (inquilino_id, versao)): `on conflict do nothing` só pegaria
      // colisão de id, então rodar com id novo duplicaria o termo em silêncio.
      // Daí a conferência explícita.
      if (inq.termo) {
        const jaExiste = await tx
          .select({ id: schema.termo.id })
          .from(schema.termo)
          .where(
            and(eq(schema.termo.inquilinoId, inq.id), eq(schema.termo.versao, VERSAO_DO_TERMO)),
          )
          .limit(1);

        if (jaExiste.length === 0) {
          await tx.insert(schema.termo).values({
            id: inq.termo.id,
            inquilinoId: inq.id,
            versao: VERSAO_DO_TERMO,
            titulo: 'Termo de uso e privacidade',
            // O texto jurídico de verdade é bloqueio não-código de
            // docs/proximos-passos.md — sem redator, a semente usa marcador.
            corpo:
              'Texto jurídico pendente de redação (bloqueio não-código de ' +
              'proximos-passos.md). Semente de desenvolvimento.',
            finalidades: ['inscricao', 'comunicacao'],
            controladorNome: inq.termo.controladorNome,
            controladorDocumento: '00000000000100',
            encarregadoNome: 'Encarregado de Dados',
            encarregadoContato: 'dpo@example.com',
            situacao: 'vigente',
            publicadoEm: new Date(agora).toISOString(),
          });
          contagem.termo += 1;
        }
      }

      for (const enc of inq.encontros) {
        const criados = await tx
          .insert(schema.encontro)
          .values({
            id: enc.id,
            inquilinoId: inq.id,
            centralId: enc.centralId,
            numero: enc.numero,
            titulo: enc.titulo,
            slug: enc.slug,
            dataInicio: '2027-03-12',
            dataFim: '2027-03-14',
            localNome: 'Recanto Vale Verde',
            localEndereco: 'Estrada do Vale, km 12',
            localCidade: enc.cidade,
            localUf: 'PR',
            vagasParticipantes: 60,
            vagasServos: 40,
            taxaParticipante: '380.00',
            taxaServo: '150.00',
            inscricoesAbremEm: INSCRICOES_ABREM_EM,
            inscricoesFechamEm: INSCRICOES_FECHAM_EM,
            situacao: enc.situacao,
          })
          .onConflictDoNothing()
          .returning();
        contagem.encontro += criados.length;
      }
    });
  }

  const total = Object.values(contagem).reduce((a, b) => a + b, 0);
  console.log(
    total === 0
      ? 'Nada a inserir — a semente já estava aplicada.'
      : `Inseridos: ${contagem.inquilino} inquilinos, ${contagem.dominio} domínios, ` +
          `${contagem.central} centrais, ${contagem.termo} termos, ${contagem.encontro} encontros.`,
  );
  console.log(
    'Hosts que resolvem: ' +
      INQUILINOS.flatMap((i) => i.dominios.map((d) => `${d.dominio} (${i.situacao})`)).join(', '),
  );
}

main()
  .catch((err) => {
    console.error('seed FALHOU:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
