# 06 — Critérios de aceite

Cenários testáveis, em linguagem de negócio, amarrados às regras de origem. **Este é o documento para você ler e contestar** — se algum cenário descreve comportamento diferente do que acontece no retiro de verdade, a regra correspondente está errada e precisa mudar antes do código.

Formato: `Dado / Quando / Então`. Cada cenário vira ao menos um teste automatizado.

---

## CA-01 — Inscrição com vaga disponível

> Regras: RN-202, RN-203, RN-204, RN-030

**Dado** o "2º Encontro Homens de Fé de Cascavel-PR" publicado, com 60 vagas de participante e 41 ocupadas, taxa de R$ 350,00, inscrições abertas
**Quando** João preenche a ficha como participante e aceita o termo
**Então** a inscrição é criada em `pendente_pagamento`
**E** `valor_devido` é R$ 350,00
**E** um registro de consentimento é gravado com data, hora e IP
**E** João recebe e-mail com o link de consulta

---

## CA-02 — Taxa reajustada não afeta quem já se inscreveu

> Regras: RN-203

**Dado** que João se inscreveu com taxa de R$ 350,00 e ainda não pagou
**Quando** a central reajusta a taxa do encontro para R$ 400,00
**Então** o valor devido de João continua R$ 350,00
**E** quem se inscrever a partir de agora deve R$ 400,00

---

## CA-03 — Pessoa que já participou, na mesma denominação

> Regras: RN-010 a RN-014, RN-213

**Dado** que João já tem cadastro na Homens de Fé pela Central de Cascavel, com telefone antigo
**Quando** ele se inscreve num encontro da Central de Maringá — mesma denominação — informando telefone novo
**Então** o cadastro existente é reaproveitado, sem duplicar pessoa
**E** o telefone é atualizado
**E** o nome completo **não** é sobrescrito
**E** ele não precisa se recadastrar por ter mudado de cidade

---

## CA-04 — Inscrição duplicada no mesmo encontro

> Regras: RN-031

**Dado** que João já tem inscrição ativa no encontro
**Quando** ele preenche a ficha de novo
**Então** recebe `409 JA_INSCRITO`
**E** a resposta traz a situação da inscrição existente e o link de consulta
**E** nenhuma segunda inscrição é criada

---

## CA-05 — Inscrição fora da janela

> Regras: RN-202

**Dado** um encontro cujas inscrições fecharam ontem
**Quando** alguém abre um link antigo e envia a ficha
**Então** recebe `422 INSCRICOES_FECHADAS`
**E** nenhum dado pessoal é gravado

---

## CA-06 — Pagamento por Pix

> Regras: RN-040, RN-041

**Dado** João com inscrição em `pendente_pagamento`
**Quando** ele escolhe Pix
**Então** recebe QR code e código copia-e-cola
**E** a cobrança expira em 24 horas
**E** a inscrição continua em `pendente_pagamento` até o pagamento cair

---

## CA-07 — Confirmação só pelo webhook

> Regras: RN-051, RN-032

**Dado** João com Pix gerado
**Quando** ele paga no app do banco e **fecha o navegador sem voltar ao site**
**Então** o webhook chega, a cobrança vira `paga` e a inscrição vira `confirmada`
**E** João recebe o e-mail de confirmação

**E, no caminho inverso:**
**Quando** alguém abre a URL de retorno sem ter pago
**Então** nenhuma inscrição é confirmada

---

## CA-08 — Clique duplo no botão de pagar

> Regras: RN-310, `cobranca_viva_unica`

**Dado** João na tela de pagamento
**Quando** ele clica duas vezes em "gerar Pix"
**Então** existe **uma única** cobrança viva
**E** a segunda requisição devolve o mesmo QR code, não um erro

---

## CA-09 — Timeout na criação do pagamento

> Regras: RN-143, RN-302, RN-415

**Dado** que a chamada ao Mercado Pago sofre timeout
**Quando** João tenta de novo
**Então** o retry usa a mesma chave de idempotência
**E** existe **um único** pagamento no gateway
**E** se ainda assim ficar órfã, a reconciliação vincula a cobrança em até 30 minutos

---

## CA-10 — Webhook entregue várias vezes

> Regras: RN-050, RN-406, RN-136

**Dado** um pagamento aprovado
**Quando** o Mercado Pago entrega a mesma notificação 3 vezes
**Então** a inscrição é confirmada uma vez
**E** um único e-mail é enviado
**E** um único registro de auditoria de confirmação é gravado

---

## CA-11 — Webhook fora de ordem

> Regras: RN-407, RN-408, RN-301

**Dado** que o evento de aprovação já foi processado e a inscrição está confirmada
**Quando** chega, atrasado, o evento de "pendente" emitido antes
**Então** ele é descartado
**E** a cobrança continua `paga` e a inscrição `confirmada`

---

## CA-12 — Webhook com assinatura inválida

> Regras: RN-403

**Quando** chega uma requisição com assinatura inválida no endpoint de webhook
**Então** a resposta é `401`
**E** nada é processado
**E** a tentativa fica registrada

---

## CA-13 — Pagamento sem cobrança correspondente

> Regras: RN-409

**Quando** chega notificação de um pagamento que não corresponde a nenhuma cobrança nossa
**Então** o evento é marcado como órfão
**E** a coordenação é alertada
**E** o evento **não** é descartado

---

## CA-14 — Pagamento de inscrição já cancelada

> Regras: RN-413

**Dado** que João cancelou a inscrição
**Quando** ele paga um QR code antigo, ainda válido
**Então** a inscrição **não** é reaberta
**E** é criada pendência de reembolso para a coordenação
**E** João é avisado

---

## CA-15 — Última vaga disputada

> Regras: RN-503, RN-033

**Dado** um encontro com exatamente 1 vaga de participante
**Quando** 50 pessoas enviam a ficha ao mesmo tempo
**Então** exatamente 1 fica em `pendente_pagamento`
**E** 49 ficam em `lista_espera`, com posições distintas
**E** nenhuma requisição falha por deadlock ou erro interno

---

## CA-16 — Lista de espera não cobra

> Regras: RN-033

**Dado** um encontro com vagas esgotadas
**Quando** Carlos se inscreve
**Então** ele fica em `lista_espera` com a posição informada
**E** **nenhuma cobrança é gerada**
**E** o e-mail explica que ele será avisado se abrir vaga

---

## CA-17 — Cancelamento promove a fila

> Regras: RN-033, RN-506, RN-507, RN-509

**Dado** vagas esgotadas e Carlos em primeiro na fila
**Quando** um confirmado cancela
**Então** Carlos passa a `pendente_pagamento` na mesma transação
**E** recebe aviso com data e hora limite explícitas para pagar
**E** o prazo é 48h, ou menor se o encontro estiver próximo

---

## CA-18 — Promovido perde o prazo

> Regras: RN-502, RN-510

**Dado** Carlos promovido, sem pagar dentro do prazo
**Quando** o prazo vence
**Então** Carlos volta ao **fim** da fila
**E** o próximo da fila é promovido imediatamente

---

## CA-19 — Prazo de 72h da inscrição normal

> Regras: RN-052, RN-313, RN-314

**Dado** João em `pendente_pagamento` há 72 horas sem pagar
**Quando** a rotina de expiração roda
**Então** ele vai para o fim da lista de espera e a vaga é liberada
**E** ele tinha recebido avisos em 24h e 48h

**Exceção:**
**Dado** que a cobrança está em análise antifraude
**Então** a inscrição **não** expira

---

## CA-20 — Cancelamento com reembolso integral

> Regras: RN-060, RN-062, RN-063

**Dado** João confirmado, com o encontro a 20 dias
**Quando** ele cancela
**Então** o reembolso é 100% do valor pago
**E** a inscrição só passa a `cancelada` depois de o gateway **aceitar** o estorno
**E** a vaga é liberada e a fila promovida
**E** o reembolso só consta como efetivado quando o webhook de estorno chegar

---

## CA-20a — Estorno aceito sem confirmação

> Regras: RN-063

**Dado** João cancelado, com o estorno aceito pelo gateway (`estorno_situacao = solicitado`)
**Quando** passam 7 dias sem o webhook de confirmação chegar
**Então** o caso vira pendência para a coordenação, com pessoa, valor e data do pedido
**E** a inscrição continua `cancelada`
**E** se o estorno depois for recusado ou revertido, a mesma pendência permanece até a devolução zerar

---

## CA-21 — Cancelamento em cima da hora

> Regras: RN-060

**Dado** João confirmado, com o encontro a 3 dias
**Quando** ele cancela
**Então** o reembolso é 0%
**E** a inscrição é cancelada e a vaga liberada
**E** nenhuma chamada de estorno é feita

---

## CA-22 — Falha no estorno não cancela a inscrição

> Regras: RN-062, RN-316

**Dado** João pedindo cancelamento com direito a reembolso
**Quando** o estorno falha no gateway
**Então** a resposta é `502 FALHA_NO_ESTORNO`
**E** a inscrição **continua confirmada**
**E** o caso entra na fila de pendências da coordenação

---

## CA-23 — Encontro cancelado

> Regras: RN-207

**Dado** um encontro com 41 inscrições confirmadas
**Quando** a central cancela o encontro
**Então** todas recebem 100% de reembolso, independentemente da antecedência
**E** todos são notificados

---

## CA-24 — Isolamento entre centrais

> Regras: RN-001, RN-141, RNF-001

**Dado** um coordenador da Central de Cascavel da Homens de Fé, autenticado
**Quando** ele tenta acessar uma inscrição da Central de Maringá pelo id
**Então** recebe `404`, não `403`
**E** a listagem de inscrições jamais traz registro de outra central
**E** o admin da denominação, esse sim, enxerga as duas centrais

---

## CA-24a — Isolamento entre denominações

> Regras: RN-001, RN-052t, RN-056t, RN-141

**Dado** um admin da denominação Homens de Fé
**Quando** ele tenta acessar, por id, qualquer registro da Tabor
**Então** recebe `404`
**E** nenhuma consulta, em nenhuma tabela, retorna linha de outro inquilino
**E** o teste automatizado que varre todas as tabelas de domínio roda no CI e falha o build se alguma vazar

---

## CA-24b — Contexto não vaza pelo pool de conexões

> Regras: RN-053t, RN-055t

**Dado** requisições alternadas entre Homens de Fé e Tabor atendidas pela mesma conexão física do pool
**Quando** as duas rodam em sequência
**Então** nenhuma enxerga dado da outra
**E** uma sessão sem contexto de inquilino retorna zero linhas, nunca erro que revele estrutura

---

## CA-24c — Travessia pelo host

> Regras: RN-059t, RN-060t, RN-061t

**Dado** um usuário autenticado da Homens de Fé
**Quando** ele faz requisição no host da Tabor com o próprio token
**Então** recebe `403` e um alerta de segurança é registrado

**E:**
**Quando** alguém acessa um host desconhecido
**Então** vê uma página neutra, que não lista inquilinos e não revela que a plataforma é multi-inquilino

---

## CA-24d — A identidade global não vaza

> Regras: RN-064t, RN-065t, RN-094, RN-212

**Dado** que Marcos já é cadastrado na Tabor, com telefone e restrição alimentar
**Quando** ele se inscreve num encontro da Homens de Fé com o mesmo CPF
**Então** a ficha **não** autopreenche nenhum campo
**E** a resposta da API é idêntica à de um CPF inédito
**E** o cadastro criado na Homens de Fé contém apenas o que ele digitou agora
**E** ninguém na Homens de Fé consegue saber que ele passou pela Tabor

**E, do outro lado:**
**Então** as duas pessoas apontam para a mesma identidade global
**E** apagar o cadastro dele na Homens de Fé não afeta o da Tabor

---

## CA-24e — Operador não vê dado pessoal

> Regras: RN-005, RN-078t, RN-079t, RN-080t, RN-128

**Dado** o operador da plataforma, sem concessão de acesso
**Quando** ele abre o painel
**Então** vê inquilinos, volume e faturamento — nenhum nome de participante

**Quando** o admin da denominação concede acesso de suporte com motivo e prazo
**Então** o operador passa a ver os dados necessários
**E** cada leitura é registrada em auditoria e visível ao admin
**E** `pessoa_dado_sensivel` continua inacessível, mesmo com a concessão
**E** expirado o prazo, o acesso volta a ser negado sem intervenção

---

## CA-25 — Dado sensível não vaza

> Regras: RN-091, RN-127

**Dado** uma inscrição com condição de saúde preenchida
**Quando** a coordenação lista as inscrições do encontro
**Então** condição de saúde e medicamentos **não** aparecem na listagem
**E** só o endpoint dedicado devolve esses campos
**E** cada acesso a ele fica registrado em auditoria com o usuário

---

## CA-26 — Token de consulta

> Regras: RN-133

**Dado** o token da inscrição de João
**Quando** alguém acessa a consulta com ele
**Então** vê situação, valor e dados de pagamento
**E** o e-mail aparece mascarado
**E** dados sensíveis **não** são retornados
**E** um token inválido devolve `404`, sem distinguir de inscrição inexistente

---

## CA-27 — Servo paga taxa reduzida

> Regras: RN-203, glossário

**Dado** um encontro com taxa de participante R$ 350,00 e de servo R$ 120,00
**Quando** Pedro se inscreve como servo
**Então** o valor devido é R$ 120,00
**E** ele ocupa vaga de servo, não de participante
**E** a fila de servos é independente da de participantes

---

## CA-28 — Servo inscrito pela coordenação

> Regras: RN-035

**Dado** um coordenador autenticado
**Quando** ele cadastra um servo diretamente pelo painel
**Então** a inscrição é criada normalmente, sem passar pelo site público
**E** pode ser marcada como paga por baixa manual, com registro de quem lançou

---

## CA-29 — Parcelamento respeita o mínimo

> Regras: RN-040, parcela mínima

**Dado** taxa de R$ 350,00, parcela mínima R$ 50,00 e limite de 12x
**Quando** João abre as opções de cartão
**Então** o máximo oferecido é 7 parcelas
**E** pedir 8 parcelas retorna `422 PARCELAS_INVALIDAS`

---

## CA-30 — Numeração por central

> Regras: RN-020, RN-131, RN-009

**Dado** que a Central de Cascavel da Homens de Fé tem encontros de número 1 e 2
**Quando** a central cria um novo encontro
**Então** o número sugerido é 3
**E** o admin pode alterá-lo para acomodar edições anteriores ao sistema
**E** a Central de Cascavel da Tabor pode ter o seu próprio "2º Encontro", com o mesmo slug de central, sem conflito

---

## CA-33 — Rótulos da denominação

> Regras: RN-008, RN-069t, RN-070t

**Dado** um inquilino que chama servo de "obreiro" e grupo de "tribo"
**Quando** alguém abre a ficha de inscrição, recebe o e-mail de confirmação ou lê a lista impressa
**Então** vê "obreiro" e "tribo" em todos eles
**E** a API continua respondendo `"tipo": "servo"`
**E** o enum no banco continua `servo`

---

## CA-34 — Implantação de inquilino

> Regras: RN-015, RN-075t, RN-076t, RN-077t

**Dado** um inquilino recém-criado pelo operador
**Quando** o admin da denominação tenta ativá-lo sem conectar o recebimento
**Então** a ativação é recusada, com a lista do que falta
**E** o subdomínio não entra no ar

**Quando** contrato, marca e recebimento estiverem completos
**Então** o inquilino vira `ativo` e o subdomínio responde
**E** o aceite do contrato fica registrado com versão, data, IP e usuário
**E** o slug não pode mais ser alterado pelo próprio admin

---

## CA-35 — Split da taxa da plataforma

> Regras: RN-043, RN-095, RN-321, RN-328

**Dado** um inquilino com taxa de 2,5% e uma inscrição de R$ 350,00
**Quando** o pagamento é aprovado
**Então** a tarifa de R$ 8,75 é retida no split, na própria criação do pagamento
**E** o dinheiro **não** passa pela conta do operador
**E** a cobrança guarda o valor da tarifa e o percentual usado

**Quando** o operador reajusta o percentual para 3%
**Então** as cobranças já criadas mantêm R$ 8,75

**Quando** essa inscrição é estornada integralmente
**Então** a tarifa é devolvida por inteiro

---

## CA-36 — Recebimento indisponível

> Regras: RN-098, RN-122, RN-123, RN-325, RN-326

**Dado** um inquilino cujo token OAuth está a 10 dias de expirar
**Quando** a rotina diária roda
**Então** o token é renovado sem interrupção

**Dado** que a renovação falha três vezes
**Então** a conexão é desativada
**E** operador e admin da denominação são alertados
**E** novas cobranças falham com `503 RECEBIMENTO_INDISPONIVEL`
**E** nenhuma cobrança é criada sem destino para o dinheiro

---

## CA-37 — Inquilino suspenso

> Regras: RN-007, RN-063t, RN-085t

**Dado** um inquilino suspenso por inadimplência, com um encontro acontecendo no fim de semana
**Então** novas inscrições são bloqueadas com mensagem orientando procurar a coordenação
**E** a consulta de inscrição existente continua funcionando
**E** nenhum dado é apagado
**E** a operação do encontro em andamento não é interrompida

---

## CA-31 — Encontro só aparece publicado

> Regras: RN-022

**Dado** um encontro em rascunho
**Quando** alguém acessa a agenda pública ou a URL direta do encontro
**Então** ele não aparece na agenda
**E** a URL direta devolve `404`

---

## CA-32 — Consentimento é obrigatório

> Regras: RN-090, RN-204

**Quando** a ficha é enviada sem aceite do termo
**Então** a resposta é `422 CONSENTIMENTO_OBRIGATORIO`
**E** nenhuma pessoa e nenhuma inscrição são criadas

---

## Cobertura

| Área | Cenários |
|---|---|
| Inscrição | CA-01 a CA-05, CA-27, CA-28, CA-32 |
| Pagamento | CA-06 a CA-09, CA-29 |
| Webhook | CA-10 a CA-14 |
| Lista de espera | CA-15 a CA-19 |
| Cancelamento | CA-20, CA-20a, CA-21 a CA-23 |
| **Multi-inquilino** | **CA-24a a CA-24e, CA-33, CA-34, CA-37** |
| Isolamento e LGPD | CA-24, CA-25, CA-26, CA-24d |
| Plataforma e faturamento | CA-35, CA-36 |
| Encontro | CA-30, CA-31 |

**Critério de pronto da Fase 1:**

1. Os 41 cenários automatizados e passando.
2. O teste de varredura de isolamento (RN-141) no CI, falhando o build se qualquer tabela de domínio vazar entre inquilinos ou ficar sem RLS.
3. CA-15 executado com concorrência real contra Postgres, não com mock.
4. CA-24b executado com pool de conexões real, não com conexão dedicada por teste — é o único jeito de pegar o vazamento de contexto da RN-053t.

**O critério que vale mais que os outros:** um vazamento entre denominações não é bug, é fim de contrato com todas elas ao mesmo tempo. Os cenários CA-24a a CA-24e não têm exceção nem prazo de tolerância.
