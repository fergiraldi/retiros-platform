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

## Ambientes

Quatro schemas do mesmo banco Supabase, um por ambiente, cada um com sua role (`app_dev`, `app_ci`, `app_hom`, `app_prod` — nenhuma com `BYPASSRLS`). A aplicação recusa subir se `current_schema()` não bater com `DB_SCHEMA_ESPERADO`, o que protege contra `.env` trocado.

| Ambiente | Onde | Deploy | Migrations |
|---|---|---|---|
| `dev` | local | — | `pnpm db:migrate` na mão; `pnpm db:seed` popula os inquilinos de teste |
| `ci` | GitHub Actions | — | o próprio workflow aplica antes de rodar a suíte |
| `hom` | Railway | automático a cada push em `main`, depois do CI passar | aplicadas no deploy |
| `prod` | Railway | **promoção manual** | **não** saem no deploy — é um ato à parte |

A assimetria entre `hom` e `prod` é deliberada: homologação acompanha `main` sozinha, produção só muda por decisão. O efeito colateral é que **`prod` fica para trás em silêncio se alguém esquecer o passo da migration** — foi assim que ele acumulou duas pendentes. Ao promover para produção, aplique-as no mesmo ato:

```sh
DATABASE_URL=<url de prod> DB_SCHEMA_ESPERADO=prod pnpm db:migrate
```

`PROXIES_CONFIAVEIS` também difere por ambiente, e de propósito: `1` em `hom`/`prod`, que ficam atrás do proxy da Railway, e `0` no dev local, que fala direto com o processo.

### O edge da Railway é o único caminho de entrada

A resolução de inquilino por host confia no `Host` da requisição, e o `trust proxy` do Express protege `X-Forwarded-For`, **não** `X-Forwarded-Host` — quem alcançar o processo sem passar pelo proxy escolhe o host, e portanto o inquilino resolvido. Hoje ninguém alcança, e isso vem da topologia, não do código. Verificado em 07/09/2026:

- **um único serviço** por projeto, uma instância por ambiente — não há vizinho na rede privada;
- **um único domínio**, do tipo `service`, servido pelo edge HTTP, que sempre injeta `X-Forwarded-*`;
- **nenhum TCP proxy** publicado — não existe porta crua exposta.

O container não tem IP público, então de fora só se chega pelo edge. **Duas mudanças reabrem esse vetor**, e nada avisa quando acontecem: acrescentar um segundo serviço ao projeto (worker, cron, cache), que passa a falar com `*.railway.internal` sem passar pelo edge; ou expor um TCP proxy para o serviço. Se algum dos dois entrar no ar, o guard precisa passar a exigir a marca do proxy na requisição em vez de confiar na topologia.

A proporção importa: o que se ganha forjando o host é a área pública do outro inquilino — a mesma que o navegador alcança visitando o subdomínio dele. A RN-060t protege o lado autenticado, validando `usuario.inquilino_id` contra o host resolvido — implementada desde 07/09/2026 no `AutenticacaoGuard`, que responde `403` e grava alerta na divergência.

`PROXIES_CONFIAVEIS` não é a única variável que difere por ambiente: `SUPABASE_JWKS_URL` e `SUPABASE_JWT_EMISSOR` são **obrigatórias** quando `NODE_ENV=production`, e a aplicação recusa subir sem elas — mesma trava de `current_schema()`, e pelo mesmo motivo: sem chave para verificar o JWT, a alternativa seria subir saudável e responder `401` em toda rota, que se parece com bug de aplicação. O emissor vai **sem barra no fim**: a claim `iss` é comparada como string exata.

## Situação

Fase 1 em desenvolvimento, com a fundação de plataforma entregue: contexto multi-inquilino por transação, RLS de dois níveis nas 17 tabelas de domínio, resolução de inquilino por host, CORS dinâmico, envelope de erro padronizado, validação de payload com Zod e autenticação por JWT do Supabase Auth com papel efetivo.

Toda rota nasce autenticada — exige conta ativa salvo isenção explícita — e a área autenticada valida o vínculo da conta contra o host resolvido, com `403` e alerta na divergência (RN-060t). As duas rotas no ar são o healthcheck `GET /saude` e a `GET /api/sessao`, que devolve o papel efetivo da requisição; ainda não existe controller de domínio, nem pagamento, e-mail ou cron. O que falta, em ordem de execução e com esforço estimado, está em [docs/proximos-passos.md](docs/proximos-passos.md).
