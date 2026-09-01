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

### RN-051t não cobre a tabela `usuario`

- **Descrição**: o trigger `validar_central_do_inquilino_trg`
  (`migrations/0003_integridade.sql`) cobre `encontro`, `inscricao`, `cobranca`,
  `notificacao` e `conexao_gateway`, mas não `usuario` — que tem o mesmo par
  `inquilino_id` + `central_id` nullable (preenchido para `admin_central`).
- **Impacto**: hoje é possível gravar um `admin_central` com `central_id` de uma
  central que pertence a outro inquilino — exatamente a "combinação impossível" que
  o trigger existe para barrar nas outras 5 tabelas.
- **Status**: aberto. Corrigir antes de popular contas de acesso multi-central
  (bloqueia o item 5b de próximos-passos.md). Esforço: 2-3h.

### `ResolvedorDeHostGuard` escrito mas não plugado em nenhuma rota

- **Descrição**: `src/contexto/resolvedor-de-host.guard.ts` resolve o inquilino pelo
  host corretamente e devolve 404 neutro para host desconhecido, mas nunca é
  aplicado via `@UseGuards(...)` em nenhum controller nem registrado como
  `APP_GUARD` global. É provider declarado e exportado pelo `ContextoModule`, nunca
  consumido — código morto no sentido estrito (inalcançável).
- **Impacto**: nenhum, hoje (só existe o `/saude`, que não precisa dele). Mas é
  risco de esquecimento: alguém pode reimplementar resolução de host do zero no
  primeiro controller de domínio se isso não for lembrado.
- **Status**: aberto. Resolve-se naturalmente no item 3 de próximos-passos.md
  ("CORS dinâmico + plugar o guard de host").

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

## Template para a próxima iteração

```
## Sprint N — <nome/tema> (<data>)

### <título curto do item>

- **Descrição**: ...
- **Impacto**: ...
- **Status**: aberto
```
