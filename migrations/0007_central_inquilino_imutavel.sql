-- 0007_central_inquilino_imutavel.sql
-- Fecha o ultimo flanco da RN-051t: o trigger das sete tabelas valida o filho
-- no momento em que o filho e escrito, e nao havia nada do lado de `central`.
-- Se o inquilino_id de uma central mudasse, todo encontro, inscricao, cobranca,
-- usuario, notificacao e conexao_gateway abaixo dela viraria de uma vez a
-- combinacao impossivel que a RN-051t existe para impedir, sem nada disparar --
-- os filhos ja estavam gravados, e o trigger deles nao roda de novo.
--
-- Hoje esse caminho nao e alcancavel: a politica restritiva `central_inquilino`
-- tem using E with check iguais a `inquilino_id = app_inquilino_id()`, entao
-- mover a central exigiria contexto do inquilino de origem (using) e destino
-- igual a origem (with check) ao mesmo tempo. A protecao, porem, vem inteira
-- da RLS -- afrouxar aquela policy abriria isto em silencio, e quem mexesse
-- nela nao teria como saber que estava derrubando outra garantia.
--
-- Imutabilidade em vez de revalidacao em cascata: central mudar de denominacao
-- nao e caso de uso. Levaria junto o historico inteiro -- encontros divulgados,
-- inscricoes pagas, cobrancas emitidas no gateway -- que nasceram sob outra
-- denominacao e continuam pertencendo a ela.

create function recusar_troca_de_inquilino_da_central() returns trigger
language plpgsql as $$
begin
  if new.inquilino_id is distinct from old.inquilino_id then
    raise exception
      'RN-051t: inquilino_id de central e imutavel (central %, de % para %)',
      old.id, old.inquilino_id, new.inquilino_id;
  end if;
  return new;
end $$;
--> statement-breakpoint

create trigger recusar_troca_de_inquilino_da_central_trg
  before update on central
  for each row execute function recusar_troca_de_inquilino_da_central();
--> statement-breakpoint

-- Mesma blindagem da 0004: a funcao nao referencia tabela nenhuma sem
-- qualificar schema, entao nao ha o risco que motivou aquela migration, mas
-- fixar o search_path mantem o idioma -- nenhuma funcao nossa depende do
-- search_path de quem a chama.
do $$
begin
  execute format(
    'alter function recusar_troca_de_inquilino_da_central() set search_path = %I, public',
    current_schema()
  );
end $$;
