import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { converterSerieBcb, converterSerieBrapi } from "./coletar";

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
});
