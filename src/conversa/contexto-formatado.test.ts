import { describe, expect, test } from "vitest";
import { estadoInicial } from "@/contratos";
import { montarContextoDeterministico } from "@/conversa";
import { snapshotGravado } from "@/mercado";

// Regressão da validação real (rodada 2, turno 16): o contexto trazia o saldo mínimo só em
// centavos (30000) e o modelo escreveu "R$ 30,00" em vez de "R$ 300,00". O contexto passa a
// trazer, como as ferramentas, as strings em reais geradas pelo código (IN-04).
describe("contexto determinístico com valores formatados", () => {
  test("indicadores e saldo da P1 têm a string em reais gerada pelo código", () => {
    const ctx = montarContextoDeterministico(estadoInicial("p1", snapshotGravado())) as {
      valores_formatados: Record<string, string>;
      cenarios: { indicadores: { saldo_minimo_centavos: number } }[];
    };
    expect(ctx.cenarios[0]!.indicadores.saldo_minimo_centavos).toBe(30000);
    expect(ctx.valores_formatados["cenarios[0].indicadores.saldo_minimo_centavos"]).toBe("R$ 300,00");
    expect(ctx.valores_formatados["cenarios[0].indicadores.saldo_final_centavos"]).toBe("R$ 3.300,00");
    expect(ctx.valores_formatados["conta.saldo_disponivel_hoje_centavos"]).toBe("R$ 1.800,00");
    expect(ctx.valores_formatados["persona.renda.bruto_mensal_centavos"]).toBe("R$ 3.400,00");
  });

  test("todo campo *_centavos do contexto tem a string formatada correspondente", () => {
    const ctx = montarContextoDeterministico(estadoInicial("p3", snapshotGravado())) as Record<string, unknown> & {
      valores_formatados: Record<string, string>;
    };
    const { valores_formatados, ...corpo } = ctx;
    let campos = 0;
    const varrer = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(varrer);
      else if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v)) {
          if (k.endsWith("_centavos") && typeof x === "number") campos++;
          else varrer(x);
        }
      }
    };
    varrer(corpo);
    expect(campos).toBeGreaterThan(10);
    expect(Object.keys(valores_formatados)).toHaveLength(campos);
  });
});
