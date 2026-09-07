-- 0006_integridade_auditoria.sql
-- RN-051t passa a cobrir `auditoria`, a setima e ultima tabela com o par
-- inquilino_id + central_id. Ficava de fora desde a 0003, declarada como
-- excecao em test/integridade-central.spec.ts.
--
-- Por que a excecao existia, e por que nao se sustenta:
--
-- `auditoria` nao tem FK nenhuma -- nem em inquilino_id, nem em central_id,
-- nem em entidade_id -- e isso e deliberado: a spec (01-modelo-de-dados.md
-- secao 4.7) declara a tabela assim, porque e log polimorfico, que aponta
-- para qualquer entidade e precisa sobreviver ao que registrou. Dai a leitura
-- de que o trigger recusaria linha de auditoria cuja central ja nao existisse.
--
-- So que central nao e apagada: tem `ativa boolean`, e a spec aplica esse
-- padrao em todo lugar (RN-063t, "dado nunca e apagado"; conexao_gateway,
-- "a linha antiga fica ativa = false e nao e apagada"). O unico `delete from
-- central` do repositorio esta em test/ajuda/semear.ts, limpando fixture.
--
-- E, decisivo: sob RLS a funcao NAO consegue distinguir "central nao existe"
-- de "central existe e e de outro inquilino" -- as duas somem do select, como
-- a propria 0005 admite na mensagem ("nao existe ou nao e visivel neste
-- contexto"). Um trigger tolerante ao caso "nao encontrei" aceitaria em
-- silencio justamente a central de outro inquilino, que e o furo a fechar.
-- Tolerancia e deteccao sao mutuamente exclusivas aqui, e a tolerancia
-- protegeria um cenario que nao ocorre.
--
-- Por isso reusa a funcao existente, sem variante propria: mesma regra das
-- outras seis tabelas, mesmo comportamento, um lugar so para manter.
--
-- Efeito colateral conhecido: auditoria gravada sem contexto de inquilino
-- (GUCs vazios, como no processamento de webhook orfao) e que traga
-- central_id preenchido passa a ser recusada -- nesse contexto nenhuma central
-- e visivel. Auditoria de escopo de plataforma (ator operador, inquilino_id
-- nulo) nao e afetada enquanto vier sem central_id, que e o caso descrito na
-- spec: convite, mudanca de papel e revogacao de conta operador.

create trigger validar_central_do_inquilino_trg
  before insert or update on auditoria
  for each row execute function validar_central_do_inquilino();
