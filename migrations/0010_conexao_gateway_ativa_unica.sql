-- 0010_conexao_gateway_ativa_unica.sql
-- RN-105: "uma conexao ativa por escopo" — reconectar substitui a anterior no
-- mesmo ato, e a anterior fica `ativa = false`, sem ser apagada (cobranca
-- emitida por ela continua viva no gateway e o webhook dela continua chegando).
--
-- `conexao_gateway_unica unique (inquilino_id, central_id, gateway)`, da 0000,
-- nao expressa isso, e erra para os dois lados:
--
--  1. Conexao de CENTRAL: a linha antiga, ja desativada, continua ocupando o
--     trio — reconectar viola a constraint. A regra manda guardar a antiga.
--  2. Conexao do INQUILINO (`central_id` nulo): UNIQUE trata nulos como
--     distintos, entao nada impede duas conexoes ativas ao mesmo tempo para o
--     inquilino inteiro — e a resolucao da cobranca (RN-123) sortearia entre
--     elas para onde vai o dinheiro.
--
-- A troca: unico so entre as ATIVAS (indice parcial), com `nulls not distinct`
-- para o nulo de `central_id` contar como valor (Postgres 15+).
--
-- Achado ao implementar o item 9 (OAuth do Mercado Pago), que e o primeiro
-- codigo a reconectar. Nenhuma linha real em `conexao_gateway` em ambiente
-- nenhum — so as de teste, que a suite cria e apaga.

alter table conexao_gateway drop constraint conexao_gateway_unica;
--> statement-breakpoint

create unique index conexao_gateway_ativa_unica
  on conexao_gateway (inquilino_id, central_id, gateway) nulls not distinct
  where ativa;
