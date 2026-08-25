// GERADO por `pnpm db:pull` a partir do schema "dev" — não editar à mão.
// Fonte real: migrations/*.sql. Rode `pnpm db:pull` de novo depois de toda migration nova.

import { relations } from "drizzle-orm/relations";
import { inquilino, pessoaDadoSensivel, pessoa, central, identidade, acessoSuporte, conexaoGateway, inquilinoDominio, encontro, inscricao, cobranca, termo, consentimento, webhookEvento, notificacao, usuario } from "./schema";

export const pessoaDadoSensivelRelations = relations(pessoaDadoSensivel, ({one}) => ({
	inquilino: one(inquilino, {
		fields: [pessoaDadoSensivel.inquilinoId],
		references: [inquilino.id]
	}),
	pessoa: one(pessoa, {
		fields: [pessoaDadoSensivel.pessoaId],
		references: [pessoa.id]
	}),
}));

export const inquilinoRelations = relations(inquilino, ({many}) => ({
	pessoaDadoSensivels: many(pessoaDadoSensivel),
	pessoas: many(pessoa),
	acessoSuportes: many(acessoSuporte),
	centrals: many(central),
	conexaoGateways: many(conexaoGateway),
	inquilinoDominios: many(inquilinoDominio),
	encontros: many(encontro),
	inscricaos: many(inscricao),
	cobrancas: many(cobranca),
	termos: many(termo),
	consentimentos: many(consentimento),
	webhookEventos: many(webhookEvento),
	notificacaos: many(notificacao),
	usuarios: many(usuario),
}));

export const pessoaRelations = relations(pessoa, ({one, many}) => ({
	pessoaDadoSensivels: many(pessoaDadoSensivel),
	central: one(central, {
		fields: [pessoa.centralOrigemId],
		references: [central.id]
	}),
	identidade: one(identidade, {
		fields: [pessoa.identidadeId],
		references: [identidade.id]
	}),
	inquilino: one(inquilino, {
		fields: [pessoa.inquilinoId],
		references: [inquilino.id]
	}),
	inscricaos_convidadorPessoaId: many(inscricao, {
		relationName: "inscricao_convidadorPessoaId_pessoa_id"
	}),
	inscricaos_pessoaId: many(inscricao, {
		relationName: "inscricao_pessoaId_pessoa_id"
	}),
	consentimentos: many(consentimento),
	notificacaos: many(notificacao),
	usuarios: many(usuario),
}));

export const centralRelations = relations(central, ({one, many}) => ({
	pessoas: many(pessoa),
	inquilino: one(inquilino, {
		fields: [central.inquilinoId],
		references: [inquilino.id]
	}),
	conexaoGateways: many(conexaoGateway),
	encontros: many(encontro),
	inscricaos: many(inscricao),
	cobrancas: many(cobranca),
	notificacaos: many(notificacao),
	usuarios: many(usuario),
}));

export const identidadeRelations = relations(identidade, ({many}) => ({
	pessoas: many(pessoa),
}));

export const acessoSuporteRelations = relations(acessoSuporte, ({one}) => ({
	inquilino: one(inquilino, {
		fields: [acessoSuporte.inquilinoId],
		references: [inquilino.id]
	}),
}));

export const conexaoGatewayRelations = relations(conexaoGateway, ({one, many}) => ({
	central: one(central, {
		fields: [conexaoGateway.centralId],
		references: [central.id]
	}),
	inquilino: one(inquilino, {
		fields: [conexaoGateway.inquilinoId],
		references: [inquilino.id]
	}),
	cobrancas: many(cobranca),
}));

export const inquilinoDominioRelations = relations(inquilinoDominio, ({one}) => ({
	inquilino: one(inquilino, {
		fields: [inquilinoDominio.inquilinoId],
		references: [inquilino.id]
	}),
}));

export const encontroRelations = relations(encontro, ({one, many}) => ({
	central: one(central, {
		fields: [encontro.centralId],
		references: [central.id]
	}),
	inscricao: one(inscricao, {
		fields: [encontro.coordenadorInscricaoId],
		references: [inscricao.id],
		relationName: "encontro_coordenadorInscricaoId_inscricao_id"
	}),
	inquilino: one(inquilino, {
		fields: [encontro.inquilinoId],
		references: [inquilino.id]
	}),
	inscricaos: many(inscricao, {
		relationName: "inscricao_encontroId_encontro_id"
	}),
}));

export const inscricaoRelations = relations(inscricao, ({one, many}) => ({
	encontros: many(encontro, {
		relationName: "encontro_coordenadorInscricaoId_inscricao_id"
	}),
	central: one(central, {
		fields: [inscricao.centralId],
		references: [central.id]
	}),
	pessoa_convidadorPessoaId: one(pessoa, {
		fields: [inscricao.convidadorPessoaId],
		references: [pessoa.id],
		relationName: "inscricao_convidadorPessoaId_pessoa_id"
	}),
	encontro: one(encontro, {
		fields: [inscricao.encontroId],
		references: [encontro.id],
		relationName: "inscricao_encontroId_encontro_id"
	}),
	inquilino: one(inquilino, {
		fields: [inscricao.inquilinoId],
		references: [inquilino.id]
	}),
	pessoa_pessoaId: one(pessoa, {
		fields: [inscricao.pessoaId],
		references: [pessoa.id],
		relationName: "inscricao_pessoaId_pessoa_id"
	}),
	cobrancas: many(cobranca),
	consentimentos: many(consentimento),
	notificacaos: many(notificacao),
}));

export const cobrancaRelations = relations(cobranca, ({one}) => ({
	central: one(central, {
		fields: [cobranca.centralId],
		references: [central.id]
	}),
	conexaoGateway: one(conexaoGateway, {
		fields: [cobranca.conexaoGatewayId],
		references: [conexaoGateway.id]
	}),
	inquilino: one(inquilino, {
		fields: [cobranca.inquilinoId],
		references: [inquilino.id]
	}),
	inscricao: one(inscricao, {
		fields: [cobranca.inscricaoId],
		references: [inscricao.id]
	}),
}));

export const termoRelations = relations(termo, ({one, many}) => ({
	inquilino: one(inquilino, {
		fields: [termo.inquilinoId],
		references: [inquilino.id]
	}),
	consentimentos: many(consentimento),
}));

export const consentimentoRelations = relations(consentimento, ({one}) => ({
	inquilino: one(inquilino, {
		fields: [consentimento.inquilinoId],
		references: [inquilino.id]
	}),
	inscricao: one(inscricao, {
		fields: [consentimento.inscricaoId],
		references: [inscricao.id]
	}),
	pessoa: one(pessoa, {
		fields: [consentimento.pessoaId],
		references: [pessoa.id]
	}),
	termo: one(termo, {
		fields: [consentimento.termoId],
		references: [termo.id]
	}),
}));

export const webhookEventoRelations = relations(webhookEvento, ({one}) => ({
	inquilino: one(inquilino, {
		fields: [webhookEvento.inquilinoId],
		references: [inquilino.id]
	}),
}));

export const notificacaoRelations = relations(notificacao, ({one}) => ({
	central: one(central, {
		fields: [notificacao.centralId],
		references: [central.id]
	}),
	inquilino: one(inquilino, {
		fields: [notificacao.inquilinoId],
		references: [inquilino.id]
	}),
	inscricao: one(inscricao, {
		fields: [notificacao.inscricaoId],
		references: [inscricao.id]
	}),
	pessoa: one(pessoa, {
		fields: [notificacao.pessoaId],
		references: [pessoa.id]
	}),
	usuario: one(usuario, {
		fields: [notificacao.usuarioId],
		references: [usuario.id]
	}),
}));

export const usuarioRelations = relations(usuario, ({one, many}) => ({
	notificacaos: many(notificacao),
	central: one(central, {
		fields: [usuario.centralId],
		references: [central.id]
	}),
	inquilino: one(inquilino, {
		fields: [usuario.inquilinoId],
		references: [inquilino.id]
	}),
	pessoa: one(pessoa, {
		fields: [usuario.pessoaId],
		references: [pessoa.id]
	}),
}));