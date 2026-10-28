import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { calcularCenarios, compararCenarios, criarHipotese, registrarDeclaracao } from "@/dominio/caixa";
import { CONTEXTO, P1, estadoNovo, origem, reaisDaSpec, saldosDaSpec } from "./testes/personas";
import type { ResultadoCenario } from "@/contratos";

const saldos = (c: ResultadoCenario) => c.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos]);

describe("B1 · motor de caixa · P1", () => {
  test("CR-01: situação atual de P1, com a fatura A derivada", () => {
    const [atual, ...resto] = calcularCenarios(P1, estadoNovo(P1), CONTEXTO);
    expect(resto).toEqual([]);
    expect(atual.cenario_id).toBe("atual");
    expect(atual.status).toBe("calculado");
    expect(saldos(atual)).toEqual(saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"));

    const a = atual.linhas[0];
    expect([a.data, a.tipo, a.meio, a.valor_centavos, a.origem]).toEqual(["2026-11-05", "saida", "debito", 70000, "dados_base"]);

    expect(atual.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("1.800"),
      saldo_minimo_centavos: reaisDaSpec("300"),
      data_saldo_minimo: "2026-11-15",
      primeira_falta: null,
      insuficiencia_centavos: 0,
      margem_hoje_centavos: reaisDaSpec("300"),
      saldo_final_centavos: reaisDaSpec("3.300"),
      sem_recebimentos: { insuficiencia_centavos: 0, primeira_falta: null, saldo_final_centavos: reaisDaSpec("300") },
    });
    expect(atual.avisos).toEqual([]);
    expect(atual.datas_ordem_relevante).toEqual([]);
    expect(atual.linhas.every((l) => l.rotulo === null)).toBe(true);
  });

  test("CR-02: criarHipotese separar 500 hoje gera H1.1, B zerado e falta de 200 em 15/11", () => {
    const r = criarHipotese(
      P1,
      estadoNovo(P1),
      { nome: "Separar R$ 500 hoje", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] },
      origem("m-1"),
    );
    expect(r.ok ? "" : r.erro.mensagem).toBe("");
    if (!r.ok) return;
    expect(r.hipotese_id).toBe("H1");
    expect(r.estado.hipoteses[0].alteracoes.map((a) => [a.id, a.copiado_de])).toEqual([["H1.1", null]]);
    expect(r.estado.contadores.H).toBe(1);

    const [atual, h1] = calcularCenarios(P1, r.estado, CONTEXTO);
    expect(saldos(atual)).toEqual(saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"));
    expect(h1.cenario_id).toBe("H1");
    expect(h1.nome).toBe("Separar R$ 500 hoje");
    expect(saldos(h1)).toEqual(saldosDaSpec("H1.1 1.300 · A 600 · B 0 (Saldo zerado) · C −200 · R1 2.800"));

    const [sep, , b, c] = h1.linhas;
    expect([sep.data, sep.tipo, sep.meio, sep.origem, sep.valor_centavos]).toEqual(["2026-10-30", "saida", "simulacao", "hipotese", 50000]);
    expect(b.rotulo).toBe("Saldo zerado");
    expect(c.rotulo).toBe("Saldo insuficiente (faltam R$ 200,00)");

    const falta = { data: "2026-11-15", valor_descoberto_centavos: reaisDaSpec("200"), saidas_do_dia: ["C"] };
    expect(h1.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("1.800"),
      saldo_minimo_centavos: reaisDaSpec("−200"),
      data_saldo_minimo: "2026-11-15",
      primeira_falta: falta,
      insuficiencia_centavos: reaisDaSpec("200"),
      margem_hoje_centavos: 0,
      saldo_final_centavos: reaisDaSpec("2.800"),
      sem_recebimentos: { insuficiencia_centavos: reaisDaSpec("200"), primeira_falta: falta, saldo_final_centavos: reaisDaSpec("−200") },
    });
    expect(h1.avisos).toEqual(["saldo_final_positivo_com_falta"]);
  });

  test("CR-03: H2 a partir de H1 renumera a cópia (H2.1), move R1 para 09/11 sem duplicar e depende do recebimento", () => {
    const r1 = criarHipotese(P1, estadoNovo(P1), { nome: "Separar R$ 500 hoje", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }, origem("m-1"));
    if (!r1.ok) throw new Error(r1.erro.mensagem);
    const r2 = criarHipotese(
      P1,
      r1.estado,
      { nome: "Salário no dia 9", a_partir_de: "H1", alteracoes: [{ operacao: "alterar_evento", evento_id: "R1", data: "2026-11-09" }] },
      origem("m-2"),
    );
    expect(r2.ok ? "" : r2.erro.mensagem).toBe("");
    if (!r2.ok) return;
    expect(r2.hipotese_id).toBe("H2");
    const h2 = r2.estado.hipoteses[1];
    expect(h2.a_partir_de).toBe("H1");
    expect(h2.alteracoes.map((a) => [a.id, a.copiado_de])).toEqual([
      ["H2.1", "H1.1"],
      ["H2.2", null],
    ]);

    const [atual, cH1, cH2] = calcularCenarios(P1, r2.estado, CONTEXTO);
    expect(saldos(atual)).toEqual(saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"));
    expect(saldos(cH1)).toEqual(saldosDaSpec("H1.1 1.300 · A 600 · B 0 (Saldo zerado) · C −200 · R1 2.800"));
    expect(saldos(cH2)).toEqual(saldosDaSpec("H2.1 1.300 · A 600 · R1 3.600 · B 3.000 · C 2.800"));
    const r1Linha = cH2.linhas.find((l) => l.evento_id === "R1")!;
    expect([r1Linha.data, r1Linha.previsto, r1Linha.original]).toEqual(["2026-11-09", true, { data: "2026-11-19", valor_centavos: 300000 }]);

    expect(cH2.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("1.800"),
      saldo_minimo_centavos: reaisDaSpec("600"),
      data_saldo_minimo: "2026-11-05",
      primeira_falta: null,
      insuficiencia_centavos: 0,
      margem_hoje_centavos: reaisDaSpec("600"),
      saldo_final_centavos: reaisDaSpec("2.800"),
      sem_recebimentos: {
        insuficiencia_centavos: reaisDaSpec("200"),
        primeira_falta: { data: "2026-11-15", valor_descoberto_centavos: reaisDaSpec("200"), saidas_do_dia: ["C"] },
        saldo_final_centavos: reaisDaSpec("−200"),
      },
    });
    expect(cH2.avisos).toEqual(["cobertura_depende_de_recebimento"]);
  });

  describe("declarações sobre a situação atual com H1 ativa", () => {
    const comH1 = () => {
      const r = criarHipotese(P1, estadoNovo(P1), { nome: "Separar R$ 500 hoje", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }, origem("m-1"));
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.estado;
    };

    test("CR-04: D1 contas da casa = 150 recalcula atual e H1 e guarda o original", () => {
      const r = registrarDeclaracao(P1, comH1(), { operacao: "alterar_evento", evento_id: "C", valor: "150" }, origem("m-2"));
      expect(r.ok ? "" : r.erro.mensagem).toBe("");
      if (!r.ok) return;
      expect(r.declaracao_id).toBe("D1");
      expect(r.estado.contadores.D).toBe(1);
      expect(r.estado.declaracoes.map((d) => [d.id, d.mensagem_id])).toEqual([["D1", "m-2"]]);

      const [atual, h1] = calcularCenarios(P1, r.estado, CONTEXTO);
      expect(saldos(atual)).toEqual(saldosDaSpec("A 1.100 · B 500 · C 350 · R1 3.350"));
      const c = atual.linhas.find((l) => l.evento_id === "C")!;
      expect([c.valor_centavos, c.origem, c.original]).toEqual([15000, "declaracao", { data: "2026-11-15", valor_centavos: 20000 }]);
      expect(atual.indicadores).toMatchObject({
        saldo_minimo_centavos: reaisDaSpec("350"),
        data_saldo_minimo: "2026-11-15",
        primeira_falta: null,
        insuficiencia_centavos: 0,
        margem_hoje_centavos: reaisDaSpec("350"),
        saldo_final_centavos: reaisDaSpec("3.350"),
        sem_recebimentos: { insuficiencia_centavos: 0, primeira_falta: null, saldo_final_centavos: reaisDaSpec("350") },
      });
      expect(atual.avisos).toEqual([]);

      expect(saldos(h1)).toEqual(saldosDaSpec("H1.1 1.300 · A 600 · B 0 · C −150 · R1 2.850"));
      const falta = { data: "2026-11-15", valor_descoberto_centavos: reaisDaSpec("150"), saidas_do_dia: ["C"] };
      expect(h1.indicadores).toMatchObject({
        saldo_minimo_centavos: reaisDaSpec("−150"),
        data_saldo_minimo: "2026-11-15",
        primeira_falta: falta,
        insuficiencia_centavos: reaisDaSpec("150"),
        margem_hoje_centavos: 0,
        saldo_final_centavos: reaisDaSpec("2.850"),
        sem_recebimentos: { insuficiencia_centavos: reaisDaSpec("150"), primeira_falta: falta, saldo_final_centavos: reaisDaSpec("−150") },
      });
      expect(h1.avisos).toEqual(["saldo_final_positivo_com_falta"]);
    });

    test("CR-05: D1 aluguel em 21/11 recalcula atual e H1", () => {
      const r = registrarDeclaracao(P1, comH1(), { operacao: "alterar_evento", evento_id: "B", data: "2026-11-21" }, origem("m-2"));
      if (!r.ok) throw new Error(r.erro.mensagem);
      const [atual, h1] = calcularCenarios(P1, r.estado, CONTEXTO);
      expect(saldos(atual)).toEqual(saldosDaSpec("A 1.100 · C 900 · R1 3.900 · B 3.300"));
      expect(atual.indicadores).toMatchObject({
        saldo_minimo_centavos: reaisDaSpec("900"),
        data_saldo_minimo: "2026-11-15",
        primeira_falta: null,
        insuficiencia_centavos: 0,
        margem_hoje_centavos: reaisDaSpec("900"),
        saldo_final_centavos: reaisDaSpec("3.300"),
        sem_recebimentos: { insuficiencia_centavos: 0, primeira_falta: null, saldo_final_centavos: reaisDaSpec("300") },
      });
      expect(atual.avisos).toEqual([]);

      expect(saldos(h1)).toEqual(saldosDaSpec("H1.1 1.300 · A 600 · C 400 · R1 3.400 · B 2.800"));
      expect(h1.indicadores).toMatchObject({
        saldo_minimo_centavos: reaisDaSpec("400"),
        data_saldo_minimo: "2026-11-15",
        primeira_falta: null,
        insuficiencia_centavos: 0,
        margem_hoje_centavos: reaisDaSpec("400"),
        saldo_final_centavos: reaisDaSpec("2.800"),
        sem_recebimentos: {
          insuficiencia_centavos: reaisDaSpec("200"),
          primeira_falta: { data: "2026-11-21", valor_descoberto_centavos: reaisDaSpec("200"), saidas_do_dia: ["B"] },
          saldo_final_centavos: reaisDaSpec("−200"),
        },
      });
      expect(h1.avisos).toEqual(["cobertura_depende_de_recebimento"]);
    });

    test("compararCenarios antes × depois de CR-04 lista D1 e as diferenças de indicadores (igual ao exemplo do contrato)", () => {
      const antes = comH1();
      const r = registrarDeclaracao(P1, antes, { operacao: "alterar_evento", evento_id: "C", valor: "150" }, origem("m-2"));
      if (!r.ok) throw new Error(r.erro.mensagem);
      const mudou = compararCenarios(
        { estado: antes, cenarios: calcularCenarios(P1, antes, CONTEXTO) },
        { estado: r.estado, cenarios: calcularCenarios(P1, r.estado, CONTEXTO) },
      );
      const exemplo = JSON.parse(
        readFileSync(join(__dirname, "..", "..", "contratos", "exemplos", "cartao-o-que-mudou-cr04.json"), "utf8"),
      ).dados;
      expect(mudou).toEqual({ alteracoes: exemplo.alteracoes, cenarios: exemplo.cenarios });
    });
  });
});
