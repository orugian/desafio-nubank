import { z } from "zod";
import {
  esquemaCategoria,
  esquemaCdiPct,
  esquemaCentavos,
  esquemaCentavosNaoNegativos,
  esquemaCentavosPositivos,
  esquemaData,
  esquemaIdEvento,
  esquemaIdFatura,
  esquemaIdLancamento,
  esquemaIdParcelamento,
  esquemaIdPersona,
  esquemaIdPosicao,
  esquemaMeioInformado,
  esquemaProtecao,
  esquemaQuantidade,
  esquemaTipoEvento,
  meioCombinaComTipo,
} from "./comum";

// Persona é estrita: campo desconhecido (renda, perfil, cheque especial) é
// rejeitado (invariante 11 da spec §4.2).

const tipoComMeio = <T extends { tipo: "saida" | "entrada"; meio: string }>(v: T, ctx: z.RefinementCtx) => {
  if (!meioCombinaComTipo(v.tipo, v.meio)) {
    ctx.addIssue({ code: "custom", path: ["meio"], message: `meio ${v.meio} não vale para ${v.tipo}` });
  }
};

/** Lançamento do histórico, somente leitura (H-01). */
export const esquemaLancamento = z
  .strictObject({
    id: esquemaIdLancamento,
    data: esquemaData,
    descricao: z.string().min(1).max(60),
    tipo: esquemaTipoEvento,
    meio: esquemaMeioInformado,
    categoria: esquemaCategoria,
    valor_centavos: esquemaCentavosPositivos,
    /** Id do compromisso recorrente a que pertence (invariante 5). */
    recorrencia_id: esquemaIdEvento.nullable().optional(),
    /** Compra no cartão parcelada. */
    parcelamento_id: esquemaIdParcelamento.optional(),
    /** `"k/n"`. */
    parcela: z.string().regex(/^\d{1,2}\/\d{1,2}$/).optional(),
    /** Pagamento de fatura (categoria `fatura`). */
    fatura_id: esquemaIdFatura.optional(),
    /** Aporte ou compra de posição (categoria `investimentos`, invariante 8). */
    posicao_id: esquemaIdPosicao.optional(),
  })
  .superRefine(tipoComMeio);
export type Lancamento = z.infer<typeof esquemaLancamento>;

/** Ocorrência citada por estimativa (H-05). */
export const esquemaOcorrencia = z.object({
  lancamento_id: esquemaIdLancamento,
  data: esquemaData,
  valor_centavos: esquemaCentavosPositivos,
});

/** Estimativa rotulada com o método (D-21). */
export const esquemaEstimativa = z.discriminatedUnion("metodo", [
  z.object({
    metodo: z.literal("media_3_ultimas"),
    ocorrencias: z.array(esquemaOcorrencia).length(3),
    /** Ex.: "estimado: média de R$ 165,00, R$ 180,00 e R$ 195,00". */
    texto: z.string().min(1),
  }),
  z.object({
    metodo: z.literal("gasto_diario"),
    valor_por_dia_centavos: esquemaCentavosPositivos,
    dias: z.int().min(1).max(7),
    texto: z.string().min(1),
  }),
]);
export type Estimativa = z.infer<typeof esquemaEstimativa>;

export const ORIGENS_DADO = [
  "agendamento",
  "debito_automatico",
  "boleto",
  "recebimento_previsto",
  "cobranca_emitida",
  "conta_estimada",
] as const;

/** Compromisso futuro conhecido pelo sistema. A fatura fechada não entra aqui: é derivada. */
export const esquemaCompromisso = z
  .strictObject({
    id: esquemaIdEvento,
    tipo: esquemaTipoEvento,
    categoria: esquemaCategoria,
    descricao: z.string().min(1).max(60),
    data: esquemaData,
    valor_centavos: esquemaCentavosPositivos,
    meio: esquemaMeioInformado,
    origem_dado: z.enum(ORIGENS_DADO),
    previsto: z.boolean(),
    estimativa: esquemaEstimativa.nullable(),
    /** Tem ocorrências no histórico com `recorrencia_id` = id (invariante 5). */
    recorrente: z.boolean(),
  })
  .superRefine(tipoComMeio);
export type Compromisso = z.infer<typeof esquemaCompromisso>;

export const esquemaGastoDiario = z.strictObject({
  valor_centavos: esquemaCentavosNaoNegativos,
  base: z.strictObject({
    de: esquemaData,
    ate: esquemaData,
    dias: z.int().positive(),
    total_centavos: esquemaCentavosNaoNegativos,
  }),
});

export const esquemaParcelamento = z.strictObject({
  id: esquemaIdParcelamento,
  descricao: z.string().min(1).max(60),
  valor_total_centavos: esquemaCentavosPositivos,
  parcelas: z.int().min(1).max(12),
  data_compra: esquemaData,
  anterior_ao_historico: z.boolean(),
});
export type Parcelamento = z.infer<typeof esquemaParcelamento>;

export const esquemaItemFatura = z.strictObject({
  lancamento_id: esquemaIdLancamento.optional(),
  data: esquemaData.optional(),
  descricao: z.string().min(1).max(60),
  valor_centavos: esquemaCentavosPositivos,
  parcelamento_id: esquemaIdParcelamento.optional(),
  parcela: z.string().regex(/^\d{1,2}\/\d{1,2}$/).optional(),
});
export type ItemFatura = z.infer<typeof esquemaItemFatura>;

export const esquemaFatura = z.strictObject({
  id: esquemaIdFatura,
  fechamento: esquemaData,
  vencimento: esquemaData,
  status: z.enum(["fechada", "aberta"]),
  valor_centavos: esquemaCentavosNaoNegativos,
  itens: z.array(esquemaItemFatura),
});
export type Fatura = z.infer<typeof esquemaFatura>;

export const esquemaCartao = z.strictObject({
  dia_fechamento: z.int().min(1).max(31),
  dia_vencimento: z.int().min(1).max(31),
  limite_centavos: esquemaCentavosPositivos,
  parcelamentos: z.array(esquemaParcelamento),
  faturas: z.array(esquemaFatura),
});
export type Cartao = z.infer<typeof esquemaCartao>;

// ---------------------------------------------------------------------------
// Posições (I-01)
// ---------------------------------------------------------------------------

export const esquemaLiquidez = z.discriminatedUnion("regra", [
  /** Qualquer dia, crédito no mesmo dia (saldo separado, caixinha, cripto). */
  z.strictObject({ regra: z.literal("imediata") }),
  /** D+N dias úteis (CDB liquidez diária D+0, fundo D+N, ação D+2). */
  z.strictObject({ regra: z.literal("d_mais_uteis"), dias: z.int().min(0).max(30) }),
  /** Só no vencimento da posição. */
  z.strictObject({ regra: z.literal("no_vencimento") }),
]);
export type Liquidez = z.infer<typeof esquemaLiquidez>;

export const esquemaAporte = z.strictObject({ data: esquemaData, valor_centavos: esquemaCentavosPositivos });
export const esquemaCompra = z.strictObject({
  data: esquemaData,
  quantidade: esquemaQuantidade,
  preco_centavos: esquemaCentavosPositivos,
});

const camposPosicao = {
  id: esquemaIdPosicao,
  nome: z.string().min(1).max(60),
  liquidez: esquemaLiquidez,
  protecao: esquemaProtecao,
  restricao: z.string().min(1).max(120).optional(),
};

export const esquemaPosicao = z.discriminatedUnion("categoria", [
  z.strictObject({ ...camposPosicao, categoria: z.literal("saldo_separado"), aportes: z.array(esquemaAporte) }),
  z.strictObject({
    ...camposPosicao,
    categoria: z.literal("caixinha"),
    cdi_pct: esquemaCdiPct,
    aportes: z.array(esquemaAporte),
  }),
  z.strictObject({
    ...camposPosicao,
    categoria: z.literal("cdb_liquidez_diaria"),
    cdi_pct: esquemaCdiPct,
    aportes: z.array(esquemaAporte),
  }),
  z.strictObject({
    ...camposPosicao,
    categoria: z.literal("cdb_vencimento"),
    cdi_pct: esquemaCdiPct,
    vencimento: esquemaData,
    aportes: z.array(esquemaAporte),
  }),
  z.strictObject({
    ...camposPosicao,
    categoria: z.literal("fundo"),
    cdi_pct: esquemaCdiPct,
    aportes: z.array(esquemaAporte),
  }),
  z.strictObject({ ...camposPosicao, categoria: z.literal("acao"), ticker: z.string().min(1), compras: z.array(esquemaCompra) }),
  z.strictObject({ ...camposPosicao, categoria: z.literal("cripto"), ticker: z.string().min(1), compras: z.array(esquemaCompra) }),
]);
export type Posicao = z.infer<typeof esquemaPosicao>;
export type CategoriaPosicao = Posicao["categoria"];

export const esquemaPersona = z.strictObject({
  id: esquemaIdPersona,
  nome: z.string().min(1).max(40),
  resumo: z.string().min(1).max(120),
  conta: z.strictObject({
    saldo_30_07_centavos: esquemaCentavos,
    saldo_inicio_hoje_centavos: esquemaCentavos,
  }),
  historico: z.array(esquemaLancamento),
  compromissos: z.array(esquemaCompromisso),
  gasto_diario: esquemaGastoDiario,
  cartao: esquemaCartao.nullable(),
  posicoes: z.array(esquemaPosicao),
});
export type Persona = z.infer<typeof esquemaPersona>;

/** Item de `GET /api/personas` e de `listarPersonas()`. */
export const esquemaResumoPersona = z.object({
  id: esquemaIdPersona,
  nome: z.string().min(1),
  resumo: z.string().min(1),
});
export type ResumoPersona = z.infer<typeof esquemaResumoPersona>;
