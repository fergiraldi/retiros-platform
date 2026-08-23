# Plataforma de Retiros

SaaS multi-inquilino para divulgação, inscrição, cobrança e operação de retiros espirituais. Cada denominação — Homens de Fé, Homens Adoradores, Tabor — é um inquilino independente, com suas centrais pelo Brasil, sua marca, seu vocabulário e seu recebimento.

Cobre o ciclo completo de um encontro: publicação na agenda, inscrição de participantes e servos, pagamento por Pix ou cartão parcelado, montagem de grupos e equipe de servição, condução do cronograma durante o evento e prestação de contas no fechamento.

## Documentação

- [PRD.md](PRD.md) — documento de produto: glossário do domínio, atores, entidades, regras de negócio numeradas, fluxos e fases de entrega.
- [specs/fase-1/](specs/fase-1/README.md) — especificação técnica da Fase 1: multi-inquilino, modelo de dados, inscrição, cobrança, webhook, lista de espera e critérios de aceite.

## Stack

| Camada | Tecnologia |
|---|---|
| Front | Angular (SSR na área pública) |
| API | NestJS |
| Banco / Auth / Storage | Supabase |
| Isolamento | Row Level Security do Postgres, por inquilino e por central |
| Hospedagem front | Vercel |
| Hospedagem API | Railway |
| Pagamentos | Mercado Pago (marketplace, com split) |

## Situação

Em definição. Nenhum código escrito ainda — a fase atual é o fechamento das specs a partir do PRD.
