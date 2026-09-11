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
- **Status**: aberto, **adiado por decisão de 07/09/2026** — fica como está até a migração
  para produção, quando será verificado antes do go-live. Não é esquecimento: o isolamento do
  RNF-001 já vale (ver acima), e o que falta é defesa em profundidade por privilégio. Esforço
  estimado: 6-12h, mais a coordenação de infraestrutura abaixo.

**Levantamento de 07/09/2026 — duas complicações que a spec não previu**

- **Roles no Postgres são globais ao cluster, não por schema.** Os quatro ambientes são
  schemas do mesmo banco Supabase, com uma role por ambiente (`app_dev`, `app_ci`, `app_hom`,
  `app_prod`). Um `app_api` único atravessaria dev, ci, hom e prod, destruindo o isolamento
  atual — a spec assumiu, implicitamente, um banco por ambiente. São **quatro** roles novas
  (`app_api_dev`, `app_api_ci`, `app_api_hom`, `app_api_prod`), não uma.
- **`app_publico` não tem desenho.** Aparece **uma única vez** no repositório inteiro, no
  `revoke all on identidade from app_api, app_publico` de `01-modelo-de-dados.md`. Nenhuma
  spec diz o que ela é, quando é usada ou o que a distingue de `app_api`. Antes de criá-la,
  decidir se ela existe — se a área pública e a autenticada usarem a mesma role, o `revoke`
  dela é letra morta permanente.

**O que precisa acontecer, quando for a hora**

1. Decidir a nomeação por ambiente (o primeiro ponto acima) — arquitetura, não execução.
2. Criar as roles **como `postgres`**, pelo SQL Editor do Supabase: `app_dev` tem
   `rolcreaterole = false` e não cria role nenhuma. É o acesso que falta hoje.
3. Conceder o mínimo: `usage` no schema, DML nas tabelas de domínio, `execute` nas funções e
   `alter default privileges` para as tabelas futuras — com as duas restrições que são o
   objetivo: **nada** em `identidade` (RN-124) e só `insert`/`select` em `auditoria` (RN-138).
4. Trocar a connection string da aplicação para a role de runtime. Isso implica **duas URLs
   por ambiente** — runtime e owner —, porque `db:migrate` continua exigindo o dono do schema.
   Hoje há uma `DATABASE_URL` só, usada pelos dois. **É o passo de risco**: errar um grant
   derruba a aplicação inteira, e só aparece no deploy.
5. A 0002 não precisa mudar: o bloco condicional passa a encontrar as roles e executa sozinho.

**O obstáculo registrado na 0002 desaparece com a separação**: o comentário dela diz que
revogar `identidade` "quebraria a própria `security definer`". Quebraria enquanto owner e
runtime são a mesma role — `resolver_identidade` é `security definer` e roda como o **owner**,
que mantém o acesso. Com a separação, o owner continua lendo `identidade` e a role de runtime
não, que é exatamente o que a RN-124 pede. O desenho funciona.

**Caminho recomendado**: fazer primeiro em `dev` de ponta a ponta — criar a role, aplicar os
grants, trocar a URL local e rodar a suíte inteira — e só replicar para os outros ambientes
depois que os testes passarem sob a role restrita.

---

## Item 3 — CORS dinâmico e resolução por host (06/09/2026)

### ~~`@SemTransacao()` só vale no handler; `@SemResolucaoDeHost()` vale na classe~~

- **Status**: **resolvido em 06/09/2026**. O `ContextoInterceptor` passou a ler o metadado com
  `getAllAndOverride([getHandler(), getClass()])`, igual ao guard — marcar um controller
  inteiro com `@SemTransacao()` agora funciona, em vez de não surtir efeito em silêncio. O
  comentário do decorator foi ajustado junto, para os dois irmãos se descreverem igual.
- **Sem teste dedicado, ainda**: o item 23 (`test/pipeline-http.spec.ts`) cobriu guard de host,
  guard de autenticação e CORS por HTTP real, mas as duas rotas existentes (`/saude`,
  `/api/sessao`) são `@SemTransacao()` — nenhuma delas exercita o `ContextoInterceptor`
  de fato abrindo uma transação via HTTP. Continua faltando, e só vai ter onde nascer quando a
  primeira rota de domínio (sem a isenção) existir — itens 10/11/20.

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

### ~~`X-Forwarded-Host` não é protegido pelo hop-count do `trust proxy`~~

- **Status**: **resolvido em 07/09/2026** — não havia ação de infraestrutura pendente: a
  topologia da Railway **já** garante a entrada única pelo edge. Verificado no projeto: um
  único serviço (sem vizinho na rede privada), um único domínio do tipo `service` servido pelo
  edge HTTP, e nenhum TCP proxy publicado. O container não tem IP público, então de fora só se
  chega pelo proxy, que sempre injeta `X-Forwarded-*`.
- **O que ficou registrado, e onde**: a garantia vem da topologia, não do código, e por isso
  virou seção própria no `README.md` ("O edge da Railway é o único caminho de entrada") — com
  as **duas mudanças que a reabrem** e que nada sinaliza: acrescentar um segundo serviço ao
  projeto, que passa a falar com `*.railway.internal` sem passar pelo edge, ou expor um TCP
  proxy. Se qualquer uma entrar no ar, o guard tem de passar a exigir a marca do proxy na
  requisição em vez de confiar na topologia.
- **Descartada por ora**: a trava em código (rejeitar, em produção, requisição sem
  `X-Forwarded-*`). Fecharia o vetor sem depender de vigilância, mas mexe no caminho de toda
  requisição para um risco cujo ganho é a área pública do outro inquilino — a mesma que o
  navegador já alcança. Fica como a resposta pronta para o dia em que a topologia mudar.
- **Diagnóstico original**: `src/main.ts` liga `app.set('trust proxy', ambiente.PROXIES_CONFIAVEIS)`, sem
  o que `req.hostname` ignoraria `X-Forwarded-Host` e a resolução por host receberia o host
  interno do container na Railway. Só que o número de saltos do Express protege
  `X-Forwarded-For`, **não** `X-Forwarded-Host`: quem alcançar o processo sem passar pelo
  proxy pode escolher o host da requisição, e portanto o inquilino resolvido.
- **Impacto**: limitado, mas real. O host forjado ainda precisa ser um host já reconhecido —
  não dá para inventar inquilino — e RN-060t manda a área autenticada validar
  `usuario.inquilino_id` contra o host resolvido, com `403` na divergência, então a travessia
  não alcança dado autenticado de outro inquilino. O que se ganha forjando é o mesmo que se
  ganha visitando o subdomínio do outro inquilino pelo navegador: a área pública dele.
- **Revisitar no item 5** (autenticação), que é quando a RN-060t sai do papel e passa a ser a
  proteção efetiva do lado autenticado.

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

### ~~Guard e CORS não têm cobertura automatizada ponta a ponta~~

- **Status**: **resolvido em 11/09/2026**, pelo item 23 (`test/pipeline-http.spec.ts`, com o
  helper `test/ajuda/app-teste.ts` que sobe a `AppModule` real via `Test.createTestingModule` e
  bate nela com `supertest`). Os quatro cenários mínimos passam contra dois inquilinos semeados
  de verdade: `/saude` responde `200` com `Host` desconhecido, host desconhecido em
  `/api/sessao` devolve `404` no envelope de RNF-011, e o preflight `OPTIONS` distingue origem
  reconhecida (recebe `Access-Control-Allow-Origin`) de origem desconhecida (não recebe).
- **Descrição original**: `test/reconhecedor-de-host.spec.ts`, `test/resolvedor-de-host.guard.spec.ts`
  e `test/cors.spec.ts` são unitários, e `test/host-resolucao.spec.ts` cobre a resolução contra o
  banco. O que nenhum teste cobria era a fiação: o `APP_GUARD` estar registrado em
  `src/app.module.ts`, o `@SemResolucaoDeHost()` isentar o healthcheck de verdade, e o CORS
  rodar antes do pipeline — verificado só na mão, com `curl`, durante a implementação.

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

### ~~`auditoria` não tem guarda para o par inquilino/central~~

- **Status**: **resolvido em 06/09/2026**, pela `migrations/0006_integridade_auditoria.sql`.
  `auditoria` passou a usar o **mesmo** `validar_central_do_inquilino_trg` das outras seis —
  sem função própria — e saiu de `EXCECOES_DECLARADAS`, que agora é uma lista vazia. As sete
  tabelas com o par estão cobertas, conferido no catálogo do banco.
- **O "a confirmar" foi confirmado**: a ausência de FK é deliberada. O bloco SQL da spec
  (`01-modelo-de-dados.md` §4.7) declara `auditoria` sem `references` nenhuma, enquanto o §4.8
  logo abaixo mostra `usuario` **com** as duas FKs. `entidade_id` também não tem FK — é log
  polimórfico, e esse é o design.
- **Por que a exceção não se sustentava**, apesar da FK ausente ser consciente: o argumento era
  o log sobreviver à exclusão da central, mas central **não é apagada** (tem `ativa`; RN-063t,
  "dado nunca é apagado"; o único `delete from central` do repositório é fixture em
  `test/ajuda/semear.ts`). E, decisivo: sob RLS a função não distingue "central não existe" de
  "central é de outro inquilino" — as duas somem do `select`, como a própria 0005 admite na
  mensagem. Um trigger tolerante ao "não encontrei" aceitaria em silêncio justamente o caso a
  barrar; tolerância e detecção são mutuamente exclusivas aqui.
- **Efeito colateral conhecido**, registrado na migration: auditoria gravada sem contexto de
  inquilino (GUCs vazios, como no webhook órfão) e com `central_id` preenchido passa a ser
  recusada — nesse contexto nenhuma central é visível. Ato de escopo de plataforma (operador,
  `inquilino_id` nulo) não é afetado enquanto vier sem `central_id`, que é o caso da spec.
- **Coberto por teste**: recusa de central de outro inquilino, controle positivo, e o ato de
  plataforma com os dois campos nulos passando (`test/integridade-central.spec.ts`).

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

### ~~Nada revalida os filhos se `central.inquilino_id` mudar~~

- **Status**: **resolvido em 06/09/2026**, pela `migrations/0007_central_inquilino_imutavel.sql`,
  opção (a): `before update` em `central` recusando qualquer troca de `inquilino_id`.
  Imutabilidade em vez de revalidação em cascata — central não muda de denominação, e trocá-la
  levaria junto encontros divulgados, inscrições pagas e cobranças já emitidas no gateway, que
  nasceram sob outra e continuam dela.
- **A RLS já barrava**, e continua barrando: a restritiva `central_inquilino` tem `using` **e**
  `with check` iguais a `inquilino_id = app_inquilino_id()` — mover exigiria contexto da origem
  e destino igual à origem ao mesmo tempo. O trigger é defesa em profundidade: a proteção vinha
  inteira da RLS, e afrouxar aquela policy abriria isto em silêncio.
- **Quem responde agora é o trigger, não a RLS**: no Postgres o `before row` roda antes da
  verificação do `with check`, então o erro é `P0001` com a mensagem da RN-051t, não o `42501`
  genérico de RLS. Melhor diagnóstico para quem esbarrar nisso.
- **Coberto por teste**: troca recusada, edição de outro campo passando, e reescrever o mesmo
  `inquilino_id` passando — `is distinct from`, não `<>`, para não confundir reescrita com troca.

---

## Item 5 — autenticação Supabase JWT (07/09/2026)

O que a autenticação deixou de fora de propósito. O item 5b (convite/ativação/revogação, F8)
**não** entra aqui: foi adiado por decisão de 07/09/2026 até o item 19 (e-mail) existir, porque
RN-018 manda o link de convite por e-mail e F8 sem canal de entrega não fecha.

### ~~Nenhum contexto consegue perguntar "este e-mail tem conta em outro inquilino?"~~

- **Status**: **resolvido em 07/09/2026 mudando o desfecho, não o mecanismo.** Token válido sem
  conta no host resolvido responde `403 VINCULO_INVALIDO` com alerta, sem distinguir "conta em
  outro inquilino" de "e-mail sem conta nenhuma". Satisfaz o `403` que CA-24c exige e cabe no
  "401/403" que PRD §8.1 passo 3 admite.
- **O que foi medido**, porque o desenho original supunha o contrário: uma função
  `security definer` **não** contorna a RLS aqui. `security definer` roda como a dona da tabela,
  e `force row level security` (RN-057t) alcança a dona — `select count(*) from usuario` sem os
  GUCs devolve **0 linhas** sob `app_dev`. `set row_security = off` é recusado com `42501`, que é
  o `force` fazendo o que existe para fazer, e nenhuma role tem `BYPASSRLS`. A restritiva
  `usuario_inquilino` é `inquilino_id = app_inquilino_id()`: **nenhum valor de GUC atravessa**.
- **Por que isso é a arquitetura funcionando, e não um obstáculo**: a pergunta era, ela mesma, a
  sondagem cross-inquilino que a RN-052t proíbe ("não existe papel que leia dado de participante
  de dois inquilinos, nem o operador"). A primeira versão da `0008` trazia um
  `existe_conta_fora_do_escopo` para fazê-la; foi descartado antes de sair da máquina.
- **O que ficou no lugar**: a resolução da conta é consulta comum sob contexto deliberadamente
  elevado — `{ inquilino do host, admin_denominacao }`, ou `{ operador }` na rota do operador —,
  no idioma que `test/ajuda/semear.ts` já usava para escrever a linha de `inquilino`. **Quem
  segura a elevação é a RLS, não o código**: sob aquele contexto a travessia continua barrada
  (medido: escrita em nome de outro inquilino é recusada com `42501`), e
  `test/conta-de-acesso.spec.ts` tem prova dedicada de que a linha de A não aparece no contexto
  de B nem numa consulta sem filtro de inquilino.
- **A consequência que sobra**, e é aceitável: quem tem JWT válido do projeto Supabase e nenhuma
  conta em lugar nenhum recebe `403`, não `401`. Semanticamente é o certo — a requisição está
  autenticada, falta autorização neste endereço.

### Alerta da RN-060t só existe em log

- **Descrição**: a travessia por host grava `Logger.warn` com prefixo `RN-060t` (host, tipo,
  inquilino do host e o `sub` do JWT — nunca o e-mail, que é dado pessoal). Não há linha em
  `auditoria`, e o log não é estruturado.
- **Impacto**: o alerta existe para quem estiver olhando o console no momento. Não é
  pesquisável, não sobrevive ao ciclo do container na Railway, e não aparece em nenhum relatório.
- **Status**: aberto, e por dependência declarada. Log estruturado com request-id é o item 7;
  auditoria efetiva é o item 18 (que depende deste). Quando o 18 chegar, o alerta ganha
  `ator_tipo` e `motivo` na `auditoria`. Esforço desprezível dentro do 18 — é lembrar.

### `app.pessoa_id` é gravado para conta `servo` e continua sem consumidor

- **Descrição**: o papel efetivo da conta `servo` leva `pessoaId`, e a `UnidadeDeTrabalho` grava
  `app.pessoa_id` como sempre gravou. Só que não existe `app_pessoa_id()` no banco, nem policy
  que leia o GUC — o que o item 5 mudou foi passar a preencher um contexto que ninguém consulta.
- **Impacto**: nenhum hoje. A conta `servo` entra com `papel = 'servo'` e vê o que a RLS de
  `servo` permite, que é o escopo do inquilino sem central.
- **Status**: aberto. Nasce quando F5 (Fase 2) e as rotas de encontro do item 20 precisarem que
  o servo veja **as inscrições da própria pessoa** — é lá que o GUC ganha função acessora e
  policy, não antes. Criar a função agora seria adivinhar o predicado.

### Papel de encontro (coordenador) não é derivado

- **Descrição**: `papelEfetivoDaConta` (`src/autenticacao/papel-efetivo.ts`) resolve os quatro
  papéis de escopo largo. Coordenador do encontro e de área (RN-025, RN-046) **não** são papel de
  conta: vêm dos ponteiros do encontro que a requisição toca, e nenhuma rota informa um encontro
  até o item 20.
- **Impacto**: nenhum hoje — não há rota de encontro. Vira real na RN-035 e RN-036, que exigem
  papel mínimo "coordenador do encontro" nos endpoints administrativos do item 20.
- **Status**: aberto, com o lugar marcado. O JSDoc de `papel-efetivo.ts` diz explicitamente que a
  promoção é **por requisição**, a partir do `encontroId` da rota — nunca no guard, que não sabe
  qual encontro a rota vai tocar, e nunca em cache, porque RN-017 quer que "o poder termine no ato
  em que o ponteiro muda".

### ~~`usuario_unico` é sensível a caixa, e a resolução não~~

- **Status**: **resolvido em 11/09/2026**, pela `migrations/0009_usuario_email_sem_caixa.sql`.
  `usuario_unico` deixou de ser `unique (inquilino_id, email)` e virou
  `create unique index usuario_unico on usuario (inquilino_id, lower(email))` — índice, não
  constraint, porque o segundo termo é expressão. O mesmo e-mail em duas grafias diferentes não
  cria mais duas contas no mesmo inquilino; a colisão vira erro de escrita (`23505`).
- **Referência corrigida**: a versão anterior deste item citava "a spec (§4.15)" como o lugar
  que publica a constraint. Impreciso — o DDL de `usuario` é `01-modelo-de-dados.md` §4.8;
  §4.15 é seção de `PRD.md`, em prosa, sem DDL nenhum. A spec §4.8 foi atualizada junto.
- **O que ainda falta, e não é este item**: normalizar o e-mail **na escrita** continua sendo
  trabalho do 5b — o índice impede a colisão no banco, mas não normaliza o que a aplicação grava.

### O `sub` do JWT não é gravado em lugar nenhum

- **Descrição**: o vínculo entre a conta e a identidade no provedor é **só o e-mail**, como a
  RN-017 manda ("uma conta por par (inquilino, e-mail)"). Não há coluna `auth_user_id` em
  `usuario`, e o `sub` é lido apenas para o alerta da RN-060t.
- **Impacto**: duas consequências que a regra não escreve. Quem troca o e-mail no Supabase Auth
  **perde o acesso em silêncio** — a conta continua lá, apontando para o endereço antigo. E um
  e-mail abandonado, se reivindicado por outra pessoa no provedor, dá acesso à conta antiga.
- **Status**: aberto, para decisão de produto, não de código. É consequência direta do desenho da
  RN-017, e mudá-lo (gravar o `sub` no primeiro acesso e passar a resolver por ele) mudaria a
  chave da conta — assunto do 5b, que é quem cria conta.

### Confirmação de e-mail depende da configuração do projeto Supabase

- **Descrição**: PRD §8.1 passo 2 manda ler "o e-mail verificado". O Supabase publica isso em
  `user_metadata.email_verified`, e a claim **não é garantida** — projeto antigo, ou provedor de
  login que não a devolve, chega sem ela. O verificador recusa quando vem explicitamente `false`
  e **aceita quando vem ausente**, porque exigir `true` recusaria conta legítima.
- **Impacto**: se a confirmação de e-mail estiver desligada no projeto Supabase, alguém pode se
  cadastrar com o e-mail de outra pessoa, receber token sem confirmar, e entrar na conta dela.
- **Status**: aberto, e é verificação de infraestrutura, não de código — conferir no painel de
  Auth do projeto `vuiwjcaahfnxpzrrscsy` que a confirmação de e-mail está exigida, antes do
  go-live.
- **Correção de 11/09/2026 — a checagem do código é mais fraca do que este item dizia**: a
  frase anterior ("o código já recusa o `false` explícito; o que falta é garantir que a claim
  exista") subestima o problema. `user_metadata` vem de `raw_user_meta_data` no Supabase, que
  **o próprio usuário grava** por `supabase.auth.updateUser({ data: ... })`. Ou seja, quem a
  checagem deveria barrar pode sobrescrever a claim contra si mesma — a presença dela não
  garante nada. O campo equivalente que o usuário **não** escreve é `app_metadata`. Enquanto a
  confirmação não for exigida no painel, a proteção efetiva é zero, não parcial.

### ~~Fiação do novo `APP_GUARD` sem cobertura ponta a ponta~~

- **Status**: **resolvido em 11/09/2026**, pelo item 23 (`test/pipeline-http.spec.ts`). Token
  válido da conta `admin_denominacao` de um inquilino, no host de outro, devolve `403
  VINCULO_INVALIDO` por HTTP real (CA-24c); o mesmo token no host certo devolve `200` com o
  papel efetivo — controle positivo que prova a cadeia `ResolvedorDeHostGuard` →
  `AutenticacaoGuard` → `ContextoInterceptor` inteira, não só o guard isolado.
- **Ressalva**: a inversão literal dos dois `APP_GUARD` em `src/app.module.ts` **não** é testada
  dinamicamente — o Nest não expõe uma forma de reordenar `APP_GUARD` via `overrideProvider` sem
  reescrever o módulo. O teste de `200` acima depende estruturalmente da ordem certa: invertida,
  `req.hostResolvido` não existiria ainda quando `AutenticacaoGuard` rodasse, e o mesmo teste
  passaria a falhar com `500` (o `Error` de fiação que o próprio guard já lança nesse caso) — não
  em silêncio, mas também não por uma asserção dedicada à ordem.
- **Verificado por mutação em 11/09/2026**, na revisão do item 23: com a ordem dos dois
  `APP_GUARD` invertida à mão em `src/app.module.ts`, **4 dos 7 testes** de
  `test/pipeline-http.spec.ts` caem com `500` (os de `404`, `401`, `200` e `403`); os 3 que
  sobrevivem são `/saude` (isento de tudo) e os dois de CORS (middleware, roda antes dos guards).
  A ressalva acima é honesta, mas a proteção é real — a suíte reprova a inversão, ainda que por
  efeito colateral e não por asserção nomeada. `app.module.ts` foi restaurado e conferido
  idêntico ao `HEAD` depois do experimento.
- **Descrição original**: irmão declarado do item de fiação de guard/CORS acima. O
  `AutenticacaoGuard` estar registrado em `src/app.module.ts` **depois** do
  `ResolvedorDeHostGuard` é o que faz a RN-060t possível, e nenhum teste unitário alcançava a
  ordem dessa lista — só `test/sessao.controller.spec.ts`, que conferia as isenções do
  `SaudeController` pelo `Reflector`, sem HTTP real.

---

## Revisão pré-commit do item 5 (11/09/2026)

Revisão adversarial do código de autenticação antes de ele ser versionado, em sete dimensões de
risco. Os três itens abaixo foram **verificados à mão contra o banco**, não apenas relatados.
A revisão ficou **incompleta**: a maior parte dos verificadores automáticos morreu por limite de
sessão, então há achados plausíveis que ninguém confirmou nem refutou — listados no fim.

### RLS de `usuario` permite escalonamento de privilégio

- **Descrição**: a permissiva `usuario_central` libera a escrita com `(central_id IS NULL)`, e a
  restritiva `usuario_inquilino` só confere o inquilino. Um `servo` do inquilino A, cujo contexto
  tem `central_id` nulo, pode gravar uma linha `papel = 'admin_denominacao'` do próprio inquilino:
  nenhuma das duas policies barra. Conferido em `pg_policies` no banco `dev`, não inferido do SQL.
- **Não é regressão do item 5**: vem da `0001`, do template `rls_politicas_padrao`. O item 5
  apenas passou a *depender* desta tabela para autorizar, o que transforma a folga em caminho de
  escalonamento.
- **Impacto**: nulo hoje — nada escreve em `usuario` fora de fixture, porque o fluxo de convite
  não existe. É exatamente a armadilha que o **item 5b** vai pisar: a primeira rota que deixar
  uma conta criar ou editar outra herda essa folga sem nada avisar.
- **Status**: aberto, e é pré-requisito do 5b junto com a normalização de e-mail. A correção
  provável é uma policy restritiva própria para `usuario`, que amarre o papel que se pode gravar
  ao papel do contexto — não dá para resolver afrouxando a permissiva.

### ~~A consulta que autentica faz Seq Scan~~

- **Status**: **resolvido em 11/09/2026**, pela mesma `migrations/0009_usuario_email_sem_caixa.sql`
  que fechou o item da caixa — os dois eram a mesma correção. Confirmado com `explain` sob
  RLS: o plano deixou de ser `Seq Scan on usuario` e passou a `Bitmap Heap Scan` restrito por
  `BitmapOr` de dois `Bitmap Index Scan on usuario_unico`, um por `inquilino_id = <host>` e um
  por `inquilino_id IS NULL` (rota do operador) — a varredura deixa de cruzar a tabela inteira e
  passa a ficar limitada às contas do inquilino da requisição.
- **Nuance honesta, para não superclaimar**: o `lower(email)` não aparece como `Index Cond` nas
  duas colunas — o planner usa só `inquilino_id` no índice e aplica `lower(email)` como filtro
  sobre o conjunto já estreitado por ele. O ganho real e medido é a fronteira por inquilino, não
  a busca binária pelo e-mail dentro dele; com o volume de contas por inquilino sendo pequeno na
  Fase 1, isso já é o que importa.
- **Também elimina o sorteio do `limit 1`** que a "gravidade alta" da revisão pré-commit do item
  5 apontava: sem duas linhas com o mesmo e-mail em grafias diferentes, não há o que sortear.

### JWKS fora do ar responde `401`, não `503`

- **Descrição**: `createRemoteJWKSet` tem cache de 10 minutos e **não serve chave velha** —
  passado o prazo, uma falha ao buscar o JWKS propaga. O erro cai no `catch` genérico de
  `src/autenticacao/autenticacao.guard.ts`, que não distingue "token inválido" de "não consegui
  buscar a chave": responde `401` com "Autenticação necessária", registra em `debug` e manda o
  cliente renovar a sessão — ação que não resolve nada.
- **Impacto**: indisponibilidade mascarada de erro do cliente. Toda rota autenticada passa a
  recusar token legítimo, o `/saude` continua verde (não toca o JWKS), a taxa de erro aparece
  como `4xx` e nada dispara alarme ou rollback. Não é falha de segurança: nenhum token ruim é
  aceito.
- **Status**: aberto. Separar, no `catch`, o erro de obtenção de chave (`ERR_JWKS_TIMEOUT`,
  `ERR_JOSE_GENERIC`, erros de rede) do erro de verificação de token
  (`ERR_JWS_SIGNATURE_VERIFICATION_FAILED`, `ERR_JWT_EXPIRED`, …) — os primeiros viram `503` com
  log em `error`. O projeto já tem o idioma em `RECEBIMENTO_INDISPONIVEL`. Esforço: 1-2h.

### Achados plausíveis que ficaram sem verificação

Relatados pela revisão e **não** confirmados — a maioria dos verificadores morreu por limite de
sessão. Ficam registrados para não se perderem; cada um precisa ser conferido antes de virar
trabalho:

- A conferência de `situacao` roda **antes** de `validarVinculo`, então uma conta inativa de
  outro inquilino recebe `CONTA_INATIVA` e **não** dispara o alerta da RN-060t — apontado por
  duas dimensões independentes, o que é sinal forte.
- `exp` não é exigido: JWT sem a claim seria aceito e nunca expiraria.
- `SUPABASE_JWT_AUDIENCIA` vazia não derruba o boot em produção, ao contrário das outras duas.
- Quatro achados sobre testes que passariam sem provar o que nomeiam — o de confusão de
  algoritmo passaria mesmo sem a opção `algorithms`, e o de `/api/sessao` só olha o handler
  enquanto os guards leem handler **e** classe.

---

## Consistência docs × código (06/09/2026)

Achado da conferência afirmação por afirmação dos dois documentos contra `src/`,
`migrations/`, `test/`, `ci.yml` e — no ponto em que os documentos se contradiziam — contra o
banco `dev`. As correções de texto foram aplicadas no ato: `proximos-passos.md` dava a role
`app_api` como pronta, contradizendo o item "RN-124 e RN-138 são letra morta" acima; a
consulta a `pg_roles` deu razão à pendência, e o que de fato está pronto (role sem
`BYPASSRLS`, RLS alcançando a dona das tabelas) foi medido e registrado lá. Só o item abaixo
é dívida de código nova.

### ~~`ZodValidationPipe` não é global e não tem teste de fiação~~

- **Status**: **resolvido em 11/09/2026**, pelo item 23 (`test/validacao-http.spec.ts`). Como
  ainda não existe controller de domínio real que use o pipe, o teste roda contra uma rota só de
  teste (`test/ajuda/rota-de-teste.controller.ts`, registrada só na `TestingModule`, nunca
  importada de `src/`): corpo inválido devolve o envelope de RNF-011 com `DADOS_INVALIDOS` e o
  detalhe por campo; corpo válido devolve `201` com o valor parseado.
- **Correção sobre o texto anterior deste item**: o cenário mínimo dizia "devolve `400`" — o
  status real de `DADOS_INVALIDOS` em `src/erros/codigos-erro.ts` é **`422`**
  (`UNPROCESSABLE_ENTITY`), não `400`. O teste afirma o status real.
- **O que continua em aberto**: o registro do pipe continua por rota (`@Body(new
  ZodValidationPipe(schema))`), decisão defensável já registrada abaixo — o item 23 prova que o
  mecanismo funciona quando aplicado, não que toda rota futura vá aplicá-lo. Vira real de novo
  nos itens 10 e 20, quando a primeira rota de domínio nascer.
- **Descrição original**: o pipe (`src/validacao/zod-validation.pipe.ts`) tinha teste unitário,
  mas não estava registrado como `APP_PIPE` em `src/app.module.ts` — os providers de lá são só
  `APP_GUARD`, `APP_INTERCEPTOR` e `APP_FILTER`. O uso é por rota, como o próprio arquivo
  documenta: o schema muda por rota, e não existe pipe global sem schema.

---

## Template para a próxima iteração

```
## Sprint N — <nome/tema> (<data>)

### <título curto do item>

- **Descrição**: ...
- **Impacto**: ...
- **Status**: aberto
```
