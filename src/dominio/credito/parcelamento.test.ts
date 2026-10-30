import Decimal from "decimal.js";
import { describe, expect, test } from "vitest";
import { esquemaResultadoSimulacaoParcelamento, estadoInicial, type EstadoSessao } from "@/contratos";
import { carregarPersona } from "@/dados";
import { escolherOpcoes, simularParcelamento } from "@/dominio/credito/parcelamento";
import { MERCADO_TESTE, P1 as P1_SEM_RENDA, P2 as P2_TESTE } from "@/dominio/caixa/testes/personas";

// CDI de teste: 0,05% ao dia → CDI mensal = 1,0005^21 − 1 ≈ 1,0555% a.m.
const D = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const rP1 = carregarPersona("p1");
if (!rP1.ok) throw new Error(rP1.erro.mensagem);
const P1 = rP1.persona; // renda líquida de R$ 3.000,00
const estado: EstadoSessao = estadoInicial("p1", MERCADO_TESTE);
const CDI_M = new D(1).plus(new D("0.05").div(100)).pow(21).minus(1);

/** PMT Price independente: round(PV × i ÷ (1 − (1+i)^−n)). */
function pmt(pv: number, jurosPct: string, n: number): number {
  const i = new D(jurosPct).div(100);
  return new D(pv).times(i).div(new D(1).minus(new D(1).plus(i).pow(-n))).toDecimalPlaces(0).toNumber();
}

describe("escolherOpcoes", () => {
  test("max 48 → [6, 12, 18, 24, 36, 48]; max 10 → [6, 10]; max 4 → [4]; max 72 → as 6 maiores", () => {
    expect(escolherOpcoes(48)).toEqual([6, 12, 18, 24, 36, 48]);
    expect(escolherOpcoes(10)).toEqual([6, 10]);
    expect(escolherOpcoes(4)).toEqual([4]);
    expect(escolherOpcoes(72)).toEqual([18, 24, 36, 48, 60, 72]);
    expect(escolherOpcoes(50)).toEqual([12, 18, 24, 36, 48, 50]);
  });
  test("opcoes_parcelas explícitas são ordenadas; sem nada → [3, 6, 10, 12]", () => {
    expect(escolherOpcoes(48, [24, 10, 1])).toEqual([1, 10, 24]);
    expect(escolherOpcoes()).toEqual([3, 6, 10, 12]);
  });
});

describe("simularParcelamento", () => {
  test("(a) moto R$ 25.000 até 48x, premissa 2,99% a.m.: Price conferido e à vista é o menor custo", () => {
    const r = simularParcelamento(P1, estado, { valor_centavos: 2_500_000, parcelas_max: 48 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.juros_am_pct).toBe("2.99");
    expect(r.juros_origem).toBe("premissa");
    expect(r.opcoes.map((o) => o.parcelas)).toEqual([6, 12, 18, 24, 36, 48]);
    expect(r.a_vista_centavos).toBe(2_500_000);

    // 48x à mão: (1,0299)^48 ≈ 4,11330; 1 − 1/4,11330 ≈ 0,756888;
    // 25.000 × 0,0299 = 747,50; 747,50 ÷ 0,756888 ≈ 987,62 → 98762 centavos.
    const o48 = r.opcoes.find((o) => o.parcelas === 48)!;
    expect(o48.parcela_centavos).toBe(pmt(2_500_000, "2.99", 48));
    expect(o48.parcela_centavos).toBe(98762);
    // Total = 47 × PMT + última (fecha o saldo; difere de PMT em poucos centavos).
    expect(Math.abs(o48.ultima_parcela_centavos - o48.parcela_centavos)).toBeLessThanOrEqual(48);
    expect(o48.total_pago_centavos).toBe(47 * 98762 + o48.ultima_parcela_centavos);
    expect(o48.juros_total_centavos).toBe(o48.total_pago_centavos - 2_500_000);
    expect(o48.custo_vs_a_vista_centavos).toBe(o48.total_pago_centavos - 2_500_000);
    expect(o48.cet_am_pct).toBe("2.99");

    // Valor presente independente: Σ parcela_k ÷ (1 + CDI_m)^k.
    let vp = new D(0);
    for (let k = 1; k <= 48; k++) {
      const pk = k === 48 ? o48.ultima_parcela_centavos : o48.parcela_centavos;
      vp = vp.plus(new D(pk).div(new D(1).plus(CDI_M).pow(k)));
    }
    expect(o48.valor_presente_centavos).toBe(vp.toDecimalPlaces(0).toNumber());
    expect(o48.vantagem_vs_a_vista_centavos).toBe(2_500_000 - o48.valor_presente_centavos);
    expect(r.cdi_mensal_pct).toBe(CDI_M.times(100).toDecimalPlaces(2).toFixed(2)); // "1.06"

    // 2,99% a.m. > CDI ≈ 1,06% a.m. → toda opção vale mais que o preço à vista.
    for (const o of r.opcoes) expect(o.valor_presente_centavos).toBeGreaterThan(r.a_vista_centavos);
    expect(r.menor_custo).toBe("a_vista");
    expect(r.menor_parcela).toBe(48);
    // Comprometimento: 98762 ÷ 300000 = 32,920666…% → "32.92".
    expect(o48.comprometimento_renda_pct).toBe("32.92");
    expect(r.renda_liquida_mensal_centavos).toBe(300000);
    expect(r.rotulo).toContain("2,99% a.m. (premissa do protótipo)");
    expect(r.rotulo).toContain("nada foi contratado");
  });

  test("(b) sem juros e sem desconto: valor presente < valor e o menor custo é o maior n", () => {
    const r = simularParcelamento(P1, estado, {
      valor_centavos: 100_000,
      parcelas_max: 10,
      juros_am_pct: "0",
      desconto_a_vista_pct: "0",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.juros_am_pct).toBe("0.00");
    expect(r.juros_origem).toBe("informado");
    // 6x: 100.000 ÷ 6 = 16.666,67 → base 16667; última = 100000 − 5 × 16667 = 16665.
    const o6 = r.opcoes.find((o) => o.parcelas === 6)!;
    expect(o6.parcela_centavos).toBe(16667);
    expect(o6.ultima_parcela_centavos).toBe(16665);
    expect(o6.total_pago_centavos).toBe(100_000);
    expect(o6.juros_total_centavos).toBe(0);
    expect(o6.cet_am_pct).toBe("0.00");
    // 10x: parcelas de 10.000 exatas.
    const o10 = r.opcoes.find((o) => o.parcelas === 10)!;
    expect(o10.parcela_centavos).toBe(10_000);
    expect(o10.total_pago_centavos).toBe(100_000);
    for (const o of r.opcoes) {
      expect(o.valor_presente_centavos).toBeLessThan(100_000);
      expect(o.vantagem_vs_a_vista_centavos).toBeGreaterThan(0);
    }
    expect(r.menor_custo).toBe(10);
  });

  test("(b2) desconto à vista grande volta a favorecer o à vista", () => {
    const r = simularParcelamento(P1, estado, {
      valor_centavos: 100_000,
      opcoes_parcelas: [10],
      juros_am_pct: "0",
      desconto_a_vista_pct: "10",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // À vista = 100.000 × 0,90 = 90.000; 10x sem juros no CDI ≈ R$ 943 de hoje > R$ 900.
    expect(r.a_vista_centavos).toBe(90_000);
    expect(r.desconto_a_vista_pct).toBe("10.00");
    expect(r.opcoes[0]!.custo_vs_a_vista_centavos).toBe(10_000);
    expect(r.menor_custo).toBe("a_vista");
  });

  test("(c) entrada: financia só o restante e soma a entrada ao total e ao valor presente", () => {
    const r = simularParcelamento(P1, estado, {
      valor_centavos: 2_500_000,
      entrada_centavos: 500_000,
      opcoes_parcelas: [12],
      juros_am_pct: "1.99",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.financiado_centavos).toBe(2_000_000);
    expect(r.entrada_centavos).toBe(500_000);
    const o = r.opcoes[0]!;
    // PMT(20.000; 1,99%; 12) ≈ R$ 1.889,..; conferido pela fórmula independente.
    expect(o.parcela_centavos).toBe(pmt(2_000_000, "1.99", 12));
    expect(o.total_pago_centavos).toBe(500_000 + 11 * o.parcela_centavos + o.ultima_parcela_centavos);
    expect(o.cet_am_pct).toBe("1.99");
    expect(o.valor_presente_centavos).toBeGreaterThan(500_000);
    expect(r.juros_am_pct).toBe("1.99");
  });

  test("(d) erros tipados: entrada ≥ valor, juros > 30, opções inválidas, desconto > 50, valor 0", () => {
    const base = { valor_centavos: 100_000 };
    const casos: Array<[Parameters<typeof simularParcelamento>[2], string, string]> = [
      [{ ...base, entrada_centavos: 100_000 }, "ARGUMENTOS_INVALIDOS", "entrada"],
      [{ ...base, entrada_centavos: 150_000 }, "ARGUMENTOS_INVALIDOS", "entrada"],
      [{ ...base, juros_am_pct: "30.01" }, "ARGUMENTOS_INVALIDOS", "juros_am_pct"],
      [{ ...base, juros_am_pct: "abc" }, "ARGUMENTOS_INVALIDOS", "juros_am_pct"],
      [{ ...base, opcoes_parcelas: [] }, "ARGUMENTOS_INVALIDOS", "opcoes_parcelas"],
      [{ ...base, opcoes_parcelas: [12, 12] }, "ARGUMENTOS_INVALIDOS", "opcoes_parcelas"],
      [{ ...base, opcoes_parcelas: [0] }, "ARGUMENTOS_INVALIDOS", "opcoes_parcelas"],
      [{ ...base, opcoes_parcelas: [73] }, "ARGUMENTOS_INVALIDOS", "opcoes_parcelas"],
      [{ ...base, opcoes_parcelas: [1, 2, 3, 4, 5, 6, 7] }, "ARGUMENTOS_INVALIDOS", "opcoes_parcelas"],
      [{ ...base, parcelas_max: 1 }, "ARGUMENTOS_INVALIDOS", "parcelas_max"],
      [{ ...base, parcelas_max: 73 }, "ARGUMENTOS_INVALIDOS", "parcelas_max"],
      [{ ...base, desconto_a_vista_pct: "51" }, "ARGUMENTOS_INVALIDOS", "desconto_a_vista_pct"],
      [{ valor_centavos: 0 }, "VALOR_INVALIDO", "valor"],
    ];
    for (const [pedido, codigo, campo] of casos) {
      const r = simularParcelamento(P1, estado, pedido);
      expect(r.ok, JSON.stringify(pedido)).toBe(false);
      if (r.ok) continue;
      expect(r.erro.codigo).toBe(codigo);
      expect(r.erro.campos).toContain(campo);
    }
    // Juros de exatamente 30% é aceito.
    expect(simularParcelamento(P1, estado, { ...base, juros_am_pct: "30" }).ok).toBe(true);
  });

  test("(e) persona sem renda → comprometimento null; persona sem cartão também simula", () => {
    expect(P1_SEM_RENDA.renda).toBeUndefined();
    const r = simularParcelamento(P1_SEM_RENDA, estado, { valor_centavos: 300_000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.opcoes.map((o) => o.parcelas)).toEqual([3, 6, 10, 12]);
    expect(r.renda_liquida_mensal_centavos).toBeNull();
    for (const o of r.opcoes) expect(o.comprometimento_renda_pct).toBeNull();

    expect(P2_TESTE.cartao).toBeNull();
    expect(simularParcelamento(P2_TESTE, estadoInicial("p2", MERCADO_TESTE), { valor_centavos: 300_000 }).ok).toBe(true);
  });

  test("(f) resultado passa no esquema de contrato", () => {
    for (const pedido of [
      { valor_centavos: 2_500_000, parcelas_max: 48 },
      { valor_centavos: 100_000, parcelas_max: 10, juros_am_pct: "0" },
      { valor_centavos: 2_500_000, entrada_centavos: 500_000, opcoes_parcelas: [1, 12], desconto_a_vista_pct: "5" },
    ]) {
      const r = simularParcelamento(P1, estado, pedido);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const { ok: _, ...resultado } = r;
      void _;
      expect(() => esquemaResultadoSimulacaoParcelamento.parse(resultado)).not.toThrow();
    }
  });
});
