// Mercado (spec §4.3, D-23, §6.1). snapshotGravado no B3b; buscarAoVivo no B3c (P1).

import {
  esquemaSerieCdi,
  esquemaSerieFechamentos,
  esquemaSnapshotMercado,
  type SnapshotMercado,
} from "@/contratos";
import cdiBruto from "../../dados/mercado/cdi.json";
import btcBruto from "../../dados/mercado/fechamentos-BTC.json";
import petr4Bruto from "../../dados/mercado/fechamentos-PETR4.json";

const cdi = esquemaSerieCdi.parse(cdiBruto);
const petr4 = esquemaSerieFechamentos.parse(petr4Bruto);
const btc = esquemaSerieFechamentos.parse(btcBruto);

/** Valores gravados em `dados/mercado/`, com `ao_vivo: false` e a data. */
export function snapshotGravado(): SnapshotMercado {
  const ultimoCdi = [...cdi.serie].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;
  const ultimoPetr4 = [...petr4.serie].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;
  const ultimoBtc = [...btc.serie].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;

  return esquemaSnapshotMercado.parse({
    ao_vivo: false,
    obtido_em: cdi.obtido_em,
    tentou_ao_vivo: false,
    cdi: {
      taxa_diaria_pct: ultimoCdi.taxa_diaria_pct,
      data_ref: ultimoCdi.data,
      fonte: cdi.fonte,
    },
    precos: {
      [petr4.ticker]: {
        preco_centavos: ultimoPetr4.preco_centavos,
        data_hora: `${ultimoPetr4.data}T18:00:00-03:00`,
        fonte: petr4.fonte,
      },
      [btc.ticker]: {
        preco_centavos: ultimoBtc.preco_centavos,
        data_hora: `${ultimoBtc.data}T21:00:00-03:00`,
        fonte: btc.fonte,
      },
    },
  });
}

/** Tenta o ao vivo uma vez; em timeout ou erro devolve o gravado com `tentou_ao_vivo: true` (F-07). */
export async function buscarAoVivo(opcoes: { timeout_ms: number }): Promise<SnapshotMercado> {
  void opcoes;
  throw new Error("não implementado");
}
