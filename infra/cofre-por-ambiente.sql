-- Cofre de segredos por ambiente (RN-104/RN-121) — src/cofre/cofre.ts.
--
-- Rodar no SQL Editor do Supabase, como `postgres`, colando o ARQUIVO INTEIRO.
-- Configura os ambientes da lista `ambientes` (por padrão, os quatro). Pode
-- rodar de novo sem estragar nada: recria as funções e reaplica os grants.
--
-- Por que não é migration: a role da aplicação (`app_<ambiente>`) não cria
-- role e não enxerga o Vault — e é exatamente isso que isola os ambientes. O
-- Vault é um só para o banco inteiro; quem o acessa é só `cofre_<ambiente>`,
-- sem login, por meio de três funções que prefixam o nome do segredo com o
-- ambiente. `app_dev` não tem como pedir um segredo `prod:`.
--
-- Viabilidade provada em 01/11/2026 no ambiente dev: como `app_dev`, ler e
-- gravar pelas funções funciona; ler o Vault direto, criar segredo direto,
-- virar `cofre_dev`, criar ou alterar função no schema do cofre e alcançar um
-- segredo `prod:` são recusados.

do $cofre$
declare
  ambientes constant text[] := array['dev', 'ci', 'hom', 'prod'];
  ambiente text;
  papel    text;
  app      text;
  prefixo  text;
begin
  foreach ambiente in array ambientes loop
    papel   := 'cofre_' || ambiente;
    app     := 'app_' || ambiente;
    prefixo := ambiente || ':';

    if not exists (select 1 from pg_roles where rolname = app) then
      raise exception 'a role % não existe — confira a lista de ambientes', app;
    end if;

    if not exists (select 1 from pg_roles where rolname = papel) then
      execute format('create role %I nologin', papel);
    end if;
    -- o postgres precisa poder agir como a role para criar o schema e passar a
    -- ela a posse das funções
    execute format('grant %I to postgres', papel);

    execute format('grant usage on schema vault to %I', papel);
    execute format('grant select on vault.decrypted_secrets to %I', papel);
    execute format('grant select, delete on vault.secrets to %I', papel);
    execute format('grant execute on function vault._crypto_aead_det_decrypt(bytea, bytea, bigint, bytea, bytea) to %I', papel);
    execute format('grant execute on function vault.create_secret(text, text, text, uuid) to %I', papel);
    execute format('grant execute on function vault.update_secret(uuid, text, text, text, uuid) to %I', papel);

    execute format('create schema if not exists %I authorization %I', papel, papel);

    execute format($f$
      create or replace function %I.ler(p_nome text) returns text
      language sql stable security definer set search_path = ''
      as $corpo$ select decrypted_secret from vault.decrypted_secrets where name = %L || p_nome $corpo$
    $f$, papel, prefixo);

    execute format($f$
      create or replace function %I.gravar(p_nome text, p_segredo text) returns void
      language plpgsql security definer set search_path = ''
      as $corpo$
      declare v_id uuid;
      begin
        select id into v_id from vault.secrets where name = %L || p_nome;
        if v_id is null then
          perform vault.create_secret(p_segredo, %L || p_nome);
        else
          perform vault.update_secret(v_id, p_segredo);
        end if;
      end $corpo$
    $f$, papel, prefixo, prefixo);

    execute format($f$
      create or replace function %I.apagar(p_nome text) returns void
      language sql security definer set search_path = ''
      as $corpo$ delete from vault.secrets where name = %L || p_nome $corpo$
    $f$, papel, prefixo);

    execute format('alter function %I.ler(text) owner to %I', papel, papel);
    execute format('alter function %I.gravar(text, text) owner to %I', papel, papel);
    execute format('alter function %I.apagar(text) owner to %I', papel, papel);

    -- Só a aplicação do próprio ambiente executa. Nem `anon` nem
    -- `authenticated` (o navegador), nem a aplicação dos outros ambientes.
    execute format('revoke execute on all functions in schema %I from public', papel);
    execute format('grant usage on schema %I to %I', papel, app);
    execute format('grant execute on all functions in schema %I to %I', papel, app);
  end loop;
end $cofre$;

-- Conferência: uma linha por ambiente, com quem pode executar as funções.
-- Esperado: em cada uma, as três funções, e só `cofre_<ambiente>` (dono) e
-- `app_<ambiente>` executando.
select n.nspname as cofre,
       string_agg(distinct p.proname, ', ') as funcoes,
       string_agg(distinct a.grantee::regrole::text, ', ') as executam
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(p.proacl) a
 where n.nspname like 'cofre\_%'
 group by n.nspname
 order by n.nspname;
