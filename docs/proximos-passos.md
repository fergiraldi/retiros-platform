# Próximos passos — liberação da Fase 1

> Levantamento feito em 01/09/2026, cruzando `PRD.md` e `specs/fase-1/*.md` contra o
> código real em `src/`, `migrations/` e `test/`. Esforço em horas de desenvolvimento —
> nunca em valor financeiro (isso é decisão do comercial).

## Veredito

A Fase 1 está longe de liberável. O que existe hoje é a fundação de plataforma —
contexto transacional por request, RLS de dois níveis, as 17 tabelas de domínio,
funções SQL e as 6 specs de teste de banco (isolamento, cobertura de RLS, contexto de
transação, resolução por host, integridade do par inquilino/central, conta de acesso) — mais a
autenticação e o papel efetivo (item 5). Desde 29/10/2026 existe o **primeiro controller de
domínio**: a área pública da F1 (item 10) — agenda, página do encontro e ficha de inscrição,
com vaga sob lock, lista de espera e limite de taxa (item 6). A inscrição nasce sem cobrança.
Zero integração com Mercado Pago, zero envio de e-mail (as notificações ficam enfileiradas em
`pendente`), zero cron.

**Estimativa total: 204 a 313 horas** de desenvolvimento (≈ 5 a 8 semanas de um dev
full-time), sem contar os bloqueios não-código listados no fim deste documento. Desse
total, **58 a 90 horas já saíram**, com os itens 5, 6, 9, 10 e 23.

O item 9 andou antes do 8, de que a tabela o dava como dependente: a conexão não precisa do
onboarding para existir, só de uma conta de admin — e o 8 está preso ao 19 (ver abaixo). Quando o
onboarding chegar, o passo "conectar o recebimento" dele é chamar a rota que já existe.

## O que já está pronto

- Contexto multi-inquilino por transação (`ContextoInterceptor` + `UnidadeDeTrabalhoService`,
  `src/contexto/`)
- RLS de dois níveis nas 17 tabelas, com teste de cobertura da RN-141
- Role de runtime sem `BYPASSRLS` e sem `superuser`, com a RLS alcançando-a mesmo sendo dona
  das tabelas (`force row level security`) — conferido no banco em 06/09/2026. A separação
  de roles (`app_api` / `app_publico`) da spec, essa sim, **não** existe; ver "RN-124 e
  RN-138 são letra morta" em [pendencias-tecnicas.md](pendencias-tecnicas.md)
- 6 specs de teste de banco (`test/isolamento.spec.ts`, `test/rls-cobertura.spec.ts`,
  `test/contexto-transacao.spec.ts`, `test/host-resolucao.spec.ts`,
  `test/integridade-central.spec.ts`, `test/conta-de-acesso.spec.ts`)
- Resolução de inquilino por host plugada como `APP_GUARD` global (RNF-006), com CORS
  dinâmico sobre o mesmo reconhecedor (`ReconhecedorDeHostService`, RN-061t)
- Integridade do par inquilino/central (RN-051t) cobrindo as 7 tabelas com o par, sem
  exceção, com teste de catálogo que falha se uma tabela nova nascer sem o trigger
- Validador de CPF (`src/validacao/cpf.ts`), insumo dos itens 6 e 10
- Autenticação por JWT do Supabase (`src/autenticacao/`, PRD §8.1 passos 2 a 5): verificação por
  JWKS assimétrico (ES256/RS256, sem `HS256`), resolução da conta pelo par (inquilino do host,
  e-mail), papel efetivo de escopo largo no contexto de transação, e RN-060t com `403` e alerta
  na travessia por host. **Falha fechada**: toda rota exige conta ativa salvo
  `@SemAutenticacao()` — as rotas públicas do item 10 precisam do decorator
- `GET /api/sessao`, que devolve o papel efetivo da requisição — é o que o front pede depois do
  login e o único cenário executável do CA-24c hoje
- RN-018 valendo no ato: suspensão e revogação são conferidas a cada requisição, sem cache de
  conta (verificado à mão, sem reiniciar a API)
- Área pública da F1 (`src/publico/`): `GET /api/publico/encontros`, `GET
  /api/publico/encontros/:centralSlug/:encontroSlug` (com o termo vigente) e `POST
  /api/publico/encontros/:encontroId/inscricoes` — identidade e pessoa (RN-010 a RN-014),
  consentimento com IP (RN-090, RN-093a), vaga sob `for update` (RN-503, CA-15 com 50 fichas
  simultâneas), lista de espera, notificação enfileirada e auditoria `publico`. Limite de taxa
  por IP e por CPF (RN-210) em `src/limite-de-taxa/`. Coberto por `test/ficha-publica.spec.ts`

## Ordem de execução

| # | Item | Horas | Depende de |
|---|---|---|---|
| 1 | ~~Envelope de erro padronizado (RNF-011)~~ — concluído | 8-12 | — |
| 2 | ~~Validação de payload (DTOs + ValidationPipe)~~ — concluído (Zod) | 6-10 | 1 |
| 3 | ~~CORS dinâmico + plugar o guard de host~~ — concluído | 8-12 | — |
| 4 | ~~Corrigir trigger de integridade em `usuario` (RN-051t)~~ — concluído | 2-3 | — |
| 5 | ~~Autenticação Supabase JWT + papel efetivo~~ — concluído | 16-24 | 1, 3 |
| 5b | Contas de acesso — convite, ativação, revogação (F8, RN-017 a RN-019) | 10-14 | 5, **19** |
| 6 | ~~Rate limit por IP e por CPF (RNF-012)~~ — concluído (em memória) | 8-14 | 1 |
| 7 | Logging estruturado + request-id | 6-10 | — |
| 8 | Onboarding do inquilino F0 | 14-20 | 5, 2 |
| 9 | ~~Cliente HTTP Mercado Pago + OAuth~~ — concluído (conexão, cofre e renovação; o agendamento é o 16) | 14-20 | 8 |
| 10 | ~~Ficha de inscrição pública F1~~ — concluído (agenda, página e ficha) | 16-24 | 2, 6, 3 |
| 11 | Criação de cobrança Pix/cartão + split | 12-18 | 9, 10 |
| 12 | Webhook: recepção + máquina de estados | 12-18 | 11 |
| 13 | Consulta/edição da inscrição por token | 4-6 | 10 |
| 14 | Cancelamento com reembolso | 6-10 | 11 |
| 15 | Lista de espera: fila + promoção automática | 6-10 | 10 |
| 16 | Cron de expiração de cobrança/inscrição (5 em 5 min) | 6-10 | 11 |
| 17 | Estorno de cobrança (total/parcial) | 8-12 | 12 |
| 18 | Auditoria efetiva (INSERT real em toda operação sensível) | 8-12 | 5 |
| 19 | Envio de e-mail/notificação | 10-16 | 11 |
| 20 | Endpoints administrativos (9 rotas de inscrição/cobrança) | 14-20 | 5, 10 |
| 21 | Painel do operador + relatórios + exportação/exclusão LGPD | 12-18 | 20 |
| 22 | Padrão de paginação | 4-6 | 2 |
| 23 | ~~Infra de teste HTTP/e2e (supertest)~~ — concluído | 4-8 | 1 |

O item **5b** foi um achado da crítica de completude do levantamento original: a
autenticação (item 5) só *lê* uma conta já ativa contra o JWT — não cria, convida,
ativa nem revoga nada. Sem ele, F8 fica sem dono.

**O 5b está travado no item 19, e a posição dele nesta tabela engana** — aparece em segundo
lugar, mas depende de um item que é o 19º. Não é ordenação errada: a dependência é real e foi
confirmada por decisão de 07/09/2026. RN-018 manda o link de convite **por e-mail**, com prazo de
7 dias, e F8 sem canal de entrega não fecha — sobraria devolver o link na resposta da API para
alguém repassar à mão, que não é o fluxo que a regra descreve. Na prática o 5b entra **depois** do
19, junto ou perto dele. As duas pré-condições dele que já estão levantadas — normalizar o e-mail
na escrita (`usuario_unico` é sensível a caixa) e varrer o estoque de linhas contra a RN-051t —
estão em [pendencias-tecnicas.md](pendencias-tecnicas.md).

**O item 8 tem a mesma dependência oculta, e a tabela também não mostra** (achado de 11/09/2026,
ao escolher o próximo item a atacar): `Depende de: 5, 2` é incompleto. O diagrama de onboarding
de `00-multi-inquilino.md` §6 tem, como segundo passo, `Plataforma → Admin: convite por e-mail`
— o mesmo mecanismo do 5b. Sem item 19, o onboarding não tem como convidar o primeiro
`admin_denominacao` da denominação pelo fluxo que a spec descreve. Na prática, 8 está tão preso
ao 19 quanto o 5b está — só que, ao contrário do 5b, isso nunca tinha sido escrito aqui. Vale
revisitar quando o item 19 (ou uma redução de escopo do onboarding que dispense o convite) entrar
em pauta, antes de estimar o item 8 como "pronto para começar" só porque 5 e 2 estão prontos.

**Somando as duas dependências ocultas, a tabela tem um ciclo** (achado de 29/10/2026): 9 depende
de 8, 8 depende de 19, 19 depende de 11 e 11 depende de 9. Do jeito que está escrita, nenhum dos
quatro começa. O nó é o item 19, que mistura duas coisas: o **envio de e-mail** em si (provedor,
remetente com a marca do inquilino — RN-137 —, envio depois do commit e nova tentativa —
RN-136), que não depende de nada, e as **notificações de cobrança**, que dependem do 11. Separado
em 19a (transporte, sem dependência) e 19b (gatilhos de cobrança, depende de 11), o ciclo se
desfaz: 19a destrava 5b e 8, e o resto segue a ordem. O 19a só espera a escolha do provedor de
e-mail, que o PRD deixa em aberto.

## Bloqueios que não são código

Travam o go-live mesmo com as horas acima todas entregues — não entram na conta de
desenvolvimento, mas precisam ser resolvidos em paralelo:

- **Credencial de produção do Mercado Pago** — cadastro como marketplace/split e
  aprovação do `application_fee`.
- **DNS wildcard + certificado TLS por subdomínio** — a resolução de inquilino por
  host (RNF-006) depende disso existir de fato, não só do código.
- **Texto jurídico do termo do inquilino** — RN-090 exige termo publicado antes de
  qualquer inscrição; sem redator, F0 não fecha mesmo com o onboarding pronto.
- **Dados-semente de um inquilino piloto** para validar o fluxo ponta a ponta.
- ~~**`SUPABASE_JWKS_URL` e `SUPABASE_JWT_EMISSOR` em `hom` e `prod`**~~ — **resolvido em
  08/09/2026, e verificado**, não apenas informado. Pelo CLI da Railway, `hom` e `prod` têm as
  três variáveis (`SUPABASE_JWKS_URL`, `SUPABASE_JWT_EMISSOR`, `SUPABASE_JWT_AUDIENCIA`), com os
  valores **iguais byte a byte** ao `issuer` e ao `jwks_uri` que o discovery do projeto
  (`/auth/v1/.well-known/openid-configuration`) publica — conferido por comparação de strings, não
  a olho, porque espaço em branco nas bordas quebraria igual à barra no fim e não apareceria na
  tela. O emissor tem 48 bytes, sem barra e sem espaço. A validação de boot foi executada com os
  valores reais de cada ambiente e `NODE_ENV=production`: passa nos dois. O JWKS responde com uma
  chave `ES256`, aceita pela lista de algoritmos. `hom` e `prod` seguem em `200` no `/saude`.
- ~~**A `migrations/0008` em `hom` e `prod`**~~ — **resolvido em 11/09/2026**, e não pelo caminho
  previsto. O item dizia que `prod` não recebia migration no deploy e que a `0008` teria de ser
  aplicada à mão antes de promover. No mesmo dia `prod` passou a seguir a `main` na Railway, e o
  pré-deploy de migration veio junto: o push do item 5 levou a `0008` e a `0009` para `prod`
  sozinho (medido: `10/10` em `_migracoes`, última às 22:08:46, dentro da janela de
  `DEPLOYING`). Os três ambientes estão em `10/10`. O fluxo atual — `develop` → `hom`, `main`
  → `prod`, ambos aplicando migration no deploy — está no `README.md`.
- ~~**Confirmação de e-mail exigida no projeto Supabase**~~ — **resolvido em 29/10/2026**,
  conferido no painel: "Confirm email" ligado e login anônimo desligado. Ver
  [pendencias-tecnicas.md](pendencias-tecnicas.md).

## Riscos principais

- ~~**Autenticação (item 5) é o maior gargalo de paralelização**~~ — **destravado em
  07/09/2026**. Os itens 8, 18, 20 e 21 já podem andar. O risco de configuração que sobrava (as
  variáveis de JWKS faltando em `hom`/`prod`, o que derrubaria o deploy no boot) foi fechado e
  verificado em 08/09/2026 — ver "Bloqueios que não são código".
- Rate limit por CPF normalizado não é coberto por lib padrão de throttling (que é
  tipicamente só por IP) — risco real de subestimar o esforço do item 6.
- SDK/contrato do Mercado Pago ainda não escolhido nem instalado — cliente HTTP, OAuth,
  split e idempotência de webhook partem do zero.
- **A API de Payments do Mercado Pago está marcada como "será descontinuada em breve"** no
  painel (visto em 29/10/2026, ao criar a aplicação `retiros-pagamentos`), e a substituta, a API
  de Orders, **não tem equivalente documentado ao `application_fee`** — o guia oficial de migração
  manda tratar isso como bloqueio para fluxo com split. A aplicação foi criada sobre Payments,
  que é a única com split no Checkout Transparente hoje. Mitigação: o item 9 isola o cliente do
  Mercado Pago num módulo só, e o item 11 confere de novo a documentação de Orders antes de
  começar. Trocar de aplicação é barato **até a primeira denominação conectar por OAuth** (o
  token fica preso ao `client_id`); depois disso, toda denominação teria de reconectar. Plano B,
  que é decisão de produto: Checkout Pro com `marketplace_fee`, ao custo de o pagamento sair da
  nossa ficha para a página do Mercado Pago.
- ~~Provedor de e-mail ainda em aberto no PRD~~ — **decidido em 29/10/2026: Resend**, por API
  HTTP, sem SDK. Cabe no modelo do PRD §7 ("Identidade do remetente"): domínio técnico de envio
  (SPF/DKIM) único da plataforma, com nome de exibição e endereço de resposta por inquilino e
  por central. Destrava o 19a; falta a conta e o domínio de envio verificado por DNS.

## Fora de escopo da Fase 1

Não entram nesta conta de horas:

- **Fase 2**: grupos, áreas de servição, cronograma (etapas/tarefas/modelos), crachás,
  check-in, funcionamento offline (RNF-003), área do servo (RN-081 a RN-084).
- **Fase 3**: despesas, avaliação (RN-100), fechamento financeiro, faturamento
  (RN-088/RN-109/RN-110).
- **WhatsApp automatizado** — decisão nº 1 do PRD ainda em aberto; nesta fase o único
  mecanismo é link manual `wa.me`.
