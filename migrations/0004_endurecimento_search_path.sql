-- 0004_endurecimento_search_path.sql
-- Achado 1 da auditoria de seguranca (/security-review): as duas funcoes
-- security definer (resolver_identidade, resolver_inquilino_por_host) nao
-- tinham search_path fixo, referenciando tabela sem qualificar schema
-- (identidade, inquilino_dominio, inquilino). Regressao introduzida na
-- 0002, quando trocamos digest() por sha256() e o ajuste de search_path
-- que existia pro pgcrypto foi removido junto sem necessidade.
--
-- Sem search_path fixo, uma role futura com CREATE num schema que apareca
-- antes de <schema> no search_path da sessao poderia sombrear "identidade"
-- e fazer a funcao definer ler/gravar numa tabela falsa, com os
-- privilegios do owner. Nao e explorável hoje (nao ha segunda role, nem
-- input de usuario decide search_path), mas e o tipo de lacuna que so
-- aparece depois que alguem ja depende dela.

do $$
begin
  execute format(
    'alter function resolver_identidade(char(11), text, date) set search_path = %I, public',
    current_schema()
  );
  execute format(
    'alter function resolver_inquilino_por_host(text) set search_path = %I, public',
    current_schema()
  );
end $$;
