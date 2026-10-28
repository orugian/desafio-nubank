import { describe, expect, test } from "vitest";
import { calcularCenarios } from "@/dominio/caixa";
import { CONTEXTO, P1, estadoNovo, reaisDaSpec, saldosDaSpec } from "./testes/personas";
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
});
