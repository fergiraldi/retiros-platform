-- 0003_integridade.sql
-- RN-051t: central_id acompanha inquilino_id em toda tabela abaixo de central.
-- Trigger valida que a central pertence ao inquilino informado, impedindo
-- linha com combinação impossível.

create function validar_central_do_inquilino() returns trigger
language plpgsql as $$
declare
  v_inquilino_da_central uuid;
begin
  if new.central_id is null then
    return new;
  end if;

  select inquilino_id into v_inquilino_da_central
  from central
  where id = new.central_id;

  if v_inquilino_da_central is null then
    raise exception 'central_id % não existe', new.central_id;
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
  before insert or update on encontro
  for each row execute function validar_central_do_inquilino();
--> statement-breakpoint

create trigger validar_central_do_inquilino_trg
  before insert or update on inscricao
  for each row execute function validar_central_do_inquilino();
--> statement-breakpoint

create trigger validar_central_do_inquilino_trg
  before insert or update on cobranca
  for each row execute function validar_central_do_inquilino();
--> statement-breakpoint

create trigger validar_central_do_inquilino_trg
  before insert or update on notificacao
  for each row execute function validar_central_do_inquilino();
--> statement-breakpoint

create trigger validar_central_do_inquilino_trg
  before insert or update on conexao_gateway
  for each row execute function validar_central_do_inquilino();
