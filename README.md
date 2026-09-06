# Plataforma de Retiros

SaaS multi-inquilino para divulgação, inscrição, cobrança e operação de retiros espirituais. Cada denominação — Homens de Fé, Homens Adoradores, Tabor — é um inquilino independente, com suas centrais pelo Brasil, sua marca, seu vocabulário e seu recebimento.

Cobre o ciclo completo de um encontro: publicação na agenda, inscrição de participantes e servos, pagamento por Pix ou cartão parcelado, montagem de grupos e equipe de servição, condução do cronograma durante o evento e prestação de contas no fechamento.

## Documentação

- [PRD.md](PRD.md) — documento de produto: glossário do domínio, atores, entidades, regras de negócio numeradas, fluxos e fases de entrega.
- [specs/fase-1/](specs/fase-1/README.md) — especificação técnica da Fase 1: multi-inquilino, modelo de dados, inscrição, cobrança, webhook, lista de espera e critérios de aceite.
- [docs/proximos-passos.md](docs/proximos-passos.md) — levantamento do que falta para liberar a Fase 1, em ordem de execução e com esforço em horas.
- [docs/pendencias-tecnicas.md](docs/pendencias-tecnicas.md) — dívida técnica e itens que ficaram pra trás em cada sprint/iteração.

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

Fase 1 em desenvolvimento, com a fundação de plataforma entregue: contexto multi-inquilino por transação, RLS de dois níveis nas 17 tabelas de domínio, resolução de inquilino por host, CORS dinâmico, envelope de erro padronizado e validação de payload com Zod.

Fora do healthcheck `GET /saude`, ainda não existe controller de domínio — sem autenticação, pagamento, e-mail ou cron. O que falta, em ordem de execução e com esforço estimado, está em [docs/proximos-passos.md](docs/proximos-passos.md).
