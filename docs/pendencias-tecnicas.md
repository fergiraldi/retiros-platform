# Pendências técnicas

Documento vivo. A cada sprint/iteração, o que ficou pra trás — bug encontrado e não
corrigido, decisão adiada, atalho tomado sob prazo, código morto — entra aqui como um
item novo, na seção da iteração em que foi descoberto. Não é backlog de feature nova
(isso é [proximos-passos.md](proximos-passos.md)); é dívida e loose end.

**Convenção de cada item:**
- **Origem**: fica no cabeçalho da seção (iteração + data), não se repete item a item
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
- **Rede**: `test/integridade-central.spec.ts`, com o teste de catálogo que teria pego a falta —
  toda tabela com o par tem o trigger, fora as exceções declaradas (§9.14 de 00-multi-inquilino.md).
- **O que a correção deliberadamente não cobre** virou item aberto próprio na seção do item 4,
  abaixo: `auditoria` fora do trigger, linhas pré-existentes não revalidadas e a ausência de
  guarda no lado de `central`.

### ~~`ResolvedorDeHostGuard` escrito mas não plugado em nenhuma rota~~

- **Status**: **resolvido em 06/09/2026**, no item 3 de proximos-passos.md. O guard passou a
  ser `APP_GUARD` global em `src/app.module.ts` (RNF-006: toda rota resolve o inquilino pelo
  host, não só as de domínio), com o decorator `@SemResolucaoDeHost()` isentando o
  healthcheck, que a Railway chama pelo host interno. A consulta em si saiu do guard para o
  `ReconhecedorDeHostService`, que o CORS dinâmico usa pelo mesmo caminho.

### ~~Etapa de drift-check do CI está flaky e continua bloqueando~~

- **Status**: **resolvido em 06/09/2026**, pela opção (a). A etapa em `.github/workflows/ci.yml`
  filtra do diff as linhas com `pgPolicy(` antes de comparar; qualquer outra linha ainda
  reprova, com a lista do que divergiu. A trava contra migration mudada sem `db:pull` continua
  valendo — só o falso positivo saiu.
- **Medido antes de implementar**: `db:pull` num schema sem mudança de estrutura produziu 34
  linhas alteradas, **68 linhas `+`/`-`, todas com `pgPolicy(`** — o filtro cobre 100% do
  ruído observado. Validado nos três cenários: árvore limpa passa, ruído de `pgPolicy` passa,
  linha estranha injetada reprova com `exit 1`.
- **Não resolve o bug de origem**, que é do `drizzle-kit`: rodar `db:pull` à mão ainda suja o
  working tree e ainda exige `git checkout` depois.

- **A causa, para quando reaparecer**: o `drizzle-kit pull` troca as cláusulas
  `using`/`withCheck` entre policies de mesmo nome quando uma tabela tem mais de uma —
  confirmado consultando `pg_policies` direto: o banco está correto, é bug de geração do
  TypeScript, não do schema real. O bloqueio vinha do "Wait for CI" ligado no `hom`, que
  parava o deploy a cada push em `main` sem divergência nenhuma.
- **Descartadas**: (b) remover a etapa, (c) `continue-on-error` — viraria ruído que ninguém
  olha, sem trava de verdade.

### ~~Política de RLS de `inquilino_dominio` mais ampla que a spec descreve~~

- **Status**: **resolvido em 06/09/2026**, corrigindo a **spec**, não a policy. A tabela de
  exceções de `specs/fase-1/01-modelo-de-dados.md` §5 agora descreve a leitura pública como
  ela é — todo domínio verificado, de qualquer inquilino — com um parágrafo dizendo por que é
  deliberada: o dado é o que a página pública de cada inquilino já expõe, e estreitar a policy
  quebraria a resolução por host, que lê a tabela **antes** de existir contexto de inquilino.
- **Correção de referência**: este item apontava `00-multi-inquilino.md` §5, onde a §5 é
  "Marca e rótulos". O texto estreito estava em `01-modelo-de-dados.md` §5 ("RLS"), linha 710
  — arquivo errado, seção certa.
- **Diagnóstico original**: a função dedicada (`resolver_inquilino_por_host`) filtra certo, mas
  a política de RLS abaixo dela (`migrations/0001_contexto_e_rls.sql:181-183`) libera `select`
  de **todos** os domínios verificados de **todos** os inquilinos, em qualquer contexto — e
  `test/isolamento.spec.ts:104-115` já afirmava isso como design esperado. A consequência
  aceita: um inquilino consegue enumerar os domínios verificados dos outros por query direta.
- **Nenhuma migration foi tocada**: apertar a policy exigiria reescrever aquele teste, que é
  justamente a evidência de que o comportamento é intencional.

### RN-124 e RN-138 são letra morta

- **Descrição**: a separação de roles de runtime (`app_api` / `app_publico`) nunca
  foi criada. O bloco que faria o `revoke` de RN-124 (nenhum role de aplicação com
  `select` em `identidade`) está dentro de um `if exists (select 1 from pg_roles...)`
  que não encontra role nenhuma e não executa (`migrations/0002_funcoes_de_dominio.sql:36-44`).
  RN-138 (auditoria append-only para `app_api`) também não tem nenhum `grant` no
  repositório.
- **Impacto**: a aplicação conecta com a role dona das tabelas — hoje pode ler
  `identidade` direto e fazer `update`/`delete` em `auditoria`, mesmo a migration
  documentando a decisão de não permitir isso. Quem lê só o SQL pode concluir que a
  proteção existe. O comentário de `test/rls-cobertura.spec.ts:9` afirma o mesmo que a
  migration — "identidade: ... sem select para role de aplicação" —, então há duas fontes
  no repositório descrevendo uma proteção inexistente. **Corrigido em 06/09/2026**: o
  comentário do teste agora diz o que a spec pede *e* o que o banco faz. A migration segue
  como está — o bloco condicional dela é a forma certa de já ficar correto quando as roles
  existirem.
- **Confirmado no banco `dev` em 06/09/2026**: `app_api` e `app_publico` não existem;
  existem `app_dev`, `app_hom`, `app_prod` e `app_ci`, **nenhuma** com `BYPASSRLS` nem
  `superuser`. `app_dev` é dona das 18 tabelas (as 17 de domínio + `_migracoes`) e tem
  `select` em `identidade` e `update`/`delete` em `auditoria` — RN-124 e RN-138 medidas, não
  inferidas.
- **O que não está quebrado** (para não superdimensionar o item): `force row level security`
  alcança o dono da tabela, e a prova empírica bate — `select count(*) from usuario` sem os
  GUCs de contexto devolve **0 linhas** sob `app_dev`. O isolamento do RNF-001 vale hoje. O
  que falta é a defesa em profundidade por privilégio: separar quem lê `identidade` e impedir
  que a role de runtime altere as próprias policies.
- **Status**: aberto. Esforço estimado: 6-12h (parte do item 5 de
  próximos-passos.md, autenticação/autorização).

---

## Item 3 — CORS dinâmico e resolução por host (06/09/2026)

### ~~`@SemTransacao()` só vale no handler; `@SemResolucaoDeHost()` vale na classe~~

- **Status**: **resolvido em 06/09/2026**. O `ContextoInterceptor` passou a ler o metadado com
  `getAllAndOverride([getHandler(), getClass()])`, igual ao guard — marcar um controller
  inteiro com `@SemTransacao()` agora funciona, em vez de não surtir efeito em silêncio. O
  comentário do decorator foi ajustado junto, para os dois irmãos se descreverem igual.
- **Sem teste dedicado**: nenhuma suíte cobre o `ContextoInterceptor` isoladamente hoje, e não
  criei arquivo novo para isto. A fiação do decorator entra nos cenários do item 23, junto com
  os do guard e do CORS.

### ~~`PROXIES_CONFIAVEIS` ainda não foi configurado em hom/prod~~

- **Descrição**: a variável nasceu com default `0` (`src/config/ambiente.ts`), que é o valor
  certo para o dev local, que fala direto com o processo. Na Railway, onde a requisição chega
  pelo proxy, o valor tem de ser `1` — as variáveis de ambiente de `hom` e `prod` ainda não
  têm a entrada.
- **Impacto**: **derruba a aplicação inteira em hom/prod assim que houver rota de domínio.**
  Com `0`, o Express ignora `X-Forwarded-Host` e `req.hostname` devolve o host interno do
  container, que não bate com nenhuma linha de `inquilino_dominio` — o guard responde `404`
  em toda rota. O `/saude` continua verde por ser isento, então o healthcheck **não** acusa o
  problema: o deploy sobe saudável e nada funciona.
- **Status**: **resolvido em 06/09/2026**, e **verificado** — não apenas informado. Pelo CLI da
  Railway (`railway variables`), `hom` e `prod` têm `PROXIES_CONFIAVEIS=1`; o `.env` do dev
  local tem `=0`. Os valores são diferentes de propósito: `1` no local faria o Express aceitar
  `X-Forwarded-Host` de qualquer cliente, sem proxy nenhum na frente.
- **Conferido junto, no mesmo acesso**: `DB_SCHEMA_ESPERADO` é `hom` em hom e `prod` em prod
  (a trava de schema aponta para o lugar certo em cada um), `NODE_ENV=production` nos dois, e
  ambos respondem `200` em `/saude`, com o deploy mais recente em `SUCCESS`.
- **Fica de pé para o item 10**: se a Railway inserir mais de um salto de proxy, o número
  deixa de ser `1`. Não dá para medir hoje — em hom/prod `inquilino_dominio` está vazio, então
  toda rota não isenta responde `404` de qualquer forma, sem distinguir a causa. Mede-se
  comparando `req.hostname` com o `Host` enviado, na primeira rota de domínio que existir.

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

### ~~Semente de desenvolvimento existe no banco, mas não é reproduzível~~

- **Status**: **resolvido em 06/09/2026**. `src/db/seed-dev.ts` + `pnpm db:seed`, escrito com
  `test/ajuda/semear.ts` como base — não dá para importar de lá, porque `tsconfig.build.json`
  exclui `test/`. Escreve pelo `UnidadeDeTrabalhoService`, como o helper, então a semente
  também prova que o `with check` de cada política aceita a escrita legítima. Reproduz o
  inventário abaixo linha a linha, com os mesmos UUIDs fixos que o script original já usava
  para inquilino/central/encontro (`10000000-`, `20000000-`, `30000000-`).
- **Achado no caminho**: `termo` é a única tabela da semente **sem constraint unique natural**
  — nem `(inquilino_id, versao)`. `on conflict do nothing` só pegaria colisão de `id`, então a
  primeira versão do script duplicaria o termo a cada execução, em silêncio. O seed confere a
  existência por `(inquilino_id, versao)` antes de inserir; as outras quatro tabelas têm
  unique natural e seguem no `on conflict do nothing`.
- **Trava**: `current_schema() = 'dev'` literal, não `DB_SCHEMA_ESPERADO` — um `.env` trocado
  leva a variável junto, e a semente nunca pode alcançar hom/prod.
- **A janela de inscrição dos encontros é relativa ao `now()`** (abre 5 dias antes, fecha 45
  depois): fixa, ela venceria e os encontros parariam de aceitar inscrição sem motivo aparente.

- **O que a semente contém** (conferido contra o banco em 06/09/2026, linha a linha): Homens
  de Fé (`localhost`, `homens-de-fe.app.com.br`, duas centrais, termo vigente, dois encontros
  — um publicado, um rascunho), Tabor (`tabor.localhost`, `tabor.app.com.br`, uma central,
  termo, um encontro), Casa de Betânia (`betania.localhost`, `em_implantacao`) e Monte Sião
  (`siao.localhost`, `suspenso`). Falta `encerrado` de propósito: pela RN-063t ele é
  indistinguível de host desconhecido, e um host que resolve para `404` só atrapalharia quem
  estivesse depurando.
- **O detalhe que não pode se perder**: **todos os domínios nascem `verificado = true`**.
  `resolver_inquilino_por_host` filtra por `d.verificado = true`
  (`migrations/0002_funcoes_de_dominio.sql:62`), então semear sem a flag reproduz exatamente o
  `404` que este item existia para evitar, e por um motivo diferente do esperado.
- **Efeito colateral bom**: destrava o bloqueio não-código "dados-semente de um inquilino
  piloto" de [proximos-passos.md](proximos-passos.md).

### Guard e CORS não têm cobertura automatizada ponta a ponta

- **Descrição**: `test/reconhecedor-de-host.spec.ts`, `test/resolvedor-de-host.guard.spec.ts` e
  `test/cors.spec.ts` são unitários, e `test/host-resolucao.spec.ts` cobre a resolução contra o
  banco. O que **nenhum** teste cobre é a fiação: o `APP_GUARD` estar registrado em
  `src/app.module.ts`, o `@SemResolucaoDeHost()` isentar o healthcheck de verdade, e o CORS
  rodar antes do pipeline. Isso foi verificado só na mão, com `curl`, durante a implementação.
- **Impacto**: alguém pode remover o `APP_GUARD`, ou o decorator do `SaudeController`, e a
  suíte inteira continua verde. É a regressão mais cara possível — RNF-006 deixando de valer
  sem ninguém notar.
- **Status**: aberto. Depende do item 23 (infra de teste HTTP/e2e com supertest). Quando ele
  chegar, os quatro cenários mínimos são: host conhecido resolve, host desconhecido dá `404`,
  `/saude` responde com host desconhecido, e preflight de origem desconhecida não devolve
  `Access-Control-Allow-Origin`.

### `ReconhecedorDeHostService.esquecer()` não tem chamador

- **Descrição**: o serviço expõe `esquecer(host?)` para invalidar o cache de reconhecimento, e
  nenhum código de produção chama — só `test/reconhecedor-de-host.spec.ts:177`, que cobre o
  método. Na prática a invalidação é só por TTL: 60s para host reconhecido, 10s para
  desconhecido (`src/contexto/reconhecedor-de-host.service.ts:18-20`).
- **Impacto**: pequeno e temporário. Quando um admin verificar um domínio próprio (item 8), o
  endereço novo demora até 60s para começar a responder, e um domínio revogado continua
  atendendo pelo mesmo intervalo. Aceitável para verificação de DNS, que já é lenta; ruim se
  alguém revogar um domínio por incidente de segurança esperando efeito imediato.
- **Status**: aberto. O item 8 (onboarding) deve chamar `esquecer(dominio)` ao gravar
  `verificado`. Esforço desprezível — é lembrar.

---

## Item 4 — integridade do par inquilino/central (06/09/2026)

O que a `migrations/0005_integridade_usuario.sql` deliberadamente deixou de fora. Nenhum destes
impede a Fase 1 hoje — todos ficam maiores quando `usuario` e `auditoria` passarem a ter dado
real (itens 5, 5b e 18 de [proximos-passos.md](proximos-passos.md)).

### `auditoria` não tem guarda para o par inquilino/central

- **Descrição**: `auditoria` tem `inquilino_id` + `central_id`, mas ficou fora do
  `validar_central_do_inquilino_trg`: nessa tabela **as duas** colunas são `uuid` puro, sem FK
  nenhuma (`migrations/0000_estrutura.sql:534-535`) — ao contrário das outras seis. A migration
  não explica o porquê, mas o motivo aparente é o log ter de sobreviver à exclusão das linhas
  que ele registra; o trigger recusaria linha de auditoria cuja central já não existe mais. A
  exceção está declarada em `test/integridade-central.spec.ts` (`EXCECOES_DECLARADAS`), então é
  visível — mas nada valida o par nessa tabela.
- **A confirmar**: se a ausência de FK foi mesmo decisão consciente. Não há comentário na
  migration nem menção na spec — pode ser omissão, e nesse caso a resposta muda.
- **Impacto**: nulo hoje (nada escreve auditoria de verdade ainda — item 18). Quando escrever,
  uma linha de auditoria pode registrar `central_id` de central de outro inquilino sem que nada
  reclame. A RLS continua barrando o `inquilino_id` errado; é só o `central_id` que fica solto.
- **Status**: aberto. Decidir no item 18 (auditoria efetiva) entre validar no ponto de escrita
  da aplicação ou um trigger próprio que aceite central inexistente e recuse central de outro
  inquilino. Esforço: 1-2h dentro do item 18.

### Linhas pré-existentes nunca foram revalidadas contra a RN-051t

- **Descrição**: o trigger é `before insert or update` — não alcança linha que já estava lá. A
  0005 não pôde conferir o estoque: `force row level security` alcança o dono da tabela e a
  migration roda sem os GUCs `app.*`, então qualquer `select` de conferência enxergaria zero
  linhas. Vale para `usuario` e também para as cinco tabelas da 0003, que nunca tiveram varredura.
- **Impacto**: nulo hoje — `usuario` não tem dado real até a autenticação (item 5), e os
  ambientes só têm dado de semente de teste. Cresce a cada linha gravada em hom/prod.
- **Status**: aberto. Antes do item 5b (contas de acesso multi-central), rodar uma varredura por
  inquilino — com os GUCs setados, um `select` por tabela cruzando `central_id` com
  `central.inquilino_id` — e só então confiar que o estoque está limpo. Esforço: 1-2h.

### Nada revalida os filhos se `central.inquilino_id` mudar

- **Descrição**: o trigger valida o filho no momento em que o filho é escrito. Não há trigger no
  lado de `central`: se o `inquilino_id` de uma central mudasse, todo `encontro`, `inscricao`,
  `cobranca`, `usuario`, `notificacao` e `conexao_gateway` abaixo dela viraria a combinação
  impossível que a RN-051t existe para impedir, sem nada disparar.
- **Impacto**: nenhum caminho alcançável hoje. A política restritiva `central_inquilino` tem
  `with check (inquilino_id = app_inquilino_id())`, então mover uma central para outro inquilino
  é recusado pela RLS. O ponto é que a proteção vem inteira da RLS — não há guarda no banco
  independente dela, e uma futura política de `central` mais frouxa abriria isso em silêncio.
- **Status**: aberto, baixa prioridade. Opções: (a) trigger em `central` recusando `update` de
  `inquilino_id`, (b) deixar como está e documentar a dependência na spec. Esforço: 1-2h.

---

## Consistência docs × código (06/09/2026)

Achado da conferência afirmação por afirmação dos dois documentos contra `src/`,
`migrations/`, `test/`, `ci.yml` e — no ponto em que os documentos se contradiziam — contra o
banco `dev`. As correções de texto foram aplicadas no ato: `proximos-passos.md` dava a role
`app_api` como pronta, contradizendo o item "RN-124 e RN-138 são letra morta" acima; a
consulta a `pg_roles` deu razão à pendência, e o que de fato está pronto (role sem
`BYPASSRLS`, RLS alcançando a dona das tabelas) foi medido e registrado lá. Só o item abaixo
é dívida de código nova.

### `ZodValidationPipe` não é global e não tem teste de fiação

- **Descrição**: o pipe (`src/validacao/zod-validation.pipe.ts`) tem teste unitário, mas
  **não** está registrado como `APP_PIPE` em `src/app.module.ts` — os providers de lá são só
  `APP_GUARD`, `APP_INTERCEPTOR` e `APP_FILTER`. O uso é por rota, `@Body(new
  ZodValidationPipe(schema))`, como o próprio arquivo documenta. É decisão defensável, e
  provavelmente a única possível: o schema muda por rota, e não existe pipe global sem schema.
  O que falta não é o registro — é o que garanta que uma rota nova não passe sem validação.
- **Impacto**: nulo hoje, porque não há controller de domínio nenhum. Vira real nos itens 10
  e 20, quando o item 2 já estiver marcado "concluído" há tempo e ninguém for reler este
  ponto: uma rota que esqueça o pipe aceita corpo arbitrário em silêncio, sem nada vermelho.
- **Status**: aberto. Irmão do item "Guard e CORS não têm cobertura automatizada ponta a
  ponta" — os dois são fiação que nenhum teste unitário alcança, e os dois se resolvem no
  item 23 (supertest). Cenário mínimo: uma rota com corpo inválido devolve `400` no envelope
  de RNF-011, não `201`.

---

## Template para a próxima iteração

```
## Sprint N — <nome/tema> (<data>)

### <título curto do item>

- **Descrição**: ...
- **Impacto**: ...
- **Status**: aberto
```
