/**
 * `drizzle-kit pull` introspecciona um schema Postgres nomeado (dev/hom/prod)
 * e, por padrão, embute esse nome nos símbolos gerados (`pgSchema("dev")`,
 * `pessoaInDev`, `dev.enum(...)`) — o que quebraria a portabilidade do
 * binário compilado entre ambientes, já que o código da aplicação teria que
 * mudar o nome importado conforme o ambiente de destino.
 *
 * Este script roda logo depois do `pull` e remove essa qualificação: troca
 * `<schema>.table(...)` / `<schema>.enum(...)` por `pgTable`/`pgEnum` sem
 * schema (resolvidos em runtime pelo `search_path` da role — dev, hom ou
 * prod, sem o código da aplicação saber a diferença), e remove o sufixo
 * `In<Schema>` de todo identificador gerado.
 */
import * as fs from 'fs';
import * as path from 'path';

const SCHEMA = process.env.DB_SCHEMA_ESPERADO ?? 'dev';
const SUFIXO = 'In' + SCHEMA.charAt(0).toUpperCase() + SCHEMA.slice(1);
const ARQUIVOS = ['schema.ts', 'relations.ts'].map((f) => path.join(__dirname, f));

function processar(caminho: string) {
  if (!fs.existsSync(caminho)) return;
  let conteudo = fs.readFileSync(caminho, 'utf8');

  // remove a linha `export const <schema> = pgSchema("<schema>");`
  conteudo = conteudo.replace(
    new RegExp(`export const ${SCHEMA} = pgSchema\\("${SCHEMA}"\\);\\n?`),
    '',
  );

  // `<schema>.table(` -> `pgTable(`, `<schema>.enum(` -> `pgEnum(`
  conteudo = conteudo.replace(new RegExp(`\\b${SCHEMA}\\.table\\(`, 'g'), 'pgTable(');
  conteudo = conteudo.replace(new RegExp(`\\b${SCHEMA}\\.enum\\(`, 'g'), 'pgEnum(');

  // remove o sufixo In<Schema> de todo identificador (ex.: pessoaInDev -> pessoa)
  conteudo = conteudo.replace(new RegExp(SUFIXO, 'g'), '');

  // ajusta o import: garante pgTable/pgEnum, remove pgSchema se sobrou sem uso
  conteudo = conteudo.replace(
    /from "drizzle-orm\/pg-core"/,
    (m) => m, // placeholder — ajuste fino de import abaixo
  );
  conteudo = ajustarImportPgCore(conteudo);

  conteudo =
    `// GERADO por \`pnpm db:pull\` a partir do schema "${SCHEMA}" — não editar à mão.\n` +
    `// Fonte real: migrations/*.sql. Rode \`pnpm db:pull\` de novo depois de toda migration nova.\n\n` +
    conteudo;

  fs.writeFileSync(caminho, conteudo);
  console.log(`pós-processado: ${path.basename(caminho)}`);
}

function ajustarImportPgCore(conteudo: string): string {
  const linhaImport = conteudo.match(/import \{([^}]+)\} from "drizzle-orm\/pg-core"/);
  if (!linhaImport) return conteudo;

  const nomes = new Set(
    linhaImport[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  nomes.delete('pgSchema');
  nomes.add('pgTable');
  if (conteudo.includes('pgEnum(')) nomes.add('pgEnum');

  const novaLinha = `import { ${Array.from(nomes).sort().join(', ')} } from "drizzle-orm/pg-core"`;
  return conteudo.replace(/import \{[^}]+\} from "drizzle-orm\/pg-core"/, novaLinha);
}

for (const arquivo of ARQUIVOS) processar(arquivo);
corrigirSchemaTs(path.join(__dirname, 'schema.ts'));

/**
 * Duas lacunas conhecidas da introspecção do drizzle-kit, sempre presentes
 * depois de um `pull` contra este schema — corrigidas aqui pra não precisar
 * lembrar manualmente depois de toda migration nova:
 *
 * 1. `bytea` (identidade.cpf_hash) não tem tipo nativo no drizzle-kit pull;
 *    ele gera `unknown("cpf_hash")`, que nem compila (`unknown` é tipo, não
 *    valor). Precisa de um `customType`.
 * 2. `encontro.coordenador_inscricao_id -> inscricao.id` e
 *    `inscricao.encontro_id -> encontro.id` são referência circular de
 *    verdade. Em runtime não há problema (o callback de extraConfig do
 *    pgTable é avaliado depois do módulo inteiro carregar), mas o
 *    TypeScript não consegue inferir os dois tipos circulares sem ajuda.
 *    Resolve trocando o `foreignKey({...})` avulso por `.references()`
 *    inline com retorno `AnyPgColumn` explícito, no lado que vem primeiro
 *    no arquivo (encontro, que referencia inscricao antes dela existir).
 */
function corrigirSchemaTs(caminho: string) {
  if (!fs.existsSync(caminho)) return;
  let conteudo = fs.readFileSync(caminho, 'utf8');

  if (conteudo.includes('unknown("cpf_hash")')) {
    conteudo = conteudo.replace(
      /import \{ sql \} from "drizzle-orm"\n/,
      'import { sql } from "drizzle-orm"\nimport { customType } from "drizzle-orm/pg-core"\n\n' +
        'const bytea = customType<{ data: Buffer }>({ dataType: () => \'bytea\' })\n',
    );
    conteudo = conteudo.replace(
      "\t// TODO: failed to parse database type 'bytea'\n\tcpfHash: unknown(\"cpf_hash\").notNull(),",
      '\tcpfHash: bytea("cpf_hash").notNull(),',
    );
  }

  const regexFkAvulsa =
    /[ \t]*foreignKey\(\{\s*columns: \[table\.coordenadorInscricaoId\],\s*foreignColumns: \[inscricao\.id\],\s*name: "encontro_coordenador_inscricao_fk"\s*\}\),?\n/;
  if (regexFkAvulsa.test(conteudo)) {
    conteudo = conteudo.replace(regexFkAvulsa, '');
    conteudo = conteudo.replace(
      /coordenadorInscricaoId: uuid\("coordenador_inscricao_id"\),/,
      // o nome original da constraint (encontro_coordenador_inscricao_fk) já
      // existe no banco, gravado pela migration real — .references() aqui é
      // só pra tipagem do query builder, não recria nem renomeia a FK.
      'coordenadorInscricaoId: uuid("coordenador_inscricao_id")\n' +
        '\t\t.references((): AnyPgColumn => inscricao.id),',
    );
  } else {
    console.warn(
      'AVISO: bloco foreignKey de coordenador_inscricao_id não encontrado no formato esperado — ' +
        'a referência circular encontro/inscricao pode voltar a dar erro de tipo. Ajustar o regex em pos-processar-schema.ts.',
    );
  }

  fs.writeFileSync(caminho, conteudo);
  console.log('correções de bytea/referência circular aplicadas em schema.ts');
}

// o SQL "migration" que o pull gera é artefato do próprio drizzle-kit, não a
// nossa fonte de verdade (migrations/*.sql já é isso) — remove pra não confundir.
const dir = __dirname;
for (const nome of fs.readdirSync(dir)) {
  if (/^\d{4}_.*\.sql$/.test(nome)) {
    fs.unlinkSync(path.join(dir, nome));
    console.log(`removido (artefato do pull, não é nossa migration): ${nome}`);
  }
}
const metaDir = path.join(dir, 'meta');
if (fs.existsSync(metaDir)) {
  fs.rmSync(metaDir, { recursive: true, force: true });
  console.log('removido: src/db/meta/ (jornal do drizzle-kit, não usamos)');
}
