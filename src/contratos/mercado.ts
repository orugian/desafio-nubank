import { z } from "zod";
import { esquemaCentavosPositivos, esquemaData, esquemaDataHora, esquemaTaxaTexto } from "./comum";

/** URL de fonte sem token (o token da brapi vai só no cabeçalho). */
export const esquemaUrlSemToken = z
  .url()
  .refine((u) => !/[?&](token|apikey|api_key|key)=/i.test(u), "url não pode conter token");

const cabecalhoSerie = {
  fonte: z.string().min(1),
  url: esquemaUrlSemToken,
  obtido_em: esquemaDataHora,
};

/** `dados/mercado/cdi.json`: CDI diário (BCB SGS 12), taxa em % ao dia em texto. */
export const esquemaSerieCdi = z.object({
  ...cabecalhoSerie,
  serie: z.array(z.object({ data: esquemaData, taxa_diaria_pct: esquemaTaxaTexto })).min(1),
});
export type SerieCdi = z.infer<typeof esquemaSerieCdi>;

/** `dados/mercado/fechamentos-<TICKER>.json`: fechamento diário em centavos de real. */
export const esquemaSerieFechamentos = z.object({
  ...cabecalhoSerie,
  ticker: z.string().min(1),
  serie: z.array(z.object({ data: esquemaData, preco_centavos: esquemaCentavosPositivos })).min(1),
});
export type SerieFechamentos = z.infer<typeof esquemaSerieFechamentos>;

/** Caminhos relativos à raiz de `newai/`. */
export const ARQUIVOS_MERCADO = {
  cdi: "dados/mercado/cdi.json",
  fechamentos: (ticker: string) => `dados/mercado/fechamentos-${ticker}.json`,
} as const;

/** Séries carregadas, injetadas em `contexto.series`. */
export type SeriesMercado = {
  cdi: SerieCdi;
  fechamentos: Record<string, SerieFechamentos>;
};

/** Snapshot em uso na sessão (spec §4.3, D-23). */
export const esquemaSnapshotMercado = z.object({
  ao_vivo: z.boolean(),
  obtido_em: esquemaDataHora,
  tentou_ao_vivo: z.boolean(),
  cdi: z.object({ taxa_diaria_pct: esquemaTaxaTexto, data_ref: esquemaData, fonte: z.string().min(1) }),
  precos: z.record(
    z.string().min(1),
    z.object({ preco_centavos: esquemaCentavosPositivos, data_hora: esquemaDataHora, fonte: z.string().min(1) }),
  ),
});
export type SnapshotMercado = z.infer<typeof esquemaSnapshotMercado>;
