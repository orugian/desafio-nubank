import { z } from "zod";
import {
  esquemaCdiPct,
  esquemaCentavos,
  esquemaCentavosNaoNegativos,
  esquemaCentavosPositivos,
  esquemaData,
  esquemaDataHora,
  esquemaIdFatura,
  esquemaIdPosicao,
  esquemaPercentualTexto,
  esquemaQuantidade,
  esquemaTaxaPctTexto,
  esquemaTaxaTexto,
} from "./comum";
import { esquemaCategoriaPosicao } from "./consultas";

// ---------------------------------------------------------------------------
// Resultados dos novos contratos (spec 1.1 e 1.2)
// ---------------------------------------------------------------------------

export const esquemaResultadoCotacao = z.object({
  ticker: z.string().min(1),
  nome: z.string().min(1).nullable(),
  tipo: z.enum(["acao", "cripto"]),
  preco_centavos: esquemaCentavosPositivos,
  variacao_dia_pct: esquemaPercentualTexto.nullable(),
  data_hora: esquemaDataHora,
  fonte: z.string().min(1),
  ao_vivo: z.boolean(),
  valorizacao_periodo_pct: esquemaPercentualTexto.nullable(),
  periodo_desde: esquemaData.nullable(),
  na_carteira: z
    .object({
      posicao_id: esquemaIdPosicao,
      quantidade: esquemaQuantidade,
      valor_centavos: esquemaCentavosNaoNegativos,
    })
    .nullable(),
  rotulo: z.string().min(1),
});
export type ResultadoCotacao = z.infer<typeof esquemaResultadoCotacao>;

export const esquemaResultadoComparativo = z.object({
  posicao: z.object({
    posicao_id: esquemaIdPosicao,
    nome: z.string().min(1),
    categoria: esquemaCategoriaPosicao,
    ticker: z.string().min(1).nullable(),
  }),
  aportes: z
    .array(
      z.object({
        data: esquemaData,
        valor_centavos: esquemaCentavosPositivos,
      }),
    )
    .min(1),
  aplicado_centavos: esquemaCentavosNaoNegativos,
  inicio: esquemaData,
  dias_corridos: z.int().nonnegative(),
  dias_uteis: z.int().nonnegative(),
  real: z.object({
    valor_centavos: esquemaCentavosNaoNegativos,
    resultado_centavos: esquemaCentavos,
    rentabilidade_pct: esquemaPercentualTexto,
    estimado: z.boolean(),
    rotulo_estimativa: z.string().min(1).nullable(),
  }),
  alternativas: z
    .array(
      z.object({
        id: z.enum(["cdi", "prefixado"]),
        nome: z.string().min(1),
        valor_centavos: esquemaCentavosNaoNegativos,
        resultado_centavos: esquemaCentavos,
        rentabilidade_pct: esquemaPercentualTexto,
        diferenca_centavos: esquemaCentavos,
      }),
    )
    .min(1),
  melhor: z.enum(["real", "cdi", "prefixado"]),
  cdi_data_ref: esquemaData,
  rotulo: z.string().min(1),
});
export type ResultadoComparativo = z.infer<typeof esquemaResultadoComparativo>;

export const esquemaResultadoSimulacaoInvestimento = z.object({
  valor_centavos: esquemaCentavosPositivos,
  indexador: z.enum(["cdi", "prefixado"]),
  cdi_pct: esquemaCdiPct.nullable(),
  taxa_aa_pct: esquemaTaxaPctTexto.nullable(),
  taxa_diaria_cdi_pct: esquemaTaxaTexto.nullable(),
  cdi_data_ref: esquemaData.nullable(),
  inicio: esquemaData,
  fim: esquemaData,
  dias_corridos: z.int().positive(),
  dias_uteis: z.int().nonnegative(),
  rendimento_bruto_centavos: esquemaCentavosNaoNegativos,
  aliquota_iof_pct: esquemaPercentualTexto,
  iof_centavos: esquemaCentavosNaoNegativos,
  aliquota_ir_pct: esquemaPercentualTexto,
  ir_centavos: esquemaCentavosNaoNegativos,
  rendimento_liquido_centavos: esquemaCentavosNaoNegativos,
  valor_final_liquido_centavos: esquemaCentavosPositivos,
  rentabilidade_liquida_pct: esquemaPercentualTexto,
  rotulo: z.string().min(1),
});
export type ResultadoSimulacaoInvestimento = z.infer<typeof esquemaResultadoSimulacaoInvestimento>;

export const esquemaResultadoPixCredito = z.object({
  valor_centavos: esquemaCentavosPositivos,
  parcelas: z.int().min(1).max(12),
  juros_am_pct: esquemaTaxaPctTexto,
  juros_origem: z.enum(["premissa", "informado"]),
  saldo_disponivel_hoje_centavos: esquemaCentavos,
  saldo_suficiente: z.boolean(),
  falta_saldo_centavos: esquemaCentavosNaoNegativos,
  iof_centavos: esquemaCentavosNaoNegativos,
  total_financiado_centavos: esquemaCentavosPositivos,
  parcela_centavos: esquemaCentavosPositivos,
  cronograma: z
    .array(
      z.object({
        numero: z.int().min(1).max(12),
        fatura_id: esquemaIdFatura,
        vencimento: esquemaData,
        valor_centavos: esquemaCentavosPositivos,
        juros_centavos: esquemaCentavosNaoNegativos,
        amortizacao_centavos: esquemaCentavosNaoNegativos,
      }),
    )
    .min(1),
  total_pago_centavos: esquemaCentavosPositivos,
  juros_total_centavos: esquemaCentavosNaoNegativos,
  custo_total_centavos: esquemaCentavosNaoNegativos,
  cet_am_pct: esquemaPercentualTexto,
  cet_aa_pct: esquemaPercentualTexto,
  limite_disponivel_centavos: esquemaCentavos,
  excede_limite: z.boolean(),
  rotulo: z.string().min(1),
});
export type ResultadoPixCredito = z.infer<typeof esquemaResultadoPixCredito>;

export const esquemaOpcaoParcelamento = z.object({
  parcelas: z.int().min(1).max(72),
  /** Parcela base (Price: PMT arredondado; sem juros: financiado ÷ n arredondado). */
  parcela_centavos: esquemaCentavosPositivos,
  /** Sem juros, a última absorve a diferença de arredondamento; com juros é igual à parcela. */
  ultima_parcela_centavos: esquemaCentavosPositivos,
  /** Entrada + soma das parcelas. */
  total_pago_centavos: esquemaCentavosPositivos,
  /** Total pago − valor da compra. */
  juros_total_centavos: esquemaCentavos,
  /** Total pago − preço à vista (com desconto). */
  custo_vs_a_vista_centavos: esquemaCentavos,
  /** Entrada + Σ parcela_k ÷ (1 + CDI mensal)^k (bruto, sem IR). */
  valor_presente_centavos: esquemaCentavosPositivos,
  /** À vista − valor presente; positivo = parcelar sai mais barato considerando o CDI. */
  vantagem_vs_a_vista_centavos: esquemaCentavos,
  cet_am_pct: esquemaPercentualTexto,
  comprometimento_renda_pct: esquemaPercentualTexto.nullable(),
});
export type OpcaoParcelamento = z.infer<typeof esquemaOpcaoParcelamento>;

export const esquemaResultadoSimulacaoParcelamento = z.object({
  valor_centavos: esquemaCentavosPositivos,
  entrada_centavos: esquemaCentavosNaoNegativos,
  financiado_centavos: esquemaCentavosPositivos,
  desconto_a_vista_pct: esquemaTaxaPctTexto,
  a_vista_centavos: esquemaCentavosPositivos,
  juros_am_pct: esquemaTaxaPctTexto,
  juros_aa_pct: esquemaTaxaPctTexto.optional(),
  juros_origem: z.enum(["premissa", "informado"]),
  cdi_mensal_pct: esquemaPercentualTexto,
  cdi_data_ref: esquemaData,
  renda_liquida_mensal_centavos: esquemaCentavosPositivos.nullable(),
  opcoes: z.array(esquemaOpcaoParcelamento).min(1).max(6),
  /** "a_vista" ou o número de parcelas com menor valor presente (empate → a_vista). */
  menor_custo: z.union([z.literal("a_vista"), z.int().min(1).max(72)]),
  menor_parcela: z.int().min(1).max(72),
  premissas: z.array(z.string().min(1)).min(1),
  rotulo: z.string().min(1),
});
export type ResultadoSimulacaoParcelamento = z.infer<typeof esquemaResultadoSimulacaoParcelamento>;

export const esquemaResultadoCalculo = z.object({
  expressao: z.string().min(1).max(200),
  /** Resultado com 2 casas (ROUND_HALF_UP), sinal permitido. */
  resultado: z.string().regex(/^-?\d+\.\d{2}$/),
  resultado_centavos: esquemaCentavos,
  rotulo: z.string().min(1),
});
export type ResultadoCalculo = z.infer<typeof esquemaResultadoCalculo>;

export const esquemaItemImposto = z.object({
  posicao_id: esquemaIdPosicao,
  nome: z.string().min(1),
  categoria: esquemaCategoriaPosicao,
  regime: z.enum([
    "renda_fixa_resgate",
    "renda_fixa_vencimento",
    "come_cotas",
    "acao",
    "cripto",
    "sem_rendimento",
  ]),
  base_centavos: esquemaCentavos,
  aliquota_pct: esquemaPercentualTexto,
  ir_estimado_centavos: esquemaCentavosNaoNegativos,
  isento: z.boolean(),
  motivo: z.string().min(1).nullable(),
  data_referencia: esquemaData,
  data_pagamento: esquemaData.nullable(),
  forma: z.string().min(1),
});
export type ItemImposto = z.infer<typeof esquemaItemImposto>;

export const esquemaIrpf = z.object({
  origem: z.enum(["historico", "informado", "cadastro"]),
  tipo_renda: z.enum(["salario", "autonomo"]),
  rendimento_mensal_centavos: esquemaCentavosPositivos,
  meses_base: z.int().nonnegative(),
  rendimento_anual_centavos: esquemaCentavosNaoNegativos,
  desconto_simplificado_centavos: esquemaCentavosNaoNegativos,
  base_calculo_centavos: esquemaCentavosNaoNegativos,
  imposto_tabela_centavos: esquemaCentavosNaoNegativos,
  reducao_centavos: esquemaCentavosNaoNegativos,
  imposto_devido_centavos: esquemaCentavosNaoNegativos,
  mensal: z.object({
    base_centavos: esquemaCentavosNaoNegativos,
    imposto_tabela_centavos: esquemaCentavosNaoNegativos,
    reducao_centavos: esquemaCentavosNaoNegativos,
    imposto_centavos: esquemaCentavosNaoNegativos,
  }),
  retido_ou_recolhido_anual_centavos: esquemaCentavosNaoNegativos,
  a_pagar_centavos: esquemaCentavosNaoNegativos,
  a_restituir_centavos: esquemaCentavosNaoNegativos,
  forma_mensal: z.string().min(1),
  prazo_declaracao: esquemaData,
  premissas: z.array(z.string().min(1)),
});
export type Irpf = z.infer<typeof esquemaIrpf>;

export const esquemaResultadoImpostoRenda = z.object({
  ano_calendario: z.literal(2026),
  exercicio: z.literal(2027),
  investimentos: z
    .object({
      itens: z.array(esquemaItemImposto),
      total_ir_estimado_centavos: esquemaCentavosNaoNegativos,
    })
    .nullable(),
  irpf: esquemaIrpf.nullable(),
  fontes: z.array(z.string().min(1)).min(1),
  rotulo: z.string().min(1),
});
export type ResultadoImpostoRenda = z.infer<typeof esquemaResultadoImpostoRenda>;
