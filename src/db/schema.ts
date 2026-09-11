// GERADO por `pnpm db:pull` a partir do schema "dev" — não editar à mão.
// Fonte real: migrations/*.sql. Rode `pnpm db:pull` de novo depois de toda migration nova.

import { bigint, boolean, char, check, date, foreignKey, index, inet, integer, jsonb, numeric, pgEnum, pgPolicy, pgTable, serial, smallint, text, timestamp, type AnyPgColumn, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { customType } from "drizzle-orm/pg-core"

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })

export const metodoPagamento = pgEnum("metodo_pagamento", ['pix', 'cartao_credito', 'dinheiro', 'pix_presencial'])
export const papelUsuario = pgEnum("papel_usuario", ['servo', 'admin_central', 'admin_denominacao', 'operador'])
export const situacaoCobranca = pgEnum("situacao_cobranca", ['pendente_emissao', 'criada', 'aguardando_pagamento', 'em_analise', 'paga', 'recusada', 'expirada', 'cancelada', 'estornada_parcial', 'estornada'])
export const situacaoEncontro = pgEnum("situacao_encontro", ['rascunho', 'publicado', 'inscricoes_encerradas', 'em_andamento', 'encerrado', 'cancelado'])
export const situacaoInquilino = pgEnum("situacao_inquilino", ['em_implantacao', 'ativo', 'suspenso', 'encerrado'])
export const situacaoInscricao = pgEnum("situacao_inscricao", ['lista_espera', 'pendente_pagamento', 'confirmada', 'presente', 'ausente', 'cancelada'])
export const tipoInscricao = pgEnum("tipo_inscricao", ['participante', 'servo'])


export const pessoaDadoSensivel = pgTable("pessoa_dado_sensivel", {
	pessoaId: uuid("pessoa_id").primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	restricaoAlimentar: text("restricao_alimentar"),
	condicaoSaude: text("condicao_saude"),
	medicamentosUsoContinuo: text("medicamentos_uso_continuo"),
	religiaoDeclarada: text("religiao_declarada"),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "pessoa_dado_sensivel_inquilino_id_fkey"
		}),
	foreignKey({
			columns: [table.pessoaId],
			foreignColumns: [pessoa.id],
			name: "pessoa_dado_sensivel_pessoa_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("pessoa_dado_sensivel_central", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("pessoa_dado_sensivel_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
	pgPolicy("pessoa_dado_sensivel_sem_operador", { as: "restrictive", for: "all", to: ["public"] }),
]);

export const pessoa = pgTable("pessoa", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	identidadeId: uuid("identidade_id"),
	centralOrigemId: uuid("central_origem_id"),
	nomeCompleto: text("nome_completo").notNull(),
	nomeCracha: text("nome_cracha").notNull(),
	dataNascimento: date("data_nascimento").notNull(),
	telefone: text().notNull(),
	email: text().notNull(),
	cep: char({ length: 8 }),
	logradouro: text(),
	numero: text(),
	complemento: text(),
	bairro: text(),
	cidade: text(),
	uf: char({ length: 2 }),
	estadoCivil: text("estado_civil"),
	contatoEmergenciaNome: text("contato_emergencia_nome").notNull(),
	contatoEmergenciaFone: text("contato_emergencia_fone").notNull(),
	observacoes: text(),
	anonimizadaEm: timestamp("anonimizada_em", { withTimezone: true, mode: 'string' }),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("pessoa_inquilino_id_nome_completo_idx").using("btree", table.inquilinoId.asc().nullsLast().op("text_ops"), table.nomeCompleto.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.centralOrigemId],
			foreignColumns: [central.id],
			name: "pessoa_central_origem_id_fkey"
		}),
	foreignKey({
			columns: [table.identidadeId],
			foreignColumns: [identidade.id],
			name: "pessoa_identidade_id_fkey"
		}),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "pessoa_inquilino_id_fkey"
		}),
	unique("pessoa_unica_por_inquilino").on(table.inquilinoId, table.identidadeId),
	pgPolicy("pessoa_central", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("pessoa_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
]);

export const identidade = pgTable("identidade", {
	id: uuid().primaryKey().notNull(),
	cpf: char({ length: 11 }).notNull(),
	cpfHash: bytea("cpf_hash").notNull(),
	nomeCompleto: text("nome_completo").notNull(),
	dataNascimento: date("data_nascimento").notNull(),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("identidade_cpf_hash_idx").using("btree", table.cpfHash.asc().nullsLast().op("bytea_ops")),
	unique("identidade_cpf_key").on(table.cpf),
]);

export const acessoSuporte = pgTable("acesso_suporte", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	operadorId: uuid("operador_id").notNull(),
	concedidoPor: uuid("concedido_por").notNull(),
	motivo: text().notNull(),
	expiraEm: timestamp("expira_em", { withTimezone: true, mode: 'string' }).notNull(),
	revogadoEm: timestamp("revogado_em", { withTimezone: true, mode: 'string' }),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "acesso_suporte_inquilino_id_fkey"
		}),
	pgPolicy("acesso_suporte_central", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("acesso_suporte_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
	check("acesso_suporte_prazo_maximo", sql`expira_em <= (criado_em + '24:00:00'::interval)`),
]);

export const central = pgTable("central", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	nome: text().notNull(),
	cidade: text().notNull(),
	uf: char({ length: 2 }).notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url"),
	emailContato: text("email_contato"),
	telefoneContato: text("telefone_contato"),
	ativa: boolean().default(true).notNull(),
	parcelaMinima: numeric("parcela_minima", { precision: 10, scale:  2 }).default('50.00').notNull(),
	maxParcelas: smallint("max_parcelas").default(12).notNull(),
	reembolsoFaixas: jsonb("reembolso_faixas").default([{"percentual":100,"antecedencia_minima_dias":16},{"percentual":50,"antecedencia_minima_dias":7},{"percentual":0,"antecedencia_minima_dias":0}]).notNull(),
	despesaExigeComprovanteAcimaDe: numeric("despesa_exige_comprovante_acima_de", { precision: 10, scale:  2 }).default('0.00').notNull(),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "central_inquilino_id_fkey"
		}),
	unique("central_slug_unico_por_inquilino").on(table.inquilinoId, table.slug),
	pgPolicy("central_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (id = app_central_id()))`  }),
	pgPolicy("central_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
	check("central_max_parcelas_check", sql`(max_parcelas >= 1) AND (max_parcelas <= 12)`),
]);

export const migracoes = pgTable("_migracoes", {
	id: serial().primaryKey().notNull(),
	hash: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	criadoEm: bigint("criado_em", { mode: "number" }).notNull(),
	aplicadoEm: timestamp("aplicado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("_migracoes_hash_key").on(table.hash),
]);

export const conexaoGateway = pgTable("conexao_gateway", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	centralId: uuid("central_id"),
	gateway: text().default('mercadopago').notNull(),
	contaExternaId: text("conta_externa_id").notNull(),
	accessTokenRef: text("access_token_ref").notNull(),
	refreshTokenRef: text("refresh_token_ref").notNull(),
	expiraEm: timestamp("expira_em", { withTimezone: true, mode: 'string' }).notNull(),
	escopos: text().array(),
	ativa: boolean().default(true).notNull(),
	ultimoRefreshEm: timestamp("ultimo_refresh_em", { withTimezone: true, mode: 'string' }),
	falhasRefresh: smallint("falhas_refresh").default(0).notNull(),
	conectadaPor: uuid("conectada_por").notNull(),
	conectadaEm: timestamp("conectada_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	desativadaEm: timestamp("desativada_em", { withTimezone: true, mode: 'string' }),
	motivoDesativacao: text("motivo_desativacao"),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.centralId],
			foreignColumns: [central.id],
			name: "conexao_gateway_central_id_fkey"
		}),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "conexao_gateway_inquilino_id_fkey"
		}),
	unique("conexao_gateway_unica").on(table.inquilinoId, table.centralId, table.gateway),
	pgPolicy("conexao_gateway_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`  }),
	pgPolicy("conexao_gateway_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
]);

export const inquilino = pgTable("inquilino", {
	id: uuid().primaryKey().notNull(),
	nome: text().notNull(),
	slug: text().notNull(),
	situacao: situacaoInquilino().default('em_implantacao').notNull(),
	logoUrl: text("logo_url"),
	logoHorizontalUrl: text("logo_horizontal_url"),
	faviconUrl: text("favicon_url"),
	corPrimaria: text("cor_primaria").default('#1f2937').notNull(),
	corSecundaria: text("cor_secundaria").default('#6b7280').notNull(),
	corTextoSobrePrimaria: text("cor_texto_sobre_primaria").default('#ffffff').notNull(),
	rotulos: jsonb().default({}).notNull(),
	areasPadrao: jsonb("areas_padrao").default([]).notNull(),
	taxaPlataformaPercentual: numeric("taxa_plataforma_percentual", { precision: 5, scale:  3 }).default('0').notNull(),
	taxaRepassadaAoInscrito: boolean("taxa_repassada_ao_inscrito").default(false).notNull(),
	contratoVersao: text("contrato_versao"),
	contratoAceitoEm: timestamp("contrato_aceito_em", { withTimezone: true, mode: 'string' }),
	contratoAceitoPor: uuid("contrato_aceito_por"),
	contratoAceitoIp: inet("contrato_aceito_ip"),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("inquilino_slug_key").on(table.slug),
	pgPolicy("inquilino_base", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("inquilino_visibilidade", { as: "restrictive", for: "all", to: ["public"] }),
	check("inquilino_ativo_tem_contrato", sql`(situacao = 'em_implantacao'::situacao_inquilino) OR (contrato_aceito_em IS NOT NULL)`),
	check("inquilino_slug_formato", sql`slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text`),
	check("inquilino_taxa_plataforma_percentual_check", sql`(taxa_plataforma_percentual >= (0)::numeric) AND (taxa_plataforma_percentual <= (100)::numeric)`),
]);

export const inquilinoDominio = pgTable("inquilino_dominio", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	dominio: text().notNull(),
	tipo: text().notNull(),
	verificado: boolean().default(false).notNull(),
	tokenVerificacao: text("token_verificacao"),
	verificadoEm: timestamp("verificado_em", { withTimezone: true, mode: 'string' }),
	principal: boolean().default(false).notNull(),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("inquilino_dominio_principal_unico").using("btree", table.inquilinoId.asc().nullsLast().op("uuid_ops")).where(sql`principal`),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "inquilino_dominio_inquilino_id_fkey"
		}),
	unique("inquilino_dominio_dominio_key").on(table.dominio),
	pgPolicy("inquilino_dominio_atualizacao_do_proprio_inquilino", { as: "restrictive", for: "update", to: ["public"], using: sql`(inquilino_id = app_inquilino_id())`, withCheck: sql`(inquilino_id = app_inquilino_id())`  }),
	pgPolicy("inquilino_dominio_escrita_liberada", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("inquilino_dominio_escrita_liberada_del", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("inquilino_dominio_escrita_liberada_upd", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("inquilino_dominio_exclusao_do_proprio_inquilino", { as: "restrictive", for: "delete", to: ["public"] }),
	pgPolicy("inquilino_dominio_insercao_do_proprio_inquilino", { as: "restrictive", for: "insert", to: ["public"] }),
	pgPolicy("inquilino_dominio_leitura_publica", { as: "permissive", for: "select", to: ["public"] }),
]);

export const encontro = pgTable("encontro", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	centralId: uuid("central_id").notNull(),
	numero: integer().notNull(),
	titulo: text().notNull(),
	slug: text().notNull(),
	dataInicio: date("data_inicio").notNull(),
	dataFim: date("data_fim").notNull(),
	localNome: text("local_nome").notNull(),
	localEndereco: text("local_endereco").notNull(),
	localCidade: text("local_cidade").notNull(),
	localUf: char("local_uf", { length: 2 }).notNull(),
	vagasParticipantes: smallint("vagas_participantes").notNull(),
	vagasServos: smallint("vagas_servos").notNull(),
	taxaParticipante: numeric("taxa_participante", { precision: 10, scale:  2 }).notNull(),
	taxaServo: numeric("taxa_servo", { precision: 10, scale:  2 }).notNull(),
	inscricoesAbremEm: timestamp("inscricoes_abrem_em", { withTimezone: true, mode: 'string' }).notNull(),
	inscricoesFechamEm: timestamp("inscricoes_fecham_em", { withTimezone: true, mode: 'string' }).notNull(),
	situacao: situacaoEncontro().default('rascunho').notNull(),
	motivoCancelamento: text("motivo_cancelamento"),
	coordenadorInscricaoId: uuid("coordenador_inscricao_id")
		.references((): AnyPgColumn => inscricao.id),
	textoDivulgacao: text("texto_divulgacao"),
	imagemCapaUrl: text("imagem_capa_url"),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.centralId],
			foreignColumns: [central.id],
			name: "encontro_central_id_fkey"
		}),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "encontro_inquilino_id_fkey"
		}),
	unique("encontro_numero_unico_por_central").on(table.centralId, table.numero),
	unique("encontro_slug_unico_por_central").on(table.centralId, table.slug),
	pgPolicy("encontro_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id = app_central_id()))`  }),
	pgPolicy("encontro_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
	check("encontro_datas_coerentes", sql`data_fim >= data_inicio`),
	check("encontro_janela_coerente", sql`inscricoes_fecham_em > inscricoes_abrem_em`),
	check("encontro_taxa_participante_check", sql`taxa_participante >= (0)::numeric`),
	check("encontro_taxa_servo_check", sql`taxa_servo >= (0)::numeric`),
	check("encontro_vagas_participantes_check", sql`vagas_participantes > 0`),
	check("encontro_vagas_servos_check", sql`vagas_servos > 0`),
]);

export const inscricao = pgTable("inscricao", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	centralId: uuid("central_id").notNull(),
	encontroId: uuid("encontro_id").notNull(),
	pessoaId: uuid("pessoa_id").notNull(),
	tipo: tipoInscricao().notNull(),
	situacao: situacaoInscricao().notNull(),
	convidadorPessoaId: uuid("convidador_pessoa_id"),
	convidadorNome: text("convidador_nome"),
	areaPretendida: text("area_pretendida"),
	valorDevido: numeric("valor_devido", { precision: 10, scale:  2 }).notNull(),
	taxaPlataformaRepassada: boolean("taxa_plataforma_repassada").default(false).notNull(),
	taxaPlataformaPercentual: numeric("taxa_plataforma_percentual", { precision: 5, scale:  3 }).default('0').notNull(),
	reembolsoFaixas: jsonb("reembolso_faixas").notNull(),
	camposExtras: jsonb("campos_extras").default([]).notNull(),
	tokenConsulta: text("token_consulta").notNull(),
	posicaoEspera: integer("posicao_espera"),
	esperaPromovidaEm: timestamp("espera_promovida_em", { withTimezone: true, mode: 'string' }),
	esperaExpiraEm: timestamp("espera_expira_em", { withTimezone: true, mode: 'string' }),
	canceladaEm: timestamp("cancelada_em", { withTimezone: true, mode: 'string' }),
	motivoCancelamento: text("motivo_cancelamento"),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("inscricao_ativa_unica").using("btree", table.encontroId.asc().nullsLast().op("uuid_ops"), table.pessoaId.asc().nullsLast().op("uuid_ops")).where(sql`(situacao <> 'cancelada'::situacao_inscricao)`),
	index("inscricao_encontro_id_situacao_tipo_idx").using("btree", table.encontroId.asc().nullsLast().op("uuid_ops"), table.situacao.asc().nullsLast().op("uuid_ops"), table.tipo.asc().nullsLast().op("enum_ops")),
	index("inscricao_inquilino_id_criado_em_idx").using("btree", table.inquilinoId.asc().nullsLast().op("uuid_ops"), table.criadoEm.desc().nullsFirst().op("uuid_ops")),
	uniqueIndex("inscricao_posicao_espera_unica").using("btree", table.encontroId.asc().nullsLast().op("enum_ops"), table.tipo.asc().nullsLast().op("enum_ops"), table.posicaoEspera.asc().nullsLast().op("enum_ops")).where(sql`(situacao = 'lista_espera'::situacao_inscricao)`),
	foreignKey({
			columns: [table.centralId],
			foreignColumns: [central.id],
			name: "inscricao_central_id_fkey"
		}),
	foreignKey({
			columns: [table.convidadorPessoaId],
			foreignColumns: [pessoa.id],
			name: "inscricao_convidador_pessoa_id_fkey"
		}),
	foreignKey({
			columns: [table.encontroId],
			foreignColumns: [encontro.id],
			name: "inscricao_encontro_id_fkey"
		}),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "inscricao_inquilino_id_fkey"
		}),
	foreignKey({
			columns: [table.pessoaId],
			foreignColumns: [pessoa.id],
			name: "inscricao_pessoa_id_fkey"
		}),
	unique("inscricao_token_consulta_key").on(table.tokenConsulta),
	pgPolicy("inscricao_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id = app_central_id()))`  }),
	pgPolicy("inscricao_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
	check("inscricao_espera_coerente", sql`(situacao = 'lista_espera'::situacao_inscricao) = (posicao_espera IS NOT NULL)`),
	check("inscricao_valor_devido_check", sql`valor_devido >= (0)::numeric`),
]);

export const cobranca = pgTable("cobranca", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	centralId: uuid("central_id").notNull(),
	inscricaoId: uuid("inscricao_id").notNull(),
	conexaoGatewayId: uuid("conexao_gateway_id"),
	metodo: metodoPagamento().notNull(),
	parcelas: smallint().default(1).notNull(),
	valor: numeric({ precision: 10, scale:  2 }).notNull(),
	taxaPlataforma: numeric("taxa_plataforma", { precision: 10, scale:  2 }).default('0').notNull(),
	taxaPlataformaPercentual: numeric("taxa_plataforma_percentual", { precision: 5, scale:  3 }).default('0').notNull(),
	valorLiquido: numeric("valor_liquido", { precision: 10, scale:  2 }),
	situacao: situacaoCobranca().default('criada').notNull(),
	gateway: text().default('mercadopago').notNull(),
	gatewayPagamentoId: text("gateway_pagamento_id"),
	idempotencyKey: uuid("idempotency_key").notNull(),
	pixQrCode: text("pix_qr_code"),
	pixQrCodeBase64: text("pix_qr_code_base64"),
	linkPagamento: text("link_pagamento"),
	expiraEm: timestamp("expira_em", { withTimezone: true, mode: 'string' }),
	pagoEm: timestamp("pago_em", { withTimezone: true, mode: 'string' }),
	atualizadoEmGateway: timestamp("atualizado_em_gateway", { withTimezone: true, mode: 'string' }),
	motivoRecusa: text("motivo_recusa"),
	baixaManualPor: uuid("baixa_manual_por"),
	baixaManualEm: timestamp("baixa_manual_em", { withTimezone: true, mode: 'string' }),
	baixaManualObservacao: text("baixa_manual_observacao"),
	estornoSituacao: text("estorno_situacao").default('nao_solicitado').notNull(),
	estornoValor: numeric("estorno_valor", { precision: 10, scale:  2 }).default('0').notNull(),
	estornoAtualizadoEm: timestamp("estorno_atualizado_em", { withTimezone: true, mode: 'string' }),
	estornoTarifaGateway: numeric("estorno_tarifa_gateway", { precision: 10, scale:  2 }).default('0').notNull(),
	taxaEstornada: numeric("taxa_estornada", { precision: 10, scale:  2 }).default('0').notNull(),
	contestacaoSituacao: text("contestacao_situacao").default('nenhuma').notNull(),
	contestacaoValor: numeric("contestacao_valor", { precision: 10, scale:  2 }),
	contestacaoAtualizadaEm: timestamp("contestacao_atualizada_em", { withTimezone: true, mode: 'string' }),
	devolucaoPresencialPor: uuid("devolucao_presencial_por"),
	devolucaoPresencialEm: timestamp("devolucao_presencial_em", { withTimezone: true, mode: 'string' }),
	devolucaoPresencialValor: numeric("devolucao_presencial_valor", { precision: 10, scale:  2 }),
	devolucaoPresencialObservacao: text("devolucao_presencial_observacao"),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atualizadoEm: timestamp("atualizado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("cobranca_inquilino_id_pago_em_idx").using("btree", table.inquilinoId.asc().nullsLast().op("timestamptz_ops"), table.pagoEm.asc().nullsLast().op("uuid_ops")).where(sql`(situacao = 'paga'::situacao_cobranca)`),
	index("cobranca_situacao_expira_em_idx").using("btree", table.situacao.asc().nullsLast().op("enum_ops"), table.expiraEm.asc().nullsLast().op("enum_ops")).where(sql`(situacao = 'aguardando_pagamento'::situacao_cobranca)`),
	uniqueIndex("cobranca_viva_unica").using("btree", table.inscricaoId.asc().nullsLast().op("uuid_ops")).where(sql`(situacao = ANY (ARRAY['pendente_emissao'::situacao_cobranca, 'criada'::situacao_cobranca, 'aguardando_pagamento'::situacao_cobranca, 'em_analise'::situacao_cobranca]))`),
	foreignKey({
			columns: [table.centralId],
			foreignColumns: [central.id],
			name: "cobranca_central_id_fkey"
		}),
	foreignKey({
			columns: [table.conexaoGatewayId],
			foreignColumns: [conexaoGateway.id],
			name: "cobranca_conexao_gateway_id_fkey"
		}),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "cobranca_inquilino_id_fkey"
		}),
	foreignKey({
			columns: [table.inscricaoId],
			foreignColumns: [inscricao.id],
			name: "cobranca_inscricao_id_fkey"
		}),
	unique("cobranca_gateway_id_unico").on(table.gateway, table.gatewayPagamentoId),
	unique("cobranca_idempotency_unica").on(table.idempotencyKey),
	pgPolicy("cobranca_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id = app_central_id()))`  }),
	pgPolicy("cobranca_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
	check("cobranca_estorno_ate_o_valor", sql`estorno_valor <= valor`),
	check("cobranca_estorno_tarifa_gateway_check", sql`estorno_tarifa_gateway >= (0)::numeric`),
	check("cobranca_estorno_valor_check", sql`estorno_valor >= (0)::numeric`),
	check("cobranca_parcelas_check", sql`(parcelas >= 1) AND (parcelas <= 12)`),
	check("cobranca_parcelas_so_cartao", sql`(metodo = 'cartao_credito'::metodo_pagamento) OR (parcelas = 1)`),
	check("cobranca_taxa_ate_o_valor", sql`taxa_plataforma <= valor`),
	check("cobranca_taxa_estornada_check", sql`taxa_estornada >= (0)::numeric`),
	check("cobranca_taxa_plataforma_check", sql`taxa_plataforma >= (0)::numeric`),
	check("cobranca_valor_check", sql`valor > (0)::numeric`),
]);

export const termo = pgTable("termo", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	versao: text().notNull(),
	titulo: text().notNull(),
	corpo: text().notNull(),
	finalidades: text().array().notNull(),
	controladorNome: text("controlador_nome").notNull(),
	controladorDocumento: text("controlador_documento").notNull(),
	encarregadoNome: text("encarregado_nome").notNull(),
	encarregadoContato: text("encarregado_contato").notNull(),
	situacao: text().default('rascunho').notNull(),
	publicadoPor: uuid("publicado_por"),
	publicadoEm: timestamp("publicado_em", { withTimezone: true, mode: 'string' }),
	substituidaEm: timestamp("substituida_em", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("termo_vigente_unico").using("btree", table.inquilinoId.asc().nullsLast().op("uuid_ops")).where(sql`(situacao = 'vigente'::text)`),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "termo_inquilino_id_fkey"
		}),
	pgPolicy("termo_central", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("termo_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
]);

export const consentimento = pgTable("consentimento", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	pessoaId: uuid("pessoa_id").notNull(),
	inscricaoId: uuid("inscricao_id"),
	termoId: uuid("termo_id").notNull(),
	versaoTermo: text("versao_termo").notNull(),
	finalidades: text().array().notNull(),
	aceitoEm: timestamp("aceito_em", { withTimezone: true, mode: 'string' }).notNull(),
	ip: inet().notNull(),
	userAgent: text("user_agent"),
	origem: text().notNull(),
	revogadoEm: timestamp("revogado_em", { withTimezone: true, mode: 'string' }),
	revogadoMotivo: text("revogado_motivo"),
}, (table) => [
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "consentimento_inquilino_id_fkey"
		}),
	foreignKey({
			columns: [table.inscricaoId],
			foreignColumns: [inscricao.id],
			name: "consentimento_inscricao_id_fkey"
		}),
	foreignKey({
			columns: [table.pessoaId],
			foreignColumns: [pessoa.id],
			name: "consentimento_pessoa_id_fkey"
		}),
	foreignKey({
			columns: [table.termoId],
			foreignColumns: [termo.id],
			name: "consentimento_termo_id_fkey"
		}),
	pgPolicy("consentimento_central", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("consentimento_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
]);

export const webhookEvento = pgTable("webhook_evento", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id"),
	gateway: text().default('mercadopago').notNull(),
	notificacaoId: text("notificacao_id").notNull(),
	tipo: text().notNull(),
	acao: text(),
	recursoId: text("recurso_id").notNull(),
	assinaturaValida: boolean("assinatura_valida").notNull(),
	corpoBruto: jsonb("corpo_bruto").notNull(),
	cabecalhos: jsonb().notNull(),
	recebidoEm: timestamp("recebido_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processadoEm: timestamp("processado_em", { withTimezone: true, mode: 'string' }),
	resultado: text(),
	erro: text(),
	tentativas: smallint().default(0).notNull(),
}, (table) => [
	index("webhook_evento_processado_em_idx").using("btree", table.processadoEm.asc().nullsLast().op("timestamptz_ops")).where(sql`(processado_em IS NULL)`),
	index("webhook_evento_recurso_id_recebido_em_idx").using("btree", table.recursoId.asc().nullsLast().op("text_ops"), table.recebidoEm.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "webhook_evento_inquilino_id_fkey"
		}),
	unique("webhook_evento_unico").on(table.gateway, table.notificacaoId),
]);

export const notificacao = pgTable("notificacao", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id").notNull(),
	centralId: uuid("central_id"),
	inscricaoId: uuid("inscricao_id"),
	pessoaId: uuid("pessoa_id"),
	usuarioId: uuid("usuario_id"),
	gatilho: text().notNull(),
	canal: text().notNull(),
	destinatario: text().notNull(),
	chaveUnica: text("chave_unica").notNull(),
	situacao: text().default('pendente').notNull(),
	tentativas: smallint().default(0).notNull(),
	enviadaEm: timestamp("enviada_em", { withTimezone: true, mode: 'string' }),
	erro: text(),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.centralId],
			foreignColumns: [central.id],
			name: "notificacao_central_id_fkey"
		}),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "notificacao_inquilino_id_fkey"
		}),
	foreignKey({
			columns: [table.inscricaoId],
			foreignColumns: [inscricao.id],
			name: "notificacao_inscricao_id_fkey"
		}),
	foreignKey({
			columns: [table.pessoaId],
			foreignColumns: [pessoa.id],
			name: "notificacao_pessoa_id_fkey"
		}),
	foreignKey({
			columns: [table.usuarioId],
			foreignColumns: [usuario.id],
			name: "notificacao_usuario_id_fkey"
		}),
	unique("notificacao_chave_unica").on(table.chaveUnica),
	pgPolicy("notificacao_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`  }),
	pgPolicy("notificacao_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
]);

export const usuario = pgTable("usuario", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id"),
	centralId: uuid("central_id"),
	pessoaId: uuid("pessoa_id"),
	email: text().notNull(),
	papel: papelUsuario().notNull(),
	situacao: text().default('convidada').notNull(),
	conviteTokenHash: text("convite_token_hash"),
	conviteExpiraEm: timestamp("convite_expira_em", { withTimezone: true, mode: 'string' }),
	criadaPor: uuid("criada_por"),
	criadaEm: timestamp("criada_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ativadaEm: timestamp("ativada_em", { withTimezone: true, mode: 'string' }),
	ultimoAcessoEm: timestamp("ultimo_acesso_em", { withTimezone: true, mode: 'string' }),
	revogadaPor: uuid("revogada_por"),
	revogadaEm: timestamp("revogada_em", { withTimezone: true, mode: 'string' }),
	motivoRevogacao: text("motivo_revogacao"),
}, (table) => [
	uniqueIndex("usuario_operador_unico").using("btree", sql`lower(email)`).where(sql`(papel = 'operador'::papel_usuario)`),
	uniqueIndex("usuario_unico").using("btree", sql`inquilino_id`, sql`lower(email)`),
	foreignKey({
			columns: [table.centralId],
			foreignColumns: [central.id],
			name: "usuario_central_id_fkey"
		}),
	foreignKey({
			columns: [table.inquilinoId],
			foreignColumns: [inquilino.id],
			name: "usuario_inquilino_id_fkey"
		}),
	foreignKey({
			columns: [table.pessoaId],
			foreignColumns: [pessoa.id],
			name: "usuario_pessoa_id_fkey"
		}),
	pgPolicy("usuario_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`  }),
	pgPolicy("usuario_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
	check("usuario_denominacao_sem_central", sql`(papel <> 'admin_denominacao'::papel_usuario) OR (central_id IS NULL)`),
	check("usuario_operador_sem_inquilino", sql`(papel = 'operador'::papel_usuario) = (inquilino_id IS NULL)`),
	check("usuario_servo_com_pessoa", sql`(papel <> 'servo'::papel_usuario) OR (pessoa_id IS NOT NULL)`),
	check("usuario_situacao_valida", sql`situacao = ANY (ARRAY['convidada'::text, 'ativa'::text, 'suspensa'::text, 'revogada'::text])`),
]);

export const auditoria = pgTable("auditoria", {
	id: uuid().primaryKey().notNull(),
	inquilinoId: uuid("inquilino_id"),
	centralId: uuid("central_id"),
	entidade: text().notNull(),
	entidadeId: uuid("entidade_id").notNull(),
	acao: text().notNull(),
	atorTipo: text("ator_tipo").notNull(),
	atorId: uuid("ator_id"),
	atorDescricao: text("ator_descricao"),
	motivo: text(),
	antes: jsonb(),
	depois: jsonb(),
	ip: inet(),
	userAgent: text("user_agent"),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("auditoria_ator_tipo_criado_em_idx").using("btree", table.atorTipo.asc().nullsLast().op("text_ops"), table.criadoEm.desc().nullsFirst().op("text_ops")).where(sql`(ator_tipo = 'operador'::text)`),
	index("auditoria_entidade_entidade_id_criado_em_idx").using("btree", table.entidade.asc().nullsLast().op("text_ops"), table.entidadeId.asc().nullsLast().op("text_ops"), table.criadoEm.desc().nullsFirst().op("uuid_ops")),
	index("auditoria_inquilino_id_criado_em_idx").using("btree", table.inquilinoId.asc().nullsLast().op("uuid_ops"), table.criadoEm.desc().nullsFirst().op("uuid_ops")),
	pgPolicy("auditoria_central", { as: "permissive", for: "all", to: ["public"], using: sql`((app_papel() = ANY ('{admin_denominacao,operador}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`, withCheck: sql`((app_papel() = ANY ('{admin_denominacao,operador}'::text[])) OR (central_id IS NULL) OR (central_id = app_central_id()))`  }),
	pgPolicy("auditoria_inquilino", { as: "restrictive", for: "all", to: ["public"] }),
]);
