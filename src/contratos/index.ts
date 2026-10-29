// Contratos 1.0 (congelados no M0). Mudança só por PEDIDO em
// intern/coordenacao/CONTRATOS-PEDIDOS.md aprovado em MARCOS.md.

import { esquemaOQueMudou, esquemaResultadoCenario } from "./cenario";
import {
  esquemaAlocacaoCompra,
  esquemaCartaoVisao,
  esquemaResultadoHistorico,
  esquemaResultadoInvestimentos,
  esquemaResultadoProjecao,
} from "./consultas";
import { esquemaEstadoSessao } from "./estado";
import { esquemaArgumentosFerramentas } from "./ferramentas";
import {
  esquemaRequisicaoAcao,
  esquemaRequisicaoSessao,
  esquemaRequisicaoTurno,
  esquemaRespostaAcao,
  esquemaRespostaFalha,
  esquemaRespostaPersonas,
  esquemaRespostaSessao,
  esquemaRespostaTurno,
} from "./http";
import { esquemaSerieCdi, esquemaSerieFechamentos, esquemaSnapshotMercado } from "./mercado";
import { esquemaPersona } from "./persona";
import { esquemaRoteiro } from "./conversa";
import { esquemaCartaoResposta, esquemaVisaoApp } from "./visao";
import {
  esquemaResultadoCotacao,
  esquemaResultadoComparativo,
  esquemaResultadoSimulacaoInvestimento,
  esquemaResultadoPixCredito,
  esquemaResultadoImpostoRenda,
} from "./extras";

export * from "./comum";
export * from "./erros";
export * from "./mercado";
export * from "./persona";
export * from "./estado";
export * from "./cenario";
export * from "./consultas";
export * from "./extras";
export * from "./visao";
export * from "./http";
export * from "./ferramentas";
export * from "./conversa";
export { descricoesFerramentas, descricoesCampos } from "./descricoes";
export { textos } from "./textos";
export * from "./formatar";

/**
 * Esquemas por nome, usados pelo campo `esquema` dos exemplos JSON
 * (`src/contratos/exemplos/*.json`, envelope `{ exemplo, esquema, descricao, dados }`).
 */
export const esquemas = {
  Persona: esquemaPersona,
  EstadoSessao: esquemaEstadoSessao,
  SnapshotMercado: esquemaSnapshotMercado,
  SerieCdi: esquemaSerieCdi,
  SerieFechamentos: esquemaSerieFechamentos,
  ResultadoCenario: esquemaResultadoCenario,
  OQueMudou: esquemaOQueMudou,
  ResultadoInvestimentos: esquemaResultadoInvestimentos,
  ResultadoProjecao: esquemaResultadoProjecao,
  ResultadoHistorico: esquemaResultadoHistorico,
  CartaoVisao: esquemaCartaoVisao,
  AlocacaoCompra: esquemaAlocacaoCompra,
  CartaoResposta: esquemaCartaoResposta,
  VisaoApp: esquemaVisaoApp,
  ArgumentosFerramentas: esquemaArgumentosFerramentas,
  Roteiro: esquemaRoteiro,
  RespostaPersonas: esquemaRespostaPersonas,
  RequisicaoSessao: esquemaRequisicaoSessao,
  RespostaSessao: esquemaRespostaSessao,
  RequisicaoTurno: esquemaRequisicaoTurno,
  RespostaTurno: esquemaRespostaTurno,
  RequisicaoAcao: esquemaRequisicaoAcao,
  RespostaAcao: esquemaRespostaAcao,
  RespostaFalha: esquemaRespostaFalha,
  ResultadoCotacao: esquemaResultadoCotacao,
  ResultadoComparativo: esquemaResultadoComparativo,
  ResultadoSimulacaoInvestimento: esquemaResultadoSimulacaoInvestimento,
  ResultadoPixCredito: esquemaResultadoPixCredito,
  ResultadoImpostoRenda: esquemaResultadoImpostoRenda,
} as const;
export type NomeEsquema = keyof typeof esquemas;
