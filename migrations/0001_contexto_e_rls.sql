-- 0001_contexto_e_rls.sql
-- RLS conforme 00-multi-inquilino.md §2. Regra de ouro: esta migration nunca
-- cria tabela nem coluna — só funções, políticas e (na 0002/0003) triggers/grants.

-- ========================================================================
-- Acessores de contexto (RN-053t a RN-058t)
-- ========================================================================

create function app_inquilino_id() returns uuid language sql stable as $$
  select nullif(current_setting('app.inquilino_id', true), '')::uuid
$$;
--> statement-breakpoint

create function app_central_id() returns uuid language sql stable as $$
  select nullif(current_setting('app.central_id', true), '')::uuid
$$;
--> statement-breakpoint

create function app_papel() returns text language sql stable as $$
  select nullif(current_setting('app.papel', true), '')
$$;
--> statement-breakpoint

-- ========================================================================
-- Helper: materializa o template de §2.3 (uma restritiva de inquilino +
-- uma permissiva de central) com os parâmetros da matriz de tradução.
--
-- p_central:                 nome da coluna de central ('central_id'), 'id'
--                             (a fronteira é o próprio id da tabela — só `central`
--                             usa isso), ou null (tabela sem conceito de central).
-- p_central_nula_visivel:    true quando central_id nulo = escopo do inquilino
--                             inteiro (RN-105: conexao_gateway, notificacao,
--                             usuario, auditoria).
-- p_papeis_globais:          papéis que atravessam a fronteira de central.
-- p_inquilino_nulo_operador: true quando inquilino_id nulo é válido para conta/
--                             ato de `operador` (usuario, auditoria — RNF-001 §8.1).
-- ========================================================================

create function rls_politicas_padrao(
  p_tabela                  text,
  p_central                 text    default 'central_id',
  p_central_nula_visivel    boolean default false,
  p_papeis_globais          text[]  default array['admin_denominacao'],
  p_inquilino_nulo_operador boolean default false
) returns void language plpgsql as $$
declare
  v_inquilino_using text;
  v_central_using   text;
  v_coluna_central  text;
begin
  execute format('alter table %I enable row level security', p_tabela);
  execute format('alter table %I force row level security', p_tabela);

  if p_inquilino_nulo_operador then
    v_inquilino_using := $sql$(inquilino_id = app_inquilino_id()) or (inquilino_id is null and app_papel() = 'operador')$sql$;
  else
    v_inquilino_using := 'inquilino_id = app_inquilino_id()';
  end if;

  execute format(
    'create policy %I on %I as restrictive for all using (%s) with check (%s)',
    p_tabela || '_inquilino', p_tabela, v_inquilino_using, v_inquilino_using
  );

  if p_central is null then
    v_central_using := 'true';
  else
    v_coluna_central := case when p_central = 'id' then 'id' else p_central end;

    if p_central_nula_visivel then
      v_central_using := format(
        'app_papel() = any(%L::text[]) or %I is null or %I = app_central_id()',
        p_papeis_globais, v_coluna_central, v_coluna_central
      );
    else
      v_central_using := format(
        'app_papel() = any(%L::text[]) or %I = app_central_id()',
        p_papeis_globais, v_coluna_central
      );
    end if;
  end if;

  execute format(
    'create policy %I on %I as permissive for all using (%s) with check (%s)',
    p_tabela || '_central', p_tabela, v_central_using, v_central_using
  );
end;
$$;
--> statement-breakpoint

-- ========================================================================
-- Matriz de aplicação (achado 4). Tabelas com fronteira de central padrão.
-- ========================================================================

select rls_politicas_padrao('encontro', 'central_id');
--> statement-breakpoint
select rls_politicas_padrao('inscricao', 'central_id');
--> statement-breakpoint
select rls_politicas_padrao('cobranca', 'central_id');
--> statement-breakpoint

-- `central`: a fronteira é o próprio id da linha, não uma coluna central_id.
select rls_politicas_padrao('central', 'id');
--> statement-breakpoint

-- Tabelas sem conceito de central (RNF-001 §8.1; RN-126).
select rls_politicas_padrao('pessoa', null);
--> statement-breakpoint
select rls_politicas_padrao('pessoa_dado_sensivel', null);
--> statement-breakpoint
select rls_politicas_padrao('termo', null);
--> statement-breakpoint
select rls_politicas_padrao('consentimento', null);
--> statement-breakpoint
select rls_politicas_padrao('acesso_suporte', null);
--> statement-breakpoint

-- Tabelas com central_id nullable (nulo = escopo do inquilino inteiro — RN-105).
select rls_politicas_padrao('conexao_gateway', 'central_id', true);
--> statement-breakpoint
select rls_politicas_padrao('notificacao', 'central_id', true);
--> statement-breakpoint

-- usuario e auditoria: central_id nullable E inquilino_id nullable (ato de
-- `operador`, que vive fora de qualquer inquilino — RNF-001 §8.1).
select rls_politicas_padrao(
  'usuario', 'central_id', true,
  array['admin_denominacao'], true
);
--> statement-breakpoint
select rls_politicas_padrao(
  'auditoria', 'central_id', true,
  array['admin_denominacao', 'operador'], true
);
--> statement-breakpoint

-- ========================================================================
-- Blocos bespoke — fora do template padrão
-- ========================================================================

-- RN-128: acesso de suporte não alcança dado sensível, com ou sem concessão.
-- Restritiva adicional: nenhuma política permissiva nova abre isso (RN-056t).
create policy pessoa_dado_sensivel_sem_operador on pessoa_dado_sensivel
  as restrictive for all
  using (coalesce(app_papel(), '') <> 'operador')
  with check (coalesce(app_papel(), '') <> 'operador');
--> statement-breakpoint

-- inquilino: raiz do isolamento, não carrega o par inquilino/central
-- (RNF-001 §8.1). Lê a própria linha (ou qualquer uma, se operador);
-- escreve só o operador.
alter table inquilino enable row level security;
--> statement-breakpoint
alter table inquilino force row level security;
--> statement-breakpoint
-- A terceira condição da USING cobre a resolução pública por host (RN-059t):
-- sem nenhum contexto de sessão ainda (é o que decide o próprio inquilino_id),
-- a leitura de branding/config pública é permitida — dado não sensível, é o
-- que a página do inquilino já mostra a qualquer visitante (RN-016).
-- Escrita continua exclusiva do operador em qualquer um dos três casos.
create policy inquilino_visibilidade on inquilino
  as restrictive for all
  using (
    id = app_inquilino_id()
    or app_papel() = 'operador'
    or (app_inquilino_id() is null and app_central_id() is null and app_papel() is null)
  )
  with check (app_papel() = 'operador');
--> statement-breakpoint
create policy inquilino_base on inquilino
  as permissive for all using (true) with check (true);
--> statement-breakpoint

-- inquilino_dominio: leitura pública do domínio verificado (não é dado
-- sensível — é o que resolve host pra inquilino, antes de existir qualquer
-- contexto de tenant), escrita só dentro do próprio inquilino (RN-120, §5).
alter table inquilino_dominio enable row level security;
--> statement-breakpoint
alter table inquilino_dominio force row level security;
--> statement-breakpoint
create policy inquilino_dominio_leitura_publica on inquilino_dominio
  as permissive for select
  using (verificado = true or inquilino_id = app_inquilino_id());
--> statement-breakpoint
-- Achado 3 (na prática, não só na teoria): restritiva sozinha nega tudo por
-- padrão — precisa de uma permissiva "true" por comando de escrita pra a
-- restritiva abaixo ter o que de fato restringir. Postgres também não aceita
-- lista de comandos em "for": uma política por comando.
create policy inquilino_dominio_escrita_liberada on inquilino_dominio
  as permissive for insert
  with check (true);
--> statement-breakpoint
create policy inquilino_dominio_escrita_liberada_upd on inquilino_dominio
  as permissive for update
  using (true) with check (true);
--> statement-breakpoint
create policy inquilino_dominio_escrita_liberada_del on inquilino_dominio
  as permissive for delete
  using (true);
--> statement-breakpoint
create policy inquilino_dominio_insercao_do_proprio_inquilino on inquilino_dominio
  as restrictive for insert
  with check (inquilino_id = app_inquilino_id());
--> statement-breakpoint
create policy inquilino_dominio_atualizacao_do_proprio_inquilino on inquilino_dominio
  as restrictive for update
  using (inquilino_id = app_inquilino_id())
  with check (inquilino_id = app_inquilino_id());
--> statement-breakpoint
create policy inquilino_dominio_exclusao_do_proprio_inquilino on inquilino_dominio
  as restrictive for delete
  using (inquilino_id = app_inquilino_id());
