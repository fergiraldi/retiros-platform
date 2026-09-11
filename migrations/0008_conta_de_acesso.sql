-- 0008_conta_de_acesso.sql
-- Base de banco da autenticacao (item 5 de docs/proximos-passos.md; PRD §8.1,
-- passos 3 e 4). Nenhuma tabela nova: `usuario` ja existe desde a 0000, com
-- convite_token_hash e convite_expira_em inclusos. O que falta e fechar dois
-- furos de integridade dos quais a autorizacao vai passar a depender, e dar a
-- `ultimo_acesso_em` uma trava de escrita.
--
-- ========================================================================
-- Por que NAO ha funcao `security definer` aqui
-- ========================================================================
-- A primeira versao desta migration trazia um `resolver_conta_de_acesso`
-- definer, na linhagem de resolver_inquilino_por_host (0002), para ler a linha
-- de `usuario` antes de existir contexto. Medido no banco em 07/09/2026: nao
-- funciona, e nao e questao de ajuste.
--
--   * `security definer` roda como o dono da funcao -- `app_dev`/`app_hom`/... --
--     que e tambem o dono de `usuario`;
--   * `force row level security` (RN-057t) alcanca o dono, entao a RLS se aplica
--     igual: com os GUCs vazios, a restritiva `usuario_inquilino` devolve zero
--     linhas. Medido: `select count(*) from usuario` sob app_dev sem contexto = 0;
--   * `set row_security = off` e recusado com 42501 -- o `force` existe
--     exatamente para o dono nao poder abrir mao dele;
--   * nenhuma role tem `BYPASSRLS` (conferido em pg_roles).
--
-- A resolucao da conta passou, entao, a ser uma consulta comum da aplicacao sob
-- contexto deliberadamente elevado -- {inquilino do host, admin_denominacao},
-- ou {operador} na rota do operador --, no mesmo idioma que test/ajuda/semear.ts
-- ja usa para escrever a linha de `inquilino`. Ganho colateral, e o motivo de
-- isto ser melhor que a funcao: sob aquele contexto **a RLS continua barrando a
-- travessia** entre inquilinos (medido: insert em nome de outro inquilino ->
-- 42501), ou seja o escopo da consulta e garantido pelo banco, e nao por um
-- `where` que alguem pode esquecer de escrever.
--
-- Consequencia que ficou registrada em docs/pendencias-tecnicas.md: **nenhum
-- contexto consegue perguntar "este e-mail tem conta em outro inquilino?"**, e
-- por isso a travessia por host da RN-060t e respondida sem essa pergunta --
-- token valido sem conta neste host e 403, nao 401 (PRD §8.1 passo 3 admite os
-- dois). A pergunta era, ela mesma, a sondagem cross-inquilino que a RN-052t
-- proibe; a RLS recusar servi-la e a arquitetura funcionando.

-- ========================================================================
-- 1. `situacao` deixa de aceitar qualquer string
-- ========================================================================
-- A coluna nasceu `text` sem check (0000), copiada do DDL de §4.15 da spec. Ate
-- aqui era inofensivo -- ninguem lia o valor. A partir do item 5 e ele que
-- decide 403 CONTA_INATIVA: RN-018 quer 'suspensa' e 'revogada' valendo no ato,
-- e um typo ('Ativa', 'ativo') viraria conta sem acesso nenhum, em silencio.
--
-- Check e nao `create type`, apesar de specs/fase-1/README.md §0.2 pedir type
-- para todo enum de situacao: o DDL da spec (§4.15) descreve `text`, e trocar o
-- tipo da coluna mexeria em spec, schema drizzle e RLS por um ganho que o check
-- ja entrega. Divergencia deliberada, registrada aqui para nao virar achado.
alter table usuario
  add constraint usuario_situacao_valida
  check (situacao in ('convidada', 'ativa', 'suspensa', 'revogada'));
--> statement-breakpoint

-- ========================================================================
-- 2. Conta de operador unica por e-mail
-- ========================================================================
-- `usuario_unico unique (inquilino_id, email)` (0000) nao restringe operador:
-- com inquilino_id nulo, o unique do Postgres nao considera as linhas iguais, e
-- davam para existir N contas 'operador' com o mesmo e-mail. A resolucao da
-- sessao do operador e por (papel = 'operador', e-mail), sem inquilino (PRD
-- §8.1 passo 3) -- com duplicata, qual conta autentica seria sorteio.
--
-- lower(email) porque a resolucao compara sem caixa. Nao estende a mesma
-- normalizacao a `usuario_unico`, que segue sensivel a caixa: e escrita,
-- terreno do item 5b, e mudar aquele unique agora seria mexer numa constraint
-- que a spec publica sem ter o fluxo que a exercita.
create unique index usuario_operador_unico
  on usuario (lower(email))
  where papel = 'operador';
--> statement-breakpoint

-- ========================================================================
-- 3. registrar_acesso_de_conta -- `ultimo_acesso_em` de §4.15
-- ========================================================================
-- Com trava de 5 minutos porque a alternativa e uma escrita por requisicao numa
-- coluna que ninguem le em tempo real. A precisao que a coluna precisa ter e
-- "quando foi a ultima vez que esta conta apareceu", nao o instante exato.
--
-- Funcao comum, **nao** `security definer`: roda com os privilegios de quem
-- chama, e portanto sob a RLS do contexto que a aplicacao abriu -- o mesmo
-- contexto elevado que leu a conta. Se um dia for chamada sem contexto, o update
-- nao encontra linha e nada acontece, que e a falha fechada certa aqui.
--
-- `now()` e o inicio da transacao, nao o instante do update -- irrelevante numa
-- janela de 5 minutos, e e o mesmo relogio que o resto da transacao usa.
create function registrar_acesso_de_conta(p_usuario_id uuid)
returns void
language sql
as $$
  update usuario
     set ultimo_acesso_em = now()
   where id = p_usuario_id
     and (ultimo_acesso_em is null
          or ultimo_acesso_em < now() - interval '5 minutes')
$$;
--> statement-breakpoint

-- Nao executavel por PUBLIC. Menos critico do que seria numa definer (esta roda
-- sob a RLS de quem chama), mas o default de `create function` e conceder a
-- PUBLIC, e uma funcao que escreve em `usuario` nao tem motivo para estar
-- aberta a toda role futura do cluster.
revoke execute on function registrar_acesso_de_conta(uuid) from public;
--> statement-breakpoint

-- search_path fixo -- idioma da 0004. A funcao referencia `usuario` sem
-- qualificar schema; fixar impede que ela dependa do search_path de quem chama.
-- `format` com current_schema() porque o nome do schema muda por ambiente
-- (dev|ci|hom|prod).
do $$
begin
  execute format(
    'alter function registrar_acesso_de_conta(uuid) set search_path = %I, public',
    current_schema()
  );
end $$;
