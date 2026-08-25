-- 0000_estrutura.sql
-- Fonte: specs/fase-1/01-modelo-de-dados.md. Tradução mecânica pra migration,
-- sem reinterpretação. RLS e funções entram em migrations separadas (0001+).

-- ========================================================================
-- §1. Tipos
-- ========================================================================

create type situacao_inquilino as enum (
  'em_implantacao', 'ativo', 'suspenso', 'encerrado'
);
--> statement-breakpoint

create type situacao_encontro as enum (
  'rascunho', 'publicado', 'inscricoes_encerradas',
  'em_andamento', 'encerrado', 'cancelado'
);
--> statement-breakpoint

create type tipo_inscricao as enum ('participante', 'servo');
--> statement-breakpoint

create type situacao_inscricao as enum (
  'lista_espera', 'pendente_pagamento', 'confirmada',
  'presente', 'ausente', 'cancelada'
);
--> statement-breakpoint

create type metodo_pagamento as enum ('pix', 'cartao_credito', 'dinheiro', 'pix_presencial');
--> statement-breakpoint

create type situacao_cobranca as enum (
  'pendente_emissao', 'criada', 'aguardando_pagamento', 'em_analise', 'paga',
  'recusada', 'expirada', 'cancelada',
  'estornada_parcial', 'estornada'
);
--> statement-breakpoint

create type papel_usuario as enum (
  'servo', 'admin_central', 'admin_denominacao', 'operador'
);
--> statement-breakpoint

-- ========================================================================
-- §2. Plataforma
-- ========================================================================

-- §2.1 inquilino
create table inquilino (
  id                    uuid primary key,
  nome                  text not null,
  slug                  text not null unique,
  situacao              situacao_inquilino not null default 'em_implantacao',

  logo_url              text,
  logo_horizontal_url   text,
  favicon_url           text,
  cor_primaria          text not null default '#1f2937',
  cor_secundaria        text not null default '#6b7280',
  cor_texto_sobre_primaria text not null default '#ffffff',

  rotulos               jsonb not null default '{}',
  areas_padrao          jsonb not null default '[]',

  taxa_plataforma_percentual numeric(5,3) not null default 0
                        check (taxa_plataforma_percentual between 0 and 100),
  taxa_repassada_ao_inscrito boolean not null default false,

  contrato_versao       text,
  contrato_aceito_em    timestamptz,
  contrato_aceito_por   uuid,
  contrato_aceito_ip    inet,

  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),

  constraint inquilino_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint inquilino_ativo_tem_contrato check (
    situacao = 'em_implantacao' or contrato_aceito_em is not null
  )
);
--> statement-breakpoint

-- §4.1 central (criada aqui, antes de inquilino_dominio/conexao_gateway, por dependência de FK)
create table central (
  id                  uuid primary key,
  inquilino_id        uuid not null references inquilino(id),
  nome                text not null,
  cidade              text not null,
  uf                  char(2) not null,
  slug                text not null,
  logo_url            text,
  email_contato       text,
  telefone_contato    text,
  ativa               boolean not null default true,

  parcela_minima      numeric(10,2) not null default 50.00,
  max_parcelas        smallint not null default 12
                      check (max_parcelas between 1 and 12),

  reembolso_faixas    jsonb not null default
                      '[{"antecedencia_minima_dias":16,"percentual":100},{"antecedencia_minima_dias":7,"percentual":50},{"antecedencia_minima_dias":0,"percentual":0}]',

  despesa_exige_comprovante_acima_de numeric(10,2) not null default 0.00,

  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),

  constraint central_slug_unico_por_inquilino unique (inquilino_id, slug)
);
--> statement-breakpoint

-- §2.2 inquilino_dominio
create table inquilino_dominio (
  id                uuid primary key,
  inquilino_id      uuid not null references inquilino(id),
  dominio           text not null unique,
  tipo              text not null,
  verificado        boolean not null default false,
  token_verificacao text,
  verificado_em     timestamptz,
  principal         boolean not null default false,
  criado_em         timestamptz not null default now()
);
--> statement-breakpoint

create unique index inquilino_dominio_principal_unico
  on inquilino_dominio (inquilino_id) where principal;
--> statement-breakpoint

-- §2.3 conexao_gateway
create table conexao_gateway (
  id                  uuid primary key,
  inquilino_id        uuid not null references inquilino(id),
  central_id          uuid references central(id),
  gateway             text not null default 'mercadopago',
  conta_externa_id    text not null,
  access_token_ref    text not null,
  refresh_token_ref   text not null,
  expira_em           timestamptz not null,
  escopos             text[],
  ativa               boolean not null default true,
  ultimo_refresh_em   timestamptz,
  falhas_refresh      smallint not null default 0,
  conectada_por       uuid not null,
  conectada_em        timestamptz not null default now(),
  desativada_em       timestamptz,
  motivo_desativacao  text,
  criado_em           timestamptz not null default now(),

  constraint conexao_gateway_unica unique (inquilino_id, central_id, gateway)
);
--> statement-breakpoint

-- §2.4 acesso_suporte
create table acesso_suporte (
  id              uuid primary key,
  inquilino_id    uuid not null references inquilino(id),
  operador_id     uuid not null,
  concedido_por   uuid not null,
  motivo          text not null,
  expira_em       timestamptz not null,
  revogado_em     timestamptz,
  criado_em       timestamptz not null default now(),

  constraint acesso_suporte_prazo_maximo check (
    expira_em <= criado_em + interval '24 hours'
  )
);
--> statement-breakpoint

-- ========================================================================
-- §3. Pessoas
-- ========================================================================

-- §3.1 identidade (global, fora do isolamento por inquilino)
create table identidade (
  id              uuid primary key,
  cpf             char(11) not null unique,
  cpf_hash        bytea not null,
  nome_completo   text not null,
  data_nascimento date not null,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
--> statement-breakpoint

create index on identidade (cpf_hash);
--> statement-breakpoint

-- §3.2 pessoa
create table pessoa (
  id                        uuid primary key,
  inquilino_id              uuid not null references inquilino(id),
  identidade_id             uuid references identidade(id),
  central_origem_id         uuid references central(id),
  nome_completo             text not null,
  nome_cracha               text not null,
  data_nascimento           date not null,
  telefone                  text not null,
  email                     text not null,
  cep                       char(8),
  logradouro                text,
  numero                    text,
  complemento               text,
  bairro                    text,
  cidade                    text,
  uf                        char(2),
  estado_civil              text,
  contato_emergencia_nome   text not null,
  contato_emergencia_fone   text not null,
  observacoes               text,
  anonimizada_em            timestamptz,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),

  constraint pessoa_unica_por_inquilino unique (inquilino_id, identidade_id)
);
--> statement-breakpoint

create index on pessoa (inquilino_id, nome_completo);
--> statement-breakpoint

-- §3.3 pessoa_dado_sensivel
create table pessoa_dado_sensivel (
  pessoa_id                 uuid primary key references pessoa(id) on delete cascade,
  inquilino_id              uuid not null references inquilino(id),
  restricao_alimentar       text,
  condicao_saude            text,
  medicamentos_uso_continuo text,
  religiao_declarada        text,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now()
);
--> statement-breakpoint

-- §3.4 termo
create table termo (
  id                    uuid primary key,
  inquilino_id          uuid not null references inquilino(id),
  versao                text not null,
  titulo                text not null,
  corpo                 text not null,
  finalidades           text[] not null,
  controlador_nome      text not null,
  controlador_documento text not null,
  encarregado_nome      text not null,
  encarregado_contato   text not null,
  situacao              text not null default 'rascunho',
  publicado_por         uuid,
  publicado_em          timestamptz,
  substituida_em        timestamptz
);
--> statement-breakpoint

create unique index termo_vigente_unico
  on termo (inquilino_id)
  where situacao = 'vigente';
--> statement-breakpoint

-- ========================================================================
-- §4. Domínio
-- ========================================================================

-- §4.2 encontro (sem a FK de coordenador_inscricao_id ainda — inscricao não existe;
-- ver ALTER TABLE logo após a criação de inscricao, mais abaixo)
create table encontro (
  id                    uuid primary key,
  inquilino_id          uuid not null references inquilino(id),
  central_id            uuid not null references central(id),
  numero                integer not null,
  titulo                text not null,
  slug                  text not null,
  data_inicio           date not null,
  data_fim              date not null,
  local_nome            text not null,
  local_endereco        text not null,
  local_cidade          text not null,
  local_uf              char(2) not null,
  vagas_participantes   smallint not null check (vagas_participantes > 0),
  vagas_servos          smallint not null check (vagas_servos > 0),
  taxa_participante     numeric(10,2) not null check (taxa_participante >= 0),
  taxa_servo            numeric(10,2) not null check (taxa_servo >= 0),
  inscricoes_abrem_em   timestamptz not null,
  inscricoes_fecham_em  timestamptz not null,
  situacao              situacao_encontro not null default 'rascunho',
  motivo_cancelamento   text,
  coordenador_inscricao_id uuid,
  texto_divulgacao      text,
  imagem_capa_url       text,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),

  constraint encontro_numero_unico_por_central unique (central_id, numero),
  constraint encontro_slug_unico_por_central   unique (central_id, slug),
  constraint encontro_datas_coerentes          check (data_fim >= data_inicio),
  constraint encontro_janela_coerente          check (inscricoes_fecham_em > inscricoes_abrem_em)
);
--> statement-breakpoint

-- §4.3 inscricao
create table inscricao (
  id                    uuid primary key,
  inquilino_id          uuid not null references inquilino(id),
  central_id            uuid not null references central(id),
  encontro_id           uuid not null references encontro(id),
  pessoa_id             uuid not null references pessoa(id),
  tipo                  tipo_inscricao not null,
  situacao              situacao_inscricao not null,
  convidador_pessoa_id  uuid references pessoa(id),
  convidador_nome       text,
  area_pretendida       text,
  valor_devido          numeric(10,2) not null check (valor_devido >= 0),
  taxa_plataforma_repassada  boolean not null default false,
  taxa_plataforma_percentual numeric(5,3) not null default 0,
  reembolso_faixas      jsonb not null,
  campos_extras         jsonb not null default '[]',
  token_consulta        text not null unique,
  posicao_espera        integer,
  espera_promovida_em   timestamptz,
  espera_expira_em      timestamptz,
  cancelada_em          timestamptz,
  motivo_cancelamento   text,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),

  constraint inscricao_espera_coerente check (
    (situacao = 'lista_espera') = (posicao_espera is not null)
  )
);
--> statement-breakpoint

-- RN-031: uma inscrição ativa por pessoa por encontro
create unique index inscricao_ativa_unica
  on inscricao (encontro_id, pessoa_id)
  where situacao <> 'cancelada';
--> statement-breakpoint

-- fila estável da lista de espera
create unique index inscricao_posicao_espera_unica
  on inscricao (encontro_id, tipo, posicao_espera)
  where situacao = 'lista_espera';
--> statement-breakpoint

create index on inscricao (encontro_id, situacao, tipo);
--> statement-breakpoint

create index on inscricao (inquilino_id, criado_em desc);
--> statement-breakpoint

-- fecha a referência circular encontro <-> inscricao
alter table encontro
  add constraint encontro_coordenador_inscricao_fk
  foreign key (coordenador_inscricao_id) references inscricao(id);
--> statement-breakpoint

-- §3.5 consentimento (depende de inscricao e termo, por isso vem depois dos dois)
create table consentimento (
  id            uuid primary key,
  inquilino_id  uuid not null references inquilino(id),
  pessoa_id     uuid not null references pessoa(id),
  inscricao_id  uuid references inscricao(id),
  termo_id      uuid not null references termo(id),
  versao_termo  text not null,
  finalidades   text[] not null,
  aceito_em     timestamptz not null,
  ip            inet not null,
  user_agent    text,
  origem        text not null,
  revogado_em   timestamptz,
  revogado_motivo text
);
--> statement-breakpoint

-- §4.4 cobranca
create table cobranca (
  id                     uuid primary key,
  inquilino_id           uuid not null references inquilino(id),
  central_id             uuid not null references central(id),
  inscricao_id           uuid not null references inscricao(id),
  conexao_gateway_id     uuid references conexao_gateway(id),
  metodo                 metodo_pagamento not null,
  parcelas               smallint not null default 1 check (parcelas between 1 and 12),

  valor                  numeric(10,2) not null check (valor > 0),
  taxa_plataforma        numeric(10,2) not null default 0 check (taxa_plataforma >= 0),
  taxa_plataforma_percentual numeric(5,3) not null default 0,
  valor_liquido          numeric(10,2),
  situacao               situacao_cobranca not null default 'criada',

  gateway                text not null default 'mercadopago',
  gateway_pagamento_id   text,
  idempotency_key        uuid not null,

  pix_qr_code            text,
  pix_qr_code_base64     text,
  link_pagamento         text,

  expira_em              timestamptz,
  pago_em                timestamptz,
  atualizado_em_gateway  timestamptz,
  motivo_recusa          text,

  baixa_manual_por         uuid,
  baixa_manual_em          timestamptz,
  baixa_manual_observacao  text,

  estorno_situacao        text not null default 'nao_solicitado',
  estorno_valor            numeric(10,2) not null default 0 check (estorno_valor >= 0),
  estorno_atualizado_em    timestamptz,
  estorno_tarifa_gateway   numeric(10,2) not null default 0 check (estorno_tarifa_gateway >= 0),
  taxa_estornada           numeric(10,2) not null default 0 check (taxa_estornada >= 0),

  contestacao_situacao      text not null default 'nenhuma',
  contestacao_valor         numeric(10,2),
  contestacao_atualizada_em timestamptz,

  devolucao_presencial_por         uuid,
  devolucao_presencial_em          timestamptz,
  devolucao_presencial_valor       numeric(10,2),
  devolucao_presencial_observacao  text,

  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),

  constraint cobranca_gateway_id_unico   unique (gateway, gateway_pagamento_id),
  constraint cobranca_idempotency_unica  unique (idempotency_key),
  constraint cobranca_estorno_ate_o_valor check (estorno_valor <= valor),
  constraint cobranca_taxa_ate_o_valor    check (taxa_plataforma <= valor),
  constraint cobranca_parcelas_so_cartao  check (
    metodo = 'cartao_credito' or parcelas = 1
  )
);
--> statement-breakpoint

create unique index cobranca_viva_unica
  on cobranca (inscricao_id)
  where situacao in ('pendente_emissao', 'criada', 'aguardando_pagamento', 'em_analise');
--> statement-breakpoint

create index on cobranca (situacao, expira_em)
  where situacao = 'aguardando_pagamento';
--> statement-breakpoint

create index on cobranca (inquilino_id, pago_em)
  where situacao = 'paga';
--> statement-breakpoint

-- §4.5 webhook_evento
create table webhook_evento (
  id                  uuid primary key,
  inquilino_id        uuid references inquilino(id),
  gateway             text not null default 'mercadopago',
  notificacao_id      text not null,
  tipo                text not null,
  acao                text,
  recurso_id          text not null,
  assinatura_valida   boolean not null,
  corpo_bruto         jsonb not null,
  cabecalhos          jsonb not null,
  recebido_em         timestamptz not null default now(),
  processado_em       timestamptz,
  resultado           text,
  erro                text,
  tentativas          smallint not null default 0,

  constraint webhook_evento_unico unique (gateway, notificacao_id)
);
--> statement-breakpoint

create index on webhook_evento (recurso_id, recebido_em desc);
--> statement-breakpoint

create index on webhook_evento (processado_em) where processado_em is null;
--> statement-breakpoint

-- §4.8 usuario (antes de notificacao, que referencia usuario)
create table usuario (
  id                 uuid primary key,
  inquilino_id       uuid references inquilino(id),
  central_id         uuid references central(id),
  pessoa_id          uuid references pessoa(id),
  email              text not null,
  papel              papel_usuario not null,
  situacao           text not null default 'convidada',
  convite_token_hash text,
  convite_expira_em  timestamptz,
  criada_por         uuid,
  criada_em          timestamptz not null default now(),
  ativada_em         timestamptz,
  ultimo_acesso_em   timestamptz,
  revogada_por       uuid,
  revogada_em        timestamptz,
  motivo_revogacao   text,

  constraint usuario_unico unique (inquilino_id, email),
  constraint usuario_operador_sem_inquilino check (
    (papel = 'operador') = (inquilino_id is null)
  ),
  constraint usuario_denominacao_sem_central check (
    papel <> 'admin_denominacao' or central_id is null
  ),
  constraint usuario_servo_com_pessoa check (
    papel <> 'servo' or pessoa_id is not null
  )
);
--> statement-breakpoint

-- §4.6 notificacao
create table notificacao (
  id            uuid primary key,
  inquilino_id  uuid not null references inquilino(id),
  central_id    uuid references central(id),
  inscricao_id  uuid references inscricao(id),
  pessoa_id     uuid references pessoa(id),
  usuario_id    uuid references usuario(id),
  gatilho       text not null,
  canal         text not null,
  destinatario  text not null,
  chave_unica   text not null,
  situacao      text not null default 'pendente',
  tentativas    smallint not null default 0,
  enviada_em    timestamptz,
  erro          text,
  criado_em     timestamptz not null default now(),

  constraint notificacao_chave_unica unique (chave_unica)
);
--> statement-breakpoint

-- §4.7 auditoria
create table auditoria (
  id               uuid primary key,
  inquilino_id     uuid,
  central_id       uuid,
  entidade         text not null,
  entidade_id      uuid not null,
  acao             text not null,
  ator_tipo        text not null,
  ator_id          uuid,
  ator_descricao   text,
  motivo           text,
  antes            jsonb,
  depois           jsonb,
  ip               inet,
  user_agent       text,
  criado_em        timestamptz not null default now()
);
--> statement-breakpoint

create index on auditoria (entidade, entidade_id, criado_em desc);
--> statement-breakpoint

create index on auditoria (inquilino_id, criado_em desc);
--> statement-breakpoint

create index on auditoria (ator_tipo, criado_em desc) where ator_tipo = 'operador';
