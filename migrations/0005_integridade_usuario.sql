-- 0005_integridade_usuario.sql
-- RN-051t nao cobria `usuario`: o trigger da 0003 ficou nas cinco tabelas com
-- o par inquilino_id + central_id (encontro, inscricao, cobranca, notificacao,
-- conexao_gateway) e `usuario` passou batido, apesar de ter o mesmo par
-- (central_id preenchido para admin_central).
--
-- O buraco era alcancavel pelo caminho normal da aplicacao: no contexto de
-- admin_denominacao do inquilino A a RLS de `usuario` libera a escrita (a
-- permissiva `usuario_central` da passe livre a admin_denominacao, e a
-- restritiva so confere inquilino_id = A) e nao havia trigger depois dela --
-- gravava-se um admin_central de A apontando para uma central de B.
--
-- `usuario` e a unica tabela coberta em que inquilino_id TAMBEM e nulavel
-- (papel `operador` vive fora de qualquer inquilino, RNF-001 secao 8.1). Nas
-- outras cinco a coluna e not null. Por isso a funcao ganha um ramo proprio:
-- sem ele, `v_inquilino_da_central <> null` avalia para NULL, o if nao dispara
-- e a linha com central e sem inquilino passaria.
--
-- `auditoria` fica de fora de proposito: tem o par, mas central_id la e uuid
-- puro, sem FK, justamente para o log sobreviver a exclusao da central. O
-- trigger recusaria linha de auditoria cuja central ja nao existe mais. A
-- excecao esta declarada no teste de cobertura (test/integridade-central.spec.ts).
--
-- Esta migration nao revalida linhas pre-existentes, e nao tem como: `force
-- row level security` alcanca o dono do schema e a migration roda sem os GUCs
-- app.*, entao qualquer select de conferencia enxergaria zero linhas. E
-- aceitavel porque `usuario` ainda nao tem dado real -- a autenticacao (item 5
-- de docs/proximos-passos.md) nem existe.

create or replace function validar_central_do_inquilino() returns trigger
language plpgsql as $$
declare
  v_inquilino_da_central uuid;
begin
  if new.central_id is null then
    return new;
  end if;

  -- toda central pertence a um inquilino: linha com central e sem inquilino e
  -- a mesma "combinação impossível" que a RN-051t barra. Ramo inalcançável nas
  -- cinco tabelas da 0003, onde inquilino_id é not null.
  if new.inquilino_id is null then
    raise exception
      'RN-051t: linha com central_id % não pode ter inquilino_id nulo', new.central_id;
  end if;

  select inquilino_id into v_inquilino_da_central
  from central
  where id = new.central_id;

  -- a consulta acima roda sob RLS (esta função é invoker, e `central` tem
  -- force row level security): central de outro inquilino não aparece e é
  -- indistinguível de inexistente daqui — daí a mensagem cobrir os dois casos.
  if v_inquilino_da_central is null then
    raise exception
      'RN-051t: central_id % não existe ou não é visível neste contexto', new.central_id;
  end if;

  if v_inquilino_da_central <> new.inquilino_id then
    raise exception
      'RN-051t: central % pertence ao inquilino %, mas a linha informa inquilino %',
      new.central_id, v_inquilino_da_central, new.inquilino_id;
  end if;

  return new;
end $$;
--> statement-breakpoint

create trigger validar_central_do_inquilino_trg
  before insert or update on usuario
  for each row execute function validar_central_do_inquilino();
--> statement-breakpoint

-- Mesma blindagem da 0004. A funcao nao e security definer (roda com o
-- privilegio de quem escreve, entao nao ha escalada aqui), mas referencia
-- `central` sem qualificar schema: um schema a frente no search_path com uma
-- tabela `central` falsa faria a validacao da RN-051t passar contra dado
-- inventado. current_schema() em vez de nome fixo porque a mesma migration
-- roda em dev, ci, hom e prod.
do $$
begin
  execute format(
    'alter function validar_central_do_inquilino() set search_path = %I, public',
    current_schema()
  );
end $$;
