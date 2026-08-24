# Specs — Fase 1: Multi-inquilino, divulgação, inscrição e pagamento

Especificação técnica derivada do [PRD](../../PRD.md). Toda regra aqui referencia a `RN-xxx` de origem; onde a spec **acrescenta** regra que não existia no PRD, isso está marcado com `[NOVA]` e a decisão precisa ser confirmada por você.

**Leia [00-multi-inquilino.md](00-multi-inquilino.md) primeiro.** Todo o resto pressupõe o modelo de isolamento descrito lá.

## Escopo desta fase

Dentro:

- Inquilino (denominação): implantação, marca, rótulos, subdomínio, situação
- Isolamento de dois níveis (inquilino e central) por RLS do Postgres
- Identidade global e cadastro de pessoa por inquilino
- Cadastro de central e encontro
- Agenda pública e página do encontro, com a marca da denominação
- Ficha de inscrição (participante e servo)
- Cobrança por Pix e cartão parcelado via Mercado Pago, com split da taxa da plataforma
- Webhook de pagamento com idempotência
- Lista de espera com promoção automática
- Cancelamento e reembolso
- Consulta da inscrição por token
- Painéis: central, denominação e operador

Fora (fases 2 e 3): grupos, áreas de servição, cronograma, crachás, check-in, despesas, prestação de contas.

## Índice

| Documento | Conteúdo |
|---|---|
| [00-multi-inquilino.md](00-multi-inquilino.md) | Hierarquia, isolamento por RLS, resolução por host, identidade global, rótulos, onboarding, acesso de suporte |
| [01-modelo-de-dados.md](01-modelo-de-dados.md) | DDL, constraints, índices e exceções de RLS |
| [02-inscricao.md](02-inscricao.md) | Máquina de estados da inscrição, regras e endpoints |
| [03-cobranca.md](03-cobranca.md) | Máquina de estados da cobrança, Mercado Pago, Pix, cartão e split |
| [04-webhook.md](04-webhook.md) | Recepção, validação de assinatura, idempotência, ordem e reconciliação |
| [05-lista-de-espera.md](05-lista-de-espera.md) | Fila, promoção, prazo e concorrência na última vaga |
| [06-criterios-de-aceite.md](06-criterios-de-aceite.md) | Cenários testáveis amarrados às `RN-xxx` |

## Convenções

**Identificadores** — `uuid v7` gerado pela aplicação (ordenável por tempo, bom para índice). Chave natural nunca é PK. Ids são únicos na plataforma inteira, nunca sequenciais por inquilino — id sequencial permite enumerar e estimar o tamanho de outra denominação.

**Contexto de inquilino** — nenhum endpoint recebe `inquilinoId`. Área pública resolve pelo host, área autenticada pelo vínculo do usuário. Ver [00-multi-inquilino.md](00-multi-inquilino.md#3-resolução-do-inquilino).

**Dinheiro** — `numeric(10,2)` no banco, `number` em reais nos contratos de API (o Mercado Pago recebe decimal, não centavos). Nunca `float`.

**Datas** — `timestamptz` sempre, gravado em UTC. A interface converte para `America/Sao_Paulo`. Campos só-data (`data_inicio` do encontro) são `date`, sem fuso.

**Nomenclatura** — tabelas e colunas em `snake_case` português, seguindo o glossário do PRD. Contratos de API em `camelCase`. O mapeamento é responsabilidade da camada de persistência.

**Erros da API** — envelope único:

```json
{
  "erro": {
    "codigo": "VAGAS_ESGOTADAS",
    "mensagem": "Não há vagas de participante para este encontro.",
    "detalhes": { "vagasRestantes": 0 }
  }
}
```

`codigo` é estável e serve de contrato; `mensagem` é texto para o usuário e pode mudar.

**Situações** — todo enum de situação é `type` no Postgres, não `text` com check. Transição inválida é erro de domínio (`409 CONFLITO_DE_SITUACAO`), nunca update silencioso.

## Ponto de atenção sobre a integração

Os nomes de campo do Mercado Pago nesta spec (`point_of_interaction.transaction_data.qr_code`, cabeçalho `x-signature`, `X-Idempotency-Key`) refletem a API de pagamentos v1. **Confira contra a documentação vigente antes de implementar** — é integração externa e muda sem nos avisar. A lógica de idempotência e ordenação descrita em [04-webhook.md](04-webhook.md) não depende desses nomes.
