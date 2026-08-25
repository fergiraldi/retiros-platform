-- 0002_funcoes_de_dominio.sql

-- ========================================================================
-- resolver_identidade — copiada byte a byte de specs/fase-1/01-modelo-de-dados.md §3.1.
-- Não reescrever o corpo.
-- ========================================================================

-- Achado de pré-voo 2, variante confirmada em execução: pgcrypto (digest) mora
-- em `extensions` no Supabase, e a role de runtime não tem USAGE nesse schema
-- (só o owner/superusuário concede — não é algo que a própria role possa se
-- auto-conceder). Em vez de depender de um grant administrativo por ambiente,
-- usa-se sha256(convert_to(...)), builtin do pg_catalog desde o PG14 — mesmos
-- bytes de digest(p_cpf, 'sha256'), sem depender de extensão nenhuma.
create function resolver_identidade(
  p_cpf char(11), p_nome text, p_nascimento date
) returns uuid
language plpgsql security definer
as $$
declare v_id uuid;
begin
  select id into v_id from identidade where cpf = p_cpf;
  if v_id is null then
    insert into identidade (id, cpf, cpf_hash, nome_completo, data_nascimento)
    values (gen_random_uuid(), p_cpf, sha256(convert_to(p_cpf, 'UTF8')), p_nome, p_nascimento)
    returning id into v_id;
  end if;
  return v_id;
end $$;
--> statement-breakpoint

-- RN-124: nenhum role de aplicação tem select em identidade. Hoje app_dev/
-- app_hom/app_prod são owner+runtime na mesma role (achado 5) — revogar
-- quebraria a própria security definer, que roda como o owner. Guardado por
-- existência de role pra já ficar correto quando a segunda role de runtime
-- existir, sem precisar editar esta migration de novo.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_api') then
    execute 'revoke all on identidade from app_api';
  end if;
  if exists (select 1 from pg_roles where rolname = 'app_publico') then
    execute 'revoke all on identidade from app_publico';
  end if;
end $$;
--> statement-breakpoint

-- ========================================================================
-- resolver_inquilino_por_host — RN-059t/RN-120. Resolve o inquilino pelo
-- host, antes de existir qualquer contexto de sessão. A tabela inquilino_dominio
-- já permite leitura pública de domínio verificado (0001); esta função só
-- encapsula a query e narra o motivo em um lugar só.
-- ========================================================================

create function resolver_inquilino_por_host(p_host text)
returns table(inquilino_id uuid, situacao situacao_inquilino)
language sql security definer stable
as $$
  select i.id, i.situacao
  from inquilino_dominio d
  join inquilino i on i.id = d.inquilino_id
  where d.dominio = p_host
    and d.verificado = true
  limit 1
$$;
