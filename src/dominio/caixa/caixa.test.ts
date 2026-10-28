import { describe, expect, test } from "vitest";
import { calcularCenarios, criarHipotese } from "@/dominio/caixa";
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
});
