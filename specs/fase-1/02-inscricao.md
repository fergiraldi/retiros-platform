# 02 — Inscrição

## 1. Máquina de estados

```mermaid
stateDiagram-v2
    [*] --> lista_espera: sem vaga (RN-033)
    [*] --> pendente_pagamento: há vaga
    lista_espera --> pendente_pagamento: promovida (RN-033)
    lista_espera --> cancelada: desiste
    pendente_pagamento --> confirmada: pagamento aprovado (RN-032)
    pendente_pagamento --> lista_espera: prazo estourado (RN-052)
    pendente_pagamento --> cancelada: desiste / encontro cancelado
    confirmada --> cancelada: cancelamento com reembolso (RN-060)
    confirmada --> presente: check-in (fase 2)
    confirmada --> ausente: encontro encerrado sem check-in (fase 2)
    cancelada --> [*]
    presente --> [*]
    ausente --> [*]
```

Transições permitidas, nada além disso:

| De | Para | Gatilho | Quem |
|---|---|---|---|
| — | `lista_espera` | inscrição sem vaga | público / coordenação |
| — | `pendente_pagamento` | inscrição com vaga | público / coordenação |
| `lista_espera` | `pendente_pagamento` | vaga liberada | sistema |
| `lista_espera` | `cancelada` | desistência | inscrito / coordenação |
| `pendente_pagamento` | `confirmada` | webhook de aprovação | sistema |
| `pendente_pagamento` | `confirmada` | baixa manual | coordenação |
| `pendente_pagamento` | `lista_espera` | 72h sem pagar (RN-052) | sistema |
| `pendente_pagamento` | `cancelada` | desistência / encontro cancelado | inscrito / coordenação |
| `confirmada` | `cancelada` | cancelamento com reembolso | inscrito / coordenação |

**RN-200 (RN-030)** — Toda transição é executada por um único serviço de domínio (`InscricaoService.transicionar`), que valida a origem contra a tabela da RN-030, grava auditoria e enfileira notificação numa mesma transação. Nenhum `update situacao` fora dele. Transição não prevista na tabela retorna `409 CONFLITO_DE_SITUACAO` com a situação atual e a pretendida. A cascata do cancelamento do encontro (RN-061) é executada pelo **sistema**, nunca em nome da coordenação; a promoção manual (RN-036) tem dois papéis mínimos — coordenador do encontro dentro do limite de vagas, `admin_central` acima dele —, e a criação administrativa (RN-035) tem linhas próprias na tabela, dispensada da janela de inscrição.

**RN-201 (RN-037)** — `confirmada → pendente_pagamento` não existe. Estorno — total ou parcial — que a plataforma não originou, e contestação de cartão, **não mudam a situação da inscrição sozinhos**: a inscrição continua `confirmada`, mantém a vaga, e passa a exibir pendência financeira para a coordenação, que decide entre cobrar de novo (RN-032, RN-044) e cancelar (`confirmada → cancelada`). A decisão é humana, não automática: contestação chega dias depois e às vezes é revertida, estorno feito por engano na conta do gateway não é desistência de ninguém, e derrubar sozinho quem já pediu folga no trabalho produz o dano que não se conserta na véspera.

---

## 2. Regras de criação

### 2.1 Janela de inscrição

**RN-202 (RN-023, RN-035)** — Aceita inscrição pelo site apenas se:

- `encontro.situacao = 'publicado'`
- `inscricoes_abrem_em <= now() < inscricoes_fecham_em` — o instante de abertura já está dentro, o de fechamento já está fora
- inquilino `ativo`

Fora da janela ou com inquilino `suspenso`: `422 INSCRICOES_FECHADAS`. Nunca esconder o botão como única defesa — link antigo compartilhado em grupo de WhatsApp continua sendo clicado semanas depois. A **criação administrativa** de inscrição pela coordenação (§4.7) é dispensada dos três predicados (RN-035): não passa por este checkout.

### 2.2 Identidade e deduplicação de pessoa (RN-010 a RN-014)

Ao receber a ficha:

0. O CPF é **normalizado** (só os 11 dígitos, preservando zero à esquerda) e **validado** (dígitos verificadores, recusa das dez sequências de dígito repetido) antes de qualquer chamada a `resolver_identidade` (RN-010a). CPF que não fecha não vira identidade.
1. `resolver_identidade(cpf, nome, nascimento)` devolve o `identidade_id` — criando a identidade se for a primeira vez na plataforma. A função devolve **só o uuid** ([01-modelo-de-dados.md](01-modelo-de-dados.md#31-identidade)).
2. Busca `pessoa` por `(inquilino_id, identidade_id)`.
3. Achou → reaproveita o registro e **atualiza** telefone, e-mail e endereço com o que veio na ficha. Não sobrescreve `nome_completo` (evita que erro de digitação apague o cadastro histórico); divergência de nome vira alerta na coordenação.
4. Não achou → cria a pessoa **do zero**, com o que veio na ficha (RN-013). Nada é copiado de outro inquilino.

**RN-212** — A resposta da API é **idêntica** havendo ou não identidade prévia em outro inquilino: mesmo código, mesmo corpo, mesma latência perceptível. A ficha não autopreenche nada e não exibe "já cadastrado". Um inquilino não descobre, por diferença de comportamento, que a pessoa passou por outra denominação (RN-065t, RN-094a).

**RN-213** — A pessoa é do inquilino, não da central. Quem viveu o encontro em Cascavel e se inscreve para servir em Maringá — mesma denominação — é reconhecido, sem recadastro. Entre denominações, não.

`pessoa_dado_sensivel` é sempre sobrescrito com o que veio na ficha: restrição alimentar e medicamento mudam entre um encontro e outro, e o dado da inscrição atual é o que a cozinha e a equipe de saúde precisam.

### 2.3 Uma inscrição ativa por encontro (RN-031)

Garantido por índice parcial ([01-modelo-de-dados.md](01-modelo-de-dados.md#36-inscricao)). Violação vira `409 JA_INSCRITO`, com a situação da inscrição existente e o link de consulta — a pessoa quase sempre esqueceu que já se inscreveu, e mandá-la para a própria inscrição resolve sem passar pela secretaria.

Se a inscrição existente estiver `cancelada`, a nova é aceita normalmente.

### 2.4 Valor devido

**RN-203 (RN-038)** — `valor_devido` é copiado da taxa do encontro no momento da inscrição, não lido por join na hora de cobrar. Se a central reajustar a taxa, quem já se inscreveu mantém o valor original. Sem essa cópia, um reajuste altera retroativamente a dívida de todo mundo que ainda não pagou. Alteração individual (bolsa, correção de tipo, acerto combinado) continua possível, mas só por ato explícito da coordenação, com motivo e auditoria — nunca como efeito colateral de mudar a configuração do encontro.

`tipo = participante` → `taxa_participante`. `tipo = servo` → `taxa_servo` (RN — servo paga taxa reduzida de alimentação).

### 2.5 Vagas

Contagem de ocupação por tipo:

```sql
select count(*) from inscricao
where encontro_id = $1
  and tipo = $2
  and situacao in ('pendente_pagamento', 'confirmada', 'presente');
```

`lista_espera`, `cancelada` e `ausente` não ocupam vaga. `pendente_pagamento` **ocupa** — é o que dá sentido ao prazo de 72h da RN-052.

O controle de concorrência dessa contagem está em [05-lista-de-espera.md](05-lista-de-espera.md#3-concorrência-na-última-vaga). É o ponto mais delicado da fase.

### 2.6 Área pretendida do servo

`area_pretendida` é texto livre de preferência, não vínculo. A alocação real é fase 2 (RN-047). O formulário deixa explícito: "preferência, sujeita à definição da coordenação".

### 2.7 Consentimento (RN-090, RN-090b)

**RN-204** — A inscrição e o registro em `consentimento` são gravados na mesma transação, contra a **versão vigente** do termo do inquilino (RN-090a). Inscrição sem consentimento correspondente não pode existir — é o registro que sustenta o tratamento de dado sensível. Se a gravação do consentimento falhar, a inscrição inteira reverte.

O consentimento de **retenção** (RN-093a) é item **separado**, com sua própria caixa, **desmarcado por padrão**, ao lado do consentimento obrigatório e nunca dentro dele — recusar não impede nada, a inscrição segue normalmente. `convidador_nome` (RN-039) é sempre gravado, inclusive quando `convidadorPessoaId` está preenchido: é o texto que a pessoa digitou, e é o que a secretaria compara quando a ligação chega.

---

## 3. Cancelamento e reembolso (F3)

### 3.1 Cálculo

`antecedencia_dias` = `encontro.data_inicio - hoje`, em dias corridos inteiros arredondados para baixo, fuso `America/Sao_Paulo`.

Percorre `inscricao.reembolso_faixas` — cópia de `central.reembolso_faixas` congelada na criação (RN-065) — ordenado por `antecedencia_minima_dias` decrescente e aplica a primeira faixa cujo `antecedencia_minima_dias` seja menor ou igual à antecedência. Antecedência negativa (cancelamento pedido depois do início do encontro) cai na última faixa.

Padrão de fábrica (RN-060, RN-065): `antecedencia_minima_dias` 16 → 100%; 7 → 50%; 0 → 0%. **A primeira linha é 16, não 15**: a faixa de 100% abre em `antecedencia_dias > 15` — 15 dias exatos devolvem 50%, não 100%.

**RN-205 (RN-060)** — O percentual incide sobre o valor **efetivamente pago**, não sobre `valor_devido`: os dois divergem em toda inscrição paga em parte. A base inclui a taxa da plataforma repassada ao inscrito, quando o inquilino optou por repassá-la (RN-096), e exclui o juro do parcelamento (RN-101), que nunca entrou na conta da central. Taxa do gateway não é devolvida ao inscrito nem descontada dele: entra como despesa da central na prestação de contas (fase 3), gravada em `estorno_tarifa_gateway` no ato do estorno.

**RN-206 (RN-060)** — Cancelar inscrição `pendente_pagamento` não devolve nada, porque não há valor efetivamente pago: apenas cancela a cobrança viva e libera a vaga.

**RN-207 (RN-061)** — Cancelamento do **encontro** (`encontro.situacao = 'cancelado'`) reembolsa 100% do valor efetivamente pago de todas as inscrições, ignorando as faixas — a política de faixas pune desistência do inscrito, não da organização. Vale também para inscrição `presente` (fase 2) e para pagamento presencial, devolvido pela central fora da plataforma e registrado nos campos `devolucao_presencial_*` da cobrança. O cancelamento do encontro **não** fica bloqueado por estorno recusado no gateway — o inscrito precisa saber hoje que o encontro não acontece; estorno que falha vira pendência derivada, visível para a coordenação. `cancelado` é terminal: não existe "descancelar".

### 3.2 Ordem das operações (RN-062)

1. Valida que a inscrição admite cancelamento (RN-030).
2. Calcula o percentual e o valor, sobre o valor efetivamente pago (RN-060).
3. **Cancela a cobrança viva** no gateway, se houver — Pix aguardando pagamento, link de cartão em aberto —, antes de qualquer outra coisa.
4. Havendo valor a devolver, **solicita o estorno** ao gateway ([03-cobranca.md](03-cobranca.md#6-estorno)) e aguarda o **aceite**.
5. **Só com o estorno aceito**, grava `inscricao.situacao = 'cancelada'`.
6. Libera a vaga e dispara a promoção da lista de espera (RN-033).
7. Notifica, com o valor devolvido e o prazo do meio de pagamento (RN-063).

**Sem valor a devolver, não há o que esperar.** Cancelamento na faixa de 0%, inscrição `pendente_pagamento` e inscrição cuja cobrança já foi estornada por inteiro pulam o passo 4: a inscrição é cancelada no ato e a vaga vai para a fila na mesma transação.

**RN-208 (RN-062)** — Se o estorno falhar no gateway (`estorno_situacao = recusado`), a inscrição **não** é cancelada: retorna `502 FALHA_NO_ESTORNO`, continua ocupando vaga e o caso vai para a fila de pendências que a coordenação enxerga. Cancelar antes de estornar produz o pior resultado possível — pessoa fora do retiro e sem o dinheiro de volta. Falha sem resposta do gateway (timeout, `5xx`, conexão indisponível) grava `estorno_situacao = indeterminado` em vez de `recusado`, com o pedido repetido pela mesma chave de idempotência, e tem a mesma visibilidade de pendência. Cobrança viva que não pôde ser cancelada não segura o cancelamento — a inscrição segue e a cobrança fica na lista de pendências. Pagamento que chegar depois para inscrição já `cancelada` **não a ressuscita**: é devolvido integralmente pela lista de devoluções pendentes.

---

## 4. Endpoints

Base pública: `/api/publico`. Base autenticada: `/api/admin`.

**O inquilino nunca aparece na URL nem no corpo.** É resolvido pelo `Host` da requisição na área pública, e pelo vínculo do usuário na área autenticada (RN-059t, RN-060t). Endpoint público que aceitasse `inquilinoId` como parâmetro seria a porta de travessia entre denominações.

### 4.1 `GET /api/publico/encontros`

Agenda da denominação do host. Sem autenticação.

Query: `uf`, `centralSlug`, `de`, `ate`, `pagina` (padrão 1), `tamanho` (padrão 20, máx 50).

`200`:

```json
{
  "itens": [
    {
      "id": "01903f...",
      "central": { "slug": "cascavel-pr", "nome": "Central de Cascavel", "cidade": "Cascavel", "uf": "PR" },
      "numero": 2,
      "titulo": "2º Encontro Homens de Fé de Cascavel-PR",
      "slug": "2-encontro-homens-de-fe",
      "dataInicio": "2026-09-11",
      "dataFim": "2026-09-13",
      "localNome": "Recanto Nossa Senhora",
      "localCidade": "Cascavel",
      "localUf": "PR",
      "imagemCapaUrl": "https://...",
      "taxaParticipante": 350.00,
      "vagasRestantesParticipante": 12,
      "inscricoesAbertas": true
    }
  ],
  "total": 37,
  "pagina": 1
}
```

Só encontros `publicado` (RN-022), **só do inquilino do host** (RN-016). Nunca expõe dado de pessoa.

**RN-214** — A resposta inclui o bloco de contexto do inquilino (marca e rótulos) numa requisição só, para o SSR renderizar com a identidade correta sem segunda ida ao servidor (RN-071t):

```json
"inquilino": {
  "nome": "Homens de Fé",
  "logoUrl": "https://...",
  "corPrimaria": "#1f2937",
  "corTextoSobrePrimaria": "#ffffff",
  "rotulos": { "participante": { "singular": "Encontrista" }, "servo": { "singular": "Obreiro" } }
}
```

**RN-209** — `vagasRestantesParticipante` é informativo e pode estar desatualizado em segundos de pico. A decisão de aceitar a inscrição é sempre refeita na criação, sob lock (RNF — ver 05). A interface não trata esse número como garantia.

### 4.2 `GET /api/publico/encontros/:centralSlug/:encontroSlug`

Página do encontro. Mesmo payload acrescido de `textoDivulgacao`, `localEndereco`, `taxaServo`, `vagasRestantesServo`, `inscricoesAbremEm`, `inscricoesFechamEm`, `maxParcelas`, `parcelaMinima`.

`404 ENCONTRO_NAO_ENCONTRADO` para encontro não publicado — não distingue "não existe" de "não publicado".

### 4.3 `POST /api/publico/encontros/:encontroId/inscricoes`

Cria a inscrição. Sem autenticação, com rate limit.

```json
{
  "tipo": "participante",
  "pessoa": {
    "nomeCompleto": "João da Silva Souza",
    "nomeCracha": "João",
    "cpf": "12345678901",
    "dataNascimento": "1985-04-23",
    "telefone": "45999998888",
    "email": "joao@exemplo.com",
    "cep": "85810000",
    "logradouro": "Rua das Flores",
    "numero": "120",
    "complemento": "apto 3",
    "bairro": "Centro",
    "cidade": "Cascavel",
    "uf": "PR",
    "estadoCivil": "casado",
    "contatoEmergenciaNome": "Maria de Souza",
    "contatoEmergenciaFone": "45988887777"
  },
  "dadosSensiveis": {
    "restricaoAlimentar": "intolerante a lactose",
    "condicaoSaude": "hipertensão",
    "medicamentosUsoContinuo": "losartana 50mg",
    "religiaoDeclarada": "católico"
  },
  "convidadorPessoaId": null,
  "convidadorNome": "Pedro Alves",
  "areaPretendida": null,
  "camposExtras": [{ "label": "Nome do cônjuge", "valor": "Maria Alves" }],
  "consentimento": { "versaoTermo": "2026-01", "finalidades": ["inscricao", "saude", "comunicacao"] },
  "consentimentoRetencao": false
}
```

**RN-116** — `camposExtras` é bloco livre, opcional, de rótulos que o admin da denominação define na configuração do inquilino (mesmo mecanismo de `rotulos` — RN-008). Cada inquilino escolhe também quais campos já opcionais desta ficha (`estadoCivil`, `nucleoFamiliarId`, `religiaoDeclarada`, etc.) aparecem e quais são obrigatórios; o schema em si não muda de inquilino para inquilino. `dadosSensiveis` e `camposExtras` **não se misturam**: o segundo nunca entra em RLS de dado sensível nem em relatório de §6 — quem coleta saúde ou religião de verdade usa os campos de `dadosSensiveis`.

`201`:

```json
{
  "inscricaoId": "01903f...",
  "situacao": "pendente_pagamento",
  "valorDevido": 350.00,
  "tokenConsulta": "V1StGXR8_Z5jdHi6B-myT...",
  "urlConsulta": "https://app/inscricao/V1StGXR8...",
  "posicaoEspera": null,
  "prazoPagamentoAte": "2026-08-25T18:00:00Z"
}
```

Em lista de espera, `201` com `situacao: "lista_espera"`, `posicaoEspera: 4`, `valorDevido` presente mas **sem cobrança criada** (RN-033).

Erros: `422 INSCRICOES_FECHADAS`, `409 JA_INSCRITO`, `422 DADOS_INVALIDOS`, `422 CONSENTIMENTO_OBRIGATORIO`, `404 ENCONTRO_NAO_ENCONTRADO`, `429 MUITAS_TENTATIVAS`, `503 INSCRICOES_SUSPENSAS` (inquilino suspenso — RN-063t). Conexão de gateway indisponível **não** é erro aqui (RN-098): a inscrição é aceita normalmente, ocupa vaga, e a cobrança nasce `pendente_emissao` ([03-cobranca.md §7.3](03-cobranca.md#73-conexão-oauth-rn-104-rn-105)) — o link de pagamento chega por e-mail assim que a conexão voltar.

**RN-210 (RNF-012)** — Limite de taxa por IP e por CPF normalizado (RN-010a), para impedir que um script crie centenas de "pessoas pendentes" via inscrições repetidas nunca pagas, ou esgote o teto de tentativas de notificação de um CPF alheio: 5 inscrições por IP a cada 10 minutos e 3 por CPF por hora. Estourar o limite responde dentro do envelope de erro (RNF-011) e nunca revela se aquele CPF já existe na plataforma ou em qual inquilino (RN-094a) — a proteção contra abuso não pode abrir a porta que a RN-001 fecha.

**RN-211** — O IP registrado no consentimento vem de `X-Forwarded-For` respeitando o proxy da Vercel/Railway, com a cadeia de proxies confiáveis configurada explicitamente. IP de consentimento LGPD que registra o IP do load balancer é inútil.

### 4.4 `GET /api/publico/inscricoes/:token`

Consulta pelo token (RN-133).

```json
{
  "encontro": { "titulo": "2º Encontro Homens de Fé de Cascavel-PR", "dataInicio": "2026-09-11", "localNome": "Recanto Nossa Senhora" },
  "pessoa": { "nomeCompleto": "João da Silva Souza", "email": "joa***@exemplo.com" },
  "tipo": "participante",
  "situacao": "pendente_pagamento",
  "valorDevido": 350.00,
  "posicaoEspera": null,
  "prazoPagamentoAte": "2026-08-25T18:00:00Z",
  "cobranca": {
    "id": "01903f...",
    "metodo": "pix",
    "situacao": "aguardando_pagamento",
    "expiraEm": "2026-08-23T18:00:00Z",
    "pixQrCode": "00020126580014BR.GOV.BCB.PIX...",
    "pixQrCodeBase64": "iVBORw0KG...",
    "podeRegerar": true
  },
  "politicaReembolso": { "percentualAtual": 100, "validoAte": "2026-08-27" },
  "camposExtras": [{ "label": "Nome do cônjuge", "valor": "Maria Alves" }]
}
```

Nunca retorna `dadosSensiveis` (RN-091). `camposExtras` (RN-116) retorna normalmente — não é dado sensível. E-mail sai mascarado — o token pode ter vazado em um grupo de mensagem.

`404 INSCRICAO_NAO_ENCONTRADA` para token inválido. Comparação do token em tempo constante.

### 4.5 `PATCH /api/publico/inscricoes/:token`

Atualiza dados até `inscricoes_fecham_em`. Aceita apenas `pessoa` (telefone, e-mail, endereço, contato de emergência) e `dadosSensiveis`. CPF, tipo e encontro não são editáveis.

`422 INSCRICOES_FECHADAS` depois do prazo — daí em diante só a secretaria altera.

### 4.6 `POST /api/publico/inscricoes/:token/cancelar`

```json
{ "motivo": "conflito de agenda" }
```

`200`: `{ "situacao": "cancelada", "reembolso": { "percentual": 100, "valor": 350.00, "situacao": "solicitado", "solicitadoEm": "2026-08-20T14:00:00Z" } }`

Sem `prazoEstimadoDias` (RN-063): o prazo do estorno é do meio de pagamento — Pix em minutos, cartão na fatura do emissor —, não nosso, e não é prometido como se fosse. A consulta por token (§4.4) segue mostrando "reembolso solicitado" com a data do pedido até o webhook efetivar o estorno.

Erros: `409 CONFLITO_DE_SITUACAO`, `502 FALHA_NO_ESTORNO` (RN-208).

### 4.7 Endpoints administrativos

| Método | Rota | Papel mínimo |
|---|---|---|
| `GET` | `/api/admin/encontros/:id/inscricoes` | coordenador_encontro |
| `POST` | `/api/admin/encontros/:id/inscricoes` | coordenador_encontro |
| `PATCH` | `/api/admin/inscricoes/:id/situacao` | coordenador_encontro |
| `POST` | `/api/admin/inscricoes/:id/baixa-manual` | coordenador_encontro |
| `POST` | `/api/admin/inscricoes/:id/cancelar` | coordenador_encontro |
| `GET` | `/api/admin/inscricoes/:id/dados-sensiveis` | coordenador_encontro |
| `GET` | `/api/admin/encontros/:id/lista-espera` | coordenador_encontro |
| `POST` | `/api/admin/encontros/:id/lista-espera/promover` | coordenador_encontro |
| `GET` | `/api/admin/denominacao/resumo` | admin_denominacao |
| `GET` | `/api/admin/denominacao/centrais` | admin_denominacao |

**RN-215** — Rota administrativa **nunca** recebe `inquilinoId`. O acesso a um recurso de outro inquilino devolve `404`, não `403` — `403` confirmaria que o id existe em algum lugar da plataforma (RN-052t).

`POST /inscricoes` administrativo implementa RN-035 (servo inscrito pela coordenação, sem passar pelo site).

`GET /dados-sensiveis` é endpoint isolado e cada acesso grava em `auditoria` (RN-127).

`POST /baixa-manual` registra pagamento recebido fora do gateway:

```json
{ "metodo": "dinheiro", "valorRecebido": 350.00, "recebidoEm": "2026-09-11T22:10:00Z", "observacao": "pago na recepção" }
```

`metodo` é `dinheiro` ou `pix_presencial` (RN-040) — os dois métodos presenciais, sem `gateway_id` nem `expira_em`. Cria `cobranca` nesse método, situação `paga`, e confirma a inscrição (RN-032). Sempre auditado com o usuário que lançou (`baixa_manual_por`, `baixa_manual_em`, `baixa_manual_observacao`).

### 4.8 Listagem administrativa

`GET /api/admin/encontros/:id/inscricoes`

Query: `tipo`, `situacao` (múltipla), `busca` (nome/CPF/e-mail), `ordenar` (`criado_em`, `nome`, `posicao_espera`), `pagina`, `tamanho`.

Retorna a inscrição com pessoa (sem dado sensível) e um resumo da cobrança. Cabeçalho `X-Total-Count`.

Resumo agregado em `GET /api/admin/encontros/:id/resumo`:

```json
{
  "participantes": { "vagas": 60, "confirmadas": 41, "pendentes": 7, "listaEspera": 3, "canceladas": 2 },
  "servos": { "vagas": 40, "confirmadas": 33, "pendentes": 1, "listaEspera": 0, "canceladas": 1 },
  "financeiro": { "arrecadado": 18250.00, "aReceber": 2800.00, "estornado": 700.00 }
}
```

---

## 5. Notificações desta fase

| Gatilho | `chave_unica` | Quando |
|---|---|---|
| `inscricao_criada` | `inscricao_criada:{id}:1` | criação com vaga |
| `lista_espera_registrada` | `lista_espera_registrada:{id}:1` | criação sem vaga |
| `pagamento_aprovado` | `pagamento_aprovado:{id}:{cobranca_id}` | webhook aprovado |
| `pagamento_pendente_24h` | `pagamento_pendente:{id}:24` | 24h sem pagar |
| `pagamento_pendente_48h` | `pagamento_pendente:{id}:48` | 48h sem pagar |
| `vaga_liberada` | `vaga_liberada:{id}:{promovida_em}` | promoção da espera |
| `inscricao_cancelada` | `inscricao_cancelada:{id}:1` | cancelamento |
| `reembolso_efetivado` | `reembolso_efetivado:{id}:{cobranca_id}` | estorno confirmado |

Na fase 1 o canal é e-mail. WhatsApp fica como link `wa.me` gerado na tela da secretaria (decisão em aberto nº 1 do PRD).

O discriminador de `vaga_liberada` usa `espera_promovida_em` porque a mesma pessoa pode ser promovida, perder o prazo, voltar para a fila e ser promovida de novo. Chave fixa bloquearia o segundo aviso, legítimo.
