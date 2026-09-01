# Próximos passos — liberação da Fase 1

> Levantamento feito em 01/09/2026, cruzando `PRD.md` e `specs/fase-1/*.md` contra o
> código real em `src/`, `migrations/` e `test/`. Esforço em horas de desenvolvimento —
> nunca em valor financeiro (isso é decisão do comercial).

## Veredito

A Fase 1 está longe de liberável. O que existe hoje é só a fundação de plataforma —
contexto transacional por request, RLS de dois níveis, as 17 tabelas de domínio,
funções SQL e as 3 specs de teste de banco (isolamento, cobertura de RLS, contexto de
transação). **Fora do healthcheck `GET /saude`, não existe um único controller de
domínio.** Zero autenticação, zero validação de payload, zero envelope de erro, zero
integração com Mercado Pago, zero e-mail, zero cron.

**Estimativa total: 204 a 313 horas** de desenvolvimento (≈ 5 a 8 semanas de um dev
full-time), sem contar os bloqueios não-código listados no fim deste documento.

## O que já está pronto

- Contexto multi-inquilino por transação (`ContextoInterceptor` + `UnidadeDeTrabalhoService`,
  `src/contexto/`)
- RLS de dois níveis nas 17 tabelas, com teste de cobertura da RN-141
- Role de runtime `app_api` restrita, sem `BYPASSRLS`
- 3 specs de teste de banco (`test/isolamento.spec.ts`, `test/rls-cobertura.spec.ts`,
  `test/contexto-transacao.spec.ts`)
- `ResolvedorDeHostGuard` está escrito e correto, mas ainda não plugado em nenhuma rota
  (ver [pendencias-tecnicas.md](pendencias-tecnicas.md))

## Ordem de execução

| # | Item | Horas | Depende de |
|---|---|---|---|
| 1 | Envelope de erro padronizado (RNF-011) | 8-12 | — |
| 2 | Validação de payload (DTOs + ValidationPipe) | 6-10 | 1 |
| 3 | CORS dinâmico + plugar o guard de host | 8-12 | — |
| 4 | Corrigir trigger de integridade em `usuario` (RN-051t) — bug real, ver pendências | 2-3 | — |
| 5 | Autenticação Supabase JWT + papel efetivo | 16-24 | 1, 3 |
| 5b | Contas de acesso — convite, ativação, revogação (F8, RN-017 a RN-019) | 10-14 | 5, 19 |
| 6 | Rate limit por IP e por CPF (RNF-012) | 8-14 | 1 |
| 7 | Logging estruturado + request-id | 6-10 | — |
| 8 | Onboarding do inquilino F0 | 14-20 | 5, 2 |
| 9 | Cliente HTTP Mercado Pago + OAuth | 14-20 | 8 |
| 10 | Ficha de inscrição pública F1 | 16-24 | 2, 6, 3 |
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
| 23 | Infra de teste HTTP/e2e (supertest) | 4-8 | 1 |

O item **5b** foi um achado da crítica de completude do levantamento original: a
autenticação (item 5) só *lê* uma conta já ativa contra o JWT — não cria, convida,
ativa nem revoga nada. Sem ele, F8 fica sem dono.

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

## Riscos principais

- **Autenticação (item 5) é o maior gargalo de paralelização** — quase toda rota
  administrativa depende dela; se atrasar, trava várias frentes ao mesmo tempo.
- Rate limit por CPF normalizado não é coberto por lib padrão de throttling (que é
  tipicamente só por IP) — risco real de subestimar o esforço do item 6.
- SDK/contrato do Mercado Pago ainda não escolhido nem instalado — cliente HTTP, OAuth,
  split e idempotência de webhook partem do zero.
- Provedor de e-mail ainda em aberto no PRD (ao contrário do WhatsApp, que já tem
  decisão nº 1 explícita, mesmo que pendente).

## Fora de escopo da Fase 1

Não entram nesta conta de horas:

- **Fase 2**: grupos, áreas de servição, cronograma (etapas/tarefas/modelos), crachás,
  check-in, funcionamento offline (RNF-003), área do servo (RN-081 a RN-084).
- **Fase 3**: despesas, avaliação (RN-100), fechamento financeiro, faturamento
  (RN-088/RN-109/RN-110).
- **WhatsApp automatizado** — decisão nº 1 do PRD ainda em aberto; nesta fase o único
  mecanismo é link manual `wa.me`.
