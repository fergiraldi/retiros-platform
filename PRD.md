# PRD — Plataforma de Retiros

Documento de produto para geração de specs. Escrito para ser lido por humano e por gerador de specs: o glossário define o vocabulário, as regras de negócio são numeradas (`RN-xxx`) e referenciadas pelos fluxos.

---

## 0. Convenções do documento

| | |
|---|---|
| **Versão** | 1.6 |
| **Dono** | Fernando Giraldi |
| **Última alteração** | 2026-08-24 |
| **Situação** | Em definição — fase de fechamento das specs (`specs/`) |
| **Downstream** | `specs/fase-1/` deriva deste documento e cita seus `RN-xxx` |

### 0.1 Changelog

**1.6 — 2026-08-24** — **§11 deixa de ser lista de dúvidas e passa a registro de decisões**: cada item ganha identificador estável, decisão a tomar, impacto concreto (regras, entidades e telas), quem decide e a fase que bloqueia — sem essa lista, "decisão em aberto" não dizia o que fazer com ela.

- **Item 4** (ficha configurável por inquilino ou fixa) passa a **[BLOQUEANTE DA FASE 1]**, ao lado do item 2: define o contrato de §4.5 e da ficha pública (F1), a entrega central da fase.
- **Item 7** (encontro em andamento com inquilino suspenso) passa a **[FECHADA]**: a parte pública já estava resolvida por RN-007 desde a 1.0, e o que restava — se a suspensão alcança a **conta** de quem opera o encontro — fecha com RN-018 (§4.15), que mantém a conta do coordenador e a dos servos alocados ativas durante a suspensão, com `specs/fase-1/00-multi-inquilino.md` (`RN-085t`) confirmado.
- **Itens 1 e 5** (provedor de WhatsApp, layout do crachá) ganham fase e prazo — não bloqueiam a Fase 1, mas precisam sair antes de Fase 2/3 e de F6, respectivamente, em vez de ficarem soltos sem prazo nenhum.
- **Item 6** (exportação de saída do inquilino) ganha o lado técnico que faltava: é exportação em massa do inquilino inteiro, distinta de F10, e o dono do produto decide a forma antes de o comercial prometer prazo em contrato.
- Nova subseção fecha §11 registrando o que as versões 1.2 a 1.5 já decidiram: toda regra `[NOVA]` de `specs/fase-1/` que §12 marca **Confirmada** ou **Muda** deixou de ser invenção de spec, com as três que a própria spec marcou como chute — RN-201, RN-205 e RN-304 — nomeadas e separadas pelo resultado: RN-205 e RN-304 confirmadas como a spec propôs, RN-201 respondida na direção oposta.
- **§10** — a Fase 1 passa a registrar **duas** decisões bloqueantes (nº 2 e nº 4), não mais uma só.

**1.5 — 2026-08-24** — fechamento de **§6 e §7**, que até aqui eram as duas seções sem `RN-xxx` (salvo a RN-085 solta) e sem fase — inertes, para um documento cujo contrato é "regra numerada e referenciada". E fechamento da **fronteira de confiança** de §8, que a stack deixava em aberto: Supabase Auth e Supabase Postgres ao lado de uma API que assume ser a única dona da conexão (RNF-001) só coexistem se o navegador nunca falar direto com o banco, e o documento não dizia isso.

- **§6** — cada relatório e painel ganha `RN-xxx` (RN-081 a RN-089, fechando o bloco de Prestação de contas e relatórios; RN-108 a RN-111, na faixa de extensão) e **fase** declarada. `RN-084` (saúde e contato de emergência) explicita a mistura de campo comum (`contato_emergencia_*`, §4.3) com campo restrito (§4.3a) numa tela só, sob a exceção nomeada da RN-091a; `RN-111` (painel do operador) permanece sob a restrição da **RN-085**, agora referenciada em vez de solta.
- **§7** — cada gatilho ganha `RN-xxx`: a maioria já citava a regra de origem (RN-033, RN-061, RN-098...), e passa a aparecer numa coluna própria; três gatilhos não tinham regra nenhuma e ganham uma — **RN-112** (inscrição criada), **RN-113** (lembrete do encontro) e **RN-114** (alocação em grupo/área, Fase 2 — as demais são Fase 1). Cinco acréscimos que a seção não tinha: **canal autoritativo na Fase 1** (e-mail é o que o sistema mede e garante; WhatsApp, enquanto a decisão em aberto nº 1 não sai, é link manual sem registro); **idempotência do disparo**, que já existia na RN-107 (§4.18) mas não era citada aqui; **identidade do remetente**, que faltava por inteiro; **aplicação dos rótulos do inquilino**, que a RNF-007 já obrigava sem esta seção referenciar; e **opt-out**, que distingue notificação transacional (sem opt-out) de lembrete (com base no consentimento).
- **§8.1** — `RNF-001` ganha dois parágrafos que faltavam desde a 1.0: se o front acessa Supabase diretamente ou só pela API (só pela API — PostgREST de tabela de domínio nunca é exposto ao navegador, Storage é por link assinado emitido pela API), e como a sessão do Supabase Auth vira o contexto de inquilino, central e papel que a RLS por transação exige. `RNF-006` ganha as consequências operacionais de subdomínio curinga e domínio próprio verificado, que a hospedagem em Vercel/Railway não tornava óbvia sozinha.
- **§8.2** — quatro requisitos que já estavam supridos, sem origem no PRD, em `specs/fase-1/README.md`: fuso e data/hora (**RNF-008**), dinheiro (**RNF-009**), identificadores (**RNF-010**) e envelope de erro da API (**RNF-011**) — a spec decidiu sozinha, na mesma situação de toda regra de §12, e passam a ter origem aqui. E dois que não estavam supridos em lugar nenhum: **RNF-012**, limitação de taxa e proteção contra abuso na ficha de inscrição, que é endpoint público, sem autenticação, que grava dado pessoal sensível e dispara e-mail; **RNF-013**, volume esperado e pico de concorrência, estimativa do dono do produto que dimensiona o controle de vagas sob lock que a RN-033 e a `05-lista-de-espera.md` já escolheram. `RNF-003` ganha a fase (Fase 2, com F5 e F6) e o escopo que faltavam — é o requisito mais caro do documento, e não pertencia a fase nenhuma.

**1.4 — 2026-08-24** — fechamento do **que as regras já existentes pressupunham e o documento não modelava**. Diferente da 1.2 e da 1.3, quase nada aqui é decisão financeira nova: são as entidades que as regras citam sem definir, os campos das regras que dizem "configurável", a separação de dado sensível que a RN-091 exige, e os três fluxos que §5 não tinha — acesso, direitos do titular e reconhecimento por CPF. O rastreamento está em §12.

- **Entidades novas** — §4.12 a §4.20: **conexão de recebimento** (RN-104, RN-105), que existia como o campo opaco `config_pagamento` de §4.1; **termo do inquilino** versionado (RN-090a), que a RN-090 citava e ninguém publicava — sem ele a Fase 1 não conseguia criar inscrição; **consentimento** (RN-090b), inclusive o **consentimento de retenção** que a RN-093 citava e que não existia em mais lugar nenhum do documento (RN-093a); **conta de acesso** (RN-017 a RN-019); **concessão de acesso de suporte** (RN-005a), que a RN-005 exigia; **auditoria** (RN-106), que a RNF-005 exigia; **notificação** (RN-107), que §7 exigia; **evento de webhook bruto** (RN-053), que a RNF-004 exigia; e **modelo de cronograma** (RN-048a), que a RN-048 citava.
- **§4.3a (nova)** — **o dado sensível sai de `Pessoa`** e vira entidade própria, com visibilidade declarada campo a campo e leitura auditada (RN-091a). Fica decidido o que o PRD calava e `specs/fase-1/00-multi-inquilino.md` tinha decidido sozinho: o acesso de suporte da RN-005 **não** alcança esses campos, com ou sem concessão — e o CPF também não, porque ele não está ali.
- **Campos das regras "configuráveis"** — §4.0 e §4.1 ganham os valores que RN-040, RN-049 e RN-060 mandavam configurar e que não existiam em campo nenhum. **RN-103** declara o que é do inquilino, o que é da central e que a herança é **cópia na criação**, nunca referência viva, com um ato explícito e auditado para propagar mudança às centrais que já existem. **RN-065** fixa a forma das faixas de reembolso, suas invariantes e o congelamento delas na inscrição — o mesmo princípio da RN-038; **RN-040a** e **RN-049a** fazem o mesmo por parcelamento e comprovante de despesa, e decidem o que é lido no ato em vez de congelado.
- **RN-024** — `slug` do encontro como identificador da URL pública, que o SSR de §8 pressupõe: sugerido na criação, imutável a partir de `publicado`, e uuid fora da área pública. **RN-025** — `coordenador_inscricao_id` no encontro, na mesma forma da RN-046, que é o que torna executável o papel "coordenador do encontro" de §3.
- **RN-039** — **convidador que não está na base**: `convidador_nome` ao lado de `convidador_pessoa_id`, com a decisão de que a ficha pública não vincula sozinha e de que a RN-045 só agrupa pelo ponteiro. Era o último id livre do bloco de Inscrição.
- **F8, F9 e F10 (novos)** — como alguém ganha e perde acesso, com a fronteira entre o **inscrito**, que usa `token_consulta`, e o **servo**, que autentica porque lê dado de terceiro (RN-019); **tratamento do CPF** — normalização, validação e o caminho da **pessoa sem CPF**, que a RN-010 não previa (RN-010a, RN-010b); e **exercício dos direitos do titular**, com o que a exportação leva, o que a exclusão apaga, o que ela preserva e quando ela espera (RN-092a, RN-092b).
- **F0** — ganha o passo que faltava: publicar a primeira versão do termo. RN-015 passa a exigi-lo para o inquilino sair de `em_implantacao`. §7, §6, §10, §11 e §8 alinhados às entidades novas.

**1.3 — 2026-08-23** — fechamento do **núcleo financeiro da Fase 1**: quem paga cada custo do meio de pagamento, o que exatamente o inscrito vê como preço, sobre o que incide o reembolso e em que ordem o dinheiro e a vaga se movem. Como na 1.2, **há decisão de negócio nova** — as specs de cobrança tinham decidido sozinhas, e duas delas pediam confirmação explícita por escrito. O rastreamento está em §12.

- **RN-101** (nova) — **custo do meio de pagamento**: a tarifa do gateway (MDR) é sempre da central e nunca é acrescentada ao que o inscrito paga; o juro do parcelamento é sempre do comprador e não entra no `valor` da cobrança nem no `valor_devido`. RN-040 passa a citá-la.
- **RN-096** — reescrita: como o repasse da taxa da plataforma **aparece no preço**. `valor_devido` guarda a taxa do encontro, `valor` da cobrança guarda o total, o percentual incide sobre a taxa do encontro que a cobrança cobra — o `valor_devido` na cobrança comum, só a diferença na cobrança de complemento da RN-037, e as duas parcelas são discriminadas na página do encontro, na ficha, no e-mail e na consulta por token. A escolha do repasse e o percentual são congelados na inscrição (§4.5), não relidos do inquilino na criação da cobrança.
- **RN-060** — base de cálculo do reembolso fechada nas duas pontas: incide sobre o que o inscrito pagou **à central**, o que **inclui** a taxa repassada (RN-096) e **exclui** o juro do parcelamento (RN-101).
- **RN-062** (nova) — **ordem das operações do cancelamento**: cobrança viva cancelada primeiro, estorno aceito antes de a inscrição virar `cancelada`, e o que acontece quando o estorno falha. A garantia que a spec teve de inventar em `RN-208` passa a ter origem aqui.
- **RN-063** (nova) — **quando o reembolso está efetivado**: o aceite síncrono libera o cancelamento, o webhook fecha o reembolso, e estorno aceito que não confirma em 7 dias vira pendência.
- **RN-064** (nova) — **contestação de cartão**: em que difere do estorno comum, o que acontece com a vaga e onde ela fica registrada.
- **RN-097** — reescrita: a taxa da plataforma volta proporcionalmente também na contestação, e volta para a plataforma quando a contestação é revertida.
- **RN-098** — reescrita: o que a área pública faz quando o recebimento está indisponível — agenda no ar, vaga reservada, cobrança pendente de emissão e relógio parado.
- **RN-052** — terceira exceção: o prazo não corre enquanto a plataforma não conseguiu emitir a cobrança (RN-098).
- **RN-102** (nova) — a taxa apurada é **relatório para faturamento externo**, não movimento financeiro: o dinheiro já foi retido no split, e emitir nota não é objetivo do produto (§1).
- §4.6 — campos `contestacao_*` e `taxa_estornada`; a distinção entre `valor` e `valor_devido` que a RN-096 passou a exigir; a situação de cobrança `pendente_emissao` (RN-098); a semântica de acumulador dos campos de estorno; e as pendências financeiras derivadas passam de três a **cinco** (RN-062, RN-063, RN-098). F3 reescrito na ordem da RN-062.
- §11 — a decisão em aberto nº 2 (recebimento por inquilino ou por central) passa a **bloqueante da Fase 1**, com a lista de impacto; §10 registra o bloqueio.
- §7 — notificações de reembolso efetivado, estorno sem confirmação, contestação recebida e vaga reservada sem cobrança emitida.

**1.2 — 2026-08-23** — fechamento do **núcleo operacional da Fase 1**: as regras que decidem quem tem vaga, quem paga em que prazo e o que acontece quando o dinheiro volta. Diferente da 1.1, aqui **há decisão de negócio nova** — cada uma existia apenas como invenção de spec, e agora tem origem no PRD. O rastreamento está em §12.

- **RN-030** — reescrita como **tabela de transições**, com origem, destino, gatilho e quem executa. `lista_espera` passa a ser estado de **entrada**, não "ramo"; entram a regressão `pendente_pagamento → lista_espera` (RN-052), o `confirmada → cancelada` de F3 e o gatilho de `ausente`; `presente` e `ausente` ficam marcados como Fase 2.
- **RN-033** — reescrita: declara **quais situações ocupam vaga**, o **prazo do promovido** (48h/24h/6h conforme a proximidade do encontro) e o que acontece quando ele estoura.
- **RN-023** (nova) — `inscricoes_abrem_em`/`inscricoes_fecham_em` são a fonte de verdade da janela de inscrição, em **dois predicados** distintos (janela aberta; aceitação de inscrição nova, que soma o inquilino `ativo`); `inscricoes_encerradas` (RN-021) passa a ser situação **derivada** do carimbo, não um segundo interruptor — derivação limitada ao par `publicado` ↔ `inscricoes_encerradas`.
- **RN-035** — reescrita: a criação administrativa de inscrição é **dispensada da janela**, com papel mínimo, justificativa, auditoria e a regra de excedente da RN-036. É o caminho do substituto de última hora que não está na fila.
- **RN-036** (nova) — promoção manual fora de ordem pela coordenação, com justificativa e auditoria, e o desfecho do prazo estourado depois do fechamento das inscrições.
- **RN-037** (nova) — destino da inscrição `confirmada` cujo pagamento é estornado ou contestado, inclusive estorno **parcial**, contestação revertida e segundo pagamento recebido. RN-070 alinhada.
- **RN-038** (nova) — `valor_devido` congelado na inscrição: reajuste de taxa não altera dívida de quem já se inscreveu.
- **RN-041** — reescrita: **marco de corte do pagamento online** (`data_inicio`, independente de `inscricoes_fecham_em`), até quando o Pix pode ser regerado, limite de regerações e o mesmo marco valendo para cartão.
- **RN-052** — reescrita: as 72h contam da **inscrição**, não da cobrança; exceção para pagamento em análise antifraude; nada expira sozinho depois de fechadas as inscrições.
- **RN-060** — quem absorve a tarifa do gateway no reembolso, onde ela fica gravada (`estorno_tarifa_gateway`, na cobrança) e em que fase vira lançamento.
- **RN-061** (nova), **RN-021** e §4.4 — **cancelamento do encontro**: o que acontece com as inscrições e com o dinheiro já pago, inclusive o presencial. F3 deixa de cobrir só a desistência do inscrito.
- §4.4, §4.5, §4.6 e §4.11 — campos e categorias que as regras acima passaram a exigir: `motivo_cancelamento` no encontro; `posicao_espera`, `espera_promovida_em` e `espera_expira_em` na inscrição, com o tempo de vida de cada um; `estorno_*` e `devolucao_presencial_*` na cobrança, de onde as três pendências financeiras são **derivadas** e de onde sai a despesa de tarifa; categoria de despesa `meio de pagamento`, lançada na Fase 3 a partir do `estorno_tarifa_gateway` gravado na Fase 1 (§10).
- §7 e §6 — notificações de encontro cancelado, de fila encerrada sem vaga e de pendência financeira; relatório de pendências financeiras do encontro.
- §12 (nova) — rastreabilidade: quais regras `[NOVA]` da spec deixam de ser invenção, e quais mudam.

**1.1 — 2026-08-23** — convenções de documento (§0) e correção das contradições internas do PRD, **sem mudança de decisão de negócio**:

- §2, §4.2, §4.3, RN-003, RN-011 e RN-094 — `data_nascimento` confirmada na identidade global e refletida em todos os pontos que descreviam a identidade como "CPF e nome"; RN-011a (nova) fixa nome e nascimento no primeiro cadastro.
- RN-001 — reescrita: declara a única travessia legítima da fronteira do inquilino (RN-010, RN-099), que a spec tinha aberto por conta própria em `RN-142`.
- RN-094 — reescrita: CPF e nome **são** dado pessoal; o que a regra garante é inacessibilidade de um inquilino a outro.
- §4.4 — removido o booleano `publicado`, redundante com `situacao` (RN-021, RN-022).
- RN-021 — transição de reabertura de `encerrado`, que RN-080 já pressupunha.
- §4.6, RN-040, RN-032, RN-051 e RN-070 — métodos presenciais (`dinheiro`, `pix_presencial`) e RN-044 (nova), a baixa manual.
- §4.7 a §4.11 — `inquilino_id` e `central_id` acrescentados, como RNF-001 já exigia; RNF-001 passa a declarar suas exceções.
- RN-045 — critério de núcleo familiar tornado executável por `nucleo_familiar_id` (§4.3).
- RN-046 — vice-coordenador modelado em §4.8; "exatamente um coordenador" virou invariante da publicação da equipe, não da criação da área. RN-046 passa a declarar `coordenador_inscricao_id` e `vice_coordenador_inscricao_id` como única fonte de verdade da coordenação, com `funcao` (§4.5) derivada deles; §2, RN-034, passo 2 de F4 e §6 alinhados.
- RN-060 — faixas de reembolso sem sobreposição nem buraco, com operador de comparação explícito.
- §4.11 e RN-100 (nova) — o booleano `aprovada` virou `situacao`, comportando o "devolve" do passo 2 de F7.
- §10 — "painel da central" e "painel da denominação" ficam só na Fase 3.
- §11 — item 8: apuração da taxa da plataforma sobre pagamento presencial.

**1.0 — 2026-08-22** — primeira versão do PRD. Base da geração das specs da Fase 1 (`specs/fase-1/`).

### 0.2 Numeração de regras

**Id é imutável.** Um `RN-xxx` identifica a mesma regra pela vida inteira do produto. Regra alterada mantém o id — é o que aconteceu na versão 1.1 acima. Regra revogada fica no documento, marcada `[REVOGADA]` com data e motivo, e **seu id nunca é reaproveitado**. Spec, código, teste, commit e conversa citam o id: reaproveitar um número transforma toda referência antiga em referência errada, e isso não aparece em revisão nenhuma.

**Sufixo de letra minúscula** (`RN-047a`, `RN-094a`) marca regra acrescentada depois e subordinada à regra base, que não se lê fora dela. Não é namespace e não dispensa a alocação de faixa.

**O sufixo `t` não é namespace.** `RN-050t` a `RN-085t`, em `specs/fase-1/00-multi-inquilino.md`, colidem visualmente com `RN-050` a `RN-085` deste documento, que são regras inteiramente diferentes — uma letra no fim do número não separa dois espaços de nomes de forma confiável. Ficam congelados como estão, porque id é imutável; **nenhum documento novo cria id com sufixo `t`**, e as regras novas daquele documento passam a sair da faixa `RN-600+`.

#### Faixas do PRD

| Faixa | Domínio | Onde |
|---|---|---|
| RN-001 – RN-019 | Plataforma, isolamento, atores, inquilino, central, identidade, pessoa, implantação | §3, §4.0–§4.3, F0, F1 |
| RN-020 – RN-029 | Encontro | §4.4 |
| RN-030 – RN-039 | Inscrição | §4.5 |
| RN-040 – RN-044 | Cobrança | §4.6 |
| RN-045 – RN-049 | Operação do encontro: grupo, área de servição, cronograma, tarefa, despesa | §4.7–§4.11 |
| RN-050 – RN-059 | Pagamento e webhook | F2 |
| RN-060 – RN-069 | Cancelamento e reembolso | F3 |
| RN-070 – RN-079 | Credenciamento e check-in | F6 |
| RN-080 – RN-089 | Prestação de contas e relatórios | F7, §6 |
| RN-090 – RN-099 | LGPD e recebimento/split | §8.3, §9 |
| **RN-100 – RN-119** | **Extensão do PRD** — bloco de origem esgotado | qualquer seção |

Três faixas já nasceram cheias ou misturadas: RN-040–RN-044 e RN-045–RN-049 estão esgotadas, e RN-090–RN-099 mistura LGPD (090–094a, 099) com recebimento (095–098) por acidente histórico. Nada disso é renumerado. Regra nova cujo bloco de origem acabou fica **no lugar certo do documento** e leva um id da faixa de extensão — RN-100, a situação da despesa, é o primeiro caso.

A versão 1.2 coube inteira dentro dos blocos de origem: RN-023 em Encontro, RN-036 a RN-038 em Inscrição, RN-061 em Cancelamento e reembolso. O bloco de Inscrição fica com **um** id livre (RN-039) — a próxima regra de inscrição depois dessa sai da faixa de extensão.

A versão 1.3 usa os dois caminhos ao mesmo tempo, e é o primeiro exemplo de como a regra se aplica na prática. RN-062, RN-063 e RN-064 cabem no bloco de Cancelamento e reembolso, que ainda tinha espaço e fica com RN-065 a RN-069 livres. RN-101 (custo do meio de pagamento, §4.6) e RN-102 (apuração da taxa, §8.3) saem da **faixa de extensão**, porque os blocos de Cobrança e de recebimento/split já estavam esgotados — as duas ficam no lugar certo do documento, ao lado das regras de que tratam, com um id que não pertence à vizinhança. É desconfortável de ler e é o preço de id imutável.

A versão 1.4 é a maior das três e usa os **três** caminhos que §0.2 admite. Coube no bloco de origem o que ainda tinha espaço: RN-017 a RN-019 (contas de acesso) **fecham** o bloco de Plataforma; RN-024 e RN-025 ficam no de Encontro; RN-039 (convidador) era o último id livre do de Inscrição e **fecha** o bloco; RN-053 (evento de webhook) e RN-065 (política de reembolso) usam blocos com folga. Saiu da **faixa de extensão** o que não tinha bloco onde caber: RN-103 a RN-107. E doze regras usam o **sufixo de letra** — RN-005a, RN-010a, RN-010b, RN-040a, RN-048a, RN-049a, RN-090a, RN-090b, RN-091a, RN-092a, RN-092b, RN-093a —, todas subordinadas a uma regra que já existia e nenhuma legível fora dela: são o campo, a entidade ou o procedimento que a regra base mandava existir e não definia.

Depois da 1.4, os blocos livres eram: RN-026 a RN-029 (Encontro), RN-054 a RN-059 (Pagamento e webhook), RN-066 a RN-069 (Cancelamento e reembolso), RN-071 a RN-079 (Credenciamento), RN-081 a RN-084 e RN-086 a RN-089 (Prestação de contas), e RN-108 a RN-119 na faixa de extensão. Os blocos de Plataforma, Inscrição, Cobrança, Operação do encontro e LGPD/recebimento estavam **esgotados**.

A versão 1.5 numera §6 inteiro: RN-081 a RN-089 **fecham** o bloco de Prestação de contas e relatórios, que estava com folga e passa a **esgotado**; RN-108 a RN-111, na faixa de extensão, cobrem o que não coube nele. §7 usa mais três da faixa de extensão — RN-112 a RN-114 — para os três gatilhos que não tinham regra nenhuma; os demais gatilhos da tabela já citavam a regra de origem e não precisaram de id novo. O painel do encontro, citado por RN-025, RN-035, RN-036, RN-037, RN-064 e RN-098 sem nunca ter sido numerado, ganha **RN-115** — também da faixa de extensão, porque o bloco de Prestação de contas e relatórios já fechou acima.

Depois da 1.5, os blocos livres são: RN-026 a RN-029 (Encontro), RN-054 a RN-059 (Pagamento e webhook), RN-066 a RN-069 (Cancelamento e reembolso), RN-071 a RN-079 (Credenciamento), e RN-116 a RN-119 na faixa de extensão. Os blocos de Plataforma, Inscrição, Cobrança, Operação do encontro, **Prestação de contas e relatórios** e LGPD/recebimento estão **esgotados**.

**O PRD não emite id acima de RN-119.** De RN-120 para cima é território de spec.

#### Faixas de spec (`specs/`)

| Faixa | Documento | Assunto |
|---|---|---|
| RN-120 – RN-199 | `fase-1/01-modelo-de-dados.md` | modelo de dados, RLS, retenção |
| RN-200 – RN-299 | `fase-1/02-inscricao.md` | inscrição |
| RN-300 – RN-399 | `fase-1/03-cobranca.md` | cobrança |
| RN-400 – RN-499 | `fase-1/04-webhook.md` | webhook |
| RN-500 – RN-599 | `fase-1/05-lista-de-espera.md` | lista de espera |
| RN-600 – RN-699 | `fase-1/00-multi-inquilino.md` | multi-inquilino e RLS — sucessora da faixa legada `RN-0xxt` |
| RN-700 – RN-999 | livre | um bloco de 100 por documento novo de spec, reservado **aqui** no ato da criação |

Regra que **nasce** na spec leva `[NOVA]` na primeira aparição, como já faz a Fase 1. Spec não altera regra do PRD: se a implementação exigir mudança, a mudança volta para cá, no id original, e a spec passa a citar a versão nova — foi o que faltou acontecer quando `RN-142` abriu sozinha a exceção que RN-001 proibia.

#### RNF

`RNF-001` a `RNF-099` são deste documento (§8). Spec que precise de requisito não-funcional próprio usa `RNF-100+`, com a mesma regra de um bloco por documento, reservado nesta seção.

---

## 1. Visão

**SaaS multi-inquilino** para divulgação, inscrição, cobrança e operação de retiros espirituais. Cada denominação — Homens de Fé, Homens Adoradores, Tabor — é um inquilino independente, com suas centrais espalhadas pelo Brasil, sua identidade visual, seu vocabulário e seu recebimento.

Hoje cada central controla seus encontros em planilhas, grupos de WhatsApp e caderno de anotações. O sistema substitui isso por um fluxo único: o encontro é publicado, a pessoa se inscreve e paga pelo site, a coordenação monta grupos e equipe de servição, conduz o evento seguindo o cronograma e fecha a prestação de contas no domingo.

A plataforma se sustenta por **percentual sobre cada inscrição paga**, retido no split do gateway (seção 8.3).

**Não é objetivo:** rede social, streaming de pregações, app nativo, emissão de nota fiscal, contabilidade formal.

---

## 2. Glossário do domínio

Este vocabulário é obrigatório em código, banco e interface.

| Termo | Definição |
|---|---|
| **Inquilino** (ou Denominação) | Organização cliente da plataforma. Ex.: "Homens de Fé", "Homens Adoradores", "Tabor". Tem identidade visual, vocabulário, subdomínio e recebimento próprios. É a fronteira máxima de isolamento de dados. |
| **Operador** | Quem opera a plataforma (você). Único papel que enxerga mais de um inquilino, e ainda assim sem acesso a dado pessoal (RN-005). |
| **Central** | Unidade organizadora de um inquilino, vinculada a uma cidade/UF. Ex.: "Central de Cascavel-PR" da Homens de Fé. Cada central tem sua própria numeração de encontros. Cidades podem ter centrais de denominações diferentes, sem relação entre si. |
| **Identidade** | Registro global mínimo de uma pessoa física — CPF, nome completo e data de nascimento —, usado apenas para reconhecer que a pessoa já existe na plataforma. Não carrega dado de contato nem dado sensível, e não é acessível a inquilino nenhum (RN-001, RN-094). |
| **Encontro** (ou Retiro) | Edição de um retiro promovido por uma central, com número sequencial próprio. Ex.: "2º Encontro Homens de Fé de Cascavel-PR". |
| **Participante** | Pessoa inscrita para viver o encontro pela primeira vez naquela edição. |
| **Servo** | Pessoa que trabalha no encontro. Paga taxa reduzida (alimentação/hospedagem) e é alocada numa área de servição com uma função. |
| **Área de servição** | Frente de trabalho da equipe: secretaria, pregação, apoio, manutenção, capela, cozinha, recepção, música, fotografia, saúde. |
| **Função** | Papel dentro da área: coordenador, vice-coordenador ou membro. Decorre de quem a área aponta como coordenador e como vice (RN-046); os demais servos alocados são membros. |
| **Grupo** | Subdivisão dos participantes durante o encontro (nome + cor + servos responsáveis). |
| **Convidador** | Pessoa que convidou o participante. Pode ou não ser servo do encontro, e pode não estar no cadastro do inquilino — nesse caso fica registrada só pelo nome (RN-039). |
| **Etapa do cronograma** | Bloco de tempo do roteiro (ex.: sexta 19:00 — Recepção e credenciamento). |
| **Tarefa da etapa** | Item operacional a executar dentro da etapa (ex.: conferir crachás, guardar malas). |
| **Inscrição** | Vínculo de uma pessoa a um encontro, na condição de participante ou de servo, com sua situação e sua cobrança. |
| **Taxa** | Valor devido pela inscrição. Difere entre participante e servo. |
| **Prestação de contas** | Fechamento financeiro do encontro: receitas arrecadadas × despesas lançadas. |
| **Rótulo** | Como um inquilino nomeia um conceito do domínio na tela. O domínio é fixo no código (`servo`); o rótulo é configurável (`servo`, `obreiro`, `equipe`). |
| **Taxa da plataforma** | Percentual retido pelo operador sobre cada inscrição paga, via split do gateway. |

---

## 3. Atores e permissões

| Ator | Escopo | Pode |
|---|---|---|
| **Visitante** | Público | Ver encontros publicados, abrir ficha de inscrição, pagar, consultar a própria inscrição por token. |
| **Inscrito** | Própria inscrição | Acompanhar situação, refazer pagamento pendente, atualizar dados até o fechamento das inscrições. |
| **Servo** | Encontro em que serve | Ver seu grupo/área, cronograma, lista dos participantes do seu grupo, marcar tarefas da etapa. |
| **Coordenador de área** | Sua área no encontro | Tudo do servo + gerenciar os servos da própria área e lançar despesas da área. |
| **Coordenador do encontro** | Um encontro | Configurar o encontro, aprovar inscrições, montar grupos e equipe, conduzir cronograma, lançar despesas, fechar prestação de contas. |
| **Admin da central** | Todos os encontros da central | Tudo do coordenador + criar encontros, gerir pessoas da central, configurar taxas e credenciais de pagamento. |
| **Admin da denominação** | Todas as centrais do inquilino | Criar/desativar centrais, consolidar indicadores da denominação, configurar marca, rótulos e recebimento. Não altera dado financeiro de central sem registro em auditoria. |
| **Operador** | Todos os inquilinos | Criar/suspender inquilinos, configurar a taxa da plataforma, dar suporte. **Não enxerga dado pessoal de participante** (RN-005). |

**RN-001** — O isolamento tem dois níveis. Nenhuma consulta atravessa a fronteira do **inquilino** a pedido de um inquilino: nem leitura, nem escrita, nem existência revelada (RN-094a). Dentro do inquilino, o dado é isolado por **central**, e o admin da denominação atravessa essa segunda fronteira.

A **única** travessia legítima da fronteira do inquilino é a da identidade global (§4.2), em duas operações, ambas executadas por **rotina de sistema** e jamais a pedido de um inquilino:

1. **Resolução de identidade por CPF** (RN-010, RN-013), na inscrição: devolve o vínculo com a identidade e nada mais — não devolve nome, não diz se já existia, não indica em quantos inquilinos a pessoa aparece (RN-094a).
2. **Limpeza de identidade órfã** (RN-099), na rotina de retenção: apaga a identidade quando não resta nenhuma pessoa vinculada a ela, em nenhum inquilino.

Nenhuma das duas entrega dado de um inquilino a outro, e nenhuma pode ser provocada ou observada por um inquilino como efeito no cadastro de outro. Qualquer outra travessia é defeito, não exceção.

**RN-002** — Uma pessoa pode ter papéis diferentes em encontros diferentes (participante em um, servo em outro).
**RN-003** — A mesma pessoa física pode existir em mais de um inquilino. Cada inquilino tem o **seu** cadastro dela, com seus dados de contato e seus dados sensíveis. O que é compartilhado é apenas a **identidade** (CPF, nome e data de nascimento), para reconhecimento.
**RN-004** — Uma conta de usuário pertence a um inquilino. Servir em duas denominações exige dois acessos distintos — não há troca de contexto entre inquilinos numa mesma sessão. A conta é a entidade de §4.15; quais destes sete atores são conta e quais são derivados está na RN-017, e como alguém ganha e perde acesso está em F8 (RN-018).
**RN-005** — O operador tem acesso a métricas, faturamento e dados de configuração, **nunca** a nome, contato ou dado sensível de participante. Suporte que exija ver dado real passa por acesso temporário concedido pelo admin da denominação, com prazo, motivo e registro em auditoria. A concessão é a entidade de §4.16, e a RN-005a declara o que ela alcança e o que ela não alcança — dado sensível (§4.3a) e CPF (§4.2) ficam fora dela, com ou sem concessão.

---

## 4. Entidades

### 4.0 Inquilino
`id`, `nome`, `slug`, `subdominio`, `dominio_proprio`, `logo`, `cores`, `rotulos`, `email_contato`, `taxa_plataforma_percentual`, `taxa_plataforma_repassada`, `padrao_parcela_minima`, `padrao_max_parcelas`, `padrao_reembolso_faixas`, `padrao_despesa_exige_comprovante_acima_de`, `situacao`, `contrato_aceito_em`

`taxa_plataforma_repassada` é o interruptor da RN-096 — se a denominação absorve a taxa da plataforma ou a repassa ao inscrito. Ele mora aqui e em nenhum outro lugar: a central não o configura, e a inscrição congela uma cópia dele na criação (§4.5).

`email_contato` é o endereço de resposta dos e-mails automáticos do inquilino inteiro (§7) — mora aqui como **ponto de partida**: toda central herda uma cópia dele na criação (RN-103, §4.1) e passa a ter a sua própria, porque quem responde pela caixa de entrada de um encontro é a secretaria da central que o organiza, não a denominação inteira.

Os quatro `padrao_*` são os valores que **toda central nova herda por cópia** (RN-103, §4.1). O prefixo é de propósito: o número que decide um reembolso ou um parcelamento é o da central, e o do inquilino é só o ponto de partida dela.

**RN-006** — `slug` é único na plataforma e define o subdomínio (`homens-de-fe.app.com.br`). Domínio próprio é opcional e depende de verificação de DNS.
**RN-007** — Situações do inquilino: `em_implantacao` → `ativo` → `suspenso` → `encerrado`. Inquilino `suspenso` mantém a área pública em modo leitura e bloqueia **inscrição nova** — nos dois canais, o site público (RN-023) e a criação administrativa da coordenação (RN-035); nenhum dado é apagado.

A suspensão para aí, e o que ela **não** faz precisa ficar escrito, porque a leitura larga de "bloqueia novas inscrições" é justamente a que derruba encontro alheio. Suspender o inquilino **não** congela a lista de espera, **não** suspende prazo nenhum (RN-033, RN-052) e **não** impede quem **já ocupa vaga** de quitá-la: cobrança viva continua pagável e regerável (RN-041). Quem está dentro do encontro não é parte da inadimplência da denominação, e tirar dele a forma de pagar produziria uma inscrição que não pode ser paga nem expirada. O acesso de quem **opera** o encontro em andamento no momento da suspensão — coordenador e servos — é tratado em RN-018 (§4.15, "O que não revoga conta"), que fecha a decisão nº 7 de §11: contas continuam ativas. O que fica decidido aqui é que a suspensão não retira vaga nem prazo de ninguém.
**RN-008** — `rotulos` é um mapa de conceito do domínio para o termo de exibição. Chaves fixas no código, valores livres por inquilino.

### 4.1 Central
`id`, `inquilino_id`, `nome`, `cidade`, `uf`, `slug`, `logo`, `contatos`, `email_contato`, `ativa`, `parcela_minima`, `max_parcelas`, `reembolso_faixas`, `despesa_exige_comprovante_acima_de`

Sai `config_pagamento`, que era um campo opaco e sem definição nenhuma no documento, e entram no lugar dele duas coisas separadas: os **valores configuráveis** acima, que as regras já mandavam configurar sem dizer onde (RN-040, RN-049, RN-060), e a **conexão de recebimento**, que não é campo de central nenhuma e virou entidade própria (§4.12). Misturar credencial de gateway com política de reembolso num único campo sem forma era o que impedia as duas de terem regra.

**RN-009** — `slug` da central é único **dentro do inquilino**. Duas denominações podem ter, cada uma, sua "central de cascavel". Ele é também metade da URL pública do encontro (RN-024).

**RN-103** — **O que cada nível configura, e como a herança funciona.** Três regras deste documento dizem "configurável" — parcela mínima (RN-040), comprovante de despesa (RN-049) e política de reembolso (RN-060) — e nenhuma dizia em que campo, em que nível, nem o que acontece quando o inquilino muda o padrão depois de a central existir.

| Configuração | Onde vive | A central herda? | Quem altera |
|---|---|---|---|
| `rotulos` (RN-008) | inquilino, e só | não existe no nível da central — a RNF-007 manda toda tela usar os do inquilino | admin da denominação |
| `taxa_plataforma_percentual` (RN-095) | plataforma, pelo contrato | não | operador |
| `taxa_plataforma_repassada` (RN-096) | inquilino, e só | não — a escolha é da denominação, e é congelada na inscrição (§4.5) | admin da denominação |
| Catálogo de áreas de servição (RN-047a) | inquilino, com cópia na central | **cópia na criação** | admin da denominação no catálogo; admin da central na cópia dela |
| `reembolso_faixas` (RN-060, RN-065) | central | **cópia na criação** | admin da central; admin da denominação, com registro em auditoria (§3) |
| `parcela_minima`, `max_parcelas` (RN-040a) | central | **cópia na criação** | idem |
| `despesa_exige_comprovante_acima_de` (RN-049a) | central | **cópia na criação** | idem |
| `email_contato` (§7) | central | **cópia na criação** | admin da central; admin da denominação, com registro em auditoria (§3) |
| Modelo de cronograma (RN-048a) | inquilino e central | **cópia**, no ato de criar o modelo da central | idem |

**Cópia, e não referência viva.** Referência faria a denominação mudar, num clique e sem saber, a política de reembolso de uma central que não pediu — e de encontros que já foram divulgados com a regra anterior. Com cópia, a central sai da criação com os números da denominação e passa a ser dona deles: mudar o padrão do inquilino alcança **central criada depois**, e mais ninguém. É a mesma decisão que a RN-047a já tomava para o catálogo de áreas, agora valendo para tudo que se herda.

Para empurrar um padrão novo às centrais que já existem há um **ato explícito** do admin da denominação — "aplicar a todas as centrais" —, com confirmação, motivo e registro em auditoria (RNF-005). Ele altera a configuração da central e para aí: **não alcança inscrição já criada**, que congelou o que precisava congelar (RN-038, RN-065, RN-096). Sem o ato não há propagação nenhuma; com ele, a propagação é um evento datado com autor, e não o efeito colateral de alguém editar um campo numa tela de configuração.

**RN-065** — **A política de reembolso é da central, e é congelada na inscrição.** `reembolso_faixas` é a lista que a RN-060 aplica. Cada faixa é um par `antecedencia_minima_dias` / `percentual`, a lista é ordenada por `antecedencia_minima_dias` **decrescente**, e vale a **primeira** faixa cuja `antecedencia_minima_dias` é menor ou igual à `antecedencia_dias` do pedido; antecedência negativa — cancelamento pedido depois do início do encontro — não casa com nenhuma e cai na **última** faixa.

O padrão de fábrica, herdado do inquilino por cópia (RN-103), é a tabela da RN-060 escrita nesta forma:

| `antecedencia_minima_dias` | `percentual` |
|---|---|
| 16 | 100 |
| 7 | 50 |
| 0 | 0 |

**A primeira linha é 16, e não 15.** A RN-060 abre a faixa de 100% em `> 15`: quinze dias exatos devolvem 50%. Escrever 15 aqui devolve 100% num cancelamento que a regra manda pagar pela metade — é exatamente o erro que `02-inscricao.md` §3.1 e o padrão de `01-modelo-de-dados.md` carregam hoje (§12), e ele custa metade do valor de uma inscrição toda vez que alguém cancela no dia exato.

**Invariantes**, as mesmas que a tabela da RN-060 respeita à mão: `antecedencia_minima_dias` são inteiros não negativos, sem repetição; a última faixa tem `antecedencia_minima_dias = 0`; `percentual` está entre 0 e 100 e **não cresce** conforme a antecedência diminui — política que devolve mais a quem desiste mais tarde é engano de digitação, não escolha. Configuração que não fecha é recusada na tela e não corrigida em silêncio: faixa faltando é cancelamento sem resposta na hora em que alguém está esperando um número.

**A inscrição copia as faixas na criação**, no campo `reembolso_faixas` de §4.5, e a RN-060 lê **dali** — nunca da central. É o mesmo congelamento de `valor_devido` (RN-038) e da taxa da plataforma (RN-096), contra o mesmo defeito: a política de cancelamento é uma das condições que a pessoa leu antes de pagar, e editar as faixas da central no meio do encontro mudaria retroativamente o que ela recebe de volta. Com a cópia, quem muda a política muda para quem se inscrever depois — inclusive para quem está na fila, que copiou as faixas ao entrar nela.

Alterar as faixas de uma inscrição específica continua possível pelo mesmo caminho de `valor_devido`: ato explícito da coordenação, com motivo e auditoria (RNF-005), nunca como efeito de mexer na configuração da central.

O que **não** lê as faixas: o cancelamento do encontro (RN-061), que devolve 100% sem faixa nenhuma, e a devolução do segundo pagamento (RN-037), que devolve o excedente inteiro porque não houve desistência de ninguém.

### 4.2 Identidade
Registro global mínimo. É a única entidade fora do isolamento por inquilino, e por isso a mais protegida: nenhum inquilino a lê (RN-001, RN-094).
`id`, `cpf`, `nome_completo`, `data_nascimento`

**RN-010** — CPF é único na plataforma inteira, nesta tabela. É a chave de reconhecimento entre inquilinos.
**RN-011** — A identidade guarda `cpf`, `nome_completo` e `data_nascimento`, e nada além disso: **não** guarda telefone, e-mail, endereço nem dado sensível. A data de nascimento entra porque CPF digitado errado casa com a pessoa errada e nome sozinho não desempata homônimo — é o terceiro fator que confirma o reconhecimento, não um dado que algum inquilino vá consumir. Só o suficiente para dizer "essa pessoa já existe".
**RN-011a** — Nome e nascimento da identidade são fixados no primeiro cadastro e nunca atualizados por inquilino nenhum. Cada inquilino mantém a sua própria versão desses campos em `Pessoa` (§4.3) — divergência entre as duas versões é esperada, não erro.

### 4.3 Pessoa
Cadastro **por inquilino**, vinculado a uma identidade, reaproveitado entre as centrais e os encontros daquele inquilino.
`id`, `inquilino_id`, `identidade_id`, `central_origem_id`, `nome_completo`, `nome_cracha`, `data_nascimento`, `telefone`, `email`, `endereco`, `estado_civil`, `nucleo_familiar_id`, `contato_emergencia_nome`, `contato_emergencia_telefone`, `observacoes`, `anonimizada_em`

Os **dados sensíveis** (§9) não moram mais aqui: ficam em entidade própria, §4.3a, e a RN-091a diz por quê e o que muda com isso.

`identidade_id` é obrigatório em toda pessoa cadastrada com CPF, e fica vazio em três casos: o da pessoa sem CPF da RN-010b, o da pessoa anonimizada pelo pedido de exclusão do titular (RN-092b) e o da pessoa anonimizada por idade (RN-093) — os dois últimos esvaziam o ponteiro no mesmo ato da anonimização. `anonimizada_em` é o carimbo que a anonimização por idade (RN-093) e o pedido de exclusão do titular (RN-092b) gravam — a linha continua existindo, com marcadores no lugar do dado pessoal, porque a inscrição e a cobrança dela continuam existindo.

`nucleo_familiar_id` é um agrupador **local do inquilino** — cônjuges, pai e filho, irmãos —, opcional, atribuído pela coordenação ao reconhecer o parentesco entre dois cadastros. Não sai do inquilino, não tem significado fora dele e não é derivado de sobrenome. Existe para tornar RN-045 executável; vazio, o critério de núcleo familiar simplesmente não se aplica àquela pessoa.

**RN-012** — Uma identidade tem no máximo uma pessoa por inquilino.
**RN-013** — Ao se inscrever, o CPF informado localiza a identidade global. Se ela existir mas não houver pessoa neste inquilino, o cadastro é criado **do zero**, com os dados da ficha. Nada é copiado de outro inquilino, nem o telefone.
**RN-014** — A pessoa é do inquilino, não da central. `central_origem_id` registra onde ela apareceu pela primeira vez, para relatório; não restringe acesso. Quem viveu o encontro em Cascavel e se mudou para Maringá serve lá sem recadastro.

### 4.3a Dado sensível da pessoa
Um registro por pessoa, no mesmo inquilino dela, separado de §4.3 de propósito.
`pessoa_id`, `inquilino_id`, `restricao_alimentar`, `condicao_saude`, `medicamentos_uso_continuo`, `religiao_declarada`

**RN-091a** — **A separação é da entidade, não da tela.** A RN-091 restringe a visibilidade de saúde e medicamento, e até a 1.3 os campos ficavam dentro de `Pessoa` — o que faz a restrição depender de todo `select`, toda exportação e todo relatório novo lembrarem de não trazer as colunas. Lembrar é o que não acontece: a lista de participantes montada às pressas na quinta à noite traz a tabela inteira, e a condição de saúde de sessenta pessoas sai na impressora da secretaria. Separada, a restrição passa a ser propriedade do lugar onde o dado está, e não disciplina de quem escreve consulta.

**Nenhuma listagem, exportação ou relatório geral faz junção com esta entidade.** O acesso é por caminho dedicado, um registro por vez, e cada **leitura** é evento auditado (§4.17) — é uma das duas únicas situações do documento em que ler já é o evento, ao lado do acesso de suporte (RN-005a). Para estes campos, quem olhou é fato tão relevante quanto quem escreveu.

**As únicas exceções, todas declaradas aqui**, no mesmo formato da tabela de exceções da `RNF-001` (§8.1):

| Relatório ou exportação | O que alcança | Auditoria da leitura |
|---|---|---|
| Lista consolidada da cozinha (§6) | `restricao_alimentar`, com nome e grupo | um evento por **emissão** do relatório, com o conjunto de pessoas alcançado — não um evento por pessoa listada |
| Condições de saúde e contatos de emergência (§6) | `condicao_saude`, `medicamentos_uso_continuo` | um evento por **emissão** do relatório, com o conjunto de pessoas alcançado |
| Exportação do titular (RN-092a) | os quatro campos, e só os do próprio titular | coberta pelo registro do pedido de exportação (F10), não um evento à parte |

Fora dessas três, a proibição vale sem exceção: nenhuma outra listagem, exportação ou relatório faz junção com esta entidade.

**A visibilidade é por campo, e não é a mesma para os quatro:**

| Campo | Quem lê | Onde aparece |
|---|---|---|
| `restricao_alimentar` | coordenação do encontro, admin da central e os servos da área com **`papel = cozinha`** (RN-047a) | a lista consolidada da cozinha (§6), com nome e grupo — a cozinha precisa saber de quem é o prato |
| `condicao_saude`, `medicamentos_uso_continuo` | coordenação do encontro, admin da central e os servos da área com **`papel = saude`** (RN-047a, RN-091) | só o relatório restrito de §6. Nunca em lista geral, nunca em exportação comum, nunca no crachá |
| `religiao_declarada` | coordenação do encontro e admin da central | relatório nenhum e lista nenhuma. É coletado para o cuidado pastoral de uma pessoa, não para consolidar em número |

**O acesso por área tem duas bordas.** Quem lê pela área precisa de inscrição de servo **viva naquela área daquele encontro** (RN-047), e só alcança quem tem inscrição viva **no mesmo encontro** — servo da cozinha do 3º Encontro não lê a restrição alimentar de quem se inscreveu no 4º. E o acesso termina quando o encontro passa a `encerrado`: acabou o motivo pelo qual ele existia.

**O acesso de suporte não alcança nada disto** (RN-005a), com ou sem concessão do admin da denominação. O PRD era silencioso e `specs/fase-1/00-multi-inquilino.md` decidiu sozinho, em `RN-080t`, que nunca alcança — **é a decisão que fica**, e ela passa a ter origem aqui.

**Quem preenche é o titular.** Os quatro campos vêm da ficha (F1) ou do link da inscrição (RN-019), e dependem de consentimento específico dele (RN-090b). Inscrição criada pela coordenação (RN-035) nasce com eles vazios e a coordenação não os preenche por ninguém.

**O que a exclusão faz aqui é apagar**, não anonimizar: a linha inteira sai, no pedido do titular (RN-092b) e na anonimização por idade (RN-093). Não há razão para guardar marcador de condição de saúde. E o conteúdo destes campos **nunca** entra em `antes`/`depois` da auditoria (RN-106) — auditar a mudança copiando o valor para uma tabela que meio sistema lê desfaz, numa linha, tudo que esta regra construiu.

### 4.4 Encontro
`id`, `inquilino_id`, `central_id`, `numero`, `slug`, `titulo`, `data_inicio`, `data_fim`, `local_nome`, `local_endereco`, `vagas_participantes`, `vagas_servos`, `taxa_participante`, `taxa_servo`, `inscricoes_abrem_em`, `inscricoes_fecham_em`, `situacao`, `motivo_cancelamento`, `coordenador_inscricao_id`, `texto_divulgacao`, `imagem_capa`

**RN-020** — `numero` é sequencial e único dentro da central, atribuído automaticamente na criação (`MAX(numero) + 1`), com possibilidade de ajuste manual pelo admin da central para acomodar histórico anterior ao sistema.

**RN-021** — **Situações do encontro, e as únicas transições que existem.** `rascunho` → `publicado` → `inscricoes_encerradas` → `em_andamento` → `encerrado`, mais `cancelado`. A lista é fechada, como a da RN-030:

| De | Para | Gatilho | Quem executa |
|---|---|---|---|
| `rascunho` | `publicado` | publicação do encontro (RN-022) | coordenador do encontro ou admin da central |
| `publicado` | `inscricoes_encerradas` | passou `inscricoes_fecham_em` (RN-023) | sistema |
| `inscricoes_encerradas` | `publicado` | `inscricoes_fecham_em` empurrado para frente (RN-023) | sistema (efeito da edição do carimbo, não ato próprio) |
| `publicado` ou `inscricoes_encerradas` | `em_andamento` | chegou `data_inicio`, no fuso `America/Sao_Paulo` | sistema; o coordenador do encontro pode **antecipar** manualmente, com motivo em auditoria (RNF-005) |
| `em_andamento` | `encerrado` | fechamento da prestação de contas (passo 4 de F7), que exige nenhuma despesa por avaliar (RN-100) | coordenador do encontro ou admin da central |
| `encerrado` | `em_andamento` | reabertura, com motivo (RN-080) | admin da central |
| qualquer situação anterior a `encerrado` | `cancelado` | cancelamento do encontro, com `motivo_cancelamento` (RN-061) | admin da central |

`cancelado` é **terminal** — encontro cancelado não volta a `publicado` nem a `rascunho`. O que acontece com as inscrições e com o dinheiro já pago está na RN-061, inclusive quando o cancelamento ocorre com o encontro já `em_andamento`.

`encerrado` → `em_andamento` é a **reabertura**: única transição que anda para trás por ato humano, exige **admin da central**, exige motivo e fica registrada em auditoria (RN-080, RNF-005). Reabrir devolve o encontro ao estado em que lançamento financeiro é aceito; encerrar de novo repete o fechamento do passo 4 de F7.

Entrar em `inscricoes_encerradas` e sair de volta para `publicado` **não são atos manuais**: as duas são derivadas do carimbo `inscricoes_fecham_em` (RN-023), e valem **só entre essas duas situações** — a partir de `em_andamento` o carimbo não mexe mais em `situacao`.

`em_andamento` → `encerrado` **não é automático**, e não cai de `data_fim`: é o ato de fechar a prestação de contas (passo 4 de F7). Encontro que acabou no domingo e cuja prestação de contas ainda não fechou continua `em_andamento` — que é exatamente o estado em que lançamento financeiro é aceito (RN-080). Encerrar é o que fecha a fila remanescente (RN-033) e o que atribui `ausente` a quem não fez check-in (RN-030, Fase 2).

**RN-022** — Só encontro `publicado` aparece na agenda pública. `situacao` é a **única** fonte de verdade da publicação — não existe indicador booleano paralelo, que só criaria dois estados capazes de divergir.

**RN-023** — **A janela de inscrição é o par de carimbos, não a situação.** São **dois predicados**, com nomes próprios porque decidem coisas diferentes e não se movem juntos.

**Janela de inscrição aberta** — depende só do encontro:

1. `encontro.situacao = publicado` (RN-022);
2. `inscricoes_abrem_em <= agora < inscricoes_fecham_em`, no fuso `America/Sao_Paulo`, com os operadores exatamente esses: o instante de abertura já está dentro, o de fechamento já está fora.

**Aceitação de inscrição nova pelo site** — é a janela mais o inquilino:

3. janela de inscrição aberta **e** inquilino `ativo` (RN-007).

Inquilino `suspenso` derruba o segundo predicado sem tocar no primeiro: o site para de aceitar inscrição nova e **nada mais muda no encontro** — a fila anda, os prazos correm e quem já ocupa vaga continua podendo pagar (RN-007, RN-041). A **criação administrativa** de inscrição pela coordenação não passa por nenhum dos dois predicados: está dispensada da janela, com condições próprias, na RN-035.

Quando uma regra deste documento diz "inscrições abertas", ela cita qual dos dois predicados usa. Onde a consequência é sobre o **encontro** — congelar a fila, suspender expiração —, quem manda é o carimbo `inscricoes_fecham_em` sozinho, e está dito abaixo.

`inscricoes_encerradas` (RN-021) **não é um segundo interruptor**. É a situação que o sistema atribui sozinho ao passar `inscricoes_fecham_em`, e desfaz sozinho se o carimbo for empurrado para frente. Fechar antes do prazo se faz **antecipando `inscricoes_fecham_em`**; reabrir, adiando-o. Não existe ato de "encerrar inscrições" que mexa na situação sem mexer no carimbo — seriam duas fontes de verdade capazes de divergir, e a que a tela mostrasse não seria necessariamente a que o cadastro de inscrição obedece. Havendo divergência — rotina atrasada, relógio fora de hora —, **o carimbo decide** e a situação é corrigida atrás dele.

**A derivação vale entre `publicado` e `inscricoes_encerradas`, e só entre elas.** A partir de `em_andamento` o carimbo deixa de alterar `situacao`: adiar `inscricoes_fecham_em` num encontro que já começou, que já encerrou ou que foi cancelado **não** o devolve a `publicado` — seria recolocar na agenda pública (RN-022) um encontro terminado ou cancelado e reabrir inscrição para ele, transição que a RN-021 não tem. Nessas situações a edição do carimbo, no máximo, é recusada na tela; o que ela nunca faz é produzir transição.

Passado `inscricoes_fecham_em` — **o carimbo**, não o predicado de aceitação —, a lista de espera congela: não entra mais ninguém na fila e não há promoção automática (RN-033). E nada expira sozinho a partir daí (RN-052). As duas consequências dependem só do carimbo de propósito: são fatos do encontro, não da saúde comercial do inquilino, e amarrá-las ao predicado de aceitação faria a suspensão de uma denominação congelar fila e prazo de encontros que estão acontecendo.

Vaga que vagar depois do fechamento é preenchida pela coordenação, uma a uma, que nessa altura já está montando grupos e precisa decidir caso a caso. São **dois** caminhos, não um: promoção manual de quem está na fila (RN-036) e criação administrativa de quem nunca se inscreveu (RN-035) — o substituto do servo que desiste na semana do encontro quase nunca está na fila. O que o fechamento encerra é o **autoatendimento**, não a operação.

**RN-024** — **O `slug` é o identificador público do encontro.** A URL da área pública é `/{slug da central}/{slug do encontro}`, servida com SSR para indexação da agenda (§8), e o `id` do encontro **não aparece nela** nem em lugar nenhum da área pública: uuid não indexa, não se dita por telefone e não cabe num cartaz.

O slug é sugerido na criação a partir do `numero` e do `titulo` — `2o-encontro-homens-de-fe-cascavel-pr` —, editável enquanto o encontro é `rascunho` e **imutável a partir de `publicado`**. O motivo é o mesmo da RN-020: a partir da publicação o link está circulando em grupo de mensagem, e trocar o endereço de uma agenda que está sendo compartilhada perde exatamente a inscrição que a divulgação trouxe. Editar o `titulo` depois de publicado não mexe no slug, e a divergência entre os dois é esperada, não erro.

É único **dentro da central**, como `numero` (RN-020) e pela mesma razão: duas centrais da mesma denominação nomeiam seus encontros sem saber uma da outra, e o slug da central (RN-009) já separa as duas na URL.

Encontro `cancelado` ou `encerrado` **mantém** o slug e a URL, que responde dizendo o que aconteceu — inclusive com o `motivo_cancelamento` (RN-061). `404` num link que circulou é a pessoa achando que errou o endereço e ligando para a coordenação.

**RN-025** — **Quem coordena o encontro.** `coordenador_inscricao_id` aponta para a inscrição de **servo** daquele encontro cuja pessoa exerce o papel de coordenador do encontro (§3). É a mesma forma da RN-046 na área de servição, e pela mesma razão: papel de encontro é derivado de um ponteiro único, não de um campo marcável em dois lugares que podem divergir. É este ponteiro que torna executável o terceiro papel de §3 — sem ele, "coordenador do encontro" era um ator do documento que nada no cadastro sabia identificar, e a RN-035 e a RN-036 exigem esse papel como mínimo.

- **Quem aponta**: admin da central.
- **Quando**: não é condição para criar nem para publicar o encontro. No `rascunho` e no começo da divulgação ainda não há servo confirmado para apontar, e exigir o ponteiro ali travaria a publicação da agenda por um papel que só existe depois. Enquanto ele está vazio, quem responde pelo encontro é o **admin da central**, que já tem tudo o que o coordenador tem (§3).
- **Se a inscrição apontada é cancelada** (RN-030), o ponteiro é limpo no mesmo ato e o encontro volta a não ter coordenador, com alerta no painel do encontro (RN-115). Apontar para inscrição cancelada é manter poder de coordenação nas mãos de quem saiu. Vale igual para os dois ponteiros da área (RN-046), que a RN-046 não dizia.
- **O que o ponteiro concede** é o papel de §3 dentro **daquele** encontro, e nada fora dele. Quem entra no sistema é a conta de §4.15; o ponteiro é o que a transforma em coordenador ali (RN-017).

### 4.5 Inscrição
`id`, `inquilino_id`, `central_id`, `encontro_id`, `pessoa_id`, `tipo` (`participante` | `servo`), `situacao`, `convidador_pessoa_id`, `convidador_nome`, `grupo_id`, `area_servicao_id`, `funcao` (`coordenador` | `vice_coordenador` | `membro`, derivada — RN-046), `valor_devido`, `taxa_plataforma_repassada`, `taxa_plataforma_percentual`, `reembolso_faixas`, `data_inscricao`, `posicao_espera`, `espera_promovida_em`, `espera_expira_em`, `data_checkin`, `token_consulta`

`taxa_plataforma_repassada` e `taxa_plataforma_percentual` são a **âncora do preço**, congelada junto com `valor_devido` no ato da criação (RN-038, RN-096): guardam se o inquilino repassava a taxa da plataforma ao inscrito e qual era o percentual naquele instante. A cobrança lê os dois **daqui**, e não do inquilino (RN-043) — inclusive a cobrança emitida semanas depois, na promoção da lista de espera (RN-033) ou no restabelecimento do recebimento (RN-098). Sem eles a âncora seria a criação da cobrança, e ligar o repasse ou reajustar o percentual no meio da espera mudaria retroativamente o preço de quem já se inscreveu — exatamente o que a RN-038 impede do outro lado da conta. Como `valor_devido`, os dois só mudam por ato explícito da coordenação, com motivo e auditoria (RNF-005).

`reembolso_faixas` é a terceira coisa congelada no mesmo ato: a cópia da política de reembolso da central (RN-065), de onde a RN-060 lê as faixas na hora do cancelamento. Pelo mesmo motivo dos outros dois — o que a pessoa recebe de volta é uma das condições que ela leu antes de pagar.

Os três campos de fila só existem para quem passou por `lista_espera` — quem nunca passou tem os três vazios a vida inteira —, mas **não** são preenchidos e limpos juntos. Cada um tem seu tempo de vida, e é onde se erra:

| Campo | O que é | Quando é gravado | Enquanto vale | Quando é limpo |
|---|---|---|---|---|
| `posicao_espera` | **Chave de ordenação** da fila dentro do par (`encontro_id`, `tipo`) — não é registro de chegada: quem perde o prazo do promovido volta ao fim e recebe posição nova (RN-033) | na entrada na fila, e de novo a cada retorno ao fim da fila | enquanto a inscrição está em `lista_espera`, e só | na promoção (automática ou manual) e no cancelamento |
| `espera_promovida_em` | instante da promoção que tirou a inscrição da fila (RN-033, RN-036) | no ato da promoção, sobrescrito a cada nova promoção da mesma inscrição | **permanece** depois da promoção, inclusive em `confirmada` — é o registro de que aquela vaga veio da fila | não é limpo, nem no retorno à fila; é sobrescrito pela promoção seguinte |
| `espera_expira_em` | fim do prazo do promovido para pagar (RN-033) | no mesmo ato de `espera_promovida_em`, com o prazo da faixa | **permanece preenchido durante toda a `pendente_pagamento`** — é ele que o prazo consulta, e limpá-lo na promoção apagaria justamente o dado que a RN-033 acabou de gravar | não é limpo; deixa de ser lido quando a inscrição sai de `pendente_pagamento`, e é sobrescrito na promoção seguinte |

A consequência prática de `posicao_espera` ser chave de ordenação, e não histórico: ela é **reatribuída**, e por isso não serve para responder "há quanto tempo essa pessoa espera" — isso sai de `data_inscricao` e da auditoria (RNF-005).

**RN-030** — **Situações da inscrição, e as únicas transições que existem.** `pendente_pagamento`, `confirmada` e `presente` são as situações que **ocupam vaga** (RN-033). `lista_espera` é situação de **entrada**, não desvio: quem chega sem vaga entra por ela. `cancelada` e `ausente` são terminais; `presente` só é deixada pela cascata do cancelamento do encontro (RN-061).

| De | Para | Gatilho | Quem executa |
|---|---|---|---|
| — (criação) | `pendente_pagamento` | inscrição pelo site, com aceitação de inscrição nova (RN-023) e vaga do tipo disponível | inscrito no site |
| — (criação) | `lista_espera` | inscrição pelo site, com aceitação de inscrição nova (RN-023) e as vagas do tipo esgotadas (RN-033) | inscrito no site |
| — (criação) | `pendente_pagamento` | criação administrativa, **dispensada da janela** (RN-035), com vaga disponível ou dentro da regra de excedente da RN-036 | coordenador do encontro; admin da central quando passa do limite de vagas (RN-036) |
| — (criação) | `lista_espera` | criação administrativa com as vagas esgotadas e a janela ainda aberta (RN-035) | coordenador do encontro |
| `lista_espera` | `pendente_pagamento` | vaga liberada: promoção do primeiro da fila (RN-033) | sistema |
| `lista_espera` | `pendente_pagamento` | promoção manual fora de ordem, **dentro** do limite de vagas (RN-036) | coordenador do encontro |
| `lista_espera` | `pendente_pagamento` | promoção manual **acima** do limite de vagas (RN-036) | admin da central |
| `lista_espera` | `cancelada` | desistência | inscrito ou coordenação |
| `lista_espera` | `cancelada` | cancelamento do encontro (RN-061) — cascata do ato do admin da central sobre o encontro (RN-021) | sistema |
| `lista_espera` | `cancelada` | encerramento do encontro com a pessoa ainda na fila (RN-033) | sistema |
| `pendente_pagamento` | `confirmada` | pagamento online aprovado, pelo webhook (RN-032, RN-051) | sistema |
| `pendente_pagamento` | `confirmada` | baixa manual de pagamento presencial (RN-032, RN-044) | secretaria, coordenação ou admin da central |
| `pendente_pagamento` | `lista_espera` | prazo de pagamento estourado: 72h da inscrição (RN-052) ou prazo do promovido (RN-033), e só antes de `inscricoes_fecham_em` | sistema |
| `pendente_pagamento` | `cancelada` | desistência | inscrito ou coordenação |
| `pendente_pagamento` | `cancelada` | cancelamento do encontro (RN-061) — cascata do ato do admin da central sobre o encontro (RN-021) | sistema |
| `confirmada` | `cancelada` | cancelamento com a política de reembolso (F3, RN-060); decisão da coordenação sobre pagamento estornado ou contestado (RN-037) | inscrito ou coordenação |
| `confirmada` | `cancelada` | cancelamento do encontro (RN-061) — cascata do ato do admin da central sobre o encontro (RN-021) | sistema |
| `confirmada` | `presente` | check-in na recepção (RN-070) — **Fase 2** | secretaria |
| `confirmada` | `ausente` | encerramento do encontro (passo 4 de F7) sem check-in registrado — **Fase 2** | sistema |
| `presente` | `cancelada` | cancelamento do encontro já `em_andamento` (RN-061) — cascata do ato do admin da central (RN-021) — **Fase 2** | sistema |

Fora dessa tabela não há transição. Quatro consequências que precisam ficar ditas, porque é onde se erra:

- **A cascata do cancelamento do encontro é ato do sistema, não da coordenação.** Ela tem linhas próprias na tabela porque o executor é outro: o ato humano é o do admin da central **sobre o encontro** (RN-021), e o que toca cada inscrição é o sistema, num único ato (RN-061). Registrar coordenação como autora de centenas de cancelamentos em massa suja a auditoria (RNF-005) e faz a guarda de transição recusar a cascata ou obrigá-la a se passar por gente.
- **`confirmada` → `pendente_pagamento` não existe.** A vaga já foi comunicada como garantida, e voltar em silêncio para "pendente" confunde o inscrito e a secretaria em igual medida. Pagamento que volta atrás depois da confirmação é tratado pela RN-037, que não mexe na situação.
- **De `cancelada` não se sai.** Quem desistiu e mudou de ideia faz inscrição nova, que disputa vaga como qualquer outra — RN-031 permite, porque inscrição cancelada não conta como ativa.
- **`presente` e `ausente` são da Fase 2**, junto com o check-in (F6, §10), e `presente → cancelada` também. Na Fase 1 a situação final de uma inscrição viva é `confirmada`, e nada no sistema atribui `ausente`. As três aparecem aqui porque a tabela é a lista fechada de transições do produto, não a da fase.

**RN-031** — Uma pessoa tem no máximo uma inscrição ativa (não cancelada) por encontro.
**RN-032** — A inscrição passa a `confirmada` automaticamente quando o pagamento online é aprovado (RN-051) ou quando a cobrança presencial recebe baixa manual (RN-044).

**RN-033** — **Vaga: o que ocupa, quem entra na fila, e em quanto tempo o promovido paga.**

*Ocupação.* Contam contra `vagas_participantes` e `vagas_servos` — contadas separadamente, porque participante e servo têm vagas e filas independentes — as inscrições em `pendente_pagamento`, `confirmada` e `presente`. **Não** contam `lista_espera`, `cancelada` e `ausente`. Que `pendente_pagamento` ocupe vaga é a decisão que sustenta todo o resto: é ela que dá sentido ao prazo de pagamento (RN-052). Se ficha preenchida e nunca paga não tirasse a vaga de ninguém, não haveria o que expirar, e a única forma de saber quantos lugares sobraram seria contar quem pagou — o que descobre o excesso na recepção da sexta à noite. Ocupando, toda vaga presa tem relógio correndo.

*Entrada na fila.* Esgotadas as vagas do tipo, a inscrição é aceita mesmo assim, como `lista_espera`, com posição de chegada, e **nenhuma cobrança é gerada** — não se cobra por vaga que não existe. `valor_devido` é registrado assim mesmo, e congelado ali (RN-038).

*Promoção.* Ao vagar uma posição, o primeiro da fila daquele tipo passa a `pendente_pagamento`, **uma promoção por vaga liberada**, no mesmo ato que liberou a vaga — deixar para uma rotina posterior mantém a vaga vazia por minutos e deixa inscrição nova entrar na frente de quem esperou duas semanas. A coordenação pode promover fora dessa ordem (RN-036). Passado o carimbo `inscricoes_fecham_em`, não há promoção automática nenhuma (RN-023) — o que a suspende é o carimbo, e não o predicado de aceitação de inscrição nova: inquilino `suspenso` não congela fila (RN-007).

*Prazo do promovido.* O promovido é avisado e tem prazo para pagar, gravado em `espera_expira_em`. O prazo **encurta conforme o encontro se aproxima**: perto da data não sobra tempo para ciclo de três dias, e a vaga precisa girar. Seja `dias_ate_o_encontro` a diferença entre `data_inicio` do encontro e o momento da promoção, em dias corridos inteiros arredondados para baixo, no fuso `America/Sao_Paulo`:

| Condição | Prazo para pagar |
|---|---|
| `dias_ate_o_encontro > 7` | 48h |
| `2 <= dias_ate_o_encontro <= 7` | 24h |
| `dias_ate_o_encontro < 2` | 6h |

Como em RN-060, as três faixas cobrem toda a reta e não se sobrepõem: 7 dias exatos dão 24h, 2 dias exatos dão 24h, 1 dia dá 6h. O aviso nunca comunica o prazo em contagem relativa ("você tem 48 horas"): traz **data e hora**, no fuso de Brasília, porque a mensagem costuma ser lida no dia seguinte.

*Fim da fila.* Fechadas as inscrições (RN-023), quem ficou em `lista_espera` é avisado de que não foi possível acomodá-lo, com convite para o próximo encontro da central (§7) — sem esse aviso a pessoa espera indefinidamente e vai atrás pelo WhatsApp da coordenação. A inscrição **continua** em `lista_espera`, e não em `cancelada`: enquanto o encontro não começa, a coordenação ainda pode chamá-la para uma vaga que vagar (RN-036). Encerrado o encontro, quem sobrou na fila é encerrado como `cancelada` pelo sistema — fila não fica aberta depois do encontro que ela esperava.

*Prazo estourado.* Quem foi promovido e não pagou volta ao **fim** da fila, não à posição que tinha — manter a posição original permitiria soltar e retomar a vaga indefinidamente sem nunca pagar. `posicao_espera` é reatribuída no retorno (§4.5), e a vaga passa ao próximo no mesmo ato. Quem perdeu um prazo continua na fila e pode ser promovido de novo.

O **histórico de promoções perdidas** que a coordenação vê antes de ligar pela terceira vez sai da **auditoria** (RNF-005), não de campo nem de contador na inscrição: cada promoção e cada estouro é evento auditado da inscrição, com quem, quando e o prazo que valia. Contador denormalizado aqui teria a mesma sorte do contador de vagas — dessincroniza e ninguém percebe.

O prazo do promovido **substitui** as 72h da RN-052 enquanto está correndo, e obedece ao mesmo limite: passado o carimbo `inscricoes_fecham_em`, nada expira sozinho (RN-052). O prazo continua sendo gravado e comunicado depois do fechamento — inclusive na promoção manual da RN-036 —, mas o seu estouro deixa de devolver alguém à fila por conta própria: vira pendência para a coordenação decidir (RN-036).

**RN-034** — `grupo_id` só se aplica a participante; `area_servicao_id` e `funcao` só a servo. `funcao` não é campo editável de forma independente: ela decorre dos ponteiros de coordenação da área (RN-046) e acompanha qualquer mudança neles.
**RN-035** — **Criação administrativa de inscrição.** A coordenação cria inscrição — de servo e de participante — sem passar pelo site público, e essa criação é **dispensada da janela de inscrição** (RN-023). É o caso mais comum da operação, e o documento não pode proibi-lo sem oferecer saída: servo confirmado desiste na semana do encontro e a coordenação chama um substituto que nunca se inscreveu, e que por isso não está na fila para ser promovido (RN-036).

O que vale no lugar da janela:

- **Até quando.** Enquanto o encontro não for `encerrado` nem `cancelado` (RN-021). Depois de `data_inicio` a inscrição criada assim já nasce para ser quitada na recepção (RN-070), porque o marco de corte do pagamento online já passou (RN-041).
- **Quem.** Papel mínimo **coordenador do encontro**. Passando do limite de vagas, vale a regra de excedente da RN-036 sem segunda redação: exige **admin da central** e gera o mesmo alerta permanente no painel do encontro.
- **Vagas.** Havendo vaga do tipo, a inscrição nasce `pendente_pagamento`. Esgotadas as vagas com a janela ainda aberta, ela entra na fila como qualquer outra (RN-033) — a coordenação não fura fila criando inscrição, fura promovendo (RN-036). Esgotadas as vagas depois do fechamento, quando não há mais fila andando, o único caminho é o excedente acima.
- **Justificativa e rastro.** Criação fora da janela exige **justificativa obrigatória** e entra na auditoria (RNF-005) com quem criou, quando e por quê — o mesmo tratamento da promoção manual, e pela mesma razão: é decisão humana que altera quem ocupa vaga.
- **Inquilino.** Inquilino `suspenso` bloqueia também este canal (RN-007). A dispensa é da janela do encontro, não da situação da denominação.

Fora da janela, este é um dos **dois** caminhos de preenchimento de vaga, ao lado da promoção manual (RN-036).

**RN-036** — **Promoção manual fora de ordem.** A coordenação pode promover da lista de espera quem não é o primeiro da fila, com **justificativa obrigatória**, registrada em auditoria (RNF-005) junto com quem promoveu e quem foi passado para trás. A necessidade é real e recorrente: casal que se inscreveu junto e não entra separado, parente de servo já confirmado, pessoa que a coordenação convidou pessoalmente. Regra sem essa saída não é obedecida — é contornada no banco, e aí não sobra controle nenhum nem rastro de quem decidiu. Papel mínimo: coordenador do encontro.

Promover **acima** do limite de vagas não é bloqueado, mas exige **admin da central** e gera alerta permanente no painel do encontro (RN-115): a capacidade real de um sítio quase sempre tem folga que o número cadastrado não reflete, e quem assume o excedente tem que ser quem responde pelo encontro. É esta mesma regra de excedente que a criação administrativa reaproveita (RN-035), em vez de ter uma segunda.

Depois de `inscricoes_fecham_em`, a promoção manual é o caminho de preenchimento de vaga **para quem está na fila**; quem não está entra pela criação administrativa (RN-035). Os dois caminhos existem porque o substituto de última hora quase nunca é alguém que se inscreveu e esperou.

**Prazo do promovido depois do fechamento.** Vale o mesmo prazo da RN-033 — 48h, 24h ou 6h conforme a proximidade do encontro —, gravado em `espera_expira_em` e comunicado em data e hora, e **truncado pelo marco de corte do pagamento online** (RN-041): prazo que passasse de `data_inicio` prometeria um pagamento online que já não existe. O que muda é o desfecho do estouro, e é aqui que a RN-052 e esta regra se encontram: **depois do fechamento nada expira sozinho**, então o prazo estourado **não** devolve o promovido à fila e **não** passa a vaga ao próximo. Ele vira **pendência de vaga** no painel do encontro (RN-115), com pessoa, valor e a hora em que o prazo venceu, e a coordenação escolhe:

- **manter a vaga** — a pessoa confirmou por telefone que vem e paga na recepção, com `dinheiro` ou `pix_presencial` (RN-040, RN-070). A inscrição segue `pendente_pagamento` e desemboca no caminho normal da inscrição não paga;
- **cancelar** (RN-030) e chamar outra pessoa, por nova promoção manual ou por criação administrativa (RN-035).

A decisão é humana pelo mesmo motivo que a da RN-037: na semana do encontro, derrubar sozinho quem já pediu folga no trabalho produz o dano que não se conserta na véspera, e nessa altura não há fila andando a quem a vaga fosse passar automaticamente.

**RN-037** — **Pagamento estornado ou contestado depois da confirmação.** Estorno — total ou parcial — que a plataforma não originou, e contestação de cartão (*chargeback*), **não mudam a situação da inscrição sozinhos**. A inscrição continua `confirmada`, mantém a vaga, e passa a exibir **pendência financeira** para a coordenação, que decide, dentro do prazo do encontro, entre duas saídas: cobrar de novo — nova cobrança online, ou recebimento presencial com baixa manual (RN-044) — ou cancelar (RN-030, `confirmada` → `cancelada`).

A decisão é humana, e não automática, por três motivos. Contestação chega dias depois do pagamento e às vezes é revertida. Estorno feito por engano na conta do gateway não é desistência de ninguém. E derrubar sozinho quem já pediu folga no trabalho e organizou a viagem produz exatamente o dano que não se conserta na véspera. Segurar a vaga presa enquanto isso também é decisão consciente: enquanto a pendência não é resolvida, aquela vaga não é oferecida à fila.

A pendência é **derivada** do estado da cobrança — estornada, estornada em parte, ou com contestação `aberta` **ou** `perdida` (RN-064) — com a inscrição ainda `confirmada` (§4.6). **Só a reversão da contestação fecha a pendência sozinha**; contestação perdida a mantém aberta, porque é o desfecho em que o dinheiro definitivamente não volta. Não existe indicador booleano paralelo na inscrição, que só criaria dois estados capazes de divergir. Pendência não resolvida até o dia do encontro cai no caminho da inscrição não paga: a secretaria recebe no ato e dá baixa antes de liberar o check-in (RN-070).

**Estorno total.** Cancelar não gera novo reembolso, porque o dinheiro já voltou inteiro.

**Estorno parcial.** É caso distinto, e tratá-lo junto com o total tira dinheiro de quem não desistiu: a pessoa pagou R$ 350,00, o gateway devolveu R$ 100,00 por engano, e ela continua com R$ 250,00 na conta da central. O que fica decidido:

- enquanto a pendência não é resolvida, a inscrição segue `confirmada` e a pendência exibe o **saldo não estornado** e o valor que voltou, separados — a coordenação precisa dos dois números para ligar para o gateway;
- **cobrar de novo** cobra a diferença, não o valor cheio: nova cobrança de R$ 100,00, pelo valor que falta para o `valor_devido` congelado (RN-038). A `taxa_plataforma` dessa segunda cobrança sai do percentual congelado aplicado sobre **essa diferença**, não sobre o `valor_devido` inteiro (RN-043, RN-096): sem repasse ela é retida de dentro dos R$ 100,00; com repasse ela é somada por fora, e o inscrito paga R$ 102,50 — nunca R$ 108,75, que cobraria a taxa cheia duas vezes na mesma inscrição;
- **cancelar** trata o saldo não estornado como valor efetivamente pago: as faixas da **RN-060 incidem sobre ele**, e o que a faixa mandar devolver é devolvido. Cancelamento a 20 dias do encontro devolve os R$ 250,00; a 10 dias, R$ 125,00. O estorno que o gateway já fez não conta como devolução da central e não abate o que ela deve — foi dinheiro que voltou por engano dela, não por política de reembolso;
- cancelamento por **cancelamento do encontro** (RN-061) devolve 100% do saldo, sem faixa, como para todo mundo.

**Contestação perdida.** Perdida a disputa, o emissor fica com o dinheiro e a pendência **continua aberta** — agora sem chance nenhuma de se fechar sozinha. É o desfecho em que o dinheiro definitivamente não volta, e é justamente por isso que ele não pode sumir da lista: fechar a pendência em `perdida` deixaria uma inscrição `confirmada` ocupando vaga que a RN-064 proíbe de oferecer à fila, sem ninguém para decidir entre cobrar de novo e cancelar, e sem o crachá retido na recepção (RN-070) — o caso em que a central perdeu o dinheiro seria o único a desaparecer do painel. A vaga segue presa, o caso segue no painel do encontro (RN-115) e no relatório de pendências (RN-087), identificado como **contestação perdida** e distinto da que ainda está em disputa, e a coordenação decide dentro do prazo do encontro pelas mesmas duas saídas de sempre.

**Contestação revertida.** Contestação chega dias depois e às vezes é derrubada, e aí o dinheiro volta para a conta da central. O desfecho depende do que a coordenação já tinha feito:

- **ainda não decidiu** — a pendência se fecha sozinha, a inscrição segue `confirmada` e nada mais acontece. É o caso que justifica a decisão ser humana;
- **já cancelou** — de `cancelada` não se sai (RN-030), e a inscrição fica onde está. O dinheiro que voltou passa a ser valor efetivamente pago de uma inscrição cancelada: a devolução segue a **RN-060** com a antecedência do **pedido de cancelamento original**, não a da reversão, e o que for devido entra na lista de devoluções pendentes até zerar (§4.6, §6);
- **já cobrou de novo e a segunda cobrança foi paga** — há **pagamento em duplicidade**, tratado abaixo.

**Segundo pagamento para a mesma inscrição.** Acontece por dois caminhos: contestação revertida depois de a coordenação recobrar, e o inscrito que paga o Pix regerado e também na recepção. Em qualquer um deles a inscrição fica `confirmada` **sem pendência**, e o excedente sobre o `valor_devido` é devolvido **integralmente** ao inscrito — RN-060 não incide, porque não houve desistência de ninguém: é erro de cobrança, não cancelamento. A devolução entra na mesma lista de pendências de devolução (§4.6), com pessoa e valor, até zerar, e sai pelo caminho do dinheiro que entrou: estorno no gateway quando foi pagamento online, devolução registrada pela central quando foi presencial (RN-061).

**RN-038** — **`valor_devido` é congelado na inscrição.** Na criação, `valor_devido` recebe uma **cópia** de `taxa_participante` ou `taxa_servo` do encontro, conforme o `tipo`, e nunca mais é relido de lá — nem na promoção da lista de espera, nem na criação da cobrança, nem na regeração de um Pix (RN-041). Reajuste de taxa vale para inscrição nova; quem já se inscreveu mantém o valor com que se inscreveu, e quem esperou três semanas na fila também. Sem a cópia, um reajuste altera retroativamente a dívida de todo mundo que ainda não pagou, inclusive de quem está com um QR code aberto de outro valor.

Alterar o `valor_devido` de uma inscrição específica continua possível — bolsa, correção de tipo, acerto combinado —, mas só por ato explícito da coordenação, com motivo e auditoria (RNF-005), e nunca como efeito colateral de uma mudança na configuração do encontro. É o mesmo princípio que congela a taxa da plataforma na cobrança (RN-043).

**RN-039** — **Convidador: dois campos, e qual deles manda.** O glossário admite convidador que não é servo nem participante do encontro, e boa parte deles não está no cadastro do inquilino: o tio que trouxe o sobrinho, o colega de trabalho que não vem. §4.5 tinha só `convidador_pessoa_id`, e a ficha de F1 pergunta "quem o convidou" — a pergunta existia e a resposta não tinha onde caber. A inscrição guarda os dois lados:

- `convidador_pessoa_id` — quando o convidador **é** uma pessoa do inquilino (§4.3). É o único que a RN-045 lê.
- `convidador_nome` — texto livre, o que a pessoa escreveu na ficha. É **sempre** gravado, inclusive quando o ponteiro está preenchido: é o que ela digitou, e é o que a secretaria compara quando a ligação chega perguntando por que fulano ficou em outro grupo.

**A ficha pública não vincula sozinha.** O site **não** procura o nome digitado no cadastro e **não** oferece lista de nomes para escolher: seria autopreencher com dado de terceiro para um visitante anônimo, e a lista de nomes de uma denominação não é coisa que se ofereça na área pública — é a mesma preocupação da RN-094a, um nível acima. Quem vincula é a coordenação, na área administrativa, ligando o nome livre a uma pessoa quando reconhece de quem se trata. O vínculo é editável e auditado (RNF-005).

**O que a RN-045 faz com nome livre: nada.** A distribuição de grupos agrupa por `convidador_pessoa_id` e por mais nada. Texto livre não é chave — "João", "joao silva" e "Jôao" seriam três convidadores diferentes, e agrupar por eles espalharia mal e ainda daria a impressão de que o critério funcionou. Vinculada a uma pessoa, a inscrição passa a contar no critério; não vinculada, o critério simplesmente não se aplica a ela, como já acontece com `nucleo_familiar_id` vazio (§4.3).

Preencher `convidador_nome` **não** cria pessoa, não cria identidade e não convida ninguém para nada.

**Nomes.** `01-modelo-de-dados.md` já carrega este campo, com outro nome e outra invariante: `convidador_nome_livre`, com a constraint `inscricao_convidador_exclusivo`, que proíbe os dois campos preenchidos ao mesmo tempo. É o oposto do que esta regra decide — `convidador_nome` é **sempre** gravado, inclusive com o ponteiro preenchido. Quem manda é este documento (§0.2): na passada de §12 o modelo renomeia `convidador_nome_livre` para `convidador_nome` e **remove** a constraint `inscricao_convidador_exclusivo`, que passa a permitir os dois campos coexistindo preenchidos.

### 4.6 Cobrança
`id`, `inquilino_id`, `central_id`, `inscricao_id`, `gateway_id`, `metodo` (`pix` | `cartao_credito` | `dinheiro` | `pix_presencial`), `parcelas`, `valor`, `taxa_plataforma`, `situacao`, `qr_code_pix`, `link_pagamento`, `expira_em`, `pago_em`, `payload_gateway`, `baixa_manual_por`, `baixa_manual_em`, `baixa_manual_observacao`, `estorno_situacao`, `estorno_valor`, `estorno_atualizado_em`, `estorno_tarifa_gateway`, `taxa_estornada`, `contestacao_situacao`, `contestacao_valor`, `contestacao_atualizada_em`, `devolucao_presencial_por`, `devolucao_presencial_em`, `devolucao_presencial_valor`, `devolucao_presencial_observacao`

`estorno_situacao` (`nao_solicitado` | `solicitado` | `indeterminado` | `concluido` | `recusado`) e `estorno_valor` registram o que a plataforma pediu ao gateway e o que voltou. `indeterminado` é o pedido cujo **resultado a plataforma não conhece** — timeout, `5xx`, ou conexão de recebimento indisponível que impediu a chamada de sair (RN-062, RN-098) —, e existe porque nenhum dos outros quatro seria verdade ali: `recusado` afirmaria uma decisão que o gateway pode nem ter tomado, e `nao_solicitado` deixaria a inscrição `confirmada` ocupando vaga sem pendência nenhuma.

`estorno_tarifa_gateway` guarda o custo de meio de pagamento que fica com a central — a tarifa retida na transação original que **não** volta com o estorno (RN-060) e a tarifa de contestação (RN-064) —, gravado no ato, com o valor apurado no gateway. `taxa_estornada` guarda o outro lado da mesma conta: a **taxa da plataforma que voltou**, na proporção do dinheiro que saiu da conta da central (RN-097), e é o número que a apuração da RN-102 subtrai. Os dois nunca se somam nem se substituem — `estorno_tarifa_gateway` é custo que a central absorve, `taxa_estornada` é remuneração que o operador devolve. Os quatro campos de `devolucao_presencial_*` são o espelho da baixa manual para o dinheiro que a central devolve fora da plataforma (RN-061), com os mesmos papéis da RN-044.

`contestacao_situacao` (`nenhuma` | `aberta` | `perdida` | `revertida`), `contestacao_valor` e `contestacao_atualizada_em` registram a **contestação de cartão**, que não cabe nos campos de estorno acima e por isso tem os seus (RN-064): aqueles registram o que a plataforma **pediu** ao gateway, e a contestação chega pronta, do emissor, sem que ninguém aqui a tenha pedido. A separação não é organização de campo — é o que permite à RN-037 fechar a pendência sozinha quando a reversão chega. Marcar contestação como `estorno_situacao = concluido` apagaria exatamente a informação de que aquilo pode voltar atrás.

**Estorno e contestação são sequências, não eventos únicos.** A mesma cobrança comporta mais de um estorno — o parcial feito por engano e, depois, o do cancelamento sobre o saldo (RN-037); o pedido recusado e repetido depois de recomposto o saldo (RN-062) — e comporta contestação seguida de estorno, com dois custos de gateway na mesma cobrança (RN-064). O que fica decidido:

- **`estorno_valor`, `estorno_tarifa_gateway` e `taxa_estornada` são acumuladores** da vida inteira da cobrança: cada estorno concluído e cada contestação **soma** neles, e nenhum é sobrescrito. `estorno_valor` nunca passa do `valor` da cobrança, e o saldo não estornado de que fala a RN-037 é `valor` − `estorno_valor` − `contestacao_valor`. O único evento que **subtrai** é a reversão de uma contestação (RN-097), em que o dinheiro volta para a conta da central e a taxa da plataforma volta a ser devida.
- **`estorno_situacao` e `estorno_atualizado_em` são do último pedido**, não da soma — é o pedido em curso que a coordenação precisa ver, e é dele que as pendências derivam. Pedido novo só é aceito quando não há outro em `solicitado` nem em `indeterminado`: pedir por cima de um pedido em trânsito devolve o dinheiro duas vezes e ainda esconde a pendência anterior, que é como um caso pendente sumia da lista.
- **As pendências derivadas leem o último pedido; a de devolução lê o acumulado.** Estorno recusado, indeterminado e sem confirmação olham `estorno_situacao`. A devolução pendente é a única que olha valor: ela só zera quando o que a central deve àquela pessoa chega a zero, de modo que dois estornos parciais que somam o devido a fecham e um sozinho não fecha.
- **O lançamento automático de `meio de pagamento` (§4.11) é um por cobrança, pelo acumulado.** A Fase 3 varre `estorno_tarifa_gateway` e lança o total que a central absorveu naquela cobrança — MDR não devolvido e tarifa de contestação juntos —, e não um lançamento por evento. Dois custos, um lançamento, pelo número que saiu do extrato do gateway.

Os `contestacao_*` **não** acumulam: a contestação é uma disputa por cobrança, `contestacao_valor` é o que o emissor reclamou e `contestacao_situacao` é onde a disputa está.

**Nomes.** `01-modelo-de-dados.md` já carrega dois destes acumuladores com outro nome — `valor_estornado` e `estornado_em` — e carrega `taxa_estornada` com exatamente o sentido acima. Quem manda é este documento (§0.2): na passada de §12 o modelo renomeia `valor_estornado` para `estorno_valor` e `estornado_em` para `estorno_atualizado_em`, mantém `taxa_estornada` como está, e ganha `estorno_situacao`, `estorno_tarifa_gateway` e os `contestacao_*`, que não têm contrapartida lá.

**`situacao` da cobrança, e o que significa `pendente_emissao`.** A cobrança nasce em `pendente_emissao` quando a inscrição foi aceita mas a plataforma não conseguiu criá-la no gateway por indisponibilidade de recebimento (RN-098). É **situação própria**, com linha no banco desde o primeiro instante, e não a ausência de cobrança: derivar a condição de "inscrição `pendente_pagamento` sem cobrança" não distingue a vaga reservada por falha nossa de um Pix que expirou — e é exatamente essa distinção que decide se o relógio da RN-052 corre. Ela conta como cobrança **viva** para efeito da unicidade (a inscrição não tem duas), não tem `gateway_id`, `qr_code_pix`, `link_pagamento` nem `expira_em`, e guarda desde já o `metodo` escolhido na ficha, que é o método com que será emitida quando a conexão voltar (RN-098). É dela que leem a terceira exceção da RN-052, o item de vaga reservada no painel do encontro (RN-115) e a quinta pendência da tabela abaixo.

`estorno_tarifa_gateway` é o que a Fase 1 grava de um custo que só vira lançamento na Fase 3: a despesa da categoria `meio de pagamento` (§4.11) **sai deste campo**, não de um valor digitado depois. É o mesmo princípio dos parágrafos abaixo — o número mora num lugar só, e a prestação de contas o lê de lá.

**`valor` e `valor_devido` não são o mesmo número.** `valor_devido` é da inscrição (§4.5) e guarda a taxa do encontro congelada (RN-038); `valor` é da cobrança e guarda o total efetivamente cobrado, que é o `valor_devido` **mais** a taxa da plataforma quando o inquilino opta por repassá-la (RN-096). Sem repasse os dois coincidem, e é por isso que a distinção passa despercebida até o dia em que alguém liga o repasse e a dívida de todo mundo parece ter mudado. O juro do parcelamento não está em nenhum dos dois (RN-101): não é arrecadado pela central e não é receita de ninguém aqui dentro.

**As pendências financeiras são derivadas destes campos, não campos próprios** — o mesmo princípio da RN-037 e da RN-046: dois estados capazes de divergir não existem. São cinco, todas da Fase 1 porque F3 é da Fase 1 (§10), e todas aparecem no relatório de pendências financeiras do encontro (§6):

| Pendência | De onde é derivada | Onde é vista |
|---|---|---|
| **Pendência financeira** da inscrição (RN-037) | cobrança com estorno total, estorno parcial, ou `contestacao_situacao` em `aberta` **ou** `perdida` (RN-064), com a inscrição ainda `confirmada`. `revertida` é o único desfecho que fecha a pendência sozinho (RN-037); `perdida` a mantém aberta até a coordenação resolver | painel do encontro (RN-115), notificação à coordenação (§7) e RN-070 na recepção — a tela distingue **contestação em disputa** de **contestação perdida** (§6) |
| **Devolução pendente** (RN-061, RN-037) | dinheiro devido ao inscrito e ainda não devolvido: cobrança presencial (`dinheiro`, `pix_presencial`) `paga` de inscrição `cancelada` sem `devolucao_presencial_em` que cubra o valor, e também o saldo de contestação revertida e o excedente de segundo pagamento (RN-037) | lista do que falta devolver, com nome e valor, até zerar |
| **Estorno recusado ou sem resultado conhecido** (RN-061, RN-062, RN-037) | cobrança com `estorno_situacao` em `recusado` **ou** `indeterminado` | pendência com pessoa, valor e qual dos dois casos é — recusa é decisão do gateway, `indeterminado` é resposta que não chegou —, e notificação à coordenação (§7) |
| **Estorno sem confirmação** (RN-063) | cobrança com `estorno_situacao = solicitado` há mais de 7 dias | pendência com pessoa, valor e a data do pedido |
| **Cobrança pendente de emissão** (RN-098) | cobrança em `pendente_emissao`, com a inscrição ocupando vaga em `pendente_pagamento` | item de vaga reservada no painel do encontro (RN-115), com pessoa e desde quando, e linha no relatório (§6); o inscrito é notificado quando o link sai (§7) |

Nenhuma das cinco é situação da inscrição: a inscrição fica onde a RN-030 a deixou, e a pendência vive na cobrança.

**RN-040** — Métodos aceitos, em dois grupos:
- **Online, pelo gateway** — `pix` à vista e `cartao_credito` em até 12x, com parcela mínima e número máximo de parcelas configuráveis por central (RN-040a). Confirmação por webhook (RN-051). O juro do parcelamento é do comprador e a tarifa do gateway é da central, em qualquer dos dois métodos (RN-101).
- **Presencial, na secretaria** — `dinheiro` e `pix_presencial` (Pix direto na chave da central, fora da plataforma), exigidos pelo check-in de inscrição não paga (RN-070). Não têm `gateway_id`, `qr_code_pix`, `link_pagamento` nem `expira_em`, não passam pelo split (§8.3) e só são quitados por baixa manual (RN-044).

**RN-040a** — **Limites do parcelamento, por central.** `parcela_minima` (padrão R$ 50,00) e `max_parcelas` (padrão 12, teto 12) são campos da central (§4.1), herdados do inquilino por cópia (RN-103). O número de parcelas que a tela oferece numa cobrança é `min(max_parcelas, floor(valor / parcela_minima))`, nunca menos que 1 — oferecer uma lista de parcelas que a própria configuração da central proíbe é combinar com o inscrito um pagamento que o gateway vai recusar.

Os dois são lidos **no ato da criação da cobrança**, e não congelados na inscrição. É a diferença que os separa de `valor_devido` (RN-038) e das faixas de reembolso (RN-065): aqueles decidem quanto a pessoa deve e quanto ela recebe de volta, e por isso não podem mudar debaixo dela; estes decidem só em quantas vezes ela pode dividir, e a escolha é feita ali, na tela, com a configuração que existe naquele instante. Baixar `max_parcelas` não altera cobrança já criada nem parcelamento já contratado — o compromisso está com o emissor do cartão, não conosco.

O juro continua sendo do comprador e o valor de cada parcela continua vindo do gateway, nunca de cálculo local (RN-101).

**RN-041** — **Validade e regeração do Pix, e até quando se paga online.**

**Marco de corte do pagamento online.** O pagamento online de um encontro se encerra em `data_inicio`, no fuso `America/Sao_Paulo` — a hora da recepção, de onde em diante quem recebe é a secretaria, com `dinheiro` ou `pix_presencial` (RN-040, RN-070). O marco é **do encontro, não da janela de inscrição**: não é `inscricoes_fecham_em` e não se move com ele. Fechar a janela encerra o autoatendimento de **entrada** (RN-023); quem já ocupa vaga (RN-033) continua tendo o que pagar, e portanto como pagar. Amarrar as duas coisas ao mesmo carimbo criava dois buracos — o promovido manualmente depois do fechamento (RN-036) recebia cobrança nascida vencida, e quem se inscrevia nas últimas horas da janela, que é o pico real de inscrição, recebia um QR code que morria antes de ser aberto.

**Validade do Pix.** A cobrança Pix expira em **24h**, e nunca depois do marco de corte: `expira_em = min(criada_em + 24h, data_inicio)`. Depois do marco não se cria cobrança online nenhuma. O truncamento por `inscricoes_fecham_em` que esta regra trazia sai da fórmula: ele só descreveria cobrança criada com a janela aberta, e mesmo ali não é necessário — toda cobrança pertence a inscrição que **já ocupa vaga**, porque `lista_espera` não gera cobrança (RN-033), e o fechamento da janela não tira a vaga de ninguém.

**Cartão segue o mesmo limite.** Checkout de `cartao_credito` obedece ao mesmo marco: não é criado depois de `data_inicio`, e o link criado antes vale até lá. A exceção é o que já está em curso: pagamento autorizado ou em análise antifraude (RN-052) cuja aprovação chegue por webhook **depois** do marco é aceita e confirma a inscrição (RN-032) — o dinheiro entrou, e recusá-lo produziria pagamento sem vaga. Se a secretaria já tiver recebido presencialmente, o resultado é pagamento em duplicidade, e o excedente é devolvido pela RN-037.

Expirada, o próprio inscrito regera pelo link da inscrição, com três limites:

- **antes do marco de corte do pagamento online** — passado ele, não há regeração: a inscrição não paga chega à recepção e é resolvida lá, com `dinheiro` ou `pix_presencial` (RN-070). Note que o limite **não** é a janela de inscrição e **não** é a situação do inquilino: inquilino `suspenso` bloqueia inscrição nova (RN-007), não a quitação de vaga já ocupada;
- **enquanto a inscrição ocupar vaga** (RN-033) — quem caiu para `lista_espera` por prazo estourado (RN-052) não regera nada, porque não há vaga sua para pagar; volta a poder quando for promovido de novo;
- **no máximo 5 vezes por inscrição** — a partir daí o caminho é a secretaria, que ou recebe presencialmente (RN-040, RN-044) ou descobre por que aquele Pix nunca é pago. Regeração ilimitada é vaga presa por tempo indeterminado a custo zero.

Regerar **cancela a cobrança anterior** no mesmo ato: dois QR codes válidos ao mesmo tempo terminam com a pessoa pagando os dois. O valor da nova cobrança é o `valor_devido` congelado da inscrição (RN-038), não a taxa vigente no encontro.
**RN-042** — Nunca trafegar nem armazenar dado de cartão. O pagamento com cartão usa checkout/tokenização do gateway.
**RN-043** — Toda cobrança carrega `taxa_plataforma`, calculada no momento da criação e retida pelo split do gateway (seção 8.3). **A base é a parcela de taxa do encontro que aquela cobrança está cobrando**, com ou sem repasse: na cobrança comum, que cobra a inscrição inteira, essa parcela é o `valor_devido` congelado (RN-038) — a taxa do encontro; na cobrança de complemento que a RN-037 manda emitir depois de um estorno parcial, é a **diferença** que ainda falta para o `valor_devido`, e não o valor cheio. O percentual aplicado é o que a inscrição congelou na criação (`taxa_plataforma_percentual`, §4.5), não o vigente do inquilino no dia em que a cobrança nasce (RN-096). A base **nunca é o `valor` da cobrança**, que já contém o repasse: aplicar o percentual sobre ele seria circular onde há repasse, porque ali o `valor` **já contém** a taxa — R$ 8,75 sobre R$ 350,00 viraria R$ 8,97 sobre R$ 358,75, e o número impresso na página do encontro deixaria de ser o número cobrado. Base por cobrança, e não por inscrição, é também o que impede a taxa cheia de ser cobrada uma segunda vez quando a mesma inscrição é paga em duas cobranças (RN-037, RN-102). O valor é congelado na cobrança: mudança de percentual não altera cobrança já criada.

**RN-101** — **Quem paga o custo do meio de pagamento.** São dois custos, com donos diferentes, e nenhum dos dois se confunde com a taxa da plataforma (RN-043, RN-095), que é a remuneração do operador e tem regra própria de repasse (RN-096). O documento tratava só da taxa da plataforma; os dois custos abaixo existem em toda transação online e caíam na conta de alguém sem que nada dissesse de quem.

**Tarifa do gateway (MDR) — da central, sempre.** O percentual e o valor fixo que o gateway retém em cada transação saem do que a central recebe, e **não** são acrescentados ao que o inscrito paga — nem quando o inquilino repassa a taxa da plataforma (RN-096). É custo de vender, como aluguel de maquininha, e a central o absorve pelo mesmo motivo por que absorve a tarifa que não volta no estorno (RN-060). Repassá-lo exigiria exibir na página do encontro um preço que muda conforme o meio de pagamento escolhido, porque Pix e cartão têm tarifas diferentes e cartão parcelado tem outra: o valor da inscrição deixaria de ser um número único, divulgável em cartaz e em grupo de mensagem.

**Juro do parcelamento — do comprador, sempre.** Quem parcela paga o acréscimo; a central recebe de quem parcelou em 12x o mesmo que recebe de quem pagou à vista. A alternativa — juro do vendedor — faz o desconto crescer com o número de parcelas e produz um encontro que fecha a prestação de contas no vermelho por uma escolha que ninguém na organização tomou: quem decide parcelar é o inscrito, e essa decisão não pode sair do caixa do retiro. Com juro do comprador, o custo do parcelamento fica com quem o escolheu, e a receita do encontro é previsível no dia em que a taxa é definida.

O juro **não entra** no `valor` da cobrança nem no `valor_devido` da inscrição: ele é somado pelo emissor do cartão, não é arrecadado pela central e não é receita da plataforma. O valor de cada parcela exibido na tela vem do **gateway**, no momento da escolha, e nunca de cálculo local — taxa de parcelamento muda sem aviso, e um número calculado por nós divergiria da fatura que a pessoa vai receber. O que a tela precisa dizer, junto com as parcelas, é de onde vem o acréscimo e que ele **não volta no reembolso** (RN-060), porque nunca esteve com a central. Descobrir isso no cancelamento é a reclamação que a secretaria não tem como responder.

> Id na faixa de extensão (§0.2): o bloco RN-040–RN-044 da cobrança está esgotado, e id não se reaproveita.

**RN-044** — **Baixa manual.** Cobrança de método presencial (`dinheiro`, `pix_presencial`) não tem webhook: passa a `paga` por baixa manual, e só por ela. Quem pode dar baixa: coordenador do encontro, admin da central e servo alocado na secretaria com permissão de recepção — a mesma pessoa que registra o recebimento no ato do check-in (RN-070). A baixa grava `baixa_manual_por`, `baixa_manual_em`, o `metodo`, o `valor` recebido e `baixa_manual_observacao`, entra na auditoria (RNF-005) e confirma a inscrição pela mesma porta do pagamento online (RN-032). Na prestação de contas o valor entra como receita confirmada do método presencial correspondente (passo 3 de F7), **separado da receita do gateway**: esse dinheiro não passou pelo split, logo não teve taxa da plataforma retida na transação — como ela é apurada nesses casos é a decisão em aberto nº 8.

### 4.7 Grupo
`id`, `inquilino_id`, `central_id`, `encontro_id`, `nome`, `cor`, `servos_responsaveis[]`

**RN-045** — A distribuição automática de participantes em grupos equilibra a quantidade por grupo e, no que a lotação permitir, evita colocar no mesmo grupo:
- pessoas com o mesmo `convidador_pessoa_id` (§4.5) — e só ele: convidador registrado apenas como nome livre não agrupa (RN-039);
- pessoas com o mesmo `nucleo_familiar_id` (§4.3) — quando o campo está vazio, o critério não se aplica àquela pessoa.

Os dois são critérios de preferência, não invariantes: havendo mais pessoas do mesmo convidador ou do mesmo núcleo do que grupos disponíveis, a distribuição espalha o máximo que couber em vez de falhar. A coordenação pode remanejar manualmente, sem validação.

### 4.8 Área de servição
`id`, `inquilino_id`, `central_id`, `encontro_id`, `nome`, `descricao`, `papel`, `vagas`, `coordenador_inscricao_id`, `vice_coordenador_inscricao_id`

**RN-046** — Uma área tem no máximo um coordenador (`coordenador_inscricao_id`) e no máximo um vice (`vice_coordenador_inscricao_id`). Os dois apontam para inscrições de servo alocadas **naquela mesma área** (RN-047) e não podem ser a mesma inscrição. Esses dois campos são a **única** fonte de verdade de quem coordena a área: `funcao` da inscrição (§4.5) é **derivada** deles — `coordenador` para a inscrição apontada por `coordenador_inscricao_id`, `vice_coordenador` para a apontada por `vice_coordenador_inscricao_id`, `membro` para os demais servos da área — e não se edita por conta própria, que só criaria dois estados capazes de divergir.
Ter coordenador **não** é condição para criar a área: no passo 1 de F4 a área nasce vazia, antes de existir servo confirmado para coordená-la. É invariante da **publicação da equipe** (passo 4 de F4), que fica bloqueada enquanto houver área com pelo menos um servo alocado e sem coordenador. Área sem nenhum servo alocado não bloqueia — vaga por preencher é situação normal. Vice é opcional em qualquer momento.

**RN-047** — Um servo pertence a uma única área por encontro.
**RN-047a** — O inquilino define seu **catálogo padrão de áreas**, herdado por toda central nova. Denominações organizam a equipe de formas diferentes e não cabe fixar a lista no código.

Cada área do catálogo carrega, além do `nome` livre, um `papel` de valores fixos no código — `cozinha`, `saude`, `nenhum` — que marca **o que a área é**, não como ela se chama. É o mesmo par chave-fixa/texto-livre de `rotulos` (RN-008), aplicado agora à área: a denominação que chama sua cozinha de "refeitório" continua marcando `papel = cozinha`, e é esse campo, não o `nome`, que a visibilidade de dado sensível por área usa (RN-091a) — nome livre não é chave, o mesmo defeito que RN-039 rejeitou para o convidador. A central herda o catálogo por cópia (RN-103), `papel` incluso, e pode renomear a área sem perder o `papel`.

### 4.9 Etapa do cronograma
`id`, `inquilino_id`, `central_id`, `encontro_id`, `dia`, `hora_inicio`, `duracao_minutos`, `titulo`, `descricao`, `area_responsavel_id`, `responsavel_inscricao_id`, `ordem`

### 4.10 Tarefa da etapa
`id`, `inquilino_id`, `central_id`, `etapa_id`, `descricao`, `area_responsavel_id`, `concluida`, `concluida_por`, `concluida_em`

**RN-048** — O cronograma pode ser criado a partir de um **modelo de cronograma**, mantido no nível do inquilino (roteiro oficial da denominação) ou da central (adaptação local). A entidade é §4.20, e a RN-048a diz o que acontece quando o modelo é aplicado a um encontro.

### 4.11 Despesa
`id`, `inquilino_id`, `central_id`, `encontro_id`, `area_servicao_id`, `categoria`, `descricao`, `valor`, `data`, `forma_pagamento`, `comprovante_url`, `lancada_por`, `situacao`, `avaliada_por`, `avaliada_em`, `motivo_devolucao`

Categorias: alimentação, hospedagem, material, transporte, decoração, som/estrutura, saúde, **meio de pagamento**, outros.

`meio de pagamento` é a categoria da tarifa do gateway que não volta com o estorno (RN-060), da tarifa de contestação (RN-064) e das demais tarifas de transação. Nessa categoria o lançamento é **automático**: o sistema o cria a partir do `estorno_tarifa_gateway` gravado na cobrança (§4.6), sem `area_servicao_id` e sem comprovante — RN-049 não se aplica a lançamento que ninguém digitou. Ele nasce `aprovada` (RN-100), porque não há o que avaliar num número que veio do extrato do gateway, e por isso não segura o fechamento do passo 4 de F7. Lançamento manual nessa categoria continua possível, e aí passa pela avaliação como qualquer outro.

**Quando o lançamento acontece.** Despesa é entidade da Fase 3 (§10), e o estorno é da Fase 1: as duas coisas não cabem no mesmo instante. Quem grava no ato do estorno é a **cobrança**, no `estorno_tarifa_gateway`; o lançamento automático é da Fase 3, junto com F7 — para o estorno que acontecer depois dela, no mesmo ato; para o estorno da Fase 1, na montagem da prestação de contas do encontro, varrendo as cobranças com `estorno_tarifa_gateway` preenchido. Nenhuma tarifa se perde no caminho, e a Fase 1 não precisa de uma entidade de despesa só para guardar um número que a cobrança já guarda.

**RN-049** — Despesa acima de valor configurável exige comprovante anexado.

**RN-049a** — O valor é `despesa_exige_comprovante_acima_de`, campo da central (§4.1), herdado do inquilino por cópia (RN-103), com padrão **R$ 0,00** — ou seja, **todo lançamento exige comprovante** até que alguém decida o contrário. O padrão é o restritivo de propósito: prestação de contas sem comprovante é exatamente a situação que a RN-049 existe para evitar, e um padrão permissivo é o que ninguém revisa antes de precisar dele.

É lido no ato do lançamento e da avaliação (F7), não congelado — despesa é entidade da Fase 3 (§10) e não há nada anterior a ela para congelar. Vale só para **lançamento manual**: o lançamento automático da categoria `meio de pagamento` não passa por aqui, porque não há comprovante a anexar num número que veio do extrato do gateway (§4.11). E baixar o valor não invalida despesa já aprovada: a avaliação foi feita sob a regra que valia, e revisar o passado por mudança de configuração reabriria prestação de contas fechada.
**RN-100** — Situações da despesa: `lancada` → `aprovada` | `devolvida`, e `devolvida` → `lancada` quando quem lançou corrige e reenvia (passo 2 de F7). `devolvida` exige `motivo_devolucao`; aprovar e devolver gravam `avaliada_por` e `avaliada_em`, e as duas ações entram na auditoria (RNF-005). Só despesa `aprovada` entra no total da prestação de contas — `lancada` e `devolvida` aparecem no relatório como pendência, e o fechamento (passo 4 de F7) exige que não reste nenhuma despesa por avaliar. Encontro `encerrado` não aceita lançamento nem avaliação (RN-080); o caminho é a reabertura (RN-021).

> Id na faixa de extensão (§0.2): o bloco RN-045–RN-049 da operação do encontro está esgotado, e id não se reaproveita.

### 4.12 Conexão de recebimento
`id`, `inquilino_id`, `central_id`, `gateway`, `conta_externa_id`, `referencia_access_token`, `referencia_refresh_token`, `expira_em`, `escopos`, `ativa`, `ultimo_refresh_em`, `falhas_refresh`, `conectada_por`, `conectada_em`, `desativada_em`, `motivo_desativacao`

**RN-104** — **O que a conexão guarda, e o que ela nunca guarda.** É a entidade que a F0 cria no passo 3 e que a RN-098 desliga quando o recebimento cai. Até a 1.3 ela existia no documento como o campo `config_pagamento` de §4.1 — opaco, sem definição e sem regra — e como a frase "conecta a própria conta Mercado Pago por OAuth" em §8.3.

`referencia_access_token` e `referencia_refresh_token` guardam o **nome do segredo no cofre**, nunca o token. Token de OAuth de gateway é credencial de movimentar dinheiro alheio: numa coluna de tabela de aplicação ele aparece em dump de banco, em log de query, em backup e na tela de quem tem leitura no banco — e nenhuma dessas quatro pessoas precisou dele para trabalhar. `conta_externa_id`, ao contrário, não é segredo: é o identificador da conta no gateway, e é o que a conciliação (RN-102) usa.

Ninguém lê o token pela aplicação. Quem o usa é a chamada ao gateway, que o busca no cofre no ato. **O operador não é exceção**: ele vê que a conexão existe, de quem é, se está ativa e quando renovou — é isso que o painel de saúde das conexões mostra (§6) —, e o segredo do inquilino não é "dado de configuração" no sentido em que §3 lhe dá acesso a dado de configuração.

`falhas_refresh`, `ultimo_refresh_em` e `expira_em` são o que a rotina de renovação da RN-098 escreve, e `ativa` é o interruptor que ela desliga. `desativada_em` e `motivo_desativacao` — `falha_renovacao`, `revogada_no_gateway`, `desconectada_pelo_inquilino` — existem porque as três desativações se parecem na tela e se resolvem de formas diferentes: a primeira costuma voltar sozinha, a segunda exige reconectar, e a terceira foi alguém decidindo. Mostrar "recebimento indisponível" sem dizer qual das três é manda a coordenação esperar por uma coisa que não vai acontecer.

**RN-105** — **Escopo, quem conecta, e o que a desconexão não desfaz.**

**Escopo.** `central_id` vazio é conexão do **inquilino inteiro**; preenchido, é conexão **daquela central**. A entidade comporta os dois porque a decisão em aberto nº 2 ainda não saiu (§11) — e comportar os dois é diferente de decidir: enquanto a resposta não vier, a resolução da conexão de uma cobrança procura primeiro a da central e, não achando, a do inquilino. É essa dupla que faz a Fase 1 carregar dois caminhos em tudo que toca dinheiro, e é ela que some quando a decisão sair.

**Quem conecta.** Admin da denominação, para a conexão do inquilino; admin da central, para a da própria central. O operador **não** conecta recebimento de ninguém, nem como cortesia de implantação: a conta é do inquilino, o OAuth é autorizado por quem é dono dela, e operador capaz de conectar é operador capaz de redirecionar o dinheiro de um retiro.

**Uma conexão ativa por escopo** — o trio (inquilino, central, gateway) é único. Reconectar substitui a anterior no mesmo ato, e a anterior fica `ativa = false` com `desativada_em`; a linha **não** é apagada, porque cobrança emitida por ela continua viva no gateway (RN-098) e o webhook dela continua chegando — apagar perderia a origem de dinheiro que ainda vai entrar.

**O que a desconexão não desfaz: nada do que já foi emitido.** Cobrança viva continua pagável, webhook continua sendo processado e confirmando inscrição (RN-032, RN-051), e pagamento presencial não passa por aqui (RN-040, RN-044). O que ela impede são as duas chamadas que precisam sair daqui para lá — **emitir cobrança nova** e **solicitar estorno** —, e é exatamente esse par que a RN-098 trata, com a cobrança nascendo `pendente_emissao` e o estorno gravando `indeterminado`.

### 4.13 Termo do inquilino
Versão do termo de uso e consentimento de dados publicada por um inquilino.
`id`, `inquilino_id`, `versao`, `titulo`, `corpo`, `finalidades[]`, `controlador_nome`, `controlador_documento`, `encarregado_nome`, `encarregado_contato`, `situacao` (`rascunho` | `vigente` | `substituida`), `publicado_por`, `publicado_em`, `substituida_em`

**RN-090a** — **O termo é versionado, e versão publicada é imutável.** A RN-090 manda a ficha coletar consentimento contra um termo "do inquilino, versionado" — e até a 1.3 ninguém publicava esse termo: F0 não tinha o passo e nenhuma entidade o guardava. O efeito prático é maior do que parece: o consentimento de §4.14 aponta para uma versão, apontar para nada não é consentimento, e sem consentimento a Fase 1 não consegue criar inscrição. Faltava um passo de implantação para o produto funcionar.

- **Quem publica**: admin da denominação, e só. O inquilino é o **controlador** (§9); o operador é operador e não escreve o termo de ninguém — nem como cortesia, porque o texto que diz quem responde pelos dados não pode ter sido escrito por quem não responde. A plataforma oferece um **modelo de partida**, que o admin edita e assume ao publicar.
- **Uma versão `vigente` por inquilino.** Publicar uma nova passa a anterior a `substituida`, com `substituida_em`. Versão em `rascunho` não é oferecida a ninguém.
- **Versão publicada não se edita.** Corrigir uma vírgula é publicar versão nova. O consentimento gravado aponta para a versão: mexer no texto por baixo de um consentimento já dado transforma o registro numa afirmação falsa sobre o que a pessoa leu — e é justamente o registro que precisa se sustentar sozinho anos depois, quando ninguém que estava lá continua na organização.
- **O que a versão carrega**, além do corpo: `finalidades`, a lista das finalidades de tratamento que aquele texto cobre — é ela que o consentimento copia (§4.14) —, e a identificação do **controlador** e do **encarregado**, com nome, documento e contato. A RN-090 exige que o termo identifique o controlador, e o contato do encarregado é por onde o titular exerce direitos quando não tem o link da inscrição à mão (F10).
- **Sem termo `vigente` não há inscrição**, e é por isso que a RN-015 passa a exigi-lo para o inquilino sair de `em_implantacao`. Não é um quarto predicado na RN-023: publicada a primeira versão, não existe caminho que devolva o inquilino a "sem termo" — versão publicada não se apaga, e a substituição sempre entrega outra vigente.

**Versão nova não invalida consentimento antigo.** Quem aceitou a versão 3 consentiu com o que estava na tela, e a versão 4 não desfaz isso. O que a versão nova produz depende do que mudou: **mudança de redação** é comunicada (§7) e passa a valer para quem se inscrever a partir dali; **finalidade nova** exige consentimento novo, e **só para ela** — as finalidades antigas continuam valendo sob o consentimento antigo. Pedir aceite geral de novo a cada revisão treina a pessoa a clicar sem ler, que é o oposto do que a RN-090 quer.

### 4.14 Consentimento
`id`, `inquilino_id`, `pessoa_id`, `inscricao_id`, `termo_id`, `versao_termo`, `finalidades[]`, `aceito_em`, `ip`, `user_agent`, `origem` (`site_publico` | `area_administrativa`), `revogado_em`, `revogado_motivo`

**RN-090b** — **O consentimento é o registro de um ato, não uma caixinha marcada na pessoa.**

- **Um registro por ato de aceite**, com `aceito_em`, `ip` e `user_agent` (RN-090), a versão do termo — `termo_id` e a **cópia** de `versao_termo`, que sobrevive a qualquer coisa que aconteça com o termo — e a lista de `finalidades` **copiada da versão** no ato. Copiada, e não lida por junção, pelo mesmo motivo de sempre: é o que ela aceitou naquele dia.
- **Imutável, exceto pela revogação.** Não se edita consentimento: revogar grava `revogado_em` e `revogado_motivo` na própria linha, e consentir de novo cria linha nova. Registro que muda não prova coisa nenhuma.
- **`origem` não é decoração.** O `ip` de um consentimento de origem administrativa é o de quem registrou, não o do titular; ler os dois como a mesma coisa é o tipo de erro que só aparece no dia em que alguém pergunta de onde veio aquele aceite.

**Inscrição criada pela coordenação (RN-035) não tem titular na tela**, e é aqui que a regra precisa ser explícita em vez de conveniente:

- os **dados básicos** da pessoa podem ser registrados pela coordenação — a inscrição é a execução de uma combinação feita com aquela pessoa, e é isso que sustenta o tratamento;
- os **campos sensíveis** (§4.3a) **nascem vazios**, e a coordenação não os preenche. Saúde, medicamento, restrição alimentar e religião declarada dependem de consentimento específico do titular, e consentimento que outra pessoa marca no lugar dele não é consentimento;
- o sistema manda à pessoa o link da inscrição (RN-019), onde ela lê o termo, consente e completa os campos sensíveis. Até lá a inscrição é válida, ocupa vaga (RN-033) e é paga normalmente: o que falta é dado que só ela pode dar;
- a recepção sabe disso. Inscrição sem consentimento registrado aparece marcada na lista de check-in (RN-070) — é o último momento em que dá para resolver com a pessoa na frente, e descobrir na segunda-feira não resolve.

**Revogar o consentimento das finalidades de que a inscrição depende** não apaga a inscrição nem devolve dinheiro: isso é pedido de exclusão, e segue a F10 (RN-092b). Revogar o **consentimento de retenção** é outra coisa: é registro próprio (RN-093a), não uma finalidade dentro desta linha, e a revogação é imediata.

**RN-093a** — **Consentimento de retenção.** A RN-093 anonimiza dado de participante de encontro `encerrado` há mais de 5 anos "salvo consentimento de retenção para histórico da central" — e esse consentimento não existia em mais lugar nenhum do documento: sem campo, sem entidade e sem ponto de coleta. Ele é um **registro próprio** de §4.14, com sua própria linha, seu próprio `aceito_em` e sua própria revogação — e não uma finalidade dentro da linha de consentimento das finalidades obrigatórias (RN-090b). A diferença não é de forma: revogar por linha revogaria junto as finalidades de que a inscrição depende, que RN-090b já trata como outra coisa — a exclusão, não a retenção. Quatro decisões próprias:

- **Separado, e opcional.** Vai na ficha (F1) como item próprio, com a sua própria caixa, **desmarcado por padrão**, ao lado do consentimento obrigatório e nunca dentro dele. Empacotar as duas coisas numa caixa só coleta "sim" para uma pergunta que ninguém leu, e consentimento assim não é específico nem informado.
- **Recusar não impede nada.** Quem não marca se inscreve igual, paga igual e vive o encontro igual. Consentimento que é condição de serviço não é livre, e a central não precisa dele para realizar o retiro — precisa dele para guardar o histórico depois.
- **Revogável a qualquer momento, por um canal que sobrevive ao encontro.** Enquanto o `token_consulta` vale (RN-019), pelo mesmo link da inscrição, sem justificativa e sem falar com ninguém. Esta regra só produz efeito prático sobre encontro `encerrado` há mais de 5 anos — exatamente quando o token já morreu (RN-019) —, e por isso, depois do encerramento, a revogação segue pelo contato do **encarregado** publicado no termo (§4.13), o mesmo canal que F10 já oferece a quem não tem o link à mão. Revogado, a pessoa volta à fila da anonimização e é anonimizada na **próxima passada mensal** da rotina, não anos depois.
- **Vale enquanto não for revogado, e é lembrado.** Toda exportação da F10 traz, junto com os dados, quais consentimentos estão ativos e desde quando. Consentimento que a pessoa deu há seis anos e esqueceu não pode ser informado só quando alguém pergunta.

Sem consentimento de retenção ativo, a RN-093 corre normalmente: o padrão da plataforma é anonimizar.

### 4.15 Conta de acesso
`id`, `inquilino_id`, `central_id`, `pessoa_id`, `email`, `papel`, `situacao` (`convidada` | `ativa` | `suspensa` | `revogada`), `convite_token_hash`, `convite_expira_em`, `criada_por`, `criada_em`, `ativada_em`, `ultimo_acesso_em`, `revogada_por`, `revogada_em`, `motivo_revogacao`

**RN-017** — **A conta grava o papel de escopo largo; o papel de encontro é derivado.** §3 lista sete atores e o documento nunca disse quais deles são conta. São **quatro** os papéis que a conta grava — `operador`, `admin_denominacao`, `admin_central` e `servo` —, e os outros três não são papel de conta nenhum:

| Ator (§3) | Como se torna esse ator |
|---|---|
| **Visitante** | não tem conta, e não precisa de uma |
| **Inscrito** | não tem conta: usa o `token_consulta` da própria inscrição (RN-019) |
| **Servo** | conta com papel `servo`, ligada a uma `pessoa_id`, **sem** `central_id`: a pessoa é do inquilino, não da central (RN-014), e o que a conta enxerga sai das inscrições daquela pessoa, encontro a encontro, cada um com a sua própria central — fixar `central_id` na conta impediria quem serviu em Cascavel de servir em Maringá sem segunda conta. A conta sozinha não dá acesso a encontro nenhum |
| **Coordenador de área** | conta `servo` **+** ser apontado por `coordenador_inscricao_id` ou `vice_coordenador_inscricao_id` da área (RN-046) |
| **Coordenador do encontro** | conta `servo` **+** ser apontado por `coordenador_inscricao_id` do encontro (RN-025) |
| **Admin da central** | conta com papel `admin_central` e `central_id` preenchido |
| **Admin da denominação** | conta com papel `admin_denominacao`, escopo o inquilino inteiro, sem `central_id` |
| **Operador** | conta com papel `operador`, **sem** `inquilino_id` — a única conta que vive fora de um inquilino (RN-004) — e por isso também **sem** `central_id`, que só tem sentido dentro de um inquilino |

**Por que os papéis de encontro são derivados e não gravados.** Coordenador de área e coordenador do encontro são papéis **de um encontro**, não de uma pessoa: quem coordena a cozinha no 3º Encontro é membro comum no 4º. Gravá-los na conta obrigaria a conta a carregar de qual encontro ela é coordenadora, criaria a segunda representação que a RN-046 existe justamente para não ter, e deixaria coordenador de encontro passado com poder de encontro presente até alguém lembrar de tirar — que é como se descobre, meses depois, quem alterou o quê. Derivado do ponteiro, o poder termina no ato em que o ponteiro muda. É a mesma decisão que a `funcao` da inscrição já segue (§4.5, RN-034).

**Um papel por conta, e o papel é teto.** Os quatro são uma escada (§3): quem é `admin_central` tem tudo o que o coordenador do encontro tem, em toda a central. Por isso o admin da central que também coordena um encontro **não** precisa de segunda conta, e por isso o servo que vira admin da central tem o papel da conta **alterado**, com motivo e auditoria, em vez de acumular uma conta a mais.

**`pessoa_id` é obrigatório na conta `servo`** — é ele que liga a conta às inscrições — e opcional nas administrativas: nem todo admin de denominação vive encontro.

**Uma conta por par (inquilino, e-mail).** Servir em duas denominações são duas contas (RN-004), e o mesmo e-mail pode estar nas duas. O que não existe é uma sessão que enxergue as duas.

**RN-018** — **Ciclo de vida da conta: quem convida, como ativa, como perde.** §3 define sete papéis e nenhum fluxo dizia como alguém ganha ou perde acesso. O fluxo é F8; as regras são estas.

**Quem pode conceder cada papel** — ninguém concede acima de si:

| Papel concedido | Quem pode conceder |
|---|---|
| `operador` | outro `operador` |
| `admin_denominacao` | `operador` (é o convite do passo 1 de F0) ou outro `admin_denominacao` do mesmo inquilino |
| `admin_central` | `admin_denominacao`, ou `admin_central` da mesma central |
| `servo` | `admin_denominacao`, `admin_central`, ou coordenador do encontro para servo do seu encontro |

**Convite.** Convidar cria a conta em `convidada`, com o e-mail do convidado, um token de **uso único** guardado como hash e prazo de **7 dias**. O link vai por e-mail (§7). Reenviar — a conta ainda em `convidada`, expirada ou não — **reaproveita a mesma linha**: emite token novo, empurra `convite_expira_em` mais 7 dias e invalida o token anterior no mesmo ato, sem criar segunda conta. É essa reutilização que mantém o par (inquilino, e-mail) da RN-017 único mesmo quando o primeiro convite nunca foi aceito: convite expirado não é uma segunda linha disputando a mesma chave e batendo na unicidade, é a mesma linha reaberta. Convite expirado não vira conta sozinho e não deixa nada pela metade — a conta permanece em `convidada`, esperando reconvite.

**Ativação.** O convidado abre o link, autentica, e a conta passa a `ativa` com `ativada_em`. O token é **ligado ao e-mail do convite**: autenticar com outro e-mail não ativa a conta. Aceita-se o convite que foi feito, não o que se conseguiu abrir.

**Suspensão e revogação.** `suspensa` é pausa reversível — afastamento, suspeita de acesso indevido; `revogada` é terminal. As duas valem **no ato**: a sessão viva não é confiada, e a autorização é conferida a cada requisição. É o mesmo princípio do acesso de suporte, que expira por rotina e não por confiança na sessão (RN-005a). Revogar **não apaga a linha**: a conta revogada continua existindo para que a auditoria (§4.17) continue tendo a quem se referir.

**O que não revoga conta.** Cancelar a inscrição de um servo (RN-030) não revoga a conta dele — ele pode ter outras inscrições, em outros encontros, e o que ele enxergava daquele encontro já morreu sozinho por ser derivado da inscrição (RN-017). Suspender o inquilino (RN-007) **não** suspende conta nenhuma. O que a suspensão do inquilino retira é a criação de inscrição nova nos dois canais (RN-023, RN-035) e a alteração de configuração do inquilino e das centrais (RN-103) — é só isso que RN-007 bloqueia, e é só isso que precisa de bloqueio. As contas continuam **ativas** para a operação do encontro em curso: a secretaria continua dando baixa manual (RN-044), a coordenação continua promovendo da lista de espera (RN-036) e resolvendo pendência financeira (RN-037), e a recepção continua fazendo check-in (RN-070). Suspender o acesso de quem opera o encontro em cima de uma inadimplência da denominação é o cenário que a decisão nº 7 de §11 fecha, nesta forma: a suspensão não retira esse acesso. Se a intenção um dia for suspendê-lo, é lá que a resposta muda, não aqui.

**Tudo entra em auditoria** (RNF-005, §4.17): convite, aceite, mudança de papel, suspensão, revogação, e o motivo de cada uma. Mudança de papel é o evento que ninguém lembra de olhar e o que mais explica, depois, um acesso que não deveria ter existido.

**RN-019** — **O inscrito não tem conta; o servo tem. A fronteira é ler dado de terceiro.**

O `token_consulta` da inscrição (§4.5) é credencial de **uma inscrição**, e é o que sustenta todo o autoatendimento do inscrito: acompanhar a situação, refazer o pagamento pendente (RN-041), atualizar os próprios dados até o fechamento das inscrições (§3), preencher os campos sensíveis (RN-090b, §4.3a), pedir cancelamento (F3), dar e revogar o consentimento de retenção (RN-093a) e exercer os direitos do titular (F10). Nada disso exige senha, e exigir seria perder a inscrição de quem se inscreveu num domingo por link de grupo de mensagem e não vai criar conta para ver se o Pix caiu.

O **servo** autentica, e o critério é um só: em F5 ele lê **dado de outras pessoas** — a lista dos participantes do seu grupo, o contato de emergência, a restrição alimentar da mesa dele. Token que viaja em link de e-mail, é encaminhado no grupo da equipe e fica no histórico do navegador é credencial adequada para os dados da própria pessoa e não é credencial para os dados de terceiros. É a mesma linha que a RN-091a traça por campo, traçada aqui por pessoa.

**Os dois convivem e não se substituem.** A mesma pessoa usa o token para a própria inscrição e a conta para o que é do encontro. O token **não** abre nada do encontro; a conta **não** dispensa a inscrição — servo sem inscrição viva naquele encontro não vê aquele encontro, por mais conta que tenha.

**Vida do token.** Vale enquanto o encontro não for `encerrado`, **inclusive** depois de a inscrição virar `cancelada`: é por ele que a pessoa acompanha o reembolso (RN-063), e cortá-lo no cancelamento tiraria o acesso justamente de quem tem uma pergunta em aberto. É reemitido a pedido do titular, ou por decisão da coordenação em caso de vazamento suspeito, e o anterior morre no ato.

Depois de `encerrado` o token deixa de existir como canal, mas dois usos que continuam fazendo sentido anos depois do encontro — o exercício dos direitos do titular (F10) e a revogação do consentimento de retenção (RN-093a) — não morrem com ele: seguem pelo contato do **encarregado** publicado no termo (§4.13), a mesma alternativa que F10 já oferece a quem não tem o link à mão.

**Fase.** As contas são da **Fase 1**, inclusive as de papel `servo`: a área administrativa é da Fase 1 (§10), e RN-035 e RN-036 exigem coordenador do encontro já nela, que é conta `servo` com o ponteiro da RN-025. O que fica para a **Fase 2** é o que a conta de servo **enxerga** — grupo, cronograma e tarefas (F5).

### 4.16 Concessão de acesso de suporte
`id`, `inquilino_id`, `usuario_operador_id`, `concedida_por`, `motivo`, `concedida_em`, `expira_em`, `revogada_em`, `revogada_por`

**RN-005a** — **A concessão é uma entidade com prazo, não um interruptor no perfil do operador.** A RN-005 já mandava o suporte passar por "acesso temporário concedido pelo admin da denominação, com prazo, motivo e registro em auditoria", e nada no documento guardava isso.

- **Quem concede**: admin da denominação, e só. Uma concessão viva por operador, por inquilino.
- **Motivo obrigatório**, em texto — e ele é escrito por quem **concede**, não por quem pede: é a frase que o admin vai reler daqui a um mês para entender por que autorizou.
- **Prazo máximo de 24h**, em `expira_em`. Não há concessão sem prazo e não há renovação automática; precisar de mais tempo é conceder de novo, com motivo de novo.
- **Revogável a qualquer momento** pelo admin da denominação, com efeito imediato.
- **Expira por rotina**, e não por confiança na sessão: sessão aberta antes do vencimento não sobrevive a ele.
- **Toda leitura sob a concessão é auditada** (§4.17) — leitura, não só escrita —, e o admin da denominação tem tela própria com o que o operador viu, item a item (§6). Concessão que ninguém revisa é acesso permanente com passos a mais.
- O operador **vê a concessão na própria tela**, com prazo e motivo. Quem está dentro do cadastro de outra organização precisa saber que está.

**O que a concessão alcança**: o cadastro do inquilino em §4.3 — nome, contato, endereço, contato de emergência, observações — e o operacional do encontro, que é o que o suporte precisa para responder "por que essa inscrição não confirmou".

**O que ela não alcança, em hipótese alguma:**

- **dado sensível** (§4.3a): saúde, medicamento, restrição alimentar e religião declarada ficam fora, com ou sem concessão. O PRD era silencioso aqui e `specs/fase-1/00-multi-inquilino.md` decidiu sozinho, em `RN-080t`, que nunca alcança — **é a decisão que fica** (RN-091a). Problema que dependa de ver uma condição de saúde é resolvido pela coordenação, com o operador orientando por descrição. A diferença entre "não deveria" e "não consegue" é a política de acesso, que exclui o papel do operador sem exceção por concessão;
- **CPF**: não está em §4.3, está na identidade global (§4.2), que papel de aplicação nenhum lê (RN-001, RN-094). A concessão não abre a única porta que o documento mantém fechada para todo mundo;
- **outro inquilino**: a concessão é de **um** inquilino, e a RN-001 continua valendo dentro dela.

### 4.17 Auditoria
`id`, `inquilino_id`, `central_id`, `entidade`, `entidade_id`, `acao`, `ator_tipo` (`usuario` | `sistema` | `webhook` | `publico` | `operador`), `ator_id`, `ator_descricao`, `motivo`, `antes`, `depois`, `ip`, `user_agent`, `criado_em`

**RN-106** — **A auditoria é append-only, e o que ela guarda é escolhido.** É a entidade que a RNF-005 exige desde a 1.0 e que o documento nunca modelou, embora doze regras dependam dela para funcionar.

**`ator_tipo` faz a distinção que o documento inteiro usa**: a cascata do cancelamento do encontro é `sistema`, e não a coordenação (RN-030, RN-061); a confirmação de pagamento é `webhook`, e não o inscrito (RN-051); a inscrição pelo site é `publico`; e `operador` é o que o admin da denominação revisa (RN-005a). Registrar a cascata em nome de quem não a executou suja exatamente o registro que a RN-030 manda manter limpo.

**Append-only, sem exceção de papel.** Ninguém tem `update` nem `delete` — nem o operador, nem uma rotina de manutenção. Auditoria que alguém pode editar não serve para o que ela existe, e o "alguém" nunca é quem se imagina.

**`inquilino_id` é opcional aqui**, pela mesma razão da RNF-001 (§8.1): convite, mudança de papel e revogação de conta de papel `operador` (RN-018) são atos de escopo de plataforma sobre uma conta que vive fora de um inquilino (RN-004, RN-017), e a linha de auditoria que os registra fica com `inquilino_id` vazio. Todo o resto — inclusive conta `admin_denominacao`, `admin_central` e `servo` — audita com `inquilino_id` preenchido, como qualquer outra entidade do inquilino.

**`motivo` é obrigatório onde o documento exige justificativa**, e vazio no resto: criação administrativa de inscrição (RN-035), promoção manual e promoção acima do limite de vagas (RN-036), alteração de `valor_devido` e das faixas de reembolso (RN-038, RN-065), antecipação de `em_andamento` e reabertura de encontro (RN-021, RN-080), baixa manual e devolução presencial (RN-044, RN-061), concessão de suporte (RN-005a), mudança de papel e revogação de conta (RN-018) e propagação de configuração às centrais (RN-103).

**O que é auditado.** Além do que a RNF-005 já listava — inscrição, cobrança, despesa e prestação de contas —, entram as entidades que a 1.4 acrescenta: conta de acesso (§4.15), concessão de suporte (§4.16), conexão de recebimento (§4.12), termo e consentimento (§4.13, §4.14) e configuração de inquilino e de central (§4.0, §4.1). **Escrita** é auditada em todas; **leitura** só nas duas em que ler já é o evento — dado sensível (§4.3a) e tudo que for lido sob concessão de suporte.

**O que a auditoria nunca guarda.** `antes` e `depois` **não** carregam campo de §4.3a: auditar a mudança de uma condição de saúde copiando a condição de saúde para uma tabela que meio sistema lê desfaz, numa linha, a separação que a RN-091a construiu — o que fica registrado é que o campo mudou, por quem e quando, não o conteúdo. E não carregam segredo: token de gateway (RN-104), `token_consulta` (RN-019) e token de convite (RN-018) entram como marcador, nunca como valor.

**A auditoria sobrevive à anonimização; o dado pessoal dentro dela, não.** Anonimizar uma pessoa (RN-093) ou atender um pedido de exclusão (RN-092b) **não apaga linha de auditoria** — o registro de que houve um pagamento, um cancelamento e um estorno é o que sustenta a prestação de contas anos depois. O que acontece é a substituição dos campos de dado pessoal dentro de `antes` e `depois` pelos mesmos marcadores que a pessoa recebeu, mantendo ação, ator, motivo e carimbo. Deixar a auditoria intacta seria manter cópia integral do que a pessoa pediu para apagar, num lugar em que ninguém pensa em procurar.

### 4.18 Notificação
`id`, `inquilino_id`, `central_id`, `inscricao_id`, `pessoa_id`, `usuario_id`, `gatilho`, `canal` (`email` | `whatsapp`), `destino`, `chave_unica`, `situacao` (`pendente` | `enviada` | `falha`), `tentativas`, `enviada_em`, `erro`, `criado_em`

**RN-107** — **Cada linha da tabela de §7 é uma linha aqui, e a chave única é o que impede a segunda.**

`chave_unica` compõe gatilho, destinatário e discriminador do evento, e é ela que cumpre a metade "nem duplica notificação" da RN-050: webhook reprocessado tenta gravar a mesma chave e não grava a segunda. Sem ela, a idempotência precisaria ser lembrada em cada gatilho — e o gatilho que esquecerem é o que manda três e-mails de pagamento aprovado às duas da manhã.

**A notificação não é o dado.** Ela guarda gatilho, destino e resultado do envio; nunca campo de §4.3a e nunca valor que só a tela autenticada deveria mostrar. O corpo é montado no envio, a partir da entidade, com a marca e os rótulos do inquilino (RNF-007) — e-mail da plataforma chegando com nome genérico faz o inscrito achar que é golpe.

**Envio é assíncrono e depois do commit.** A notificação é criada dentro da transação que ela anuncia e enviada depois que a transação fecha. E-mail de vaga confirmada disparado por uma transação que rola de volta é o pior erro desta lista, porque ele não tem desfazer.

**Falha não é silêncio.** `tentativas` e `erro` guardam o que aconteceu, com nova tentativa espaçada e um teto. Estourado o teto, a notificação fica em `falha` e aparece para a coordenação no painel do encontro (RN-115), junto com as pendências financeiras (RN-087): quem não recebeu o link do Pix não sabe que não recebeu, e a única pessoa capaz de perceber é a que está com a lista na mão.

**Canal.** Na Fase 1 o envio automático é **e-mail**. O WhatsApp existe como registro com o link `wa.me` pronto para a secretaria disparar (§7), enquanto o provedor é a decisão em aberto nº 1 — a linha existe desde já para que escolher provedor seja ligar um canal, e não criar a entidade.

### 4.19 Evento de webhook
`id`, `gateway`, `evento_id_gateway`, `tipo`, `acao`, `recurso_id`, `assinatura_valida`, `corpo_bruto`, `cabecalhos`, `recebido_em`, `processado_em`, `resultado`, `erro`, `tentativas`, `inquilino_id`, `cobranca_id`

**RN-053** — **O evento bruto é gravado antes de ser entendido.** É o que a RNF-004 pede desde a 1.0, e a entidade que faltava para ela: o corpo e os cabeçalhos como chegaram, gravados **antes** de validar assinatura, antes de localizar a cobrança e antes de decidir o que fazer. Webhook perdido por erro de processamento é dinheiro que entrou e inscrição que não confirmou — e sem o corpo guardado não há como reprocessar nem como descobrir o que ele dizia.

- **`(gateway, evento_id_gateway)` é único**, e é daí que sai a idempotência da RN-050: o mesmo evento reentregue encontra a linha, não reprocessa e não notifica de novo.
- **Assinatura inválida também é gravada**, com `assinatura_valida = false`, e rejeitada em seguida. Descartar em silêncio apaga a única evidência de que alguém está tentando confirmar pagamento por fora.
- **`inquilino_id` é preenchido depois**, quando a rota e o corpo permitem resolver de quem é o evento, e fica vazio no evento órfão. É a única entidade do documento que nasce **sem dono** — o webhook chega antes de sabermos de quem ele é —, e por isso ela não está sob o isolamento por inquilino (RNF-001): o acesso é do processador e do operador, e ela não é exposta em endpoint de inquilino nenhum.
- **O corpo bruto tem prazo.** Ele carrega dado do pagador vindo do gateway — nome, e-mail, às vezes documento —, que é dado pessoal que ninguém aqui pediu e que §9 não deixa guardar indefinidamente por conveniência de depuração. `corpo_bruto` e `cabecalhos` são apagados **90 dias** depois de `recebido_em`; o resto da linha — identificadores, tipo, resultado e carimbos — fica, e é o que a conciliação (RN-102) e a auditoria usam a partir dali.

### 4.20 Modelo de cronograma
`id`, `inquilino_id`, `central_id`, `nome`, `descricao`, `ativo`, `criado_por`, `criado_em`

As etapas e tarefas do modelo têm a mesma forma de §4.9 e §4.10, com três diferenças: `modelo_id` no lugar de `encontro_id`, `dia_relativo` no lugar de `dia`, `area_responsavel_nome` no lugar de `area_responsavel_id`, e sem os campos de execução — `responsavel_inscricao_id`, `concluida`, `concluida_por` e `concluida_em`, que só existem quando há encontro acontecendo.

**RN-048a** — **O modelo é um molde, e aplicá-lo é cópia.** A RN-048 cita o modelo desde a 1.0 e nunca disse o que ele é nem o que acontece quando alguém o usa.

- **Nível.** `central_id` vazio é modelo do inquilino — o roteiro oficial da denominação; preenchido, é a adaptação daquela central. A central cria o seu **copiando** um do inquilino, e a partir dali os dois não se falam mais: o inquilino revisar o roteiro oficial não mexe na adaptação que a central fez. É a mesma decisão da RN-103, pelo mesmo motivo.
- **Aplicar é copiar, e é de mão única.** Aplicar um modelo a um encontro cria as etapas e tarefas de §4.9 e §4.10 **como cópias**, sem vínculo de volta. Editar o modelo depois não toca em encontro nenhum, e editar o cronograma do encontro não altera o modelo. Cronograma vivo preso ao molde é o roteiro do sábado mudando na sexta à noite porque alguém arrumou o modelo em outra central.
- **Dia é relativo, não data.** `dia_relativo` é o dia do encontro — 1 é o primeiro —, resolvido contra `data_inicio` no ato da aplicação. Modelo com data absoluta serve para um encontro só, que é o contrário de modelo.
- **Área é por nome, e o que não casa fica vazio.** As áreas de servição de §4.8 são do encontro e não existem quando o modelo é escrito, então o modelo guarda o **nome** da área, tirado do catálogo do inquilino (RN-047a), e a aplicação liga cada etapa à área daquele encontro que tem aquele nome. Nome sem correspondência deixa a etapa **sem área responsável**, marcada na tela para a coordenação resolver — nunca ligada à área errada, e nunca impedindo a aplicação inteira do modelo por causa de uma área que aquele encontro não tem.
- **Fase.** Cronograma e modelos são da **Fase 2** (§10, F5).

---

## 5. Fluxos

O identificador do fluxo é imutável, como o das regras (§0.2): `F0` a `F7` nasceram na 1.0, e os fluxos acrescentados depois entram no **fim da numeração**, não no meio da leitura. F8, F9 e F10 são da 1.4, e nenhum dos três é posterior aos outros no tempo do produto — F9 é chamado de dentro do passo 6 de F1, e F8 precede tudo.

### F0 — Implantação de um inquilino
1. Operador cria a denominação: nome, slug, subdomínio, percentual da taxa da plataforma (RN-095). E convida o primeiro admin da denominação (F8, RN-018).
2. Admin da denominação aceita o convite, ativa a conta, aceita o contrato e configura marca (logo, cores), rótulos (RN-008), catálogo padrão de áreas de servição (RN-047a) e os padrões que as centrais vão herdar (RN-103).
3. Conecta a conta de recebimento ao gateway por OAuth (seção 8.3) — a conexão é a entidade de §4.12.
4. **Publica a primeira versão do termo de uso e consentimento de dados** (§4.13, RN-090a), identificando o controlador e o encarregado.
5. Cria as centrais, que herdam os padrões do inquilino por cópia (RN-103), e convida os admins de cada uma (F8).
6. Inquilino passa a `ativo` e o subdomínio entra no ar.

**RN-015** — Inquilino só sai de `em_implantacao` com contrato aceito, marca definida, **termo publicado** e conta de recebimento conectada. Sem recebimento configurado não há como cobrar inscrição, e um subdomínio no ar sem isso frustra a primeira inscrição.

O **termo** entra nesta lista na 1.4, e a razão é a mesma um degrau acima: sem uma versão vigente do termo (§4.13) a ficha de F1 não tem contra o que coletar consentimento, o consentimento de §4.14 não tem para onde apontar, e a inscrição **não pode nascer** — RN-090 a exige. Um subdomínio no ar sem termo publicado não frustra a primeira inscrição: impede todas. O passo 4 é justamente o que faltava para a Fase 1 funcionar, e ele é do admin da denominação porque o inquilino é o controlador (§9) — o operador não escreve o termo de ninguém.

### F1 — Divulgação e inscrição pública
1. Visitante acessa o subdomínio da denominação e vê a agenda dos encontros publicados de todas as centrais dela.
2. Abre a página do encontro: título numerado, datas, local, texto de divulgação, valor e vagas restantes.
3. Clica em inscrever-se e escolhe **participante** ou **servo** (exibidos com os rótulos do inquilino).
4. Preenche a ficha: dados pessoais, contato de emergência, restrição alimentar e condição de saúde (§4.3a) e quem o convidou (RN-039). Servo também escolhe a área de servição pretendida (preferência, não garantia — RN-047 e alocação final são da coordenação).
5. Aceita o termo de uso e o consentimento de dados na **versão vigente** do inquilino (RN-090, RN-090a), e decide **à parte** sobre o consentimento de retenção, que vem desmarcado e não é condição de nada (RN-093a). O registro é o de §4.14.
6. Sistema normaliza e valida o CPF, localiza a Identidade (F9, RN-010, RN-010a), cria ou reaproveita a Pessoa **deste inquilino** (RN-013) e cria a Inscrição, congelando nela `valor_devido`, a âncora do preço e as faixas de reembolso (RN-038, RN-096, RN-065); se há vaga, gera Cobrança; senão, entra em lista de espera (RN-033).
7. Escolhe Pix ou cartão e paga. Estando o recebimento indisponível, a vaga é reservada e o link de pagamento chega depois (RN-098).
8. Recebe por **e-mail** (RN-112) a confirmação com o **token de consulta** da inscrição — é o único canal que a Fase 1 garante (§7).

**RN-016** — Não existe agenda que cruze denominações. Cada inquilino tem a sua, no seu domínio, com a sua marca. Um site nacional agregador seria outro produto.

### F2 — Confirmação do pagamento
1. Gateway envia webhook de mudança de situação.
2. Sistema valida assinatura do webhook e localiza a cobrança pelo `gateway_id`.
3. Aprovado → cobrança `paga`, inscrição `confirmada` (RN-032), notificação enviada.
4. Recusado/expirado → inscrição segue `pendente_pagamento`, inscrito notificado com link para refazer.

**RN-050** — Webhook é idempotente: reprocessar o mesmo evento não altera estado nem duplica notificação.
**RN-051** — Confirmação de pagamento **online** é sempre disparada pelo webhook, nunca pelo retorno da tela do navegador. Pagamento presencial não gera webhook e é confirmado por baixa manual (RN-044) — ato registrado de um operador humano identificado, não sinal vindo do navegador do inscrito.

**RN-052** — **Prazo de pagamento da inscrição comum: 72h, contadas da inscrição.** A contagem começa em `data_inscricao`, **não** na criação da cobrança. Contar da cobrança deixa um buraco do tamanho do problema: quem se inscreve e nunca chega a gerar cobrança nunca estoura prazo nenhum, e segura a vaga até o dia do encontro. Estourado o prazo sem pagamento, a inscrição vai para o **fim** da lista de espera (RN-033) e a vaga é liberada e promovida no mesmo ato. Dois avisos antes disso, em 24h e em 48h (§7).

Três exceções, todas necessárias:

- **Pagamento em análise.** Inscrição cuja cobrança está em análise antifraude no gateway **não expira**, por mais que passe das 72h. A análise é do gateway, não do inscrito, e pode ser aprovada minutos depois: derrubar quem está com pagamento em curso devolve à fila uma vaga que já tem dono e cria dois. O relógio volta a correr se a análise terminar em recusa.
- **Cobrança que a plataforma não conseguiu emitir.** Inscrição cuja cobrança está em **`pendente_emissao`** (§4.6) por indisponibilidade de recebimento (RN-098) também **não expira**, e pelo mesmo motivo, um degrau acima: a falha não é do gateway nem do inscrito, é nossa. Quem responde a exceção é a **situação da cobrança**, não a ausência dela: inscrição que simplesmente não tem cobrança nenhuma é outro caso e continua expirando. O relógio começa a contar quando a cobrança é emitida e o inscrito recebe o link — cobrar dele um prazo que ele não teve como cumprir é derrubar a pessoa por um erro que ela não cometeu.
- **Inscrições fechadas.** Passado o carimbo `inscricoes_fecham_em` (RN-023), **nada expira sozinho** — nem estas 72h, nem o prazo do promovido da RN-033. A fila está congelada e não há a quem passar a vaga; e a inscrição não paga é justamente a que a RN-070 espera na recepção, para receber `dinheiro` ou `pix_presencial` no ato. Expirar depois do fechamento tiraria a vaga de alguém para não dar a ninguém. Daí em diante, quem tira uma inscrição do caminho é a coordenação, cancelando (F3) — inclusive no prazo do promovido, que continua correndo como aviso e vira pendência de vaga em vez de transição automática (RN-036).

  O que suspende a expiração é o **carimbo**, não o predicado de aceitação de inscrição nova da RN-023: inquilino `suspenso` não suspende prazo nenhum (RN-007). E suspender a expiração não suspende o **pagamento**: quem quiser pagar online continua podendo até o marco de corte da RN-041.

O promovido da lista de espera tem prazo próprio, mais curto (RN-033), que substitui estas 72h enquanto está correndo.

### F3 — Cancelamento e reembolso
1. Inscrito solicita cancelamento pelo link da inscrição, ou coordenação cancela.
2. Sistema calcula o reembolso pela política da central (RN-060), sobre o valor efetivamente pago.
3. Cobrança viva é cancelada no gateway — QR code que sobrevive ao cancelamento é dinheiro entrando para uma vaga que não existe mais (RN-062).
4. Havendo valor a devolver, o estorno é solicitado ao gateway, com o resultado e a tarifa retida gravados na cobrança (§4.6) — é dali que a prestação de contas (F7) lê o que a central absorveu (RN-060).
5. **Só com o estorno aceito**, a inscrição passa a `cancelada` (RN-062). Estorno recusado — ou sem resposta do gateway — não cancela nada e vira pendência para a coordenação.
6. Vaga liberada dispara a promoção da lista de espera (RN-033), no mesmo ato.
7. Inscrito é notificado. O reembolso só está **efetivado** quando o gateway confirma por webhook (RN-063); até lá a consulta da inscrição diz "reembolso solicitado", com a data.

O fluxo acima é a **desistência do inscrito**. O cancelamento do **encontro inteiro** tem caminho próprio (RN-061): não é desistência de ninguém, não passa pela política de faixas e não promove fila nenhuma.

**RN-060** — Política padrão de reembolso, configurável por central na forma da RN-065 e **congelada na inscrição** no ato da criação (§4.5), de onde esta regra lê as faixas. Seja `antecedencia_dias` a diferença entre `data_inicio` do encontro e o momento do pedido de cancelamento, em dias corridos inteiros arredondados para baixo, no fuso `America/Sao_Paulo`:

| Condição | Devolve |
|---|---|
| `antecedencia_dias > 15` | 100% |
| `7 <= antecedencia_dias <= 15` | 50% |
| `antecedencia_dias < 7` | 0% |

As três faixas cobrem toda a reta e não se sobrepõem: 15 dias exatos devolvem 50%, 7 dias exatos devolvem 50%, 6 dias não devolvem nada. Cancelamento pedido depois do início do encontro dá `antecedencia_dias` negativo e cai na última faixa.

**A base é o que o inscrito pagou à central.** O percentual incide sobre o valor **efetivamente pago**, e não sobre o `valor_devido` congelado (RN-038): os dois divergem em toda inscrição paga em parte, e é sobre dinheiro que entrou que se calcula devolução. Cancelar inscrição `pendente_pagamento` não devolve nada porque não há o que devolver — apenas encerra a cobrança viva e libera a vaga. A base tem duas bordas, e as duas precisam estar ditas porque decidem valor na tela:

- **inclui a taxa da plataforma repassada** ao inscrito (RN-096), quando o inquilino optou por repassá-la: foi dinheiro que ele desembolsou pela inscrição, e a plataforma o devolve na mesma proporção do resto (RN-097). Devolver só a taxa do encontro faria "100% de reembolso" ser menos que o extrato do cartão da pessoa;
- **exclui o juro do parcelamento** (RN-101), que o inscrito pagou ao emissor do cartão e que nunca entrou na conta da central. Devolvê-lo sairia do dinheiro dos outros inscritos, para cobrir um custo que a organização não recebeu e não escolheu. Quem parcela precisa saber disso **antes** de parcelar, e é por isso que a RN-101 manda dizê-lo na tela de pagamento, não no cancelamento.

Devolvido o dinheiro, a taxa da plataforma volta na mesma proporção — para o inscrito quando ela foi repassada, para a central quando ela foi absorvida (RN-096, RN-097).

A **tarifa do gateway** (RN-101) retida na transação original não volta com o estorno — ou volta só em parte, conforme o gateway —, e o que não voltar **não é descontado do inscrito**: quem devolve 100% devolve 100% do que a pessoa pagou à central. A diferença fica com a central e é gravada no ato do estorno em `estorno_tarifa_gateway`, na própria cobrança (§4.6) — é dali que sai o lançamento automático da categoria **meio de pagamento** na prestação de contas (§4.11, F7), que é da Fase 3 (§10). Gravar na cobrança é o que permite ao estorno da Fase 1 chegar inteiro à prestação de contas construída depois. Repassar essa tarifa transformaria "100% de reembolso" num número que não é 100%, e a discussão sobre os poucos reais custa mais que eles.

**RN-061** — **Cancelamento do encontro.** Encontro que passa a `cancelado` (RN-021) arrasta todas as suas inscrições num único ato do sistema, e devolve todo o dinheiro:

- **Inscrições.** Tudo que estiver em `pendente_pagamento`, `confirmada` ou `lista_espera` vai para `cancelada` (RN-030), num único ato do **sistema** — o ato humano é o do admin da central sobre o encontro (RN-021), e é ele que a auditoria registra (RNF-005), não centenas de cancelamentos em nome da coordenação. Cobrança viva — Pix aguardando pagamento, link de cartão em aberto — é cancelada **antes**, no gateway, para que ninguém pague um encontro que não vai acontecer. Não há promoção de fila: não sobrou vaga, deixou de haver encontro.
- **Inscrições `presente`** — Fase 2, junto com o check-in (§10). Encontro cancelado já `em_andamento` existe: emergência, interdição do local, temporal na sexta à noite. Quem já fez check-in vai para `cancelada` na mesma cascata (RN-030), e `data_checkin` fica gravada — o registro honesto é que a pessoa esteve lá e o encontro não aconteceu. O dinheiro segue a mesma regra de todo mundo: **100% do valor efetivamente pago**, sem faixa. Refeição servida e diária já paga são despesa do encontro na prestação de contas (F7), não desconto no inscrito; foi a organização que interrompeu, e ela é quem absorve o que já gastou.
- **Dinheiro pago online.** Reembolso de **100% do valor efetivamente pago**, ignorando as faixas da RN-060. A política de faixas existe para punir desistência de última hora do inscrito; quando quem desiste é a organização, ela não se aplica. A taxa da plataforma volta integralmente (RN-097).
- **Dinheiro pago presencialmente.** `dinheiro` e `pix_presencial` (RN-040) não passaram pelo gateway e não têm o que estornar: a devolução é feita pela central, fora da plataforma, e **registrada no sistema por quem devolveu** — mesmos papéis da baixa manual (RN-044), nos campos `devolucao_presencial_*` da cobrança (§4.6), com valor, data, responsável e observação, em auditoria (RNF-005) —, entrando na prestação de contas como devolução do método correspondente. O sistema não finge que devolveu: a lista do que ainda falta devolver, com nome e valor, é **derivada** dessas cobranças (§4.6) e aparece no relatório de pendências financeiras do encontro (§6), até zerar.
- **Estorno que falha.** O cancelamento do encontro **não fica bloqueado** por estorno recusado no gateway. Aqui a ordem normal (RN-062) se inverte, de propósito: encontro cancelado é fato consumado, o inscrito precisa saber hoje para desmarcar o que marcou, e segurar o aviso até o último estorno passar não devolve o dinheiro de ninguém mais rápido. Estorno que falhou grava `estorno_situacao = recusado` na cobrança e vira pendência derivada dela (§4.6), visível para a coordenação com pessoa e valor no relatório de pendências financeiras (§6) e notificada (§7), até ser resolvido.
- **Aviso.** Todo inscrito é notificado, inclusive quem estava só na lista de espera, com o `motivo_cancelamento` do encontro (§4.4).

`cancelado` é terminal (RN-021): não existe "descancelar". Encontro que volte a acontecer é encontro novo, com número novo (RN-020), e as inscrições são refeitas — o que também é o registro honesto do que aconteceu.

**RN-062** — **Ordem das operações do cancelamento com reembolso.** O cancelamento move duas coisas — a vaga e o dinheiro — e a ordem entre elas não é detalhe de implementação: é ela que decide quem fica no prejuízo quando alguma etapa falha. A ordem é esta, e vale tanto para o cancelamento pedido pelo inscrito quanto para o feito pela coordenação:

1. **Valida** que a inscrição admite cancelamento (RN-030).
2. **Calcula** o reembolso pela política da central, sobre o valor efetivamente pago (RN-060).
3. **Cancela a cobrança viva** no gateway, se houver — Pix aguardando pagamento, link de cartão em aberto —, antes de qualquer outra coisa.
4. **Solicita o estorno**, havendo valor a devolver, e aguarda o **aceite** do gateway (RN-063).
5. **Só com o estorno aceito**, a inscrição passa a `cancelada` (RN-030).
6. **Libera a vaga** e dispara a promoção da lista de espera (RN-033), no mesmo ato.
7. **Notifica** o inscrito, com o valor devolvido e o prazo do meio de pagamento (RN-063).

**Estorno recusado não cancela a inscrição.** Se o gateway recusa o pedido — saldo insuficiente na conta da central é o caso mais comum no Pix —, a inscrição continua `confirmada`, continua ocupando vaga (RN-033) e **nada** é liberado para a fila. Quem pediu recebe resposta honesta: o cancelamento não foi concluído e a coordenação foi avisada. A cobrança grava `estorno_situacao = recusado` e vira pendência derivada dela (§4.6), com pessoa e valor, no relatório de pendências financeiras (§6) e em notificação à coordenação (§7), até alguém resolver — repetindo o pedido depois de recompor o saldo, ou devolvendo por fora e registrando (RN-061). Cancelar antes de o dinheiro sair produz o pior resultado que este sistema é capaz de produzir: pessoa fora do retiro, sem o dinheiro de volta e sem nem a vaga para reclamar.

**Estorno que falha sem resposta não é estorno recusado.** Timeout, `5xx` e conexão de recebimento indisponível (RN-098) deixam a plataforma sem saber se o dinheiro saiu — e é o desfecho mais frequente dos dois, não o mais raro. Gravar `recusado` ali mente quando o estorno passou; deixar `nao_solicitado` produz inscrição `confirmada` ocupando vaga, sem pendência nenhuma e sem aviso a ninguém, que é o pior dos dois. O que fica decidido:

- a cobrança grava **`estorno_situacao = indeterminado`** (§4.6), com o `estorno_valor` do pedido e o `estorno_atualizado_em` da tentativa;
- o pedido é **repetido** pela plataforma, com a **mesma chave de idempotência** do pedido original — é ela que impede a repetição de devolver o dinheiro duas vezes se o primeiro tiver passado —, em tentativas espaçadas, até o gateway responder. Respondido, o estado vira `solicitado` ou `recusado` e o caso volta ao caminho normal (RN-063);
- enquanto isso a inscrição continua **`confirmada`**, ocupando vaga (RN-033), e nada é liberado para a fila — pela mesma razão da recusa: cancelar sem saber onde está o dinheiro produz pessoa fora do retiro e sem devolução;
- o caso aparece como pendência com **a mesma visibilidade da recusa** — mesma lista (§6), mesma notificação à coordenação (§7), com pessoa, valor e a hora da tentativa —, dizendo qual dos dois casos é: recusa é decisão do gateway, `indeterminado` é resposta que não chegou;
- quem pediu o cancelamento é informado de que ele **não foi concluído** e está sendo reprocessado — não de que foi recusado, que seria afirmar o que não sabemos.

**Sem valor a devolver, não há o que esperar.** Cancelamento na faixa de 0% (RN-060), inscrição `pendente_pagamento` e inscrição cuja cobrança já foi estornada por inteiro (RN-037) pulam o passo 4: não há estorno a solicitar, a inscrição é cancelada no ato e a vaga vai para a fila na mesma transação. O que a ordem protege é dinheiro em trânsito, e ali não há nenhum.

**Cobrança viva que não pôde ser cancelada não segura o cancelamento** — não há dinheiro do inscrito preso nela. O cancelamento segue, e a cobrança fica na lista de pendências para não passar batido. Pagamento que chegar depois, para inscrição já `cancelada`, **não a ressuscita** (RN-030): é devolvido integralmente pelo caminho de onde veio, pela lista de devoluções pendentes (§4.6), como o segundo pagamento da RN-037. Não houve desistência a punir com faixa nenhuma — houve cobrança que a plataforma não conseguiu fechar a tempo, e a RN-060 não se aplica a erro nosso.

**A exceção é o cancelamento do encontro** (RN-061), onde a ordem se inverte de propósito e o aviso não espera o dinheiro. Ali a comparação é outra: o inscrito precisa saber hoje que o encontro não acontece, e nenhum estorno chega mais rápido por causa disso.

**RN-063** — **Quando o reembolso está efetivado.** Estorno tem **dois** marcos, e confundi-los é o que faz a plataforma dizer "reembolsado" para quem ainda não viu o dinheiro:

- **Aceite** — a API de estorno respondeu que recebeu o pedido. Grava `estorno_situacao = solicitado` e `estorno_valor` (§4.6). É este marco, e só ele, que libera o passo 5 da RN-062: esperar a confirmação para cancelar deixaria a inscrição pendurada por dias, ocupando vaga que já não tem dono, por uma resposta que quase sempre vem.
- **Efetivação** — o gateway confirma o estorno por **webhook** (RN-051), e aí grava `estorno_situacao = concluido` e `estorno_atualizado_em`. Só aqui o reembolso está efetivado, só aqui sai a notificação de reembolso concluído (§7) e só aqui o caso sai do acompanhamento.

Entre um marco e outro a inscrição está `cancelada` e a consulta por token diz a verdade: **reembolso solicitado**, com a data do pedido e o prazo do meio de pagamento — Pix volta em minutos, cartão volta na fatura, e o prazo do cartão é do emissor, não nosso, e por isso não é prometido como se fosse. A resposta síncrona da API **não é prova de dinheiro devolvido**; tratá-la como prova transfere para a secretaria um telefonema que a plataforma criou.

**Estorno aceito que não confirma em 7 dias vira pendência** para a coordenação, na mesma lista das outras (§6), com pessoa, valor e data do pedido. O prazo é folgado de propósito: quem estoura sete dias não está no prazo do emissor, está perdido, e é caso de ligar para o gateway. E **estorno aceito que depois é recusado ou revertido** grava `estorno_situacao = recusado` e vira a mesma pendência — a inscrição continua `cancelada`, porque de `cancelada` não se sai (RN-030), e o que a central deve ao inscrito entra na lista de devoluções pendentes (§4.6) até zerar. É o preço de destravar o cancelamento no aceite, e é um preço pequeno perto de segurar indefinidamente a vaga de quem já desistiu.

**RN-064** — **Contestação de cartão (chargeback).** Contestação não é estorno, e tratá-la como estorno comum erra em todos os pontos que importam. São quatro diferenças, e cada uma tem consequência própria:

- **A plataforma não pediu.** O estorno da RN-062 é ato nosso, por valor que nós calculamos; a contestação chega pronta, do emissor do cartão, pelo valor que o portador reclamou, às vezes numa inscrição que a coordenação nem sabia que tinha problema. Por isso ela não é gravada nos campos de estorno, que registram o que **pedimos** e o que voltou, e sim nos campos `contestacao_*` da cobrança (§4.6).
- **Pode ser revertida — ou perdida.** Estorno concluído acabou; contestação é disputa com prazo de defesa, e uma parte delas volta atrás. É exatamente por isso que ela **não cancela a inscrição sozinha** (RN-037): a pendência que ela abre se fecha sozinha **se a reversão chegar** antes de a coordenação decidir, e a pessoa nem fica sabendo que quase perdeu a vaga. Dos quatro valores de `contestacao_situacao`, **só `revertida` encerra a pendência por conta própria**. `perdida` **não** encerra: é o desfecho em que o emissor levou o dinheiro de vez, e fechar a pendência ali faria justamente o caso mais grave desaparecer do painel, com a vaga presa e ninguém para decidir (RN-037). A tela distingue os dois — contestação em disputa e contestação perdida (§6, §7) —, porque a coordenação decide diferente em cada um.
- **A vaga não se move.** A inscrição continua `confirmada` e continua ocupando vaga (RN-033), com pendência financeira visível para a coordenação (§4.6, §6), que decide entre cobrar de novo e cancelar (RN-037). A vaga **não** vai para a fila enquanto a pendência estiver aberta: oferecê-la e ter a contestação revertida em seguida criaria dois donos para o mesmo lugar, e o segundo já teria pago.
- **Custa mais que um estorno.** Além do valor, o gateway costuma reter uma tarifa de contestação. Ela é custo de meio de pagamento da central, como o MDR (RN-101), e é gravada em `estorno_tarifa_gateway` — o campo guarda o custo de meio de pagamento que a central absorve, e não é exclusivo do estorno —, de onde vira lançamento da categoria `meio de pagamento` na prestação de contas (§4.11, F7).

A taxa da plataforma volta proporcionalmente, como em qualquer dinheiro que saiu da conta da central (RN-097); revertida a contestação, ela volta a ser devida pelo mesmo cálculo. A contestação **não** entra nas faixas da RN-060: não é desistência de ninguém, e não há política de reembolso a aplicar sobre dinheiro que o emissor tirou por conta própria. Se a coordenação decidir cancelar (RN-037), é o cancelamento que segue a política, sobre o que tiver sobrado como valor efetivamente pago.

Contestação é do **cartão**. Pix e dinheiro não têm contestação: ali o que existe é estorno (RN-062) ou devolução registrada pela central (RN-061).

### F4 — Montagem da equipe e dos grupos
1. Coordenador do encontro define as áreas de servição e suas vagas.
2. Aloca cada servo confirmado numa área e, na própria área, aponta quem é o coordenador e quem é o vice (RN-046, RN-047). A função de cada servo sai desses ponteiros — não há como marcá-la separadamente e pôr as duas representações em desacordo.
3. Cria os grupos e roda a distribuição automática dos participantes (RN-045).
4. Ajusta manualmente e publica: cada servo passa a ver seu grupo e sua área. A publicação valida a invariante de coordenação das áreas (RN-046).

### F5 — Cronograma e condução do evento
1. Coordenação monta o cronograma a partir de um modelo (RN-048) ou do zero.
2. Cada etapa recebe área responsável e suas tarefas operacionais.
3. Durante o encontro, a coordenação enxerga a etapa atual, a próxima e o percentual de tarefas concluídas.
4. Servos marcam suas tarefas como concluídas.

Roteiro típico da primeira noite, usado como modelo de exemplo:

| Dia | Hora | Etapa | Área |
|---|---|---|---|
| Sexta | 19:00 | Recepção e entrega de credenciais | Recepção |
| Sexta | 19:30 | Guarda das malas e acomodação | Apoio |
| Sexta | 20:00 | Apresentação da equipe | Coordenação |
| Sexta | 21:30 | Dinâmica de integração | Apoio |
| Sexta | 22:00 | Pregação de abertura | Pregação |

### F6 — Credenciamento e check-in
1. Sistema gera crachás em PDF (lote ou individual) com nome de crachá, grupo, cor do grupo e QR code da inscrição.
2. Na recepção, a secretaria busca por nome/CPF ou lê o QR code e registra o check-in.
3. Inscrição passa a `presente` e `data_checkin` é gravada.
4. Painel de recepção mostra em tempo real: esperados, presentes, faltantes.

**RN-070** — Check-in só é permitido para inscrição `confirmada`. Inscrição `pendente_pagamento` exige que a secretaria registre o recebimento no ato — `dinheiro` ou `pix_presencial` (RN-040) — por baixa manual (RN-044) antes de liberar. Inscrição `confirmada` com **pendência financeira** em aberto (RN-037) segue exatamente o mesmo caminho: o crachá sai depois do recebimento, não antes. É aqui que desemboca toda inscrição não paga que atravessou o fechamento das inscrições sem expirar (RN-052). Confirmada a inscrição pela baixa, o check-in segue o caminho normal.

### F7 — Despesas e prestação de contas
1. Coordenadores de área lançam despesas com comprovante ao longo do encontro.
2. Coordenador do encontro aprova ou devolve cada lançamento.
3. Ao encerrar, o sistema fecha o relatório: receita confirmada por método × despesas por área e categoria × saldo.
4. Relatório exportável em PDF e planilha; encontro passa a `encerrado`.

**RN-080** — Encontro `encerrado` bloqueia novos lançamentos financeiros. Reabertura exige admin da central e fica registrada em auditoria.

### F8 — Contas de acesso: convite, ativação e revogação
§3 define sete papéis e, até a 1.3, nenhum fluxo dizia como alguém ganha ou perde acesso. Este é o fluxo; as regras são RN-017 a RN-019.

1. Quem convida escolhe **papel** e **escopo**, dentro do que a RN-018 permite, e informa o e-mail. A conta nasce `convidada`, com token de uso único e prazo de 7 dias (§4.15).
2. O convidado recebe o e-mail com o link (§7), abre, autentica e a conta passa a `ativa`. Token ligado ao e-mail do convite: autenticar com outro e-mail não ativa nada.
3. O papel vale a partir daí. Papel de **escopo largo** — `admin_central`, `admin_denominacao`, `operador` — vem da conta. Papel de **encontro** — coordenador do encontro, coordenador de área — não passa por este fluxo: vem dos ponteiros (RN-025, RN-046) e é concedido e retirado por lá (RN-017).
4. Mudança de papel, suspensão e revogação percorrem o mesmo caminho, com motivo, valendo **no ato** e registradas em auditoria (RN-018, §4.17).
5. Convite não aceito expira em 7 dias e não deixa conta ativa para trás — a conta permanece em `convidada`. Reconvidar **reaproveita a mesma conta**: emite token novo, com prazo novo, e invalida o anterior; não cria segunda conta para o mesmo par (inquilino, e-mail) (RN-017, RN-018).

O que este fluxo **não** faz: não cria acesso para o inscrito, que não tem conta (RN-019), e não cria pessoa — conta `servo` se liga a uma pessoa que já existe no cadastro do inquilino (§4.3).

### F9 — Reconhecimento da pessoa pelo CPF
É o que o passo 6 de F1 chama, e o que a criação administrativa (RN-035) chama pelo mesmo caminho.

1. **Normalização** — o CPF digitado é reduzido a 11 dígitos: fora ponto, traço, espaço e qualquer outro caractere, **preservando zero à esquerda** (RN-010a).
2. **Validação** — 11 dígitos, dígitos verificadores conferidos, e recusa das dez sequências de dígito repetido (RN-010a).
3. **Resolução da identidade** — rotina de sistema, jamais a pedido do inquilino (RN-001): devolve o vínculo com a identidade daquele CPF, criando-a com o nome e o nascimento da ficha se for a primeira vez na plataforma (RN-010, RN-011a). Não devolve nome, não diz se já existia e não indica em quantos inquilinos a pessoa aparece (RN-094a).
4. **Pessoa do inquilino** — havendo identidade e não havendo pessoa neste inquilino, o cadastro nasce **do zero**, com o que veio na ficha (RN-013). Nada é copiado de outro inquilino, nem o telefone.
5. **Divergência não bloqueia e não corrige.** Nome ou nascimento diferentes do que a identidade guarda: a identidade fica com o que o primeiro cadastro gravou e o inquilino fica com o que a pessoa escreveu hoje (RN-011a). Divergência é esperada, não erro.
6. **Sem CPF** — caminho próprio, na RN-010b, que não passa pelo site público.

**RN-010a** — **O CPF é normalizado antes de qualquer coisa, e validado antes de virar identidade.** A RN-010 faz do CPF a chave de reconhecimento da plataforma inteira e nunca disse o que conta como "o CPF".

**Onze dígitos e nada mais.** A plataforma guarda e compara sempre a forma normalizada; máscara é assunto de tela. Sem isso, o mesmo CPF entra duas vezes — `012.345.678-90` e `01234567890` são dois valores distintos para o índice único da RN-010 —, e a chave de reconhecimento entre inquilinos deixa de reconhecer exatamente a pessoa que ela existe para reconhecer.

**Zero à esquerda não se perde.** CPF é cadeia de dígitos, não número. Tratá-lo como inteiro em qualquer ponto do caminho — planilha de importação inclusive — transforma `01234567890` em `1234567890` e cria uma pessoa nova, com histórico próprio, ao lado da que já existia.

**Dígito verificador é recusa, não aviso.** CPF que não fecha não vira identidade. Identidade é a chave da plataforma inteira, e admitir chave inválida é admitir duplicata que ninguém consegue juntar depois. As dez sequências de dígito repetido — `00000000000` e as outras nove — **passam** no cálculo dos verificadores e são recusadas à parte, porque são o que se digita quando não se quer informar o CPF.

**O que a validação não faz**: não consulta a Receita, não confere se o CPF é de quem está preenchendo e não valida nome contra CPF. A plataforma valida **forma**, não titularidade; prometer a segunda exigiria consulta externa que não é objetivo do produto (§1). O desempate de homônimo e de dígito trocado continua sendo a data de nascimento (RN-011).

**RN-010b** — **Pessoa sem CPF.** A RN-010 faz do CPF a **única** chave de reconhecimento da plataforma, e o documento não previa quem não tem um: o estrangeiro sem CPF e o caso raro do menor que ainda não recebeu o dele. Não prever não faz o caso sumir — faz a coordenação cadastrar a pessoa com o CPF de um parente, que é pior que qualquer coisa nesta regra. O que fica decidido:

- **A ficha pública exige CPF.** O caminho sem CPF é **administrativo**, pela mesma porta da RN-035: papel mínimo coordenador do encontro, **justificativa obrigatória** e auditoria (§4.17). Mesmo tratamento da inscrição criada fora da janela, e pela mesma razão — é decisão humana que abre exceção, e exceção sem autor não se revisa.
- **A pessoa nasce sem identidade global.** `identidade_id` fica vazio (§4.3) — o primeiro dos três casos em que ele fica, ao lado da pessoa anonimizada pelo pedido de exclusão (RN-092b) e da pessoa anonimizada por idade (RN-093). Ela existe só naquele inquilino, não é reconhecida em outro e não é deduplicada: sem identidade, a RN-012 não tem o que aplicar, e duas fichas da mesma pessoa sem CPF são dois cadastros até alguém reconhecer e juntar.
- **Ela não é cidadã de segunda classe em mais nada.** Inscreve-se, ocupa vaga, paga, serve, faz check-in, exerce os direitos do titular (F10) e entra na anonimização (RN-093) como qualquer pessoa. O que ela não tem é o reconhecimento entre inquilinos — que é exatamente, e só, o que o CPF dá.
- **Ganhando CPF depois**, a coordenação o informa no cadastro e a pessoa passa pelo caminho normal da F9: resolve a identidade, vincula, e dali em diante é reconhecida como todo mundo. Se a resolução encontrar identidade que **já tem pessoa neste inquilino** (RN-012), o caso é duplicata: a saída é juntar os dois cadastros, com motivo e auditoria, e não criar um terceiro.
- **A rotina de limpeza não muda.** RN-099 apaga identidade órfã; pessoa sem identidade nunca é órfã de nada e simplesmente não entra nessa rotina.

### F10 — Exercício de direitos do titular
A RN-092 dá ao titular o direito de exportar e excluir, e até a 1.3 isso era um enunciado sem fluxo: sem dizer quem pede, o que sai, o que fica e o que acontece quando o pedido chega no meio de um encontro.

1. **Pedido.** O titular pede pelo link da própria inscrição, autenticado pelo `token_consulta` (RN-019), ou pelo contato do **encarregado** publicado no termo (§4.13) quando não tem o link à mão. Coordenação e admins não pedem no lugar de ninguém.
2. **Escopo.** O pedido vale para **um inquilino** — o que coletou os dados (RN-099). Quem viveu encontros em duas denominações pede duas vezes, e a plataforma não conta a uma que a outra existe (RN-094, RN-094a).
3. **Exportação** (RN-092a).
4. **Exclusão** (RN-092b), que às vezes é executada na hora e às vezes fica agendada.
5. **Registro.** Pedido, execução e adiamento entram em auditoria (§4.17) e são informados ao titular (§7). Pedido agendado continua visível no mesmo link, com a razão e a data prevista — pedido que some da tela é pedido que a pessoa acha que foi ignorado.

**RN-092a** — **Exportação: o que sai, em que forma, em quanto tempo.**

O arquivo traz tudo o que o inquilino guarda **daquele titular**: o cadastro de §4.3, os campos sensíveis de §4.3a, os consentimentos com versão do termo, data, hora, IP e situação atual (§4.14), as inscrições com situação e histórico de fila, as cobranças com valor, método, datas e o que foi estornado ou devolvido (§4.6), e as notificações enviadas a ele (§4.18). Vai junto o **texto** da versão do termo que ele aceitou, e não só o número dela: exportar o consentimento sem o que foi consentido entrega metade do documento.

**O que não sai**: dado de outra pessoa — o convidador que ele indicou aparece como nome, não como cadastro (RN-039), e o grupo dele não vem com a lista dos outros —, dado de outro inquilino (RN-094), a identidade global (§4.2, que não é do inquilino e da qual o inquilino não tem cópia) e a auditoria de atos de terceiros.

**Forma e prazo.** Formato legível por gente e por máquina — um PDF para ler e um arquivo estruturado para carregar em outro lugar —, entregue por **link temporário** de validade curta, e **nunca como anexo**: exportação de dado pessoal parada em caixa de e-mail alheia é vazamento com autorização nossa. Prazo de **15 dias**, e na prática o mesmo dia: o volume de um titular é pequeno, e o prazo que a lei dá não é o que o produto precisa gastar.

**Exportação não é exclusão** e não muda nada: pode ser pedida quantas vezes o titular quiser, e cada uma entra na auditoria.

**RN-092b** — **Exclusão: o que some, o que fica, e por que ela às vezes espera.**

O que a exclusão faz é o que a RN-093 já fazia por idade — **anonimizar a pessoa e apagar o dado sensível**:

- **`Pessoa`** (§4.3) — nome, nome de crachá, nascimento, telefone, e-mail, endereço, estado civil, contato de emergência e observações viram marcadores, `identidade_id` é **esvaziado** e `anonimizada_em` é gravado, exatamente como a anonimização por idade da RN-093 já faz. Esvaziar o ponteiro é o que faz o CPF do titular parar de ser alcançável a partir deste inquilino — sem ele, este cadastro não aponta mais para o registro global (§4.2), que é exatamente o que o pedido de exclusão promete (F10). A pessoa anonimizada — por pedido (RN-092b) ou por idade (RN-093) — é o **segundo e o terceiro** caso de `identidade_id` vazio, ao lado da pessoa sem CPF da RN-010b (§4.3);
- **`Dado sensível`** (§4.3a) — a linha é **apagada**, não anonimizada. Não há razão para guardar marcador de condição de saúde;
- **`Inscrição`** e **`Cobrança`** — **ficam**, com valores, datas e situações intactos, ligadas à pessoa anonimizada. É a preservação do registro financeiro que a RN-092 já mandava: prestação de contas de um encontro não se refaz porque um participante pediu exclusão, e o número que a central declarou continua tendo que fechar;
- **`Consentimento`** (§4.14) — fica, com o que é identificação direta anonimizado e o que é prova preservado: versão do termo, data, hora e o fato do aceite. O registro de que houve consentimento é o que sustenta o tratamento que já aconteceu;
- **`Auditoria`** (§4.17) — as linhas ficam, com o dado pessoal dentro de `antes`/`depois` substituído pelos mesmos marcadores (RN-106);
- **`Identidade`** (§4.2) — apagada quando não resta nenhuma pessoa vinculada a ela em nenhum inquilino, sempre pela rotina de sistema da RN-099 — o mesmo gatilho da RN-001 e da própria RN-099, sem qualificação extra: pessoa anonimizada já não conta, porque a anonimização acabou de esvaziar o ponteiro dela. Nunca como efeito direto do pedido, que é de um inquilino só;
- **`token_consulta`** (§4.5) — invalidado no ato. Depois da exclusão não há mais o que consultar.

**Quando a exclusão espera.** Pedido feito por quem tem **inscrição viva** — em situação não terminal, num encontro que ainda não foi `encerrado` — **não é recusado e não é executado no ato**: fica **agendado**, e roda sozinho quando a inscrição chega a estado terminal ou o encontro encerra. O titular é informado disso na hora, com a data prevista e com a alternativa que encurta o caminho: cancelar a inscrição (F3, com a política de reembolso da RN-060) antecipa tudo.

O motivo é o que se perde no meio. Apagar no sábado à noite quem vai ser recebido no domingo tira da recepção a lista, da cozinha a restrição alimentar e da coordenação o contato de emergência de alguém que está dentro do sítio. Enquanto a inscrição existe, o tratamento tem base própria na execução do que foi combinado — e **pedido de exclusão não é pedido de cancelamento**: quem quer sair do encontro cancela. São coisas diferentes que as pessoas às vezes pedem com a mesma frase, e tratá-las como uma só ou apaga quem ia comparecer, ou deixa no cadastro quem pediu para sair.

O mesmo adiamento vale para **pendência financeira aberta** (§4.6): dinheiro em trânsito não se resolve com o dono anonimizado no meio do caminho. Não é adiamento indefinido — resolvida a pendência, o pedido roda.

**Prazo.** 15 dias contados do desbloqueio, e o titular é notificado quando executa (§7).

---

## 6. Relatórios

Cada relatório e painel abaixo é regra numerada, como o resto do documento (§0.2): declara o que mostra, quem acessa e em que fase existe. O bloco nativo de Prestação de contas e relatórios (RN-080–RN-089) fecha nesta versão; o que não coube nele sai da faixa de extensão (RN-108–RN-111).

| RN | Relatório ou painel | Fase | Acesso |
|---|---|---|---|
| RN-081 | Lista de participantes por grupo (impressão) | Fase 2 | Coordenação, servos do grupo |
| RN-082 | Lista de servos por área e função (impressão) | Fase 2 | Coordenação, servos da área |
| RN-083 | Restrições alimentares consolidadas | Fase 2 | Cozinha (`papel = cozinha`, RN-047a), coordenação, admin da central |
| RN-084 | Condições de saúde e contatos de emergência | Fase 2 | Área de saúde (`papel = saude`, RN-047a), coordenação, admin da central |
| RN-086 | Situação financeira das inscrições (pagas, pendentes, canceladas) | Fase 1 | Coordenação, admin da central |
| RN-087 | Pendências financeiras do encontro | Fase 1 | Coordenação, admin da central; recepção (RN-070) a partir da Fase 2 |
| RN-088 | Prestação de contas do encontro | Fase 3 | Coordenação, admin da central |
| RN-089 | Registro de acesso de suporte (§4.16) | Fase 1 | Admin da denominação |
| RN-108 | Pedidos de exportação e exclusão (F10) | Fase 1 | Admin da denominação, admin da central |
| RN-109 | Painel da central | Fase 3 | Admin da central |
| RN-110 | Painel da denominação | Fase 3 | Admin da denominação |
| RN-111 | Painel do operador | Fase 1 | Operador |
| RN-115 | Painel do encontro | Fase 1 | Coordenação do encontro, admin da central |

**RN-081** — Lista de participantes por grupo, para impressão. **Fase 2** — depende de Grupo (§4.7), que só existe a partir de F4.

**RN-082** — Lista de servos por área e função, para impressão; a função impressa é a derivada dos ponteiros de coordenação da área (RN-046). **Fase 2** — depende de Área de servição (§4.8), que só existe a partir de F4.

**RN-083** — Restrições alimentares consolidadas, entregue à cozinha com nome e grupo — é uma das duas exceções nomeadas da RN-091a à proibição geral de junção com `Dado sensível da pessoa` (§4.3a), com cada **emissão** do relatório registrada em auditoria, não cada pessoa listada. **Fase 2** — a lista é organizada por grupo (§4.7), que só existe a partir de F4, ainda que o campo `restricao_alimentar` já exista desde a Fase 1.

**RN-084** — Condições de saúde e contatos de emergência. A tela junta dois tipos de dado com regra de acesso diferente: `contato_emergencia_nome` e `contato_emergencia_telefone` são campo comum de `Pessoa` (§4.3), sem restrição especial além do acesso normal por papel (§3); `condicao_saude` e `medicamentos_uso_continuo` são de `Dado sensível da pessoa` (§4.3a) e só entram aqui porque este relatório é a outra exceção nomeada da RN-091a à proibição de junção — acesso restrito à coordenação do encontro, ao admin da central e aos servos da área com `papel = saude` (RN-047a, RN-091), com cada emissão registrada em auditoria (RN-091a). O acesso de suporte (RN-005a) não alcança os dois campos sensíveis em hipótese alguma, com ou sem concessão. **Fase 2** — a área de servição com `papel = saude` (RN-047a) só existe a partir de F4, ainda que os campos sensíveis já existam desde a Fase 1.

**RN-086** — Situação financeira das inscrições do encontro (pagas, pendentes, canceladas), tela operacional da área administrativa. **Fase 1** — Cobrança e Inscrição são entidades da fase, e é sobre elas que F1 a F3 operam.

**RN-087** — **Pendências financeiras do encontro.** As cinco pendências derivadas de §4.6, numa lista só, com pessoa, valor e desde quando: inscrição `confirmada` com pagamento estornado, estornado em parte ou contestado (RN-037, RN-064), **distinguindo contestação em disputa de contestação perdida** — a primeira ainda pode se resolver sozinha pela reversão, a segunda é dinheiro que já não volta, e a decisão da coordenação é outra em cada caso; devolução pendente, presencial de encontro cancelado (RN-061) ou de dinheiro recebido a mais (RN-037); estorno recusado pelo gateway ou sem resultado conhecido depois de falha de comunicação (RN-061, RN-062), dizendo qual dos dois é; estorno aceito e sem confirmação há mais de 7 dias (RN-063); cobrança em `pendente_emissao` por indisponibilidade de recebimento, com a vaga reservada (RN-098). É a tela que a coordenação usa para decidir caso a caso e a que a recepção consulta antes de liberar o crachá (RN-070) — o acesso da recepção começa na **Fase 2**, junto com o check-in (RN-070); na Fase 1 a tela é só de coordenação e admin da central. **Fase 1**, com F3: é o que torna operáveis a RN-037 e a RN-061 — sem a lista, a decisão que as duas regras entregam à coordenação não tem onde acontecer (§10).

A mesma tela mostra ainda a **lista de notificações que esgotaram o teto de tentativas** (RN-107) — não é uma sexta pendência: não deriva da cobrança (§4.6), deriva da entidade Notificação (§4.18), e por isso fica descrita aqui em vez de na tabela de cinco acima. É o que a RN-107 promete quando diz que a notificação em `falha` "aparece para a coordenação junto com as pendências do encontro" — esta é a lista, com gatilho, destinatário e o erro registrado, para a coordenação saber quem não recebeu o quê e agir por outro canal.

**RN-088** — Prestação de contas do encontro: receita confirmada por método × despesas por área e categoria × saldo (passo 3 de F7), exportável em PDF e planilha. **Fase 3** — depende de Despesa (§4.11) e do fechamento de F7.

**RN-089** — Registro de acesso de suporte (§4.16): o que o operador leu sob concessão, item a item, com data, hora, e o motivo e o prazo da concessão (RN-005a). Tela do admin da denominação. **Fase 1** — a concessão é entidade da fase, e sem esta tela ela é acesso permanente com passos a mais.

**RN-108** — Pedidos de exportação e exclusão (F10): o que foi pedido, o que já executou, o que está agendado e por qual razão (RN-092a, RN-092b). Tela do admin da denominação e do admin da central. **Fase 1** — F10 é fluxo da fase.

**RN-109** — Painel da central: histórico de encontros, evolução de público, ticket médio. **Fase 3** — painel de indicadores (§10).

**RN-110** — Painel da denominação: encontros por central, participantes no período, arrecadação consolidada. **Fase 3** — painel de indicadores (§10).

**RN-111** — Painel do operador: inquilinos ativos, encontros realizados no período, volume transacionado, taxa da plataforma apurada (RN-102), saúde das conexões de recebimento (§4.12). **Fase 1** — é o painel que o operador precisa desde a implantação do primeiro inquilino, sob a restrição da RN-085 abaixo.

**RN-085** — O painel do operador trabalha exclusivamente com números agregados. Nenhum relatório da plataforma exibe nome, contato ou dado sensível de participante para o operador (RN-005).

**RN-115** — **Painel do encontro.** Tela operacional central da coordenação, que reúne os alertas e pendências que as regras da fase já produzem e que precisavam de um lugar único para aparecer:

- alerta permanente de **coordenador do encontro ausente**, enquanto `coordenador_inscricao_id` está vazio ou acabou de ser limpo pelo cancelamento da inscrição apontada (RN-025);
- alerta permanente de **vaga acima do limite** cadastrado, aberta por promoção manual ou por criação administrativa do excedente (RN-035, RN-036);
- **pendência de vaga** do promovido cujo prazo estourou depois do fechamento das inscrições (RN-036);
- as **pendências financeiras** da RN-087 — a mesma lista, na mesma tela, e não uma segunda;
- **vagas reservadas** por cobrança em `pendente_emissao`, com pessoa e desde quando (RN-098).

**Fase 1**: cada alerta que o compõe já existe na fase — é o mesmo motivo por trás da RN-087 estar na Fase 1 apesar de os demais relatórios de §6 serem de fases seguintes. Acesso: coordenação do encontro, admin da central.

---

## 7. Notificações

Canais: e-mail (transacional) e WhatsApp (a definir provedor; na fase 1, link `wa.me` gerado manualmente pela secretaria).

**Canal autoritativo na Fase 1.** E-mail é o único canal que o sistema garante e mede: cada linha da tabela abaixo nasce como um registro de Notificação (§4.18), com `situacao`, `tentativas` e `chave_unica` — é dele que a coordenação sabe se um aviso falhou (RN-107). WhatsApp, enquanto a decisão em aberto nº 1 (§11) não sai, **não** passa por essa entidade: é um link `wa.me` pronto que a secretaria dispara manualmente, sem registro de envio, sem retentativa e sem garantia nenhuma de entrega — é conveniência, não caminho redundante. Nenhuma regra deste documento pode depender de o inscrito ter recebido pelo WhatsApp: o prazo da RN-052, o aviso da promoção (RN-033) e qualquer outro gatilho com consequência de negócio estão cobertos, na Fase 1, **só** pelo e-mail. Quando o provedor de WhatsApp for escolhido (fase 2 ou 3), ele passa a nascer como Notificação como qualquer canal, com sua própria `situacao` e `chave_unica`.

**Idempotência do disparo.** É a RN-107 (§4.18): `chave_unica` compõe gatilho, destinatário e discriminador do evento, e é ela — não um `if` espalhado por cada gatilho — que garante que o mesmo evento nunca dispara duas vezes. Webhook reprocessado (RN-050) tenta gravar a mesma chave e não grava a segunda.

**Identidade do remetente.** Todo e-mail sai com o **nome e a marca do inquilino** no remetente de exibição — nunca a plataforma como remetente genérico — e com endereço de resposta que chega à **secretaria da central** que organiza o encontro a que a notificação se refere: o `email_contato` da central (§4.1), herdado por cópia do `email_contato` do inquilino na criação da central (RN-103) e editável dali em diante, independente do inquilino depois. Notificação que não está ligada a um encontro específico — convite de acesso (RN-018), versão nova do termo (RN-090a), exportação e exclusão de dados (F10) — usa o `email_contato` do próprio inquilino (§4.0), que é quem responde por esses atos. Campo vazio nos dois níveis não deixa o e-mail sem sair: cai num endereço de resposta padrão da plataforma, e o nome de exibição continua sendo o do inquilino. E-mail de "Plataforma de Retiros" sem identificação do inquilino é o tipo de mensagem que o inscrito marca como golpe e que o provedor de e-mail aprende a jogar em spam. O domínio técnico de envio (SPF/DKIM) é da plataforma, porque autenticar domínio próprio de cada inquilino não é objetivo do produto (§1); o que muda por inquilino (ou por central) é sempre o nome de exibição e o endereço de resposta, nunca o domínio técnico.

**Coordenação do encontro, como destinatário.** As linhas da tabela abaixo endereçadas a "Coordenação do encontro" resolvem para a conta por trás de `coordenador_inscricao_id` (RN-025) — a conta `servo` com o ponteiro, que a RN-017 já reconhece como coordenador do encontro. Enquanto o ponteiro está vazio, ou aponta para uma inscrição que foi cancelada e ainda não foi substituído (RN-025), o destinatário cai para o **admin da central**, que já responde pelo encontro nesse intervalo (RN-025, §3) — é o mesmo destinatário que a RN-025 já dá o poder de decidir enquanto não há coordenador nomeado, e a pendência financeira precisa de alguém que decida. Havendo coordenador apontado, **só ele** recebe: o admin da central não é copiado por padrão, porque cada encontro tem coordenação própria e endereçar todo aviso à estrutura administrativa da central inteira é ruído que ensina a ignorar a notificação.

**Rótulos do inquilino.** Todo corpo de notificação usa os rótulos do inquilino (RN-008), como qualquer tela ou PDF gerado pelo sistema — é a mesma obrigação da **RNF-007** (§8.1), que esta seção não citava. "Sua inscrição de **obreiro** foi confirmada" e "Sua inscrição de **servo** foi confirmada" são o mesmo e-mail, gerado pelo mesmo gatilho, com o rótulo do inquilino no lugar do termo interno.

**Opt-out.** Notificação **transacional** — a que decorre de um ato do próprio inscrito ou de algo que afeta a vaga ou o dinheiro dele (inscrição criada, pagamento, promoção, cancelamento, reembolso, pendência, exclusão) — não tem opt-out: é comunicação necessária para operar a inscrição, e desligá-la deixaria a pessoa sem saber que perdeu a vaga. A que **não** é transação em curso teria opt-out, com base no próprio consentimento (RN-090, §4.14) — finalidade que a pessoa não aceitou não gera notificação daquela finalidade. Não existe hoje, na tabela abaixo, gatilho que dependa disso: o **lembrete** (RN-113) é o único candidato ao padrão, e fica sem opção de desligar na Fase 1 porque é o aviso que evita o encontro perder gente por esquecimento — o mesmo motivo por trás de o consentimento de retenção (RN-093a) ser opcional e o consentimento obrigatório (RN-090b), não.

**Três gatilhos que não tinham regra.** A maioria das linhas abaixo já citava a regra de origem antes desta versão (RN-033, RN-061, RN-098...) — a tabela apenas move essa citação para uma coluna própria. Três não citavam nada, porque nenhuma regra do documento as declarava:

**RN-112** — Notificação de inscrição criada é disparada assim que a Inscrição existe (F1, passo 6), qualquer que seja a situação — `pendente_pagamento`, `lista_espera` ou a administrativa da RN-035 —, e é o e-mail que carrega o `token_consulta` (RN-019). Diferente de "pagamento aprovado" (RN-032): quem cai em lista de espera nunca recebe cobrança, mas precisa do link para acompanhar a posição na fila.

**RN-113** — Lembrete do encontro, 7 dias e 1 dia antes de `data_inicio`, para toda inscrição `confirmada`. Sem opt-out (ver acima) e independente de grupo, área ou cronograma — por isso é Fase 1, ainda que a alocação em grupo (RN-114) só exista a partir da Fase 2.

**RN-114** — Alocação em grupo ou em área de servição publicada (passo 4 de F4) notifica cada servo do que foi decidido para ele. **Fase 2** — depende de Grupo (§4.7) e Área de servição (§4.8), que só existem a partir de F4.

| RN | Gatilho | Destinatário | Fase |
|---|---|---|---|
| RN-112 | Inscrição criada | Inscrito | Fase 1 |
| RN-032 | Pagamento aprovado | Inscrito | Fase 1 |
| RN-052 | Pagamento pendente (aviso em 24h e 48h) | Inscrito | Fase 1 |
| RN-033 | Promoção da lista de espera, com o prazo em data e hora | Inscrito | Fase 1 |
| RN-033 | Prazo do promovido estourado: volta ao fim da fila | Inscrito | Fase 1 |
| RN-033 | Fechamento das inscrições sem vaga, com convite para o próximo encontro | Quem ficou em `lista_espera` | Fase 1 |
| RN-098 | Vaga reservada com o pagamento indisponível, e o link assim que sair | Inscrito | Fase 1 |
| RN-062 | Cancelamento e reembolso | Inscrito | Fase 1 |
| RN-063 | Reembolso efetivado, quando o gateway confirma | Inscrito | Fase 1 |
| RN-061 | Encontro cancelado, com o motivo | Todos os inscritos, inclusive a lista de espera | Fase 1 |
| RN-037, RN-064 | Pendência financeira em inscrição confirmada, dizendo se a contestação está **em disputa** ou **perdida** | Coordenação do encontro | Fase 1 |
| RN-062 | Estorno recusado pelo gateway, ou sem resultado conhecido depois de falha de comunicação | Coordenação do encontro | Fase 1 |
| RN-063 | Estorno aceito e sem confirmação há 7 dias | Coordenação do encontro | Fase 1 |
| RN-064 | Contestação de cartão recebida | Coordenação do encontro | Fase 1 |
| RN-064, RN-037 | Contestação de cartão perdida, com a pendência que continua aberta | Coordenação do encontro | Fase 1 |
| RN-098 | Recebimento indisponível, antes de a primeira inscrição falhar | Operador e admin da denominação | Fase 1 |
| RN-113 | Lembrete — 7 dias e 1 dia antes | Todos os confirmados | Fase 1 |
| RN-114 | Alocação em grupo/área publicada | Servos | Fase 2 |
| RN-018 | Convite de acesso, com o link e o prazo de 7 dias | Convidado | Fase 1 |
| RN-018 | Conta suspensa ou revogada, com o motivo | Titular da conta | Fase 1 |
| RN-005a | Acesso de suporte concedido, com operador, motivo e prazo | Admin da denominação | Fase 1 |
| RN-090a | Versão nova do termo publicada, com o que mudou | Inscritos com inscrição viva no inquilino | Fase 1 |
| RN-092a | Exportação de dados pronta, com o link temporário | Titular | Fase 1 |
| RN-092b | Exclusão executada, ou agendada com a razão e a data prevista | Titular | Fase 1 |
| RN-107 | Notificação que falhou depois do teto de tentativas | Coordenação do encontro | Fase 1 |

---

## 8. Stack e arquitetura

| Camada | Escolha |
|---|---|
| Front | Angular (SSR na área pública, para indexação da agenda) |
| API | NestJS |
| Banco | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Arquivos | Supabase Storage (comprovantes, imagens de capa, crachás) |
| Hospedagem front | Vercel |
| Hospedagem API | Railway |
| Pagamentos | Mercado Pago — marketplace, com split (Pix + cartão parcelado, webhook) |

### 8.1 Multi-inquilino

**RNF-001** — Schema único, com `inquilino_id` e `central_id` em toda tabela de domínio, inclusive nas que poderiam derivar o par por join — denormalização deliberada, porque este é o filtro mais executado do sistema. O isolamento é imposto por **Row Level Security no Postgres**, não por `where` no código da aplicação. A API conecta com role sem `BYPASSRLS` e define o contexto por transação; query que esquecer o filtro retorna zero linhas em vez de vazar. Validado por teste automatizado no CI.

As únicas exceções, todas declaradas aqui:

| Entidade | Tratamento |
|---|---|
| `Inquilino` (§4.0) | é a raiz do isolamento; não carrega o par |
| `Central` (§4.1) | carrega `inquilino_id`; seu próprio `id` é o `central_id` das demais |
| `Identidade` (§4.2) | global, fora do isolamento, sem leitura por role de aplicação (RN-001, RN-094) |
| `Pessoa` (§4.3) | carrega `inquilino_id` e **não** carrega `central_id`: é do inquilino, não da central (RN-014). `central_origem_id` é dado de relatório, não fronteira |
| `Dado sensível da pessoa` (§4.3a) | carrega `inquilino_id` e segue o par pela pessoa; além da RLS tem política própria de leitura, por campo e por área (RN-091a), da qual o papel `operador` é excluído sem exceção por concessão |
| `Conta de acesso` (§4.15) | carrega `inquilino_id`, exceto a conta de papel `operador`, a única que vive fora de um inquilino (RN-004, RN-017) |
| `Evento de webhook` (§4.19) | **sem** isolamento por inquilino: nasce antes de sabermos de quem é, e `inquilino_id` é preenchido depois ou nunca. Acesso só do processador e do operador, e nunca exposta em endpoint de inquilino (RN-053) |
| `Termo do inquilino` (§4.13) | carrega `inquilino_id` e **não** carrega `central_id`: o termo é do inquilino, não de uma central (RN-090a) |
| `Consentimento` (§4.14) | carrega `inquilino_id` e **não** carrega `central_id`: acompanha o termo que aceita, que é do inquilino (RN-090b) |
| `Concessão de acesso de suporte` (§4.16) | carrega `inquilino_id` e **não** carrega `central_id`: a concessão é de um inquilino inteiro, não de uma central (RN-005a) |
| `Conexão de recebimento` (§4.12) | carrega `inquilino_id`; `central_id` é **opcional** — vazio é conexão do inquilino inteiro, preenchido é conexão daquela central (RN-105) |
| `Modelo de cronograma` (§4.20) | carrega `inquilino_id`; `central_id` é **opcional** — vazio é o modelo do inquilino, preenchido é a adaptação da central (RN-048a) |
| `Auditoria` (§4.17) | carrega `inquilino_id`, exceto os atos de escopo de plataforma sobre conta de papel `operador` — convite, mudança de papel e revogação (RN-018) —, que ficam com `inquilino_id` vazio pela mesma razão da conta que registram: `operador` vive fora de um inquilino (RN-004, RN-017). `central_id` segue o mesmo par das entidades acima quando a entidade auditada não o carrega |

**Fronteira de confiança: o front nunca fala com o banco.** A stack lista Supabase Auth e Supabase Postgres ao lado de uma API NestJS, e o parágrafo acima funda o isolamento em "a API conecta com role sem `BYPASSRLS` e define o contexto por transação" — os dois só coexistem se o navegador não tiver caminho nenhum até o Postgres que não passe por ali. Fica decidido: **o front acessa o domínio exclusivamente pela API.**

- **Nenhuma tabela de domínio é alcançável pelo navegador.** O `supabase-js` do front é usado só para o fluxo de autenticação (login, refresh de sessão) — nunca para `.from()` em tabela de domínio. O endpoint autogerado do PostgREST do Supabase, se ativo por padrão na instância, não recebe `grant` nenhum das roles que o navegador pode assumir (`anon`, `authenticated`) em tabela de domínio nenhuma: as políticas de RLS deste documento são escritas para a role dedicada da API, condicionadas ao contexto de sessão abaixo, e não para `auth.uid()` — que é o mecanismo que o PostgREST usaria se estivesse liberado. Um pedido que chegasse por ali, mesmo com um JWT válido do Supabase Auth, voltaria zero linhas, pela mesma garantia que protege quem esquece o filtro no código da aplicação.
- **Supabase Storage é a única exceção que o navegador toca direto, e tem dois caminhos, por classe de arquivo.** Arquivo que carrega dado pessoal — comprovante de despesa, crachá em PDF (§4.11, F6), qualquer anexo ligado a uma pessoa — só sai por **link assinado de curta duração emitido pela API**, nunca por uma chave de acesso amplo ao bucket entregue ao cliente: é o mesmo princípio da RN-042 (nunca trafegar dado de cartão pela aplicação) aplicado a arquivo. Marca do inquilino (logo, cores) e **imagem de capa do encontro** (§4.4) são outra classe: conteúdo público, que a página do encontro em SSR serve no pico de tráfego da abertura das inscrições (RNF-013) e que RN-024 e RNF-002 existem para deixar indexável — link assinado de curta duração não é cacheável por CDN, muda a cada render e adiciona uma chamada à API na página de maior tráfego da plataforma. Essas ficam num **bucket público**, servidas por URL estável e cacheável, direto do Storage, sem passar pela API a cada carregamento; a regra que sustenta separar os dois buckets é a mesma que separa as duas classes de arquivo: **nenhum dado pessoal entra no bucket público**, nunca — é o bucket de marca e de divulgação, não de cadastro.

**Como a sessão do Supabase Auth vira contexto de isolamento.** É o que o parágrafo do isolamento por RLS pressupõe e não dizia: de onde vêm o inquilino, a central e o papel que a API grava por transação.

1. O inquilino da requisição já foi resolvido pelo host (RNF-006), antes de qualquer coisa — inclusive em rota autenticada: a área administrativa de um inquilino vive no subdomínio (ou domínio próprio) dele, não numa rota neutra.
2. A API valida o JWT do Supabase Auth (assinatura, emissor, expiração) e lê o e-mail verificado — nunca o nome, que a pessoa pode editar no provedor.
3. Resolve a **Conta de acesso** (§4.15) pelo par (`inquilino_id` do passo 1, e-mail do passo 2) — a mesma chave que a RN-017 já usa para dizer que uma conta é de um par (inquilino, e-mail). Para a rota do **operador**, que não vive num inquilino (RN-004, RN-017), o par vira (`papel = operador`, e-mail), sem `inquilino_id`. Não achar conta correspondente, ou achar uma com `situacao` diferente de `ativa` (RN-018), é `401`/`403` — nunca a criação de um contexto parcial.
4. `central_id` e o **papel efetivo** saem do tipo de conta (RN-017): vazio para `admin_denominacao` e para `operador`; o da própria conta para `admin_central`; para `servo`, **não** vem da conta — vem da inscrição ou do ponteiro de coordenação (RN-025, RN-046) do encontro específico que a requisição está tocando, resolvido e validado a cada chamada, nunca fixado na sessão.
5. Só então a API abre a transação e grava o contexto de sessão (inquilino, central, papel) que a RLS lê — antes da primeira consulta de domínio, na mesma transação que as executa, nunca numa conexão reaproveitada de outra requisição sem regravar o contexto.

**O mesmo contexto, sem sessão do Supabase Auth.** Os cinco passos acima pressupõem um JWT — mas o caminho de escrita mais executado da Fase 1 não tem um: F1 cria `Pessoa`, `Inscrição`, `Consentimento` e `Cobrança` a partir de um visitante anônimo na ficha pública. Os mesmos três valores do contexto de transação têm resposta própria ali:

- **`inquilino_id`** é o do host resolvido no passo 1 (RNF-006) — o mesmo predicado, sem JWT nenhum para validar contra ele.
- **`central_id`** é o da central do encontro que a requisição está tocando, resolvido pelo slug da central e do encontro na URL (RN-024) e **validado contra o `inquilino_id` do passo 1** antes de abrir a transação: encontro cujo slug resolve para uma central de outro inquilino nesse host é erro de rota, não gravação silenciosa numa central errada.
- **`papel`** grava `publico` — o mesmo valor que `ator_tipo` já usa na auditoria para a inscrição pelo site (RN-106) —, distinto dos quatro papéis de conta (RN-017). A política de RLS (`00-multi-inquilino.md` §2.3) trata esse valor como qualquer papel que não seja `admin_denominacao`: a escrita casa por `central_id` e nunca atravessa central nenhuma.

**RNF-006** — Cada inquilino tem subdomínio próprio (`homens-de-fe.app.com.br`) e, opcionalmente, domínio próprio verificado por DNS. O inquilino da requisição é resolvido pelo host, antes de qualquer consulta.

**Consequências da hospedagem (§8).** O subdomínio é resolvido por um curinga (`*.app.com.br`) apontado para o front na Vercel, que emite certificado TLS para o curinga inteiro — um inquilino novo entra no ar sem nova configuração de domínio, só com a linha nova na tabela `Inquilino` (§4.0). Domínio próprio é outro caminho: o admin da denominação aponta um CNAME (ou registro equivalente) para a plataforma, e **até a verificação passar, o domínio não serve nada** — o subdomínio continua sendo o endereço válido nesse intervalo, e a tela de configuração mostra a verificação como pendente, não como concluída por otimismo. A resolução por host (acima) passa a checar **dois** conjuntos — subdomínios do curinga e domínios próprios verificados — antes de decidir de qual inquilino é a requisição; a rota que a API expõe para `Access-Control-Allow-Origin` segue a mesma lista, dinâmica, porque domínio próprio é adicionado em tempo de execução por um admin, não em deploy.

**Host do operador.** A área do operador (RN-111) não pertence a inquilino nenhum, e por isso não vive em subdomínio de tenant algum: é servida num host próprio da plataforma (por exemplo `operador.app.com.br`), fora dos dois conjuntos de host que a RNF-006 resolve — o curinga de inquilino e o domínio próprio verificado. A resolução por host (acima) reconhece esse terceiro host **antes** de aplicar o predicado de tenant, para que ele não caia na regra de host desconhecido (RN-061t) nem exija `inquilino_id` nenhum no contexto de transação — o operador é a única conta que vive fora de um inquilino (RN-004, RN-017), e sua rota não podia viver dentro de um. A lista de `Access-Control-Allow-Origin` (acima) inclui esse host como uma entrada fixa própria, e não como parte da lista dinâmica de domínios de inquilino.

Sessão do navegador é por origem: quem loga com domínio próprio e depois acessa pelo subdomínio (ou o contrário) **não continua logado** — são origens diferentes para o `localStorage` que guarda a sessão do Supabase Auth, e login de novo é o comportamento esperado, não um defeito a reportar. DNS de domínio próprio que quebra depois de verificado (registro removido, certificado que não renova) tira **só aquele endereço** do ar; o subdomínio permanece alcançável o tempo todo, como saída de emergência que não depende de DNS de terceiro.

**RNF-007** — Toda tela e todo texto gerado pelo sistema — inclusive e-mail e PDF de crachá — usa os rótulos do inquilino (RN-008), nunca o nome interno do conceito.

### 8.2 Demais requisitos

**RNF-002** — Área pública responsiva e mobile-first: a maioria das inscrições virá de celular, por link compartilhado em grupo de mensagem.

**RNF-003** — Telas de recepção e de cronograma precisam funcionar com internet instável (retiros costumam ser em chácara/sítio): leitura em cache local e fila de sincronização para check-in.

**Fase e escopo.** É o requisito mais caro do documento — cache local, fila de sincronização e resolução de conflito não são checkbox, são subsistema —, e até esta versão não pertencia a fase nenhuma. **É da Fase 2**, junto com F5 (cronograma) e F6 (credenciamento e check-in), porque é exatamente essas duas telas, e só elas, que o requisito alcança: nada na ficha de inscrição pública (F1), no pagamento (F2, F3) ou nas telas de configuração da área administrativa opera offline — todas dependem de escrever numa cobrança ou numa inscrição de forma que a RLS e o gateway possam validar na hora, e cache local ali produziria dois inscritos pagando a mesma vaga, não conveniência. O que fica dentro do requisito:

- **Leitura** — a lista de esperados do check-in (`nome_completo`, `nome_cracha`, grupo e situação da inscrição — os campos que `Pessoa` e `Inscrição` de fato guardam, §4.3, §4.5) e o cronograma do dia são baixados para o dispositivo **antes** de a conexão cair, tipicamente ao abrir a tela na sexta à tarde. **Não** leva CPF nem foto: CPF não está em `Pessoa`, está na identidade global (§4.2), que papel de aplicação nenhum lê (RN-001, RN-094); foto não é campo de `Pessoa` nenhuma. Copiar qualquer um dos dois para um tablet que sai do sítio seria decisão de proteção de dado que este requisito não pode tomar de passagem.
- **Escrita** — check-in (RN-070) e conclusão de tarefa da etapa (§4.10) são gravados localmente e entram numa fila; a sincronização, quando a conexão volta, é **idempotente** — reenviar o mesmo check-in não duplica `data_checkin` — e resolve conflito (duas secretarias com o mesmo dispositivo offline registrando check-in da mesma inscrição) pelo primeiro registro que chegar, com o segundo descartado e visível na tela como "já registrado por outro dispositivo", nunca como erro silencioso.
- **Fora do escopo** — pagamento, baixa manual de valor (RN-044) e qualquer escrita em Cobrança continuam exigindo conexão: dinheiro não entra numa fila local que pode nunca sincronizar.

**RNF-004** — Todo webhook de pagamento é persistido bruto antes de ser processado. A entidade é §4.19, e a RN-053 diz o que ela guarda, por que ela é a única que nasce sem dono e por quanto tempo o corpo bruto fica.

**RNF-005** — Auditoria de alterações em inscrição, cobrança, despesa e prestação de contas: quem, quando, valor antes e depois. A entidade é §4.17, e a RN-106 amplia a lista, declara onde `motivo` é obrigatório, quais são as duas únicas leituras auditadas e o que a auditoria nunca guarda.

**RNF-008** — **Fuso e representação de data/hora.** Todo carimbo de tempo é `timestamptz`, gravado em UTC; a interface converte para `America/Sao_Paulo` — o fuso que toda regra deste documento já assume ao falar em "dias corridos" e "hora de Brasília" (RN-033, RN-052, RN-060). Campo só-data, como `data_inicio` do encontro, é `date`, sem fuso.

**RNF-009** — **Dinheiro.** `numeric(10,2)` no banco; `number` em reais nos contratos de API — o gateway recebe decimal, não centavos. Nunca `float`: a diferença de arredondamento entre `float` e `numeric` é exatamente o tipo de erro que some em ambiente de teste e aparece só quando a taxa da plataforma (RN-043) ou uma faixa de reembolso (RN-060) fecha um centavo errado.

**RNF-010** — **Identificadores.** `uuid v7`, gerado pela aplicação — ordenável por tempo, o que ajuda índice sem abrir mão da propriedade abaixo. Chave natural nunca é chave primária. Ids são únicos na plataforma inteira e **nunca sequenciais por inquilino**: sequencial permite a um inquilino enumerar ou estimar o tamanho de outro pela contagem de ids emitidos, o mesmo risco que a RN-094a fecha para nome e CPF.

**RNF-011** — **Envelope de erro da API.** Formato único:

```json
{
  "erro": {
    "codigo": "VAGAS_ESGOTADAS",
    "mensagem": "Não há vagas de participante para este encontro.",
    "detalhes": { "vagasRestantes": 0 }
  }
}
```

`codigo` é estável e é contrato — spec e front dependem dele para decidir o que fazer, não para mostrar texto —; `mensagem` é para o usuário e pode mudar sem quebrar ninguém. Toda situação de erro de domínio, inclusive a transição inválida (`409 CONFLITO_DE_SITUACAO`, §0.2 de `specs/fase-1/README.md`) e a limitação de taxa (RNF-012), responde dentro deste envelope — nunca um `500` genérico nem um corpo de formato diferente por rota.

**RNF-012** — **Limitação de taxa e proteção contra abuso em endpoint público.** A ficha de inscrição (F1) é o caso central — endpoint **sem autenticação** que grava dado pessoal, inclusive sensível (§4.3a), e dispara e-mail (RN-107) —, e o mesmo raciocínio vale para qualquer outra rota pública que crie registro ou dispare notificação, como a regeração de Pix (RN-041) ou o reenvio de link. As duas exigem:

- **limite de taxa por IP e por CPF normalizado** (RN-010a), para impedir que um script crie centenas de "pessoas pendentes" via inscrições repetidas nunca pagas, ou esgote o teto de tentativas de notificação (RN-107) de um CPF alheio;
- **resposta que não revela existência.** Estourar o limite é erro dentro do envelope da RNF-011, nunca um comportamento que deixe transparecer se aquele CPF já existe na plataforma (RN-094a) ou em qual inquilino — a proteção contra abuso não pode abrir a porta que a RN-001 fecha.

O limiar exato e o mecanismo (janela fixa, *sliding window*, captcha) são decisão de implementação, não deste documento — o que ele exige é que a proteção exista e onde.

**RNF-013** — **Volume esperado e pico de concorrência.** É o número que dimensiona a estratégia de controle de vagas (contagem sob lock, sem contador denormalizado — RN-033 e as regras de spec de `05-lista-de-espera.md`), não o inverso. Estimativa de partida, do dono do produto: um encontro típico fica entre **50 e 300 inscrições** (participante mais servo); o pico de concorrência real não é o volume total, é o **instante da abertura de um encontro popular divulgado num grupo de mensagem**, em que dezenas de pessoas tentam se inscrever nos primeiros minutos, concentradas na disputa pela última vaga do tipo. Na plataforma inteira, dezenas de inquilinos, cada um com poucas centrais publicando poucos encontros simultâneos — não é tráfego de e-commerce de massa, e dimensionar Railway/Supabase para milhares de conexões concorrentes por segundo seria engenharia além do que §1 pede. É estimativa, não medição: o número real da primeira central ativa corrige este parágrafo, não o inverso.

### 8.3 Recebimento e split

O dinheiro da inscrição **nunca passa pela conta do operador**. O inquilino (ou a central, conforme a decisão em aberto nº 2, **bloqueante da Fase 1**) conecta a própria conta Mercado Pago por OAuth; a plataforma cria o pagamento em nome dessa conta e retém sua taxa como tarifa de aplicação. A conexão é a entidade de §4.12: o que ela guarda e o que ela nunca guarda está na RN-104, e quem conecta, com que escopo e o que a desconexão não desfaz está na RN-105.

**RN-095** — O percentual da taxa é definido por inquilino, no contrato, e vigora a partir da data de configuração. Cobranças já criadas mantêm o valor congelado, e **inscrições já criadas mantêm o percentual que congelaram** em `taxa_plataforma_percentual` (§4.5, RN-043, RN-096) — inclusive as que ainda não geraram cobrança.

**RN-096** — **Quem paga a taxa da plataforma, e como ela aparece no preço.** Por padrão a taxa é **absorvida pela denominação**: o inscrito paga a taxa do encontro (`taxa_participante` ou `taxa_servo`, §4.4) e a central recebe esse valor menos a taxa da plataforma e menos a tarifa do gateway (RN-101). O inquilino pode optar por **repassá-la ao inscrito**, e é aí que ela aparece no preço — o que exige dizer em que campo cada número mora, porque com repasse o inscrito paga mais que a taxa do encontro e os dois valores deixam de ser o mesmo.

| | Sem repasse (padrão) | Com repasse |
|---|---|---|
| `valor_devido` da inscrição (§4.5, RN-038) | taxa do encontro | taxa do encontro — **não muda** |
| `valor` da cobrança (§4.6) | taxa do encontro | taxa do encontro **+** taxa da plataforma |
| `taxa_plataforma` da cobrança (RN-043) | retida de dentro do valor | acrescentada por fora |
| Central recebe | taxa do encontro − taxa da plataforma − tarifa do gateway | taxa do encontro − tarifa do gateway |

**A base do percentual é a taxa do encontro que aquela cobrança cobra.** Com repasse ou sem ele, a taxa da plataforma é o percentual congelado (§4.5, RN-043) aplicado sobre a **taxa do encontro** — na cobrança comum, o `valor_devido` inteiro: R$ 350,00 × 2,5% = R$ 8,75. Sem repasse ela é retida de dentro desses R$ 350,00; com repasse ela é somada por fora, e o `valor` da cobrança vira R$ 358,75. Aplicar o percentual sobre o `valor` faria a fórmula morder a própria cauda no caso do repasse — o `valor` depende da taxa e a taxa dependeria do `valor` —, e o resultado seria R$ 8,97, diferente do R$ 8,75 que a página do encontro imprimiu e que o inscrito aceitou pagar.

**Na cobrança de complemento, o acréscimo é sobre o complemento.** Quando a RN-037 manda cobrar a diferença depois de um estorno parcial, a linha "taxa do encontro" daquela cobrança **é** a diferença, e é sobre ela que o percentual incide: com repasse ativo, uma diferença de R$ 100,00 é cobrada como R$ 100,00 **+** R$ 2,50 de taxa de serviço, `valor` de R$ 102,50 — não R$ 108,75. Acrescentar ali a taxa sobre o `valor_devido` inteiro cobraria a taxa cheia uma segunda vez na mesma inscrição (RN-102) e faria o preço na tela deixar de bater com a diferença que a RN-037 mandou cobrar.

`valor_devido` **é sempre a taxa do encontro**, com ou sem repasse. É ele que a coordenação lê como dívida da pessoa, que a RN-037 usa para cobrar a diferença de um pagamento parcial e que a RN-038 congela na inscrição. Somar o repasse a ele misturaria num número só a dívida com o inscrito e a remuneração do operador, e bastaria desligar o repasse para a dívida de quem já se inscreveu parecer ter mudado de valor.

**Discriminado, sempre.** Onde há repasse, o inscrito vê **duas linhas**, nunca um total redondo sem explicação: "taxa do encontro R$ 350,00 + taxa de serviço R$ 8,75 = R$ 358,75". As duas linhas aparecem em todo lugar em que o valor aparece — página do encontro, ficha de inscrição antes de confirmar, e-mail de cobrança e consulta da inscrição por token —, e o mesmo vale para o extrato da central, que precisa da decomposição para conferir o que recebeu. Embutir o acréscimo no total é o tipo de coisa que a denominação descobre por reclamação de participante, e a reclamação é justa: ninguém aceita pagar o que não sabe que está pagando.

**A escolha vale por inscrição, e é congelada quando ela nasce.** A inscrição grava na criação `taxa_plataforma_repassada` e `taxa_plataforma_percentual` (§4.5) — o modo de repasse e o percentual vigentes naquele instante —, e a cobrança lê os dois de lá, não do inquilino (RN-043). O congelamento é o que sustenta a frase: sem ele a âncora real seria a criação da **cobrança**, e o documento cria dois intervalos longos entre uma coisa e outra — `lista_espera` não gera cobrança (RN-033) e pode ser promovida semanas depois, e a inscrição aceita com a cobrança em `pendente_emissao` espera o recebimento voltar (RN-098). Ligar o repasse ou reajustar o percentual no meio disso cobraria de quem esperou um preço diferente do que a página do encontro mostrava no dia em que ela se inscreveu, que é a alteração retroativa que a RN-038 proíbe do outro lado da conta. Ligar ou desligar o repasse, portanto, não altera cobrança já criada, inscrição já criada nem `valor_devido` já congelado (RN-038, RN-043): vale para inscrição criada depois. E o repasse alcança só a taxa da plataforma — a **tarifa do gateway** é da central em qualquer configuração (RN-101), e o juro do parcelamento é do comprador em qualquer uma delas.

No reembolso, a taxa repassada é dinheiro que o inscrito pagou: entra na base de cálculo (RN-060) e volta para ele na mesma proporção do resto (RN-097).

**RN-097** — **Dinheiro que sai da conta da central devolve a taxa da plataforma, na mesma proporção.** Vale para o estorno da desistência (RN-062), para o cancelamento do encontro (RN-061) e para a contestação de cartão (RN-064): a plataforma não fica com taxa de dinheiro que não ficou com a central. Estorno total devolve a taxa integral; estorno parcial devolve na proporção do que voltou.

Quem recebe essa devolução depende de quem pagou a taxa: com repasse ativo (RN-096) ela volta para o **inscrito**, junto com o resto do reembolso; sem repasse ela volta para a **central**, que foi quem a absorveu. Contestação **revertida** refaz o caminho — o dinheiro volta para a conta da central e a taxa volta a ser devida, pelo mesmo cálculo. O que não volta em caso nenhum é a tarifa do gateway (RN-101), que é de quem vendeu.

**RN-098** — **Indisponibilidade de recebimento: o que trava, o que não trava, e o que a área pública mostra.** Token OAuth do inquilino é renovado automaticamente antes de expirar — a conexão é a entidade de §4.12, e o token vive no cofre, não nela (RN-104). Falha de renovação — ou revogação do acesso pelo próprio inquilino no painel do gateway — desativa a conexão, bloqueia a **emissão de cobrança nova** daquele inquilino e alerta operador e admin da denominação **antes** que a primeira inscrição falhe. O bloqueio para aí, e o resto precisa ficar escrito, porque a leitura larga de "bloqueia o recebimento" derruba muito mais coisa do que deveria.

**O que continua funcionando.** Cobrança já emitida continua pagável: o Pix e o link de cartão vivem no gateway, não aqui, e o webhook de aprovação continua chegando e confirmando inscrição (RN-032, RN-051). Pagamento presencial não depende de conexão nenhuma e continua sendo recebido com baixa manual (RN-040, RN-044). Nada expira, nada é cancelado e nenhuma vaga muda de dono por causa da falha.

**A área pública fica no ar.** A agenda e a página do encontro continuam publicadas, com valor e vagas (RN-022). Tirar a divulgação do ar por uma falha que costuma durar minutos perde a inscrição de quem chegou pelo link do grupo de mensagem e não volta, e não conserta nada — a conexão não se restabelece porque a página saiu do ar.

**A inscrição é aceita, e a vaga é reservada.** A ficha continua aberta: a inscrição nasce `pendente_pagamento` e ocupa vaga como qualquer outra (RN-033), com a cobrança criada em **`pendente_emissao`** (§4.6) — situação própria da cobrança, e não ausência de cobrança, porque é ela que distingue a vaga reservada por falha nossa de um Pix que expirou. É desse mesmo marcador que leem o relógio parado da RN-052, o item de vaga reservada no painel do encontro e a pendência derivada (§4.6, §6). A tela diz a verdade, sem culpar o inscrito e sem inventar prazo — a vaga está reservada e o link de pagamento chega **por e-mail** assim que estiver disponível (§7), o único canal que a Fase 1 garante; a secretaria pode avisar também por WhatsApp, pelo link `wa.me` manual (§7), mas isso é conveniência dela, não promessa do sistema. Recusar a inscrição custaria a pessoa; aceitá-la e ficar em silêncio custaria a confiança dela, que é mais cara.

**O relógio não corre.** Enquanto a cobrança não puder ser emitida por indisponibilidade, o prazo de pagamento fica suspenso — é a terceira exceção da RN-052, pelo mesmo motivo da análise antifraude, um degrau acima: a falha é nossa. A contagem começa quando a cobrança é emitida e o inscrito é avisado.

**Restabelecida a conexão**, a plataforma emite as cobranças pendentes e notifica cada inscrito com o seu link, na ordem em que as inscrições entraram. Enquanto isso não acontece, as cobranças em `pendente_emissao` aparecem como vaga reservada no painel do encontro (RN-115), com pessoa e desde quando — a coordenação não pode descobrir na recepção que meia dúzia de gente nunca recebeu link nenhum. Passado o marco de corte do pagamento online sem restabelecimento (RN-041), essas inscrições seguem o caminho de qualquer inscrição não paga: são quitadas na recepção (RN-070).

**Por qual método.** A emissão restaurada usa o `metodo` que a pessoa escolheu na ficha, gravado na cobrança `pendente_emissao` desde a criação. Não havendo escolha registrada — inscrição criada pela coordenação (RN-035), ou falha antes da escolha —, emite-se **`pix`**, que é o método à vista, sem checkout e sem parcelamento a escolher no lugar do inscrito; o link da inscrição continua permitindo trocar para cartão até o marco de corte (RN-041). Emitir cartão por conta própria seria decidir por ela em quantas vezes ela paga, e o juro é dela (RN-101).

**Cancelamento com dinheiro a devolver, com a conexão fora.** Sem conexão o pedido de estorno não chega a sair, e o cancelamento para no passo 4 da RN-062: a cobrança grava `estorno_situacao = indeterminado` — o resultado é desconhecido porque não houve pedido, e `recusado` afirmaria uma decisão que o gateway não tomou —, a inscrição continua `confirmada` com a vaga presa e o caso entra na mesma pendência da recusa (§4.6, §6, §7). A plataforma repete o pedido quando a conexão volta, com a mesma chave de idempotência, e quem pediu o cancelamento é avisado de que ele não foi concluído. Cancelar a inscrição sem devolver o dinheiro porque a conexão caiu é exatamente o resultado que a RN-062 existe para impedir, e indisponibilidade não é motivo para produzi-lo.

Isto **não** se confunde com inquilino que nunca conectou recebimento: aquele não sai de `em_implantacao` e não tem subdomínio no ar (RN-015). Aqui o inquilino está `ativo`, o encontro está publicado, gente está se inscrevendo, e a conexão caiu depois.

**RN-102** — **A taxa apurada é relatório, não movimento financeiro.** O número que o painel do operador exibe como taxa da plataforma apurada (§6) é a soma, por inquilino e período, da `taxa_plataforma` de **toda cobrança que recebeu pagamento**, qualquer que seja a situação em que ela esteja hoje, menos a `taxa_estornada` acumulada nela (§4.6) — o que voltou em estorno e em contestação (RN-097). **A base é o pagamento, não a situação atual da cobrança**: cobrança estornada em parte deixa de estar `paga` e **continua entrando** na apuração, com a taxa menos a parte proporcional que voltou. Somar só o que está em `paga` derrubaria da conta justamente os casos que a RN-097 existe para tratar, e o operador faturaria a menos exatamente onde há devolução parcial. **A soma continua sendo por cobrança**, e é a base por cobrança da RN-043 que a mantém correta: inscrição de R$ 350,00 que teve R$ 100,00 estornados por engano e foi complementada por nova cobrança de R$ 100,00 (RN-037) entra com R$ 6,25 pela primeira — R$ 8,75 menos os R$ 2,50 que voltaram na proporção (RN-097) — e com R$ 2,50 pela segunda, somando os mesmos R$ 8,75 de sempre. A taxa é apurada uma vez sobre a receita da inscrição, não uma vez por cobrança emitida. Contestação **revertida** refaz o caminho: o dinheiro volta para a conta da central, a taxa volta a ser devida e a `taxa_estornada` correspondente é desfeita, pelo mesmo cálculo (RN-097). Ele **não** move dinheiro: o dinheiro já foi retido na própria transação, pelo split do gateway (RN-043), e não existe cobrança posterior ao inquilino por algo que já está na conta do operador.

Para que serve, então: é o relatório com que o operador **fatura fora da plataforma**. Emissão de nota, contabilidade formal e conciliação com o extrato de tarifas do gateway acontecem em outro lugar, porque nenhuma das três é objetivo do produto (§1) — e prometer isso na tela criaria a expectativa de um documento fiscal que o sistema não emite. Divergência entre o nosso número e o do gateway é **alerta para o operador conferir**, nunca ajuste automático no nosso número: o extrato do gateway é o dinheiro que existe, o nosso número é o que deveria ter sido retido, e onde os dois discordam alguém precisa olhar em vez de deixar o sistema escolher um deles.

A única parte da taxa que **não** entra nesse número é a das inscrições pagas presencialmente, que não passaram pelo split e por isso não têm o que somar aqui (RN-044) — é a decisão em aberto nº 8, e ela é do contrato, não deste relatório.

> Id na faixa de extensão (§0.2): o bloco RN-090–RN-099 do recebimento e do split está esgotado.

---

## 9. LGPD e dados sensíveis

O sistema trata dado pessoal sensível (art. 5º, II da LGPD): convicção religiosa, saúde, restrição alimentar.

**Papéis** — cada inquilino é **controlador** dos dados dos seus participantes. O operador da plataforma é **operador** no sentido da lei: trata dados por conta do inquilino, nos limites do contrato. Isso é o que sustenta RN-005 e RN-085 — o operador não tem interesse próprio nesses dados e por isso não os acessa.

**RN-090** — A ficha de inscrição apresenta finalidade de uso e coleta consentimento explícito, com data, hora e IP registrados. O termo é do inquilino, versionado, e identifica quem é o controlador. O termo é a entidade de §4.13 (RN-090a) e o consentimento a de §4.14 (RN-090b); publicar a primeira versão do termo é o passo 4 de F0, e sem ela não há inscrição (RN-015).
**RN-091** — Campos de saúde e medicamento só são visíveis para coordenação do encontro e área responsável pela saúde. Nunca aparecem em lista impressa geral nem em exportação comum. A visibilidade é sustentada pela **separação da entidade**, em §4.3a: a RN-091a tira os quatro campos sensíveis de `Pessoa`, declara quem lê cada um, faz da leitura evento auditado, e fecha o que o documento deixava em aberto — o acesso de suporte da RN-005 **não** os alcança, com ou sem concessão (RN-005a).
**RN-092** — Titular pode solicitar exportação e exclusão dos seus dados pelo link da inscrição. Exclusão preserva o registro financeiro anonimizado, por obrigação de prestação de contas. O fluxo é **F10**: o que a exportação leva está na RN-092a; o que a exclusão apaga, o que ela preserva e quando ela fica agendada, na RN-092b.
**RN-093** — Dado de participante de encontro `encerrado` há mais de 5 anos é anonimizado automaticamente, salvo consentimento de retenção para histórico da central. O **consentimento de retenção** é a RN-093a, e até a 1.3 ele não existia em mais lugar nenhum do documento: é um registro próprio de §4.14, com sua própria linha e sua própria revogação — não uma finalidade dentro do consentimento obrigatório (RN-090b). Revogável a qualquer momento: pelo link da inscrição enquanto o `token_consulta` vale (RN-019), e, depois do encontro `encerrado`, pelo contato do encarregado publicado no termo (§4.13).
**RN-094** — **Nenhum dado pessoal é acessível de um inquilino a outro.** CPF, nome e data de nascimento são dado pessoal, e existem uma única vez na plataforma, no registro global de identidade (§4.2) — o que a plataforma garante não é que esse dado não exista fora do inquilino, é que **nenhum inquilino o alcança**: a identidade fica fora do isolamento por inquilino e sem leitura para role de aplicação, e a única coisa que a resolução por CPF devolve é o vínculo (RN-001, RN-094a). Contato, endereço, restrição alimentar, condição de saúde e histórico de participação ficam no cadastro do inquilino que os coletou (§4.3) e não saem dele em hipótese alguma. Denominações são controladores distintos, e compartilhar dado entre elas exigiria base legal própria que não temos — o registro global existe para consistência de CPF, sob responsabilidade do operador, não como dado à disposição dos inquilinos.
**RN-094a** — A existência de uma identidade **não** é revelada ao inquilino. A ficha de inscrição nunca preenche campo automaticamente com dado de outro inquilino, nem informa "esta pessoa já participou da Tabor". O reconhecimento é interno, para consistência de CPF.
**RN-099** — Exclusão solicitada pelo titular atinge o cadastro **daquele inquilino**. A identidade global só é apagada quando não resta nenhuma pessoa vinculada a ela em nenhum inquilino.

---

## 10. Fases de entrega

### Fase 1 — Multi-inquilino, divulgação, inscrição e pagamento
Inquilino, Central, Identidade, Pessoa, **Dado sensível da pessoa** (§4.3a), Encontro, Inscrição, Cobrança, e as entidades de plataforma que as regras da fase já pressupunham: **Conexão de recebimento** (§4.12), **Termo** e **Consentimento** (§4.13, §4.14), **Conta de acesso** (§4.15), **Concessão de acesso de suporte** (§4.16), **Auditoria** (§4.17), **Notificação** (§4.18) e **Evento de webhook** (§4.19). Resolução por subdomínio, marca e rótulos, RLS de dois níveis, onboarding de inquilino com OAuth do gateway e publicação do termo. Site público com agenda e página do encontro em SSR (RN-024), ficha de inscrição, Pix e cartão parcelado com split, webhook, lista de espera, consulta da inscrição por token, **área administrativa** da central e da denominação (operação de encontros e inscrições, configuração de marca, rótulos, taxas, recebimento e os padrões herdados pelas centrais — RN-103), painel do operador. Fluxos F0, F1, F2, F3, **F8, F9 e F10**.

As contas de acesso são da Fase 1 **inclusive as de papel `servo`**, e não só as administrativas: a RN-035 e a RN-036 exigem coordenador do encontro já nesta fase, e coordenador do encontro é conta `servo` com o ponteiro da RN-025. O que fica para a Fase 2 é o que a conta de servo **enxerga** (F5), não a conta.

A área administrativa da Fase 1 são as telas de operação e configuração. A fase de cada relatório e painel está declarada regra a regra em §6, que é a autoridade sobre "o que sai em cada fase" — este parágrafo só resume o que está lá. São da **Fase 1**: RN-086 (situação financeira das inscrições), RN-087 (pendências financeiras do encontro — F3 é da Fase 1, e é ele que torna operáveis a RN-037 e a RN-061; sem a lista, a decisão que as duas regras entregam à coordenação não tem onde acontecer), RN-089 (registro de acesso de suporte), RN-108 (pedidos de exportação e exclusão) e RN-111 (painel do operador), além do **painel do encontro** (RN-115) que reúne os alertas e as pendências dessas regras numa tela só. Ficam para fases seguintes RN-081 a RN-084 (**Fase 2** — dependem de Grupo e Área de servição, só existentes a partir de F4) e RN-088, RN-109 e RN-110 (**Fase 3** — prestação de contas e painéis de indicadores da central e da denominação).

**A Fase 1 tem duas decisões bloqueantes em aberto**, ambas em §11. A **nº 2** — recebimento por inquilino ou por central — não impede especificar o resto da fase, e impede **começar F0**: é ela que define de quem é a tela de conexão OAuth do passo 3, a que conta a apuração da taxa se refere (RN-102) e como o webhook é roteado. A spec já está pagando por essa ausência, carregando dois caminhos onde deveria ter um. A **nº 4** — ficha de inscrição configurável por inquilino ou fixa com campos opcionais — impede **começar F1**: define o contrato de §4.5 e da ficha pública, a entrega central da fase.

A **despesa não é exceção nenhuma**: o lançamento automático da categoria `meio de pagamento` (§4.11, RN-060) só começa na Fase 3, com F7, porque é lá que a entidade Despesa e a prestação de contas existem. O que a Fase 1 faz no ato do estorno é gravar a tarifa retida em `estorno_tarifa_gateway`, na **cobrança** (§4.6), que é entidade desta fase; a Fase 3 varre esse campo ao montar a prestação de contas e lança de lá o que a central absorveu. É o mesmo motivo do relatório acima às avessas: ali a Fase 1 precisava da tela porque a decisão é dela; aqui basta o dado, porque a decisão — e o lançamento — é da Fase 3.

### Fase 2 — Operação do retiro
Grupos, áreas de servição (a partir do catálogo do inquilino), cronograma com tarefas e **modelo de cronograma** (§4.20, RN-048a), crachás com a marca da denominação, check-in, painel de recepção, listas operacionais para impressão — participantes por grupo, servos por área e função, restrições alimentares consolidadas, condições de saúde e contatos de emergência (RN-081 a RN-084, §6) —, leitura e escrita offline de recepção e cronograma sob conexão instável (**RNF-003**, §8.2), área do servo — que é o que a conta `servo` da Fase 1 passa a enxergar (RN-019). Fluxos F4, F5, F6.

### Fase 3 — Financeiro e prestação de contas
Despesas com comprovante, avaliação (RN-100), fechamento, relatórios exportáveis, painel da central e painel da denominação (§6) e faturamento da plataforma. Fluxo F7.

---

## 11. Decisões de produto

Cada item é uma decisão de produto, não uma dúvida solta. Tem **identificador estável** — o número, o mesmo citado como "decisão nº N de §11" no resto do documento —, **decisão a tomar**, **impacto concreto** (quais regras, entidades e telas mudam conforme a resposta), **quem decide** e **qual fase ela bloqueia**. Item marcado **[BLOQUEANTE DA FASE N]** precisa de resposta **antes** do desenvolvimento daquela fase, não durante: sem ela, o que se escreve é código que sustenta duas hipóteses ao mesmo tempo. Item sem essa marca não impede nenhuma fase de começar, mas tem prazo próprio, registrado em "Bloqueia" — decisão sem prazo é decisão que nunca sai. **O número da decisão é imutável**, pela mesma razão do id de regra (§0.2): decisão respondida permanece na lista, marcada **[FECHADA]**, em vez de ser removida com o resto renumerado, e o número nunca é reaproveitado — é o que mantém válida toda citação a "decisão nº N de §11" espalhada pelo documento e por `specs/`.

1. **Provedor de WhatsApp para notificação automática**
   - **Decisão a tomar:** qual provedor de WhatsApp Business API contratar.
   - **Impacto:** RN-107 (§4.18, Notificação) ganha o WhatsApp como canal com `situação` e `chave_unica` próprias, como o e-mail já tem hoje; §7 troca o link `wa.me` disparado manualmente pela secretaria por envio automático e registrado. Nenhuma regra do documento muda de comportamento até a decisão sair — nenhuma depende hoje de o inscrito ter recebido aviso por esse canal (§7).
   - **Quem decide:** dono do produto, com o comercial (o custo do provedor entra no contrato).
   - **Bloqueia:** nenhuma fase da Fase 1. Precisa sair antes do início da Fase 2 ou da Fase 3 — o que vier primeiro —, que é quando o canal deixa de ser link manual (§7).

2. **[BLOQUEANTE DA FASE 1] A conta de recebimento é do inquilino ou da central?**
   - **Decisão a tomar:** a conexão com o gateway de pagamento é por inquilino ou por central? Denominação com centrais em CNPJs distintos precisa de conexão por central; denominação centralizada prefere uma só. A modelagem prevista suporta as duas — e é por isso que a pergunta atravessou três versões do documento sem incomodar ninguém —, mas ela não é pergunta de modelagem: é de produto, e três entregas da Fase 1 estão paradas em cima dela.
   - **Impacto:**

     | Onde bate | O que fica em aberto |
     |---|---|
     | **Onboarding do inquilino** (F0, passo 3) | de quem é a tela de conexão OAuth e o que ela pede. Por central, a implantação deixa de ser um ato do admin da denominação e vira um por central, e a RN-015 passa a ter de decidir se o inquilino sobe `ativo` com **uma** central conectada ou só com **todas** |
     | **Apuração da taxa da plataforma** (§8.3, RN-102) | a que conta o número apurado se refere. Por central, a apuração é por central e o faturamento do inquilino é a soma delas — e a decisão nº 8, sobre inscrição paga presencialmente, herda a mesma pergunta antes de poder ser respondida |
     | **Roteamento do webhook** | se a rota carrega o slug do inquilino ou o par inquilino/central. `specs/fase-1/04-webhook.md` (`RN-405`) teve de deixar a rota **parametrizada**, e `03-cobranca.md` (`RN-325`) de resolver a conexão com fallback de central para inquilino, justamente porque a resposta não existe |
     | **Conexão de recebimento** (§4.12, RN-105) | `central_id` é nullable e a resolução procura a central antes do inquilino — a entidade comporta as duas respostas, e é isso que mantém o fallback vivo. Respondida a pergunta, um dos dois lados sai: ou `central_id` deixa de existir, ou passa a ser obrigatório e o fallback some |

     Enquanto não houver resposta, a Fase 1 carrega os dois caminhos em tudo que toca dinheiro.
   - **Quem decide:** dono do produto, com o comercial — entra no contrato do inquilino.
   - **Bloqueia:** Fase 1, especificamente o início de **F0**: não impede especificar o resto da fase, impede **começar a construir**. Precisa sair antes de F0 entrar em desenvolvimento.

3. **[FECHADA] Cadastro nacional de pessoa**
   - **Decisão registrada:** identidade global, cadastro por inquilino (RN-010 a RN-014, RN-094).
   - **Bloqueia:** nada — resolvida antes de a Fase 1 ser especificada.

4. **[BLOQUEANTE DA FASE 1] A ficha de inscrição é configurável por inquilino ou fixa com campos opcionais?**
   - **Decisão a tomar:** encontros mistos ou segmentados por perfil (homens, mulheres, casais, jovens) mudam a ficha de inscrição. Com multi-inquilino isso vira uma pergunta de contrato de dados: cada inquilino define seus próprios campos, ou existe um schema único que cada inquilino liga e desliga campo a campo?
   - **Impacto:** define o contrato de §4.5 (Inscrição) e da ficha pública (F1, passo 4) — a entrega central da Fase 1. Toca RN-039 (convidador), RN-090b (preenchimento dos campos sensíveis de §4.3a), RN-010a/RN-010b (CPF) e, se a resposta for "configurável por inquilino", a tela administrativa de configuração ganha um mecanismo de campo dinâmico que hoje não existe em nenhuma entidade do documento — RN-008 (rótulos) não cobre isso, só renomeia campo fixo. A exportação do titular (RN-092a, F10) herda o formato que sair daqui.
   - **Quem decide:** dono do produto.
   - **Bloqueia:** Fase 1, o início de **F1** — como a decisão nº 2, não impede especificar o resto da fase, impede começar a construir a tela.

5. **O crachá tem layout padrão por denominação, ou cada central personaliza?**
   - **Decisão a tomar:** layout único herdado pela denominação, ou campo próprio por central?
   - **Impacto:** geração de PDF em lote e individual (F6, passo 1), a marca herdada por cópia na criação da central (RN-103) e RNF-007 (rótulos do inquilino em toda tela e todo PDF). Se for por central, `central` (§4.1) ganha um campo de layout que hoje não existe.
   - **Quem decide:** dono do produto.
   - **Bloqueia:** nenhuma fase da Fase 1 — crachá é **Fase 2** (§10, F6). Precisa sair antes do início de F6.

6. **Inquilino que sai da plataforma: formato e prazo da exportação de saída**
   - **Decisão a tomar:** inquilino que sai da plataforma leva os dados para onde, em que formato e em que prazo? É diferente de F10 (RN-092a, RN-108), que exporta o dado de **um titular** a pedido dele — esta é a exportação de **todo o inquilino**: todas as pessoas, inscrições, cobranças e encontros dele.
   - **Impacto:** exige uma rotina de exportação em massa que hoje não existe em fase nenhuma; toca a retenção de dados (§9) e o Supabase Storage (§8, tabela de stack). Formato e prazo não são só cláusula de contrato — o dono do produto precisa decidir a forma técnica (o mesmo par PDF + arquivo estruturado de F10, ou outro) antes de o comercial poder prometer um prazo.
   - **Quem decide:** dono do produto, com o comercial e o jurídico — o prazo entra no contrato.
   - **Bloqueia:** nenhuma fase da Fase 1 — só é exercitada quando um inquilino sai, o que não acontece durante o desenvolvimento. Precisa sair antes do primeiro contrato com cláusula de saída ser assinado.

7. **[FECHADA] Encontro em andamento quando o inquilino é suspenso: acesso de quem opera**
   - **Respondida por RN-007 no lado público:** inquilino `suspenso` mantém a área pública em modo leitura, bloqueia inscrição nova nos dois canais (RN-023, RN-035) e não apaga nada; não congela a lista de espera, não suspende prazo nenhum (RN-033, RN-052) nem impede quitar vaga já ocupada (RN-041).
   - **Decisão registrada:** RN-018 (§4.15, "O que não revoga conta") decide o que restava — a **conta** de quem opera o encontro em andamento: suspender o inquilino (RN-007) **não** suspende a conta do coordenador (RN-025) nem a dos servos alocados, que continuam operando normalmente até o encontro terminar. A suspensão retira só a criação de inscrição nova, nos dois canais, e a alteração de configuração do inquilino e das centrais (RN-103) — nada além disso. `specs/fase-1/00-multi-inquilino.md` (`RN-085t`) chegou à mesma decisão de forma independente, e fica **confirmada**.
   - **Impacto:** RN-007 (situações do inquilino), RN-018 (§4.15) e as contas do coordenador e dos servos do encontro (RN-017 a RN-019, RN-025); as telas que dependem delas continuarem ativas — baixa manual (RN-044), promoção da lista de espera (RN-036), resolução de pendência financeira (RN-037), check-in (RN-070) e o painel do encontro (RN-115).
   - **Bloqueia:** nada — já construído na Fase 1, com F8 e §4.15, não na Fase 2. Se a resposta um dia mudar para suspender esse acesso, é este item que reabre, e a mudança bate em RN-018.

8. **Como a taxa da plataforma é apurada sobre inscrição paga presencialmente (RN-044)?**
   - **Decisão a tomar:** dinheiro e Pix na chave da central não passam pelo split, então não há o que reter na transação. Faturar o inquilino depois, abrir mão da taxa nesses casos, ou tratar como exceção rara com limite são caminhos diferentes.
   - **Impacto:** RN-102 (apuração da taxa, §8.3) e o relatório de faturamento externo que ela alimenta. Herda a mesma pergunta da decisão nº 2: se a conta de recebimento for por central, a apuração muda de escopo antes de esta poder ser respondida.
   - **Quem decide:** dono do produto, com o comercial — entra no contrato.
   - **Bloqueia:** nenhuma fase da Fase 1 diretamente, mas depende da decisão nº 2 sair primeiro — como ela também mexe em RN-102 e no contrato, o ideal é resolver as duas juntas antes de F0.

### O que as versões anteriores já fecharam

As versões 1.2 a 1.5 fecharam, regra a regra, decisões de produto que a Fase 1 teve de inventar sozinha porque este documento, na forma atual, ainda não existia. O registro regra a regra é o §12; aqui fica o resumo como decisão fechada, não como pendência.

- Toda regra `[NOVA]` de `specs/fase-1/` que §12 lista como **Confirmada** ou **Muda** tem decisão de produto tomada e origem no PRD a partir da versão em que foi processada — deixou de ser invenção de spec aguardando resposta.
- As três que a própria spec marcou como chute, pedindo confirmação explícita, **receberam resposta**:
  - **RN-205** (base do reembolso é o valor efetivamente pago, não `valor_devido`) — **Confirmada** como a spec propôs, inclusive na parte que ela deixou em aberto: a tarifa do gateway é despesa da central, não desconto do inscrito (RN-060).
  - **RN-304** (juro do parcelamento é do comprador, nunca do vendedor) — **Confirmada** como a spec propôs; era a confirmação pedida em itálico na própria spec (RN-101).
  - **RN-201** (destino da inscrição `confirmada` com pagamento estornado) — a spec escreveu que era *"a regra que eu chutei com menos apoio no PRD"* e mandava para `cancelada` automaticamente. A resposta é a **oposta** do chute, e por isso RN-201 é **Muda** em §12, não confirmada como as outras duas: mantém `confirmada`, abre pendência, e a saída é da coordenação (RN-037). A spec ainda precisa ser corrigida nesse ponto (§12, "O que falta").
- O que **não** ganhou origem no PRD é intencional, não pendência: as regras que §12 marca "Continuam de spec" são o **como** (implementação), não o **quê** (decisão de produto) — por exemplo RN-200, RN-204, RN-209, RN-211 a RN-215, RN-315, RN-321, RN-322, RN-500, RN-501, RN-503 a RN-507, RN-511, RN-516 e RN-517. Essas ficam de spec por definição, não por falta de resposta.
- Nenhuma regra `[NOVA]` **processada em §12** continua como decisão de produto em aberto. O que falta, listado no fim de §12 ("O que falta"), é a passada nas specs para citar os ids do PRD e tirar a marca `[NOVA]` das regras já processadas — trabalho de redação, não decisão pendente.
- Existe uma terceira categoria, que não pode ser confundida com as duas acima: regra `[NOVA]` que §12 **nunca processou** — nem como Confirmada/Muda, nem como "Continua de spec" nomeada. `04-webhook.md` inteiro está nessa situação (`RN-400` a `RN-418`; só `RN-405` aparece em §12, de passagem, na tabela de impacto da decisão nº 2), junto com o resto de `03-cobranca.md` (`RN-301`, `RN-302`, `RN-308` a `RN-312`) e de `01-modelo-de-dados.md` (`RN-120`, `RN-134`, `RN-143`, `RN-144`). Triando agora: `RN-400` a `RN-404`, `RN-406` a `RN-416`, `RN-301`, `RN-302`, `RN-308` a `RN-312`, `RN-120`, `RN-134`, `RN-143` e `RN-144` são implementação — o **como** aplicar o webhook do gateway, tratar timeout e recusa de cartão, resolver domínio e garantir idempotência — e não precisam de origem no PRD, na mesma classe das regras já nomeadas acima (§12 registra a afirmação para `04-webhook.md`, na seção "Fora do recorte"). `RN-417` e `RN-418` ficam de fora dela: decidem o que fazer quando o inquilino resolvido pela cobrança diverge do slug da rota do webhook, um comportamento de segurança que o PRD nunca decidiu, e **continuam aguardando resposta** — não estão classificadas como implementação.

---

## 12. Rastreabilidade — o que a spec deixa de inventar

A Fase 1 foi especificada antes desta versão do PRD e teve de decidir sozinha o que o documento não dizia. As regras abaixo estão marcadas `[NOVA]` em `specs/fase-1/` porque nasceram lá; a partir da versão 1.2 elas têm origem **aqui**, e a marca `[NOVA]` sai na próxima revisão das specs.

A regra de §0.2 vale: **spec não altera regra do PRD**. Onde a decisão deste documento diverge da que a spec tomou por conta própria, é a spec que muda — a coluna "situação" diz qual é o caso.

### `02-inscricao.md`

| Regra da spec | Assunto | Passa a vir de | Situação |
|---|---|---|---|
| `RN-201` | destino da inscrição `confirmada` com pagamento estornado | **RN-037** | **Muda.** A spec mandava para `cancelada` automaticamente, e ela mesma marcou o ponto: *"a regra que eu chutei com menos apoio no PRD"*. A decisão é a oposta — mantém `confirmada`, abre pendência e deixa a saída com a coordenação. O que a spec acertou e fica: `confirmada → pendente_pagamento` não existe. |
| `RN-202` | janela de inscrição | **RN-023** | **Muda.** A autoridade fica definida — checar situação **e** carimbo continua certo, mas eles deixam de ser duas fontes de verdade: a situação é derivada do carimbo, e em divergência o carimbo decide. Três correções de conteúdo: o `now() between inscricoes_abrem_em and inscricoes_fecham_em` da spec é **inclusivo nas duas pontas**, contra o `< inscricoes_fecham_em` que a RN-023 fixa; falta a condição de **inquilino `ativo`**, que o predicado de aceitação de inscrição nova exige; e falta a **dispensa da janela** na criação administrativa (RN-035), que não passa por este predicado. |
| `RN-203` | `valor_devido` copiado da taxa do encontro | **RN-038** | Confirmada, com a exceção de alteração individual auditada acrescentada. |
| `RN-205` | reembolso sobre o valor efetivamente pago | **RN-060** | Confirmada, inclusive na parte que a spec deixou em aberto: a tarifa do gateway é despesa da central, não desconto do inscrito. **A 1.3 fecha a base nas duas pontas** e responde o pedido de confirmação da spec: inclui a taxa da plataforma repassada (RN-096), exclui o juro do parcelamento (RN-101). |
| `RN-206` | cancelar `pendente_pagamento` não gera reembolso | **RN-060** | **Deixa de ser regra própria.** É consequência: o percentual incide sobre o valor pago, e ali não há valor pago. Fica como esclarecimento no texto da RN-060. |
| `RN-207` | encontro cancelado reembolsa 100% | **RN-061** | Confirmada e ampliada: pagamento presencial, cobrança viva, estorno que falha, aviso e terminalidade. |
| `RN-208` | não cancelar a inscrição antes de o estorno passar | **RN-062** (1.3) | Na 1.2 continuava de spec, com a exceção do cancelamento do encontro (RN-061). **Na 1.3 deixa de ser regra de spec**: a garantia é idêntica e passa a ter origem no PRD, com três acréscimos — a cobrança viva é cancelada antes de tudo, os casos sem valor a devolver não esperam estorno nenhum, e pagamento que chega para inscrição já `cancelada` é devolvido integralmente. A exceção da RN-061 continua. |
| `RN-200` | serviço único de transição de situação | — | Continua de spec — é implementação. Passa a validar contra a tabela da **RN-030**, em vez de contra uma tabela que a própria spec montou. |
| `RN-210` | limite de taxa por IP e por CPF, e resposta que não revela existência ao estourar o limite | **RNF-012** (1.5) | **Muda de origem.** Até a 1.4 continuava de spec, como decisão de implementação; a `RNF-012` (§8.2) passa a exigi-la como requisito do produto — endpoint público sem autenticação que grava dado sensível e dispara e-mail —, corrigindo a linha anterior deste quadro, que classificava `RN-209` a `RN-215` inteiros como decisão de implementação. |
| `RN-204`, `RN-209`, `RN-211` a `RN-215` | consentimento na mesma transação, vagas restantes informativas, IP de consentimento, contexto de marca no payload, resposta indistinguível, `404` em vez de `403` | — | Continuam de spec: decisão de implementação, não de produto. |

### `05-lista-de-espera.md`

| Regra da spec | Assunto | Passa a vir de | Situação |
|---|---|---|---|
| ocupação de vaga (§1, sem id) | quais situações contam contra as vagas | **RN-033** | Confirmada. Era a definição que decidia o risco de overbooking e existia só na spec. |
| liberação de vaga (§4, sem id) | o que libera vaga, e o prazo gravado na promoção | **RN-037** e **RN-033** | **Muda, em dois pontos.** A lista de gatilhos traz "estorno que leva à `cancelada`", que a RN-037 passa a proibir: estorno não cancela inscrição sozinho, a vaga continua presa e não vai para a fila. E o diagrama grava `espera_expira_em = now() + 48h` fixo, ignorando as faixas da RN-033 — o mesmo defeito que a `RN-509` tem no texto. |
| `RN-502` | quem perde o prazo volta ao fim da fila | **RN-033** | Confirmada, e §4.5 acrescenta o que ela implica no campo: `posicao_espera` é chave de ordenação reatribuída no retorno, não registro de chegada. |
| `RN-508` | uma promoção por vaga liberada | **RN-033** | Confirmada. |
| `RN-509` | prazo do promovido: 48h / 24h / 6h | **RN-033** | **Confirmada e corrigida.** O texto e o bloco de código da spec discordavam nas bordas ("menos de 7 dias" × "entre 2 e 7 dias"); a tabela do PRD fixa os operadores, como RN-060 já fazia. |
| `RN-510` | prazo estourado passa a vaga ao próximo | **RN-033** | Confirmada. |
| `RN-512` | fila congelada depois do fechamento | **RN-023**, **RN-035** e **RN-036** | Confirmada, e desdobrada. O "preenchimento manual pela coordenação" que a spec citava de passagem são **dois** caminhos: promoção manual de quem está na fila (RN-036) e criação administrativa de quem nunca se inscreveu (RN-035). |
| `RN-513` | aviso a quem ficou na fila no fechamento | **RN-033** e **§7** | Confirmada — e a RN-033 acrescenta o que a spec não dizia: a inscrição continua em `lista_espera` depois do aviso, disponível para promoção manual até o encontro começar. |
| `RN-514` | promoção manual fora de ordem, com justificativa | **RN-036** | Confirmada. |
| `RN-515` | promoção acima do limite exige admin da central | **RN-036** | Confirmada. |
| `RN-500`, `RN-501`, `RN-503` a `RN-507`, `RN-511`, `RN-516`, `RN-517` | contagem sob lock e sem contador denormalizado, ordem e escopo do lock, posições não renumeradas, promoção na mesma transação, notificação depois do commit, formato do aviso, posição visível ao inscrito | — | Continuam de spec: são o **como**. O PRD passa a definir o **quê** que elas contam (RN-033). |

### Fora do recorte

Cinco regras de `03-cobranca.md` também ganham origem:

- `RN-306` e `RN-307` (regeração de Pix e limite de 5) em **RN-041**, que acrescenta o vínculo com a vaga e o **marco de corte do pagamento online**. **Mudam**: o teto do `expira_em` e o limite da regeração deixam de ser `inscricoes_fecham_em` e passam a ser `data_inicio`.
- `RN-313` e `RN-314` (72h contadas da inscrição, análise antifraude não expira) em **RN-052**, que acrescenta a suspensão da expiração depois do fechamento. Confirmadas.
- `RN-300` (contestação de cartão não é estorno comum: marca a cobrança, gera pendência visível para a coordenação e não é revertida automaticamente — a coordenação decide) em **RN-037**. **Confirmada** — e é ela que explica por que `RN-201` muda e esta não. As duas decidiam o mesmo caso de formas opostas **dentro do próprio conjunto de specs**: `RN-201` mandava para `cancelada` automaticamente, `RN-300` deixava a decisão com a coordenação. A RN-037 fica com a decisão da `RN-300`, ampliada para o estorno parcial, a contestação revertida e o segundo pagamento recebido. A 1.3 acrescenta a **RN-064**, que cobre o que faltava do mesmo caso: onde a contestação é registrada, a tarifa de contestação e o efeito da reversão sobre a taxa da plataforma.

`04-webhook.md` (`RN-400` a `RN-404`, `RN-406` a `RN-416`) é implementação do webhook de pagamento — o **como** aplicar o evento do gateway, sob o isolamento que a RN-001 já obriga e o registro que a RN-053 (§4.19) já define — e por isso fica de spec, sem origem própria, como as regras "Continuam de spec" das tabelas acima. `RN-417` e `RN-418` ficam de fora dessa afirmação: decidem o que fazer quando o inquilino resolvido pela cobrança diverge do slug da rota, decisão de segurança que o PRD ainda não tomou (§11, "O que as versões anteriores já fecharam").

### `03-cobranca.md` — o financeiro, na 1.3

A 1.2 já tinha trazido cinco regras deste arquivo, acima. A 1.3 fecha o resto — o custo do meio de pagamento, o repasse, o estorno e a apuração —, inclusive a confirmação que a `RN-304` pedia em itálico. A outra confirmação pendente, a da `RN-205`, está na tabela de `02-inscricao.md`, com as duas regras de cancelamento que mudam de dono.

| Regra da spec | Assunto | Passa a vir de | Situação |
|---|---|---|---|
| `RN-304` | juro do parcelamento é do comprador | **RN-101** | **Confirmada** — era a confirmação pedida em itálico na própria spec (*"é escolha de negócio, não técnica"*). A RN-101 acrescenta o custo que a spec não decidia: a tarifa do gateway é da central e não é acrescentada ao que o inscrito paga. |
| `RN-305` | valor da parcela vem do gateway | **RN-101** | Confirmada e ampliada: a tela também diz de onde vem o acréscimo e que ele não volta no reembolso. |
| `RN-316` | estorno de Pix sem saldo vira pendência | **RN-062** | Confirmada — é o caso mais comum da recusa que a RN-062 trata. |
| `RN-317` | estorno só efetivado no webhook | **RN-063** | **Confirmada, com uma correção.** O que a spec chamava de reembolso `solicitado` é o **aceite**, e é ele — não a confirmação — que libera o cancelamento. Entram o prazo de 7 dias sem confirmação e o desfecho do estorno aceito que depois é recusado. |
| `RN-323` | repasse discriminado na tela e no e-mail | **RN-096** | Confirmada e ampliada: a discriminação vale também na página do encontro e na consulta por token, e `valor_devido` fica declarado como a taxa do encontro, sem o repasse. |
| `RN-324` | trocar o repasse não altera cobrança existente | **RN-096** | Confirmada. |
| `RN-328` | estorno devolve a taxa proporcionalmente | **RN-097** | Confirmada e ampliada para a contestação e para a reversão dela, com quem recebe a devolução dependendo do repasse. |
| `RN-329`, `RN-330` | apuração da taxa e conciliação mensal | **RN-102** | Confirmadas. A RN-102 acrescenta o **para quê**: é relatório de faturamento externo, coerente com §1, e o dinheiro já foi retido no split. |
| `RN-325`, `RN-326`, `RN-327` | conexão resolvida antes da chamada, renovação de token, revogação detectada no primeiro `401` | **RN-098** | Confirmadas quanto ao bloqueio e ao alerta. **Mudam** no que vem depois: `503 RECEBIMENTO_INDISPONIVEL` deixa de ser o desfecho da inscrição pública — a inscrição é aceita, a vaga é reservada, a cobrança fica pendente de emissão e o prazo da RN-052 não corre. |
| `RN-315`, `RN-321`, `RN-322` | idempotência do estorno, `application_fee` na criação, teto da tarifa | — | Continuam de spec: são o **como** do que RN-043, RN-062 e §8.3 decidem. |

### `00-multi-inquilino.md` e `01-modelo-de-dados.md` — a plataforma, na 1.4

A 1.2 e a 1.3 trataram do operacional e do financeiro, que estão em `02-inscricao.md`, `03-cobranca.md`, `04-webhook.md` e `05-lista-de-espera.md`. A 1.4 trata do que sobrou: as entidades de plataforma, que a spec teve de inventar inteiras porque o PRD só as citava de passagem. É a maior transferência de origem das quatro versões — dez tabelas que existiam só na spec passam a ter definição aqui.

| Regra da spec | Assunto | Passa a vir de | Situação |
|---|---|---|---|
| `01` `RN-121`, `RN-122`, `RN-123` | conexão de gateway: segredo no cofre, renovação, resolução com fallback | **RN-104**, **RN-105** | Confirmadas. O PRD passa a ter a entidade (§4.12) no lugar do campo opaco `config_pagamento`, e acrescenta o que a spec não dizia: quem pode conectar, os três motivos de desativação e o que a desconexão **não** desfaz. |
| `01` `RN-124`, `RN-125` | identidade sem `select` livre; `resolver_identidade` não atualiza nome | RN-001, RN-011a | Já vinham da 1.1. A 1.4 acrescenta o que faltava **antes** da chamada: **RN-010a** (normalização e validação) e **RN-010b** (pessoa sem CPF), que a spec não tinha em lugar nenhum. |
| `01` `RN-127` | `pessoa_dado_sensivel` sem junção, acesso restrito a `coordenador_encontro` e `admin_central` | **RN-091a** | **Muda.** A restrição a essas duas contas não sobrevive: RN-091a acrescenta os servos das áreas de cozinha e de saúde (RN-047a) e institui a lista consolidada da cozinha e o relatório restrito de saúde como exceções nomeadas à proibição de junção — os dois expressamente proibidos pela redação atual de `RN-127`. |
| `01` `RN-128` | acesso de suporte não alcança esta tabela, em hipótese alguma | **RN-091a**, **RN-005a** | Confirmada. |
| `00` `RN-080t` | acesso de suporte não alcança dado sensível, em hipótese alguma | **RN-091a**, **RN-005a** | **Confirmada.** É o caso mais claro de spec decidindo no silêncio do PRD: o documento não dizia, `00-multi-inquilino.md` decidiu que nunca alcança, e **a decisão da spec fica**, agora com origem aqui. |
| `00` `RN-078t`, `RN-079t`, `RN-081t` | concessão com motivo e prazo de 24h, leitura auditada, expiração por rotina | **RN-005a** | Confirmadas, com a entidade em §4.16 e dois acréscimos: o que a concessão **alcança**, e que o CPF fica fora dela por estar na identidade global, que ninguém lê. |
| `00` `RN-077t` | aceite do contrato grava versão, data, hora, IP e usuário | RN-015, **RN-090a** | Confirmada, e separada do que ela não era. O **contrato** é do operador com o inquilino; o **termo** é do inquilino com o titular, e era ele que faltava (§4.13). Confundir os dois é o que fazia parecer que a implantação já cobria a LGPD. |
| `01` `RN-129` | o termo é do inquilino; `versao_termo` referencia o dele | **RN-090a** | Confirmada e ampliada: quem publica, uma versão vigente por vez, versão publicada **imutável**, e o que a versão nova faz com o consentimento antigo. |
| `01` §6, passo 1 | a rotina de retenção pula quem tem "consentimento de retenção ativo" | **RN-093a** | **Confirmada, e o consentimento passa a existir.** A spec já consultava um consentimento que documento nenhum coletava. A RN-093a define onde ele é coletado, que vem desmarcado, que não é condição de nada e que revogá-lo devolve a pessoa à fila da passada seguinte. |
| `01` `RN-133` | `token_consulta` aleatório, único, fora de log e de query string | **RN-019** | Confirmada e ampliada: o token é a credencial do **inscrito**, vale enquanto o encontro não encerra — inclusive com a inscrição já `cancelada`, porque é por ele que se acompanha o reembolso — e é reemitido a pedido. |
| `01` `RN-135` | `webhook_evento` sem RLS, `inquilino_id` nullable | **RN-053** | Confirmada e ampliada: assinatura inválida também é gravada, e o corpo bruto tem prazo de guarda por carregar dado do pagador. |
| `01` `RN-136`, `RN-137` | `chave_unica` da notificação; remetente com a marca do inquilino | **RN-107** | Confirmadas, com o acréscimo do envio **depois do commit** e do desfecho da falha depois do teto de tentativas. |
| `01` `RN-138`, `RN-139` | auditoria append-only; leitura sob suporte auditada | **RN-106** | Confirmadas e ampliadas: onde `motivo` é obrigatório, quais entidades entram na lista, o que `antes`/`depois` nunca carregam e o que sobra da auditoria depois da anonimização. |
| `01` `RN-130` | central herda `reembolso_faixas`, `parcela_minima` e `max_parcelas` por cópia | **RN-103** | **Confirmada.** A herança por cópia era invenção de spec, e a razão que a spec deu é a certa. Passa a valer para todas as configurações, com o ato explícito de propagação às centrais que já existem. |
| `01` `RN-131`, `RN-132` | `numero` fixo e editável; `titulo` armazenado formatado | RN-020 | Confirmadas. A 1.4 acrescenta a regra do `slug`, que já estava na tabela `encontro` sem regra nenhuma: **RN-024**. |
| `01` `RN-126`, `RN-141`, `RN-142` | pessoa sem `central_id`; teste de RLS; travessia na rotina de retenção | RN-014, RN-001 | Sem mudança. `RN-141` continua de spec: é o **como**. |
| `01` `RN-140` | uma conta por inquilino, sem troca de contexto | **RN-017**, **RN-018**, **RN-019** | **Confirmada no princípio e mudada no conteúdo** — o desdobramento está na tabela abaixo. |
| `00` `RN-085t` | inadimplência não derruba encontro em andamento; contas de quem opera continuam ativas | **RN-018**, **RN-007** | **Confirmada.** É a decisão nº 7 de §11, fechada: a spec decidiu sozinha o mesmo ponto que RN-018 (§4.15) decide sobre a conta de quem opera o encontro, e chegou à mesma resposta. A referência a "decisão em aberto nº 7 do PRD" no texto da regra passa a citar RN-018 (§12, "O que falta", 1.6). |

### Convenções técnicas do `README.md` da Fase 1

Quatro convenções da seção "Convenções" de `specs/fase-1/README.md` existiam só ali, sem origem no PRD — a mesma situação de toda regra `[NOVA]` das tabelas acima, agora para requisito não funcional em vez de regra de negócio. A 1.5 dá a elas o id que faltava:

| Convenção do README | Passa a vir de |
|---|---|
| Fuso e representação de data/hora | **RNF-008** |
| Dinheiro | **RNF-009** |
| Identificadores | **RNF-010** |
| Envelope de erro da API | **RNF-011** |

O conteúdo não muda — o README já estava certo —, só a origem. Na próxima passada, `specs/fase-1/README.md` cita os quatro ids em vez de descrevê-los sem referência.

### O que falta

Nenhum arquivo de `specs/` foi alterado na 1.2, na 1.3, na 1.4, na 1.5 nem na 1.6. As specs da Fase 1 precisam de uma passada para citar os ids do PRD e tirar as marcas `[NOVA]` das regras das tabelas acima. **Esta lista — as tabelas de mudança de 1.2 a 1.6 e as divergências abaixo — é o recorte da passada: o que não estiver aqui não será corrigido**, e por isso ela é enumerada inteira em vez de resumida numa contagem.

**Mudanças de conteúdo vindas da 1.2:**

| Onde | O que muda | Origem |
|---|---|---|
| `02-inscricao.md` `RN-201` | pagamento estornado deixa de cancelar a inscrição automaticamente: continua `confirmada`, com pendência, e a saída é da coordenação | RN-037 |
| `02-inscricao.md` `RN-202` | borda superior da janela vira `< inscricoes_fecham_em`; entra a condição de inquilino `ativo`; entra a dispensa da janela na criação administrativa | RN-023, RN-035 |
| `02-inscricao.md` `RN-200` | a tabela validada passa a ser a da RN-030, com as linhas de cascata executadas pelo **sistema**, os dois papéis da promoção manual e as linhas de criação administrativa | RN-030, RN-035, RN-036, RN-061 |
| `05-lista-de-espera.md` §4 | "estorno que leva à `cancelada`" sai da lista de gatilhos de liberação de vaga | RN-037 |
| `05-lista-de-espera.md` §4 e `RN-509` | `espera_expira_em` deixa de ser `now() + 48h` fixo no diagrama e passa às faixas 48h/24h/6h, com as bordas fechadas | RN-033 |
| `05-lista-de-espera.md` §5 | depois do fechamento o prazo do promovido não devolve ninguém à fila: vira pendência de vaga para a coordenação | RN-036, RN-052 |
| `03-cobranca.md` `RN-306`, `RN-307` | `expira_em` e o limite da regeração passam a ser truncados pelo **marco de corte do pagamento online** (`data_inicio`), não por `inscricoes_fecham_em`; cartão segue o mesmo marco | RN-041 |
| `03-cobranca.md` e `01-modelo-de-dados.md` | campos de estorno (`estorno_situacao`, `estorno_valor`, `estorno_atualizado_em`, `estorno_tarifa_gateway`) e de devolução presencial (`devolucao_presencial_*`), de onde as três pendências financeiras são derivadas — e, no caso do `estorno_tarifa_gateway`, de onde a Fase 3 lança a despesa de `meio de pagamento` | §4.6, RN-037, RN-060, RN-061 |
| `01-modelo-de-dados.md` | `espera_expira_em` permanece preenchido durante `pendente_pagamento`; `posicao_espera` continua exclusiva de `lista_espera`, como a restrição já impõe | §4.5, RN-033 |

A categoria de despesa `meio de pagamento` e seu lançamento automático (§4.11, RN-060) **não entram nesta passada**, e a ausência de linha na tabela acima é de propósito: `01-modelo-de-dados.md` modela só a Fase 1, que não tem tabela `despesa` — despesas e prestação de contas estão fora do recorte da fase, como o próprio `specs/fase-1/README.md` declara. Da Fase 1 essa regra só exige o `estorno_tarifa_gateway` na cobrança, já coberto pela linha dos campos de estorno; a categoria e o lançamento são modelados na spec da Fase 3, quando ela existir (§10).

**Mudanças de conteúdo vindas da 1.3:**

| Onde | O que muda | Origem |
|---|---|---|
| `03-cobranca.md` `RN-304` e `02-inscricao.md` `RN-205` | sai o pedido de confirmação: as duas estão confirmadas por escrito, e a origem passa a ser o PRD | RN-101, RN-060 |
| `02-inscricao.md` §3.2 e `RN-208` | a ordem ganha o cancelamento da cobrança viva antes do estorno, o atalho dos casos sem valor a devolver e o pagamento que chega para inscrição já `cancelada` | RN-062 |
| `03-cobranca.md` `RN-317` | o marco que libera o cancelamento é o **aceite**, não a confirmação; entram o prazo de 7 dias e o estorno aceito que depois é recusado | RN-063 |
| `03-cobranca.md` §1 e `RN-300` | `charged_back` deixa de ser mapeado para `estornada`: a contestação tem registro próprio e não se confunde com o estorno que a plataforma pediu | RN-064, §4.6 |
| `03-cobranca.md` §7.2 | a tabela de repasse ganha a distinção entre `valor_devido` e `valor`; a discriminação passa a valer também na página do encontro e na consulta por token | RN-096 |
| `03-cobranca.md` §7.1 | a base do percentual deixa de ser `valor`: `taxa_plataforma = round(base_taxa_encontro * percentual / 100, 2)`, com ou sem repasse, onde `base_taxa_encontro` é a parcela de taxa do encontro que **aquela** cobrança cobra — o `valor_devido` na cobrança comum, e só a diferença na cobrança de complemento da RN-037, para a taxa cheia não ser cobrada duas vezes na mesma inscrição. Com repasse a fórmula atual é circular — o `valor` já contém a taxa — e devolve R$ 8,97 onde a página do encontro imprimiu R$ 8,75. O percentual usado é o congelado na inscrição (`taxa_plataforma_percentual`, §4.5), não o vigente do inquilino | RN-037, RN-043, RN-096 |
| `03-cobranca.md` `RN-324` e `01-modelo-de-dados.md` | a âncora do repasse passa a ser a **inscrição**: `taxa_plataforma_repassada` e `taxa_plataforma_percentual` congelados na criação da inscrição, e a cobrança lê os dois de lá em vez de `inquilino.taxa_repassada_ao_inscrito` e do percentual vigente. Sem isso, promoção da lista de espera e emissão restaurada cobram preço diferente do divulgado | RN-096, RN-038, §4.5 |
| `03-cobranca.md` `RN-325` e `02-inscricao.md` | `503 RECEBIMENTO_INDISPONIVEL` deixa de ser o desfecho da inscrição pública: vaga reservada, cobrança pendente de emissão e prazo suspenso | RN-098, RN-052 |
| `01-modelo-de-dados.md` e `03-cobranca.md` §1 | `situacao_cobranca` ganha **`pendente_emissao`**, incluída em `cobranca_viva_unica` e sem `gateway_pagamento_id`, `pix_qr_code`, `link_pagamento` nem `expira_em`. A terceira exceção da RN-052, o item de vaga reservada no painel e a quinta pendência derivada leem dela, e não de "inscrição `pendente_pagamento` sem cobrança". A emissão restaurada usa o `metodo` gravado ali, `pix` na falta de escolha | RN-098, RN-052, §4.6 |
| `03-cobranca.md` §6 e `01-modelo-de-dados.md` | `estorno_situacao` ganha **`indeterminado`**, para o pedido cujo resultado não se conhece (timeout, `5xx`, conexão indisponível). O pedido é repetido com a mesma chave de idempotência (`RN-315`), a inscrição continua `confirmada` com a vaga presa, e o caso vira pendência com a mesma visibilidade da recusa | RN-062, RN-098, §4.6 |
| `01-modelo-de-dados.md` | os campos de estorno passam a ter semântica declarada: `valor_estornado` → `estorno_valor` e `estornado_em` → `estorno_atualizado_em`, os três valores (`estorno_valor`, `estorno_tarifa_gateway`, `taxa_estornada`) são **acumuladores** da vida da cobrança e só a reversão de contestação subtrai; `estorno_situacao` reflete o **último** pedido, e pedido novo é recusado enquanto houver outro em `solicitado` ou `indeterminado`. `taxa_estornada` fica com o nome e o sentido que já tem | §4.6, RN-037, RN-097 |
| `03-cobranca.md` `RN-329` | a apuração deixa de somar só `situacao = 'paga'`: entra **toda cobrança que recebeu pagamento**, qualquer que seja a situação atual, somando `taxa_plataforma − taxa_estornada`. Como está, cobrança estornada em parte sai da conta inteira e o operador fatura a menos | RN-102, RN-097 |
| `03-cobranca.md` e `01-modelo-de-dados.md` | campos `contestacao_situacao`, `contestacao_valor` e `contestacao_atualizada_em` na cobrança; `estorno_tarifa_gateway` passa a receber também a tarifa de contestação | §4.6, RN-064 |
| `04-webhook.md` §5, passo 12 | o passo que "trata reembolso" para `estornada`/`estornada_parcial` passa a separar o estorno que **nós pedimos** da contestação que **chega pronta**: o primeiro fecha o pedido em `concluido` e acumula `estorno_valor` e `taxa_estornada`; a segunda não passa por ali | RN-063, RN-064, RN-097 |
| `04-webhook.md` §5 e `RN-300` | `charged_back` grava os campos `contestacao_*` — `aberta`, `perdida` ou `revertida` — e a tarifa de contestação em `estorno_tarifa_gateway`, nunca `situacao = estornada`. A reversão desfaz a `taxa_estornada` correspondente e fecha a pendência; a perda a mantém aberta | RN-064, RN-097, RN-037 |
| `04-webhook.md` §5, passos 12 e 13 | o webhook é o **marco de efetivação** do reembolso (`estorno_situacao = concluido`) e é ele, e só ele, que dispara a notificação de reembolso efetivado. O aceite síncrono não a dispara | RN-063, §7 |
| `04-webhook.md` §8, testes 13, 14 e 17 | os cenários deixam de citar `RN-317`, `RN-300` e `RN-328` e passam a citar `RN-063`, `RN-064` e `RN-097`; o teste 13 separa aceite de efetivação, o 14 verifica os campos `contestacao_*` e o 17 cobre também a contestação e a reversão dela | §12 |
| `02-inscricao.md` §4.4 (e a resposta de §4.6) | `prazoEstimadoDias` sai do contrato público: o reembolso solicitado devolve a **data do pedido** e o prazo do meio de pagamento como é — Pix em minutos, cartão na fatura do emissor —, sem prometer como nosso um prazo que é dele | RN-063 |
| `06-criterios-de-aceite.md` | os aceites que citam `RN-205`, `RN-208` e `RN-317` passam a citar `RN-060`, `RN-062` e `RN-063`, e ganham o caso do estorno aceito sem confirmação | §12 |

**Mudanças de conteúdo vindas da 1.4:**

| Onde | O que muda | Origem |
|---|---|---|
| `01-modelo-de-dados.md` `usuario` e o enum `papel_usuario` | o enum perde três valores: `inscrito`, porque o inscrito **não tem conta** e usa `token_consulta`; `coordenador_encontro` e `coordenador_area`, porque passam a ser **derivados** dos ponteiros do encontro e da área. Ficam `operador`, `admin_denominacao`, `admin_central` e `servo`. A tabela ganha `email`, `situacao`, os campos de convite e os de revogação, e a conta revogada deixa de ser apagável. Reconvidar passa a **reaproveitar a linha existente** — token novo, prazo novo —, inclusive quando o convite anterior expirou: é o que evita a colisão com a unicidade de (inquilino, e-mail) | RN-017, RN-018, RN-019, RN-025 |
| `01-modelo-de-dados.md` `central` | `reembolso_faixas` muda de forma e de padrão: a chave passa a ser `antecedencia_minima_dias` e a primeira faixa passa de **15** para **16**. Com `15` e comparação `<=`, quinze dias exatos devolvem 100% onde a RN-060 manda devolver 50% — é a mesma divergência que §12 já apontava em `02-inscricao.md` §3.1, e ela está também no `default` da tabela. Entra `despesa_exige_comprovante_acima_de`, e sai qualquer resquício de `config_pagamento` | RN-060, RN-065, RN-049a |
| `01-modelo-de-dados.md` `encontro` | ganha `coordenador_inscricao_id`, limpo quando a inscrição apontada é cancelada; `slug` passa a ter regra — sugerido na criação, editável em `rascunho`, **imutável a partir de `publicado`** | RN-024, RN-025 |
| `01-modelo-de-dados.md` `inscricao` | `convidador_nome_livre` é renomeado para `convidador_nome`, a constraint `inscricao_convidador_exclusivo` é removida — os dois campos passam a coexistir preenchidos —, e ganha `reembolso_faixas` congelado na criação | RN-039, RN-065 |
| `01-modelo-de-dados.md` `pessoa` | `identidade_id` passa a ser **nullable** em todos os casos que o esvaziam — a pessoa sem CPF (RN-010b), a pessoa anonimizada pelo pedido de exclusão (RN-092b) e a pessoa anonimizada por idade (RN-093) —, e nenhuma constraint pode restringir o `null` ao caso da pessoa sem CPF: a rotina de exclusão esvazia o mesmo ponteiro. `pessoa_unica_por_inquilino` deixa de alcançar essas pessoas. Entra `anonimizada_em`, que a rotina de §6 já gravava sem estar na tabela | RN-010b, RN-092b, RN-093 |
| `01-modelo-de-dados.md` `consentimento` e tabela `termo` (nova) | o termo do inquilino passa a ser tabela, com versão, situação, finalidades e identificação do controlador e do encarregado; `consentimento` ganha `inscricao_id`, `termo_id` e `origem`, e `versao_termo` fica como **cópia** ao lado do ponteiro. O consentimento de retenção passa a ser **linha própria** de `consentimento`, com seu próprio `aceito_em` e sua própria revogação — não uma finalidade dentro da linha do consentimento obrigatório | RN-090a, RN-090b, RN-093a |
| `01-modelo-de-dados.md` `conexao_gateway` | ganha `conectada_por`, `conectada_em`, `desativada_em` e `motivo_desativacao`, com os três motivos distinguidos; a conexão substituída deixa de ser apagável | RN-104, RN-105 |
| `01-modelo-de-dados.md` `auditoria` | ganha `ator_descricao`, `motivo` e `user_agent`, com `motivo` obrigatório na lista de atos da RN-106; `antes`/`depois` passam a excluir campo sensível e segredo | RN-106 |
| `01-modelo-de-dados.md` `webhook_evento` | ganha o expurgo de `corpo_bruto` e `cabecalhos` aos 90 dias, mantendo o resto da linha | RN-053 |
| `01-modelo-de-dados.md` §6 | a rotina de retenção passa a ser também o caminho da **exclusão a pedido do titular**, com o adiamento por inscrição viva e por pendência financeira, e com o apagamento — não anonimização — de `pessoa_dado_sensivel` | RN-092b, RN-093a |
| `01-modelo-de-dados.md` `pessoa_dado_sensivel` | `RN-127` deixa de restringir a leitura a `coordenador_encontro` e `admin_central`: passa a admitir também os servos da área com `papel = cozinha` e da área com `papel = saude` (RN-047a), e os dois relatórios de §6 como exceções nomeadas à proibição de junção. `plano_saude` **sai** da tabela — `§4.3a` guarda os quatro campos que RN-091a declara, e nenhum a mais | RN-091a |
| `01-modelo-de-dados.md` `notificacao` | ganha `pessoa_id` e `usuario_id`, necessários para os gatilhos de §7 sem inscrição associada — o "Convite de acesso" (RN-018), que se dirige ao convidado de F8, que não tem inscrição | §4.18, RN-107 |
| `02-inscricao.md` `RN-204`, `RN-213` | continuam de spec, porque são o **como**. O **quê** que elas gravam passa a vir da RN-090b, inclusive o caso que a spec não previa: inscrição criada pela coordenação nasce **sem campo sensível preenchido**, e a pessoa os completa pelo link | RN-090b |
| `02-inscricao.md` §4.2 (ficha) e §4.4 | a ficha ganha o consentimento de retenção como item **separado e desmarcado**, `convidador_nome` ao lado do ponteiro, e a normalização/validação do CPF antes de qualquer chamada a `resolver_identidade` | RN-093a, RN-039, RN-010a |
| `06-criterios-de-aceite.md` | entram aceites para convite, ativação e revogação de conta; para CPF mascarado, inválido e de dígitos repetidos; para a pessoa sem CPF criada pela coordenação; e para exportação e exclusão com e sem inscrição viva | F8, F9, F10 |

**Mudanças de conteúdo vindas da 1.5:**

| Onde | O que muda | Origem |
|---|---|---|
| `00-multi-inquilino.md` §3 e `RN-060t` | a rota administrativa neutra (`app.com.br/admin`, resolvendo o inquilino só pelo vínculo do usuário autenticado) deixa de existir: toda rota, autenticada ou não, resolve o inquilino pelo host primeiro (RNF-006), e a área administrativa de um inquilino vive no subdomínio ou domínio próprio dele. `RN-060t` passa a **validar** o vínculo do usuário **contra** o host já resolvido, em vez de resolver o inquilino a partir dele | §8.1 |
| `00-multi-inquilino.md` §3 e `RN-061t` | a tabela de resolução de §3 ganha um terceiro host reconhecido, ao lado do subdomínio curinga e do domínio próprio verificado: o host próprio da plataforma que serve a área do operador (`operador.app.com.br` ou equivalente, RN-111), reconhecido **antes** de aplicar o predicado de tenant e sem `inquilino_id` nenhum no contexto de transação. `RN-061t` deixa de tratar esse host como desconhecido — só continua caindo na página neutra de "endereço não encontrado" o host que não bater com nenhum dos três. A lista de `Access-Control-Allow-Origin` ganha esse host como entrada fixa própria, separada da lista dinâmica de subdomínios de inquilino e domínios próprios verificados | §8.1, RNF-006, RN-111 |
| `00-multi-inquilino.md` `RN-062t` | o texto da verificação de domínio próprio precisa bater com a forma que a RNF-006 descreve (CNAME ou registro equivalente) — hoje `RN-062t` fala só em registro TXT. A passada decide qual mecanismo prevalece e alinha os dois textos | RNF-006 |
| `02-inscricao.md` `RN-210` | ganha origem no PRD — ver a linha corrigida na tabela de `02-inscricao.md` acima | RNF-012 |
| nenhum documento de spec cobre hoje | `RN-112` (inscrição criada) e `RN-113` (lembrete do encontro, com o job agendado 7 dias e 1 dia antes de `data_inicio`) precisam de dono num documento da Fase 1 — o primeiro cabe em `02-inscricao.md`, o segundo não tem lar óbvio nos cinco documentos existentes | §7 |
| `specs/fase-1/README.md`, "Escopo desta fase" | "Painéis: central, denominação e operador" sai da lista: os painéis da central e da denominação (RN-109, RN-110) são Fase 3 (§6). Ficam o painel do operador (RN-111) e o painel do encontro (RN-115) | §6 |

**Três documentos de spec que a Fase 1 ainda não tem.** F8, F9 e F10 são fluxos da Fase 1 (§10) e não têm arquivo em `specs/fase-1/`: contas de acesso, reconhecimento por CPF e direitos do titular estão hoje espalhados entre `00-multi-inquilino.md` e `01-modelo-de-dados.md`, em pedaços que descrevem tabela e não fluxo — que é exatamente por que a ausência não incomodava. Cada documento novo reserva o seu bloco de 100 ids em §0.2 no ato da criação, a partir de RN-700.

**Mudanças de conteúdo vindas da 1.6:**

| Onde | O que muda | Origem |
|---|---|---|
| `00-multi-inquilino.md` `RN-085t` | a referência a "decisão em aberto nº 7 do PRD" passa a citar a decisão fechada — a conta de quem opera o encontro continua ativa durante a suspensão do inquilino, como RN-018 já decide | RN-018, RN-007, §11 item 7 |
| `04-webhook.md` `RN-405` | a referência a "decisão em aberto nº 2 do PRD" passa a registrar que a decisão é **[BLOQUEANTE DA FASE 1]**, não uma pendência solta | §11 item 2 |
| `01-modelo-de-dados.md` (`central_id` nulo em `conexao_gateway`) | mesma correção: a referência a "decisão em aberto nº 2 do PRD" passa a registrar que a decisão é **[BLOQUEANTE DA FASE 1]** | §11 item 2 |
| `02-inscricao.md` (canal WhatsApp em F1/§7) | a referência a "decisão em aberto nº 1 do PRD" ganha o prazo que faltava: antes do início da Fase 2 ou da Fase 3, o que vier primeiro | §11 item 1 |

**Divergências herdadas da 1.1, que a mesma passada precisa corrigir** — não são decisão nova, são spec que ficou fora de sincronia:

- `02-inscricao.md` §3.1 escreve "Padrão RN-060: >= 15 dias → 100%", contra o `> 15` da tabela da RN-060. Com o `>=`, 15 dias exatos devolvem 100% na spec e 50% no PRD.
- `02-inscricao.md` §4.7 e o enum `metodo_pagamento` de `01-modelo-de-dados.md` usam o método `presencial`, que a RN-040 substituiu por **dois**: `dinheiro` e `pix_presencial`. A prestação de contas separa os dois (RN-044), e um enum só não comporta isso.

Até a passada acontecer, o PRD é o documento correto e a spec é a versão anterior dele.
