# 03 — Cobrança e pagamento

Integração com Mercado Pago no **modelo marketplace**: o pagamento é criado em nome da conta conectada do inquilino, e a plataforma retém sua taxa como tarifa de aplicação. Pix à vista e cartão de crédito parcelado (RN-040).

> Os nomes de campo da API do Mercado Pago aqui refletem a API de pagamentos v1 e o fluxo de marketplace. Confira contra a documentação vigente antes de implementar — em especial `application_fee`, o fluxo OAuth e o refresh de token, que são a parte que mais muda.

## 1. Máquina de estados

```mermaid
stateDiagram-v2
    [*] --> criada: cobrança persistida antes de chamar o gateway
    criada --> aguardando_pagamento: gateway aceitou
    criada --> recusada: gateway rejeitou na criação
    aguardando_pagamento --> paga: aprovado
    aguardando_pagamento --> em_analise: análise antifraude
    aguardando_pagamento --> recusada: negado
    aguardando_pagamento --> expirada: prazo vencido
    aguardando_pagamento --> cancelada: inscrição cancelada
    em_analise --> paga: liberado
    em_analise --> recusada: negado
    paga --> estornada_parcial: estorno parcial
    paga --> estornada: estorno total
    estornada_parcial --> estornada: estorno completado
```

| Situação Mercado Pago | Situação nossa |
|---|---|
| `pending` | `aguardando_pagamento` |
| `in_process`, `in_mediation` | `em_analise` |
| `approved`, `authorized` | `paga` |
| `rejected` | `recusada` |
| `cancelled` | `cancelada` (ou `expirada`, se por vencimento) |
| `refunded` | `estornada` |
| `charged_back` | `estornada` + alerta para a coordenação |

**RN-300 [NOVA]** — `charged_back` (contestação de cartão) não é tratado como estorno comum: além de marcar a cobrança, gera pendência visível para a coordenação, porque o dinheiro já saiu e a inscrição pode estar confirmada. Não é revertida automaticamente — a coordenação decide.

**RN-301 [NOVA]** — De `paga` não se volta para `aguardando_pagamento`. Estado terminal do lado do recebimento; correção é estorno, não regressão.

---

## 2. Criação da cobrança

### 2.1 Pré-condições

- Inscrição em `pendente_pagamento` (nunca em `lista_espera` — RN-033)
- Sem cobrança viva para a inscrição (`cobranca_viva_unica`)
- Encontro dentro da janela de inscrição
- Inquilino `ativo` (RN-063t)
- Conexão de gateway ativa e com token válido (RN-123)

### 2.2 Sequência obrigatória

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant B as Banco
    participant MP as Mercado Pago

    C->>A: POST /cobrancas {metodo, parcelas}
    A->>B: BEGIN
    A->>B: insert cobranca (situacao=criada, idempotency_key=uuid)
    A->>B: COMMIT
    A->>MP: POST /v1/payments (X-Idempotency-Key)
    alt sucesso
        MP-->>A: {id, status, point_of_interaction...}
        A->>B: update cobranca (gateway_pagamento_id, situacao, qr code)
        A-->>C: 201 dados de pagamento
    else timeout / erro de rede
        A-->>C: 202 PROCESSANDO
        Note over A,MP: retry com a MESMA idempotency_key
    end
```

**RN-143 (do modelo de dados), reforçada aqui** — a cobrança é persistida em `criada` com a `idempotency_key` **antes** da chamada. É o que torna o retry seguro: em timeout, não sabemos se o Mercado Pago criou o pagamento; repetir com a mesma chave devolve o pagamento original em vez de criar um segundo.

**RN-302 [NOVA]** — Timeout na chamada ao gateway nunca vira `500` genérico. Retorna `202` com a cobrança em `criada`, e uma rotina de reconciliação ([04-webhook.md](04-webhook.md#6-reconciliação)) resolve a situação real. A interface mostra "processando" e faz polling. Tratar timeout como falha faz o usuário clicar de novo e é assim que nasce pagamento duplicado.

**RN-144 (do modelo de dados)** — Cobrança em `criada` há mais de 15 minutos sem `gateway_pagamento_id` é investigada pela reconciliação pela `idempotency_key` antes de qualquer nova tentativa.

### 2.3 Parcelamento (RN-040)

```
parcelas_maximas = min(
  central.max_parcelas,
  floor(valor / central.parcela_minima)
)
```

Com valor de R$ 350,00, `parcela_minima` R$ 50,00 e `max_parcelas` 12 → máximo 7 parcelas.

`parcelas_maximas` sempre >= 1, mesmo se o valor for menor que a parcela mínima.

**RN-304 [NOVA]** — Parcela é sempre com juros do comprador (o inscrito paga o acréscimo), nunca do vendedor. A central recebe o valor cheio da taxa. Sem isso, um retiro com muitos parcelamentos fecha a prestação de contas no vermelho sem ninguém entender por quê. *Confirme — é escolha de negócio, não técnica.*

**RN-305 [NOVA]** — O valor mostrado por parcela vem do endpoint de meios de pagamento do gateway, não de conta nossa. Taxa de parcelamento muda e cálculo local diverge da fatura.

### 2.4 Pix

`date_of_expiration` = `now() + 24h`, conforme RN-041, limitado por `inscricoes_fecham_em` — Pix que vence depois do fechamento das inscrições não faz sentido.

Da resposta, guardamos `point_of_interaction.transaction_data.qr_code` (copia e cola), `qr_code_base64` (imagem) e `ticket_url`.

**RN-306 [NOVA]** — Pix expirado pode ser regerado pelo próprio inscrito enquanto as inscrições estiverem abertas (RN-041). A regeneração **cancela a cobrança anterior** e cria outra, mantendo `cobranca_viva_unica`. Regenerar sem cancelar é como a pessoa acaba com dois QR codes válidos e paga os dois.

**RN-307 [NOVA]** — Máximo 5 regerações por inscrição. Acima disso, `429` e orientação para falar com a secretaria.

### 2.5 Cartão

O front usa o SDK do Mercado Pago para tokenizar. **O cartão nunca passa pela nossa API** (RN-042). Recebemos apenas `token`, `paymentMethodId`, `issuerId`, `installments` e os dados do pagador.

**RN-308 [NOVA]** — O `device_id` gerado pelo script de segurança do gateway é enviado no cabeçalho da criação do pagamento. Sem ele a taxa de aprovação cai de forma perceptível.

**RN-309 [NOVA]** — Token de cartão é de uso único e expira em minutos. Falha por token expirado retorna `422 TOKEN_EXPIRADO` com orientação de refazer, não é tratada como recusa do cartão — a mensagem para o usuário é completamente diferente.

---

## 3. Endpoints

### 3.1 `POST /api/publico/inscricoes/:token/cobrancas`

Pix:

```json
{ "metodo": "pix" }
```

`201`:

```json
{
  "cobrancaId": "01903f...",
  "metodo": "pix",
  "situacao": "aguardando_pagamento",
  "valor": 350.00,
  "expiraEm": "2026-08-23T18:00:00Z",
  "pixQrCode": "00020126580014BR.GOV.BCB.PIX0136...",
  "pixQrCodeBase64": "iVBORw0KGgoAAAANSUhEUg...",
  "ticketUrl": "https://www.mercadopago.com.br/payments/..."
}
```

Cartão:

```json
{
  "metodo": "cartao_credito",
  "token": "ff8080814c11e237014c1ff593b57b4d",
  "paymentMethodId": "master",
  "issuerId": "24",
  "parcelas": 6,
  "deviceId": "armor.abc123...",
  "pagador": {
    "email": "joao@exemplo.com",
    "identificacao": { "tipo": "CPF", "numero": "12345678901" }
  }
}
```

`201`:

```json
{
  "cobrancaId": "01903f...",
  "metodo": "cartao_credito",
  "situacao": "paga",
  "valor": 350.00,
  "parcelas": 6,
  "valorParcela": 62.35,
  "bandeira": "master",
  "ultimosQuatro": "1234"
}
```

Erros:

| HTTP | Código | Situação |
|---|---|---|
| 409 | `COBRANCA_JA_EXISTE` | já há cobrança viva; devolve a existente |
| 409 | `CONFLITO_DE_SITUACAO` | inscrição não está em `pendente_pagamento` |
| 422 | `PARCELAS_INVALIDAS` | acima do máximo calculado |
| 422 | `TOKEN_EXPIRADO` | token de cartão vencido |
| 402 | `PAGAMENTO_RECUSADO` | recusa do emissor; inclui `motivoRecusa` |
| 202 | `PROCESSANDO` | timeout no gateway (RN-302) |
| 429 | `MUITAS_TENTATIVAS` | limite de regeração ou de tentativas |

**RN-310 [NOVA]** — `409 COBRANCA_JA_EXISTE` devolve os dados da cobrança viva em vez de só recusar. O usuário que clicou duas vezes recebe o mesmo QR code, e não um erro.

**RN-311 [NOVA]** — `motivoRecusa` é traduzido para linguagem de usuário. `cc_rejected_insufficient_amount` vira "saldo ou limite insuficiente"; `cc_rejected_bad_filled_security_code` vira "código de segurança incorreto". Código cru do gateway não vai para a tela.

### 3.2 `POST /api/publico/inscricoes/:token/cobrancas/:id/regerar`

Só para Pix `expirada` ou `aguardando_pagamento` (RN-306, RN-307). Cancela a anterior e cria nova, em transação.

### 3.3 `GET /api/publico/inscricoes/:token/cobrancas/:id`

Polling da interface enquanto o Pix não cai. Retorna a situação atual.

**RN-312 [NOVA]** — Este endpoint lê **do nosso banco**, nunca chama o gateway. Polling de front batendo em API externa esgota rate limit em pico de inscrição. A atualização chega pelo webhook. Intervalo recomendado: 5s nos 2 primeiros minutos, 15s depois, parando em 15 minutos.

### 3.4 Administrativos

| Método | Rota | Ação |
|---|---|---|
| `GET` | `/api/admin/encontros/:id/cobrancas` | listagem com filtro por situação e método |
| `POST` | `/api/admin/cobrancas/:id/sincronizar` | força consulta ao gateway e atualiza |
| `POST` | `/api/admin/cobrancas/:id/estornar` | estorno manual, total ou parcial |
| `GET` | `/api/admin/encontros/:id/conciliacao` | divergências entre nosso estado e o gateway |

---

## 4. Confirmação e RN-051

**A confirmação da inscrição acontece exclusivamente pelo webhook.** O retorno do navegador (`back_urls`) atualiza a tela, nada mais.

Motivo, concreto: o usuário paga no app do banco e fecha o navegador antes de voltar; paga e perde o sinal; ou abre a `back_url` manualmente sem ter pago. Confiar no retorno do front produz inscrição confirmada sem dinheiro e inscrição paga sem confirmação — os dois erros, na mesma implementação.

Exceção controlada: pagamento com cartão aprovado de forma síncrona já retorna `approved` na criação. Nesse caso a confirmação pode ser aplicada na hora, **pelo mesmo serviço de domínio que o webhook usa**, e o webhook subsequente é idempotente e não faz nada. Não é uma segunda regra, é a mesma função chamada de outro lugar.

---

## 5. Expiração (RN-052)

Rotina a cada 5 minutos:

1. `cobranca` em `aguardando_pagamento` com `expira_em < now()` → `expirada`.
2. `inscricao` em `pendente_pagamento` há mais de 72h, sem cobrança paga → `lista_espera`, com posição no fim da fila, liberando a vaga.
3. Avisos em 24h e 48h antes disso, via `notificacao` (RN-136 impede duplicidade).

**RN-313 [NOVA]** — A contagem das 72h começa na criação da inscrição, não na criação da cobrança. Senão, quem nunca gera cobrança segura a vaga para sempre.

**RN-314 [NOVA]** — A rotina não expira inscrição cuja cobrança esteja em `em_analise`. Análise antifraude pode passar de 72h e derrubar quem está com pagamento em curso é inaceitável.

---

## 6. Estorno

`POST /v1/payments/{id}/refunds`, com `amount` para parcial e corpo vazio para total.

```
valor_estornado = valor_estornado + valor_do_estorno
situacao = 'estornada' se valor_estornado >= valor, senão 'estornada_parcial'
```

**RN-315 [NOVA]** — Estorno também usa chave de idempotência, derivada de `{cobranca_id}:{valor}:{tentativa}`. Retry de estorno sem idempotência devolve o dinheiro duas vezes.

**RN-316 [NOVA]** — Pix estornado depende de saldo na conta do Mercado Pago. Falha por saldo insuficiente retorna `502 FALHA_NO_ESTORNO` e vira pendência para a coordenação (RN-208), nunca fica silenciosa.

**RN-317 [NOVA]** — O estorno só é considerado efetivado quando o webhook de `refunded` chega. Até lá a inscrição fica em `cancelada` com reembolso `solicitado`. A resposta síncrona da API de estorno não é prova de dinheiro devolvido.

---

## 7. Split e taxa da plataforma

O dinheiro **não passa pela conta do operador** (RN-082t). O pagamento é criado com o `access_token` da conta conectada do inquilino, e a plataforma retém sua fatia via `application_fee` na mesma requisição.

### 7.1 Cálculo

```
taxa_plataforma = round(valor * inquilino.taxa_plataforma_percentual / 100, 2)
```

Calculada e **congelada** na criação da cobrança, junto com o percentual usado (RN-043, RN-134). Mudança de percentual não alcança cobrança já criada.

**RN-321 [NOVA]** — A tarifa vai no `application_fee` da própria criação do pagamento, nunca por transferência posterior. Transferência posterior faz o operador figurar como intermediário do dinheiro da denominação — problema fiscal, não só técnico.

**RN-322 [NOVA]** — `application_fee` nunca excede o valor do pagamento, garantido por `cobranca_taxa_ate_o_valor` no banco. Percentual mal configurado é erro de cadastro, não pode virar cobrança rejeitada na cara do inscrito.

### 7.2 Quem paga a taxa (RN-096)

| `taxa_repassada_ao_inscrito` | Inscrito paga | Central recebe |
|---|---|---|
| `false` (padrão) | R$ 350,00 | R$ 350,00 − tarifa − taxa do gateway |
| `true` | R$ 350,00 + tarifa | R$ 350,00 − taxa do gateway |

**RN-323 [NOVA]** — Com repasse ativo, o valor acrescido aparece **discriminado** na tela de inscrição e no e-mail: "taxa do encontro R$ 350,00 + taxa de serviço R$ 8,75". Embutir no total sem discriminar é o tipo de coisa que a denominação descobre por reclamação de participante.

**RN-324 [NOVA]** — Trocar o modo de repasse não altera cobrança existente. A mudança vale para inscrições criadas depois.

### 7.3 Conexão OAuth

O admin da denominação autoriza a plataforma; recebemos `access_token` e `refresh_token`, guardados no cofre por referência (RN-121).

**RN-325 [NOVA]** — Toda chamada ao gateway resolve a conexão antes: primeiro a da central, depois a do inquilino (RN-123). Não havendo conexão ativa, a criação falha com `503 RECEBIMENTO_INDISPONIVEL` e alerta — nunca cria cobrança sem destino do dinheiro.

**RN-326 [NOVA]** — Rotina diária renova token com menos de 15 dias para expirar (RN-122). Três falhas desativam a conexão e bloqueiam novas cobranças, com alerta a operador e admin da denominação. O objetivo é que a denominação saiba antes do inscrito.

**RN-327 [NOVA]** — Token revogado pelo inquilino no painel do Mercado Pago é detectado no primeiro `401` do gateway: a conexão é desativada na hora e o admin é notificado com o passo a passo de reconexão.

### 7.4 Estorno da taxa (RN-097)

```
taxa_estornada = round(taxa_plataforma * (valor_do_estorno / valor), 2)
```

**RN-328 [NOVA]** — Estorno devolve a tarifa proporcionalmente. A plataforma não fica com taxa de dinheiro que voltou ao inscrito. Em estorno total, a tarifa devolvida é integral.

### 7.5 Apuração

**RN-329 [NOVA]** — O faturamento da plataforma é apurado a partir de `cobranca` com `situacao = 'paga'`, somando `taxa_plataforma − taxa_estornada` por inquilino e período. É relatório, não movimento financeiro: o dinheiro já foi retido no split.

**RN-330 [NOVA]** — A apuração é conciliada mensalmente com o relatório de tarifas do gateway. Divergência é alerta para o operador, nunca ajuste automático no nosso número.

---

## 8. Segurança

**RN-318 [NOVA]** — Credenciais do Mercado Pago são por conexão (inquilino ou central), lidas do cofre por referência (RN-121), carregadas em memória com TTL curto e nunca logadas. Log de requisição ao gateway mascara `Authorization` e qualquer campo de pagador.

**RN-331 [NOVA]** — O token de um inquilino jamais é usado para criar pagamento de outro. A conexão é resolvida a partir do `inquilino_id` da própria cobrança, sob RLS, nunca de parâmetro de requisição.

**RN-319 [NOVA]** — `payload_gateway` e `webhook_evento.corpo_bruto` são gravados sem os campos de portador de cartão. Guardar resposta bruta é útil para depurar e perigoso se guardar demais.

**RN-320 [NOVA]** — Toda operação de cobrança grava em `auditoria` com ator (`publico`, `usuario`, `sistema`, `webhook`), valor antes e depois. É a base da prestação de contas da fase 3.
