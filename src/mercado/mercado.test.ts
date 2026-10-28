import { describe, expect, test } from "vitest";
import { esquemaSnapshotMercado } from "@/contratos";
import { snapshotGravado } from "@/mercado";
import cdiJson from "../../dados/mercado/cdi.json";
import btcJson from "../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../dados/mercado/fechamentos-PETR4.json";

describe("B3b · mercado (snapshot gravado)", () => {
  test("7: snapshotGravado devolve os valores gravados em dados/mercado com ao_vivo: false e data", () => {
    const snap = snapshotGravado();
    esquemaSnapshotMercado.parse(snap);

    const ultimoCdi = cdiJson.serie.at(-1)!;
    const ultimoPetr4 = petr4Json.serie.at(-1)!;
    const ultimoBtc = btcJson.serie.at(-1)!;

    expect(snap).toEqual({
      ao_vivo: false,
      obtido_em: cdiJson.obtido_em,
      tentou_ao_vivo: false,
      cdi: {
        taxa_diaria_pct: ultimoCdi.taxa_diaria_pct,
        data_ref: ultimoCdi.data,
        fonte: cdiJson.fonte,
      },
      precos: {
        PETR4: {
          preco_centavos: ultimoPetr4.preco_centavos,
          data_hora: `${ultimoPetr4.data}T18:00:00-03:00`,
          fonte: petr4Json.fonte,
        },
        BTC: {
          preco_centavos: ultimoBtc.preco_centavos,
          data_hora: `${ultimoBtc.data}T21:00:00-03:00`,
          fonte: btcJson.fonte,
        },
      },
    });
  });
});
