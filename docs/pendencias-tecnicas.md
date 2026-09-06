# Pendências técnicas

Documento vivo. A cada sprint/iteração, o que ficou pra trás — bug encontrado e não
corrigido, decisão adiada, atalho tomado sob prazo, código morto — entra aqui como um
item novo, na seção da iteração em que foi descoberto. Não é backlog de feature nova
(isso é [proximos-passos.md](proximos-passos.md)); é dívida e loose end.

**Convenção de cada item:**
- **Origem**: onde foi descoberto (sprint/iteração ou sessão de trabalho, com data)
- **Descrição**: o que está errado ou incompleto, com referência a arquivo:linha
- **Impacto**: o que quebra ou fica exposto enquanto não for corrigido
- **Status**: aberto / em andamento / resolvido (mover para o topo da sua seção quando resolver, com a data)

---

## Pré-sprint-1 — fundação e levantamento (01/09/2026)

Itens encontrados durante a configuração dos ambientes dev/hom/prod/ci e o
levantamento de gap da Fase 1 (ver [proximos-passos.md](proximos-passos.md)).

### ~~RN-051t não cobre a tabela `usuario`~~

- **Status**: **resolvido em 06/09/2026**, no item 4 de proximos-passos.md. A
  `migrations/0005_integridade_usuario.sql` pendura o `validar_central_do_inquilino_trg` em
  `usuario`, fechando a escrita de um `admin_central` com `central_id` de outra central — que a
  RLS não barrava, porque a permissiva `usuario_central` dá passe livre a `admin_denominacao` e a
  restritiva só confere `inquilino_id`.
- **Achado no caminho**: `usuario` é a única tabela coberta em que `inquilino_id` **também** é
  nulável (papel `operador`). A função como estava na 0003 não bastava: `v_inquilino_da_central <>
  null` avalia para `NULL`, o `if` não dispara e a linha com central e sem inquilino passaria. A
  função ganhou ramo próprio para isso, e `search_path` fixo no idioma da 0004 — ela referencia
  `central` sem qualificar schema.
- **Exceção declarada**: `auditoria` tem o mesmo par e fica **fora** do trigger de propósito —
  `central_id` lá é `uuid` puro, sem FK, para o log sobreviver à exclusão da central. O trigger
  recusaria linha de auditoria cuja central já não existe.
- **Ressalva**: a migration não revalida linhas pré-existentes, e não tem como — `force row level
  security` alcança o dono do schema e a migration roda sem os GUCs `app.*`, então qualquer
  `select` de conferência enxergaria zero linhas. Sem impacto hoje: `usuario` não tem dado real
  até a autenticação (item 5).
- **Rede**: `test/integridade-central.spec.ts`, com o teste de catálogo que teria pego a falta —
  toda tabela com o par tem o trigger, fora as exceções declaradas (§9.14 de 00-multi-inquilino.md).

### ~~`ResolvedorDeHostGuard` escrito mas não plugado em nenhuma rota~~

- **Status**: **resolvido em 06/09/2026**, no item 3 de proximos-passos.md. O guard passou a
  ser `APP_GUARD` global em `src/app.module.ts` (RNF-006: toda rota resolve o inquilino pelo
  host, não só as de domínio), com o decorator `@SemResolucaoDeHost()` isentando o
  healthcheck, que a Railway chama pelo host interno. A consulta em si saiu do guard para o
  `ReconhecedorDeHostService`, que o CORS dinâmico usa pelo mesmo caminho.

### Etapa de drift-check do CI está flaky e foi removida do fluxo de bloqueio

- **Descrição**: a etapa "Confere que src/db/schema.ts está sincronizado com as
  migrations" (`.github/workflows/ci.yml`) falha de forma intermitente. O
  `drizzle-kit pull` troca as cláusulas `using`/`withCheck` entre policies do mesmo
  nome quando uma tabela tem mais de uma policy — confirmado consultando
  `pg_policies` diretamente: o banco está correto, é bug de geração do TypeScript
  pelo `drizzle-kit`, não do schema real.
- **Impacto**: como o ambiente `hom` no Railway tem "Wait for CI" ligado, essa etapa
  vermelha impede o deploy automático de `hom` a cada push em `main`, mesmo quando
  não há divergência real nenhuma.
- **Status**: aberto. Opções levantadas e ainda não decididas: (a) filtrar do diff as
  linhas `pgPolicy(` antes de comparar, (b) remover a etapa do CI, (c) deixá-la
  não-bloqueante (`continue-on-error`).

### Política de RLS de `inquilino_dominio` mais ampla que a spec descreve

- **Descrição**: `specs/fase-1/00-multi-inquilino.md` §5 descreve a leitura pública
  de `inquilino_dominio` como "apenas do host consultado, por função dedicada". A
  função dedicada (`resolver_inquilino_por_host`) filtra certo, mas a política de
  RLS abaixo dela (`migrations/0001_contexto_e_rls.sql:181-183`) libera `select` de
  **todos** os domínios verificados de **todos** os inquilinos, em qualquer
  contexto — e `test/isolamento.spec.ts:104-115` já afirma isso como design
  esperado.
- **Impacto**: um inquilino consegue enumerar os domínios verificados de outros
  inquilinos via query direta (não via a função pública, que já é estreita). Dado
  não é sensível (é o que a página pública já mostra), mas diverge do texto da
  spec.
- **Status**: aberto — precisa de decisão: apertar a policy pra bater com a spec,
  ou atualizar a spec pra documentar a política real como intencional.

### RN-124 e RN-138 são letra morta

- **Descrição**: a separação de roles de runtime (`app_api` / `app_publico`) nunca
  foi criada. O bloco que faria o `revoke` de RN-124 (nenhum role de aplicação com
  `select` em `identidade`) está dentro de um `if exists (select 1 from pg_roles...)`
  que não encontra role nenhuma e não executa (`migrations/0002_funcoes_de_dominio.sql:36-44`).
  RN-138 (auditoria append-only para `app_api`) também não tem nenhum `grant` no
  repositório.
- **Impacto**: a aplicação conecta com a role dona do schema — hoje pode ler
  `identidade` direto e fazer `update`/`delete` em `auditoria`, mesmo a migration
  documentando a decisão de não permitir isso. Quem lê só o SQL pode concluir que a
  proteção existe.
- **Status**: aberto. Esforço estimado: 6-12h (parte do item 5 de
  próximos-passos.md, autenticação/autorização).

---

## Item 3 — CORS dinâmico e resolução por host (06/09/2026)

### `X-Forwarded-Host` não é protegido pelo hop-count do `trust proxy`

- **Descrição**: `src/main.ts` liga `app.set('trust proxy', ambiente.PROXIES_CONFIAVEIS)`, sem
  o que `req.hostname` ignoraria `X-Forwarded-Host` e a resolução por host receberia o host
  interno do container na Railway. Só que o número de saltos do Express protege
  `X-Forwarded-For`, **não** `X-Forwarded-Host`: quem alcançar o processo sem passar pelo
  proxy pode escolher o host da requisição, e portanto o inquilino resolvido.
- **Impacto**: limitado, mas real. O host forjado ainda precisa ser um host já reconhecido —
  não dá para inventar inquilino — e RN-060t manda a área autenticada validar
  `usuario.inquilino_id` contra o host resolvido, com `403` na divergência, então a travessia
  não alcança dado autenticado de outro inquilino. O que se ganha forjando é o mesmo que se
  ganha visitando o subdomínio do outro inquilino pelo navegador: a área pública dele.
- **Status**: aberto. A mitigação é de infraestrutura, não de código — garantir que a Railway
  seja o único caminho de entrada do processo. Revisitar no item 5 (autenticação), que é
  quando a RN-060t sai do papel.

---

## Template para a próxima iteração

```
## Sprint N — <nome/tema> (<data>)

### <título curto do item>

- **Descrição**: ...
- **Impacto**: ...
- **Status**: aberto
```
