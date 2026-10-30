import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  DIAS_HISTORICO,
  FIM_HISTORICO,
  INICIO_HISTORICO,
  estadoInicial,
  type SnapshotMercado,
} from "@/contratos";
import { carregarPersona, verificarInvariantes } from "@/dados";
import { calcularCenarios } from "@/dominio/caixa";
import { CONTEXTO, MERCADO_TESTE, reaisDaSpec, saldosDaSpec } from "@/dominio/caixa/testes/personas";
import { resumirParcelamentos } from "@/dominio/cartao";
import { criarExecutores } from "@/conversa/executores";

const snapTeste: SnapshotMercado = {
  ao_vivo: false,
  obtido_em: "2026-10-28T11:00:00-03:00",
  tentou_ao_vivo: false,
  cdi: { taxa_diaria_pct: "0.05", data_ref: "2026-10-29", fonte: "CDI de teste" },
  precos: {},
};

describe("NINA-A · Janela histórica de 6 meses (30/04/2026 a 29/10/2026, 183 dias)", () => {
  test("constantes de janela histórica em comum.ts", () => {
    expect(INICIO_HISTORICO).toBe("2026-04-30");
    expect(DIAS_HISTORICO).toBe(183);
    expect(FIM_HISTORICO).toBe("2026-10-29");
  });

  test("P1, P2 e P3 geradas passam sem nenhuma violação nos invariantes 1..12", () => {
    for (const id of ["p1", "p2", "p3"] as const) {
      const r = carregarPersona(id);
      expect(r.ok ? "" : JSON.stringify(r.erro)).toBe("");
      if (!r.ok) continue;
      expect(verificarInvariantes(r.persona)).toEqual([]);
    }
  });

  test("transações coerentes cobrindo os meses extras (maio, junho, julho) e sem receitas no dia parcial 30/04", () => {
    for (const id of ["p1", "p2", "p3"] as const) {
      const r = carregarPersona(id);
      if (!r.ok) throw new Error(r.erro.mensagem);
      const p = r.persona;

      // Todos os lançamentos estão dentro da janela 30/04 a 29/10
      for (const l of p.historico) {
        expect(l.data >= INICIO_HISTORICO).toBe(true);
        expect(l.data <= FIM_HISTORICO).toBe(true);
      }

      // Nenhuma receita em 30/04
      const receitas3004 = p.historico.filter((l) => l.data === "2026-04-30" && l.tipo === "entrada");
      expect(receitas3004).toEqual([]);

      // Meses presentes no histórico abrangem maio a outubro
      const meses = new Set(p.historico.map((l) => l.data.slice(0, 7)));
      expect(meses.has("2026-05")).toBe(true);
      expect(meses.has("2026-06")).toBe(true);
      expect(meses.has("2026-07")).toBe(true);
      expect(meses.has("2026-08")).toBe(true);
      expect(meses.has("2026-09")).toBe(true);
      expect(meses.has("2026-10")).toBe(true);
    }
  });

  test("Invariante 2: checkpoint saldo_30_07_centavos e saldo_inicio_historico_centavos", () => {
    for (const id of ["p1", "p2", "p3"] as const) {
      const r = carregarPersona(id);
      if (!r.ok) throw new Error(r.erro.mensagem);
      const p = r.persona;

      expect(p.conta.saldo_inicio_historico_centavos).toBeDefined();

      const movDesde3007 = p.historico
        .filter((l) => l.meio !== "cartao_credito" && l.data >= "2026-07-30")
        .reduce((s, l) => s + (l.tipo === "entrada" ? l.valor_centavos : -l.valor_centavos), 0);
      expect(p.conta.saldo_30_07_centavos + movDesde3007).toBe(p.conta.saldo_inicio_hoje_centavos);

      const movTotal = p.historico
        .filter((l) => l.meio !== "cartao_credito")
        .reduce((s, l) => s + (l.tipo === "entrada" ? l.valor_centavos : -l.valor_centavos), 0);
      expect(p.conta.saldo_inicio_historico_centavos! + movTotal).toBe(p.conta.saldo_inicio_hoje_centavos);
    }
  });

  test("Gastos diários: teto(total_variavel / 183) preserva exatamente os valores originais", () => {
    const r1 = carregarPersona("p1");
    const r2 = carregarPersona("p2");
    const r3 = carregarPersona("p3");
    if (!r1.ok || !r2.ok || !r3.ok) throw new Error("falha ao carregar");

    // P1: diário 0
    expect(r1.persona.gasto_diario.valor_centavos).toBe(0);
    expect(r1.persona.gasto_diario.base.dias).toBe(183);
    expect(r1.persona.gasto_diario.base.total_centavos).toBe(0);

    // P2: diário 15,00 (1500 centavos)
    expect(r2.persona.gasto_diario.valor_centavos).toBe(1500);
    expect(r2.persona.gasto_diario.base.dias).toBe(183);
    expect(r2.persona.gasto_diario.base.total_centavos).toBe(274500);
    expect(Math.floor((274500 + 183 - 1) / 183)).toBe(1500);

    // P3: diário 10,00 (1000 centavos)
    expect(r3.persona.gasto_diario.valor_centavos).toBe(1000);
    expect(r3.persona.gasto_diario.base.dias).toBe(183);
    expect(r3.persona.gasto_diario.base.total_centavos).toBe(183000);
    expect(Math.floor((183000 + 183 - 1) / 183)).toBe(1000);
  });

  test("Renda e Invariante 12: média mensal em 6 meses bate liquido_mensal_centavos", () => {
    const r1 = carregarPersona("p1");
    const r2 = carregarPersona("p2");
    const r3 = carregarPersona("p3");
    if (!r1.ok || !r2.ok || !r3.ok) throw new Error("falha");

    // P1: 6 meses de 3.000,00
    expect(r1.persona.renda!.liquido_mensal_centavos).toBe(300000);

    // P2: receitas extras mai/jun/jul somam 715000; total 1.430.000 / 6 = 238333
    const recP2 = r2.persona.historico.filter((l) => l.tipo === "entrada" && l.categoria === "receitas");
    const somaP2 = recP2.reduce((s, l) => s + l.valor_centavos, 0);
    expect(somaP2).toBe(1430000);
    expect(Math.round(somaP2 / 6)).toBe(238333);
    expect(r2.persona.renda!.liquido_mensal_centavos).toBe(238333);

    // P3: 6 meses de 4.200,00
    expect(r3.persona.renda!.liquido_mensal_centavos).toBe(420000);
  });

  test("Investimentos no histórico (Invariante 8): saídas para aportes dentro do histórico", () => {
    const r2 = carregarPersona("p2");
    const r3 = carregarPersona("p3");
    if (!r2.ok || !r3.ok) throw new Error("falha");

    // P2: INV4 aporte em 2026-05-04 de 200.000
    const inv4Lanc = r2.persona.historico.find(
      (l) => l.posicao_id === "INV4" && l.data === "2026-05-04" && l.valor_centavos === 200000,
    );
    expect(inv4Lanc).toBeDefined();
    expect(inv4Lanc?.tipo).toBe("saida");
    expect(inv4Lanc?.meio).toBe("debito");

    // P3: INV7 aporte em 2026-06-10 de 150.000
    const inv7Lanc = r3.persona.historico.find(
      (l) => l.posicao_id === "INV7" && l.data === "2026-06-10" && l.valor_centavos === 150000,
    );
    expect(inv7Lanc).toBeDefined();
    expect(inv7Lanc?.tipo).toBe("saida");
    expect(inv7Lanc?.meio).toBe("debito");
  });

  test("resumirParcelamentos: P1 Celular tem exatamente 4 pagas, 6 restantes e saldo restante 900,00", () => {
    const r1 = carregarPersona("p1");
    if (!r1.ok) throw new Error("falha");
    const estado = estadoInicial("p1", snapTeste);
    const resumos = resumirParcelamentos(r1.persona, estado);

    expect(resumos).toHaveLength(1);
    const celular = resumos[0];
    expect(celular).toEqual({
      id: "PC1",
      descricao: "Celular",
      data_compra: "2026-06-20",
      valor_total_centavos: 150000,
      parcelas: 10,
      valor_parcela_centavos: 15000,
      parcelas_pagas: 4,
      parcelas_restantes: 6,
      saldo_restante_centavos: 90000,
      proximo_vencimento: "2026-11-05",
      ultimo_vencimento: "2027-04-05",
      quitado: false,
    });
  });

  test("resumirParcelamentos: P3 Geladeira tem 2 pagas, 8 restantes e saldo restante 2.000,00", () => {
    const r3 = carregarPersona("p3");
    if (!r3.ok) throw new Error("falha");
    const estado = estadoInicial("p3", snapTeste);
    const resumos = resumirParcelamentos(r3.persona, estado);

    expect(resumos).toHaveLength(1);
    const geladeira = resumos[0];
    expect(geladeira).toEqual({
      id: "PC1",
      descricao: "Geladeira",
      data_compra: "2026-08-15",
      valor_total_centavos: 250000,
      parcelas: 10,
      valor_parcela_centavos: 25000,
      parcelas_pagas: 2,
      parcelas_restantes: 8,
      saldo_restante_centavos: 200000,
      proximo_vencimento: "2026-11-05",
      ultimo_vencimento: "2027-06-05",
      quitado: false,
    });
  });

  test("resumirParcelamentos: P2 não tem cartão e retorna lista vazia", () => {
    const r2 = carregarPersona("p2");
    if (!r2.ok) throw new Error("falha");
    const estado = estadoInicial("p2", snapTeste);
    expect(resumirParcelamentos(r2.persona, estado)).toEqual([]);
  });

  test("consultar_cartao executor expõe parcelamentos no resultado", async () => {
    const r1 = carregarPersona("p1");
    if (!r1.ok) throw new Error("falha");
    const executores = criarExecutores();
    const estado = estadoInicial("p1", snapTeste);
    const res = await executores.ferramentas.consultar_cartao({}, { estado, mensagem_id: "m-parc" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const parcelamentos = res.resultado.parcelamentos as Array<{ parcelas_restantes: number; saldo_restante_centavos: number }>;
    expect(parcelamentos).toHaveLength(1);
    expect(parcelamentos[0]!.parcelas_restantes).toBe(6);
    expect(parcelamentos[0]!.saldo_restante_centavos).toBe(90000);
    expect((res.resultado.valores_formatados as Record<string, string>)["parcelamentos[0].saldo_restante_centavos"]).toBe("R$ 900,00");
  });

  test("Não regressão das projeções de caixa (CR-01, CR-09, CR-13)", () => {
    const r1 = carregarPersona("p1");
    const r2 = carregarPersona("p2");
    const r3 = carregarPersona("p3");
    if (!r1.ok || !r2.ok || !r3.ok) throw new Error("falha");

    // CR-01 (P1)
    const [cr01] = calcularCenarios(r1.persona, estadoInicial("p1", MERCADO_TESTE), CONTEXTO);
    expect(cr01.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(
      saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"),
    );
    expect(cr01.indicadores!.saldo_minimo_centavos).toBe(reaisDaSpec("300"));
    expect(cr01.indicadores!.saldo_final_centavos).toBe(reaisDaSpec("3.300"));

    // CR-09 (P2)
    const [cr09] = calcularCenarios(r2.persona, estadoInicial("p2", MERCADO_TESTE), CONTEXTO);
    expect(cr09.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(
      saldosDaSpec("G1 795 · E1 675 · G2 570 · E2 −530 · E3 970 · E4 790 · G3 685 · G4 580 · E5 180 · G5 135"),
    );
    expect(cr09.indicadores!.saldo_minimo_centavos).toBe(reaisDaSpec("−530"));
    expect(cr09.indicadores!.saldo_final_centavos).toBe(reaisDaSpec("135"));

    // CR-13 (P3)
    const [cr13] = calcularCenarios(r3.persona, estadoInicial("p3", MERCADO_TESTE), CONTEXTO);
    expect(cr13.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(
      saldosDaSpec("G1 2.430 · E1 1.530 · E2 280 · G2 210 · G3 140 · E3 4.340 · E4 3.040 · G4 2.970 · G5 2.940 · E5 2.290"),
    );
    expect(cr13.indicadores!.saldo_minimo_centavos).toBe(reaisDaSpec("140"));
    expect(cr13.indicadores!.saldo_final_centavos).toBe(reaisDaSpec("2.290"));
  });

  test("Compatibilidade regressiva: fixtures legadas sintéticas de 92 dias continuam válidas", () => {
    const caminhoMinima = join(__dirname, "..", "..", "dados", "personas", "p1-minima.json");
    const p1Minima = JSON.parse(readFileSync(caminhoMinima, "utf8"));
    expect(verificarInvariantes(p1Minima)).toEqual([]);
  });
});
