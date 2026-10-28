import { describe, expect, test } from "vitest";
import { carregarPersona, listarPersonas } from "@/dados";

// B0 · comportamento 4: carregarPersona("p1") com a P1 mínima passa nos
// invariantes aplicáveis (spec §4.2). A P1 mínima não tem histórico.

describe("carregarPersona com a P1 mínima", () => {
  test("carrega P1 com saldo 1.800, compromissos B, C e R1 e a fatura fechada A de 700 (spec §11.1)", () => {
    const r = carregarPersona("p1");
    expect(r.ok ? "" : r.erro.mensagem).toBe("");
    if (!r.ok) return;
    const p = r.persona;
    expect(p.conta.saldo_inicio_hoje_centavos).toBe(180000);
    expect(p.gasto_diario.valor_centavos).toBe(0);
    expect(p.compromissos.map((c) => [c.id, c.data, c.tipo, c.valor_centavos, c.previsto])).toEqual([
      ["B", "2026-11-10", "saida", 60000, false],
      ["C", "2026-11-15", "saida", 20000, false],
      ["R1", "2026-11-19", "entrada", 300000, true],
    ]);
    const a = p.cartao?.faturas.find((f) => f.id === "A");
    expect([a?.status, a?.fechamento, a?.vencimento, a?.valor_centavos]).toEqual(["fechada", "2026-10-29", "2026-11-05", 70000]);
    expect(p.posicoes.map((x) => x.id)).toEqual(["SEP", "INV1", "INV9", "INV2", "INV3"]);
  });

  test("persona inexistente é erro tipado, sem exceção", () => {
    const r = carregarPersona("p9");
    expect(r.ok).toBe(false);
  });

  test("listarPersonas inclui P1 com nome e resumo", () => {
    expect(listarPersonas()).toContainEqual({
      id: "p1",
      nome: "Bia (fictícia)",
      resumo: "Quer juntar dinheiro para uma viagem.",
    });
  });
});
