import { z } from "zod";
import {
  esquemaCategoria,
  esquemaCdiPct,
  esquemaCentavos,
  esquemaCentavosNaoNegativos,
  esquemaCentavosPositivos,
  esquemaData,
  esquemaIdEvento,
  esquemaIdOperacao,
  esquemaIdPersona,
  esquemaIdPosicao,
  esquemaMeio,
  esquemaPercentualTexto,
  esquemaProtecao,
  esquemaQuantidade,
  esquemaTipoEvento,
} from "./comum";
import { esquemaOQueMudou, esquemaResultadoCenario } from "./cenario";
import {
  esquemaCartaoVisao,
  esquemaCategoriaPosicao,
  esquemaDestinoOperacao,
  esquemaResultadoHistorico,
  esquemaResultadoInvestimentos,
  esquemaResultadoProjecao,
} from "./consultas";
import { esquemaSnapshotMercado } from "./mercado";
import {
  esquemaResultadoCotacao,
  esquemaResultadoComparativo,
  esquemaResultadoSimulacaoInvestimento,
  esquemaResultadoPixCredito,
  esquemaResultadoImpostoRenda,
  esquemaResultadoSimulacaoParcelamento,
} from "./extras";

// ---------------------------------------------------------------------------
// Cartões de resposta (spec §6.4)
// ---------------------------------------------------------------------------

export const esquemaCartaoResposta = z.discriminatedUnion("tipo", [
  /** Cenários ativos: situação atual primeiro, depois hipóteses. */
  z.object({ tipo: z.literal("comparacao"), cenarios: z.array(esquemaResultadoCenario).min(1) }),
  z.object({ tipo: z.literal("o_que_mudou"), ...esquemaOQueMudou.shape }),
  z.object({ tipo: z.literal("historico"), resultado: esquemaResultadoHistorico }),
  z.object({ tipo: z.literal("cartao_credito"), cartao: esquemaCartaoVisao }),
  z.object({ tipo: z.literal("investimentos"), resultado: esquemaResultadoInvestimentos }),
  z.object({ tipo: z.literal("rendimento"), resultado: esquemaResultadoProjecao }),
  z.object({
    tipo: z.literal("operacao_pendente"),
    operacao_id: esquemaIdOperacao,
    valor_centavos: esquemaCentavosPositivos,
    destino: esquemaDestinoOperacao,
    alerta: z.string().min(1).nullable(),
    impacto: esquemaResultadoCenario,
    /** Até o próximo recebimento previsto, quando o destino rende (O-03, I-08). */
    rendimento_estimado: esquemaResultadoProjecao.nullable(),
  }),
  z.object({
    tipo: z.literal("operacao_concluida"),
    operacao_id: esquemaIdOperacao,
    valor_centavos: esquemaCentavosPositivos,
    destino: esquemaDestinoOperacao,
    /** `textos.mensagem_operacao_simulada`. */
    mensagem: z.string().min(1),
    hipoteses_descartadas: z.array(z.string().regex(/^H\d+$/)),
    saldo_disponivel_hoje_centavos: esquemaCentavos,
  }),
  /** P1 (G-01). */
  z.object({
    tipo: z.literal("aviso_valor"),
    valores_centavos: z.array(esquemaCentavos).min(1),
    mensagem: z.string().min(1),
  }),
  /** P1. */
  z.object({
    tipo: z.literal("rascunho_atendimento"),
    motivo: z.string().min(1).max(200),
    texto: z.string().min(1),
    enviado: z.literal(false),
  }),
  z.object({ tipo: z.literal("erro"), codigo: z.string().regex(/^[A-Z0-9_-]+$/), mensagem: z.string().min(1) }),
  z.object({ tipo: z.literal("cotacao"), resultado: esquemaResultadoCotacao }),
  z.object({ tipo: z.literal("comparativo_investimento"), resultado: esquemaResultadoComparativo }),
  z.object({ tipo: z.literal("simulacao_investimento"), resultado: esquemaResultadoSimulacaoInvestimento }),
  z.object({ tipo: z.literal("pix_credito"), resultado: esquemaResultadoPixCredito }),
  z.object({ tipo: z.literal("imposto_renda"), resultado: esquemaResultadoImpostoRenda }),
  z.object({ tipo: z.literal("simulacao_parcelamento"), resultado: esquemaResultadoSimulacaoParcelamento }),
]);
export type CartaoResposta = z.infer<typeof esquemaCartaoResposta>;
export type TipoCartao = CartaoResposta["tipo"];

// ---------------------------------------------------------------------------
// VisaoApp (spec §6.5): dados prontos para as telas, em toda resposta da API.
// ---------------------------------------------------------------------------

export const esquemaPosicaoVisao = z.object({
  id: esquemaIdPosicao,
  nome: z.string().min(1),
  categoria: esquemaCategoriaPosicao,
  cdi_pct: esquemaCdiPct.nullable(),
  ticker: z.string().min(1).nullable(),
  quantidade: esquemaQuantidade.nullable(),
  valor_atual_centavos: esquemaCentavosNaoNegativos,
  aplicado_centavos: esquemaCentavosNaoNegativos,
  resultado_centavos: esquemaCentavos,
  rentabilidade_pct: esquemaPercentualTexto,
  valorizacao_periodo_pct: esquemaPercentualTexto.nullable(),
  data_disponibilidade: esquemaData,
  protecao: esquemaProtecao,
  restricao: z.string().min(1).nullable(),
  estimado: z.boolean(),
  fonte: z.string().min(1),
});

export const esquemaVisaoApp = z.object({
  marca: z.enum(["nubank", "neutra"]),
  prototipo: z.literal(true),
  persona: z.object({ id: esquemaIdPersona, nome: z.string().min(1) }),
  conta: z.object({
    saldo_disponivel_hoje_centavos: esquemaCentavos,
    saldo_inicio_hoje_centavos: esquemaCentavos,
    operacoes_hoje: z.array(
      z.object({
        id: esquemaIdOperacao,
        valor_centavos: esquemaCentavosPositivos,
        destino: esquemaIdPosicao,
        destino_nome: z.string().min(1),
        descricao: z.string().min(1),
      }),
    ),
  }),
  /** Lançamentos de conta (sem compras no cartão), mais recentes primeiro; inclui operações simuladas de hoje. */
  extrato: z.array(
    z.object({
      id: z.string().min(1),
      data: esquemaData,
      descricao: z.string().min(1),
      tipo: esquemaTipoEvento,
      meio: esquemaMeio,
      categoria: esquemaCategoria,
      valor_centavos: esquemaCentavosPositivos,
      simulado: z.boolean(),
    }),
  ),
  /** Compromissos da situação atual na janela, em ordem de data (inclui a fatura fechada derivada). */
  proximos_pagamentos: z.array(
    z.object({
      evento_id: esquemaIdEvento,
      data: esquemaData,
      descricao: z.string().min(1),
      tipo: esquemaTipoEvento,
      meio: esquemaMeio,
      valor_centavos: esquemaCentavosPositivos,
      previsto: z.boolean(),
      /** Ex.: "estimado: média de R$ 165,00, R$ 180,00 e R$ 195,00". */
      estimativa_texto: z.string().min(1).nullable(),
      origem: z.enum(["dados_base", "declaracao"]),
    }),
  ),
  cartao: esquemaCartaoVisao.nullable(),
  posicoes: z.array(esquemaPosicaoVisao),
  mercado: esquemaSnapshotMercado,
});
export type VisaoApp = z.infer<typeof esquemaVisaoApp>;
