import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ARQUIVOS_MERCADO, esquemaSerieCdi, esquemaSerieFechamentos } from "@/contratos";
import {
  converterSerieBcb,
  converterSerieBrapi,
  converterSerieCoinGecko,
  gerarArquivosMercado,
} from "./coletar";

describe("B3a · Coleta de mercado gravada", () => {
  test("1. Resposta gravada do BCB vira série com datas ISO e taxas em texto decimal", () => {
    const bruto = JSON.parse(
      readFileSync(join(__dirname, "fixtures", "bcb-sgs12.json"), "utf8"),
    );
    const resultado = converterSerieBcb(bruto);

    expect(resultado.fonte).toBe("BCB SGS 12");
    expect(resultado.serie.length).toBe(246);
    expect(resultado.serie[0]).toEqual({
      data: "2025-11-03",
      taxa_diaria_pct: "0.055131",
    });
    expect(resultado.serie.at(-1)).toEqual({
      data: "2026-10-27",
      taxa_diaria_pct: "0.050788",
    });
  });

  test("2. Resposta gravada da brapi vira fechamentos em centavos até 27/10", () => {
    const bruto = JSON.parse(
      readFileSync(join(__dirname, "fixtures", "brapi-PETR4.json"), "utf8"),
    );
    const resultado = converterSerieBrapi(bruto);

    expect(resultado.fonte).toBe("brapi");
    expect(resultado.ticker).toBe("PETR4");
    expect(resultado.serie.length).toBe(62);
    expect(resultado.serie[0]).toEqual({
      data: "2026-07-30",
      preco_centavos: 4284,
    });
    expect(resultado.serie.at(-1)).toEqual({
      data: "2026-10-27",
      preco_centavos: 5279,
    });
  });

  test("3. Resposta gravada da CoinGecko vira fechamento diário em centavos até 27/10", () => {
    const bruto = JSON.parse(
      readFileSync(join(__dirname, "fixtures", "coingecko-bitcoin-brl.json"), "utf8"),
    );
    const resultado = converterSerieCoinGecko(bruto);

    expect(resultado.fonte).toBe("CoinGecko");
    expect(resultado.ticker).toBe("BTC");
    expect(resultado.serie.length).toBe(90);
    expect(resultado.serie[0]).toEqual({
      data: "2026-07-30",
      preco_centavos: 32778988,
    });
    expect(resultado.serie.at(-1)).toEqual({
      data: "2026-10-27",
      preco_centavos: 43008618,
    });
  });

  test("4. Arquivos de saída gravados em dados/mercado/ são aceitos pelo esquema do contrato", () => {
    const raiz = join(__dirname, "..", "..");
    gerarArquivosMercado({ raiz });

    const cdiJson = JSON.parse(readFileSync(join(raiz, ARQUIVOS_MERCADO.cdi), "utf8"));
    const petr4Json = JSON.parse(
      readFileSync(join(raiz, ARQUIVOS_MERCADO.fechamentos("PETR4")), "utf8"),
    );
    const btcJson = JSON.parse(
      readFileSync(join(raiz, ARQUIVOS_MERCADO.fechamentos("BTC")), "utf8"),
    );

    const cdi = esquemaSerieCdi.parse(cdiJson);
    const petr4 = esquemaSerieFechamentos.parse(petr4Json);
    const btc = esquemaSerieFechamentos.parse(btcJson);

    expect(cdi.serie.at(-1)?.data).toBe("2026-10-27");
    expect(petr4.ticker).toBe("PETR4");
    expect(petr4.serie.at(-1)?.data).toBe("2026-10-27");
    expect(btc.ticker).toBe("BTC");
    expect(btc.serie.at(-1)?.data).toBe("2026-10-27");
  });
});
