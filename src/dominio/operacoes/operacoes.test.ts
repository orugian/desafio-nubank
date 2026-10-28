import { describe, expect, test } from "vitest";
import { esquemaPropostaMovimentacao } from "@/contratos";
import { proporMovimentacao } from "@/dominio/operacoes";
import { calcularCenarios } from "@/dominio/caixa";
import { CONTEXTO, P1, estadoNovo, reaisDaSpec } from "@/dominio/caixa/testes/personas";

const indicadoresCR02 = () => {
  const falta = { data: "2026-11-15", valor_descoberto_centavos: reaisDaSpec("200"), saidas_do_dia: ["C"] };
  return {
    saldo_inicial_centavos: reaisDaSpec("1.800"), saldo_minimo_centavos: reaisDaSpec("−200"), data_saldo_minimo: "2026-11-15",
    primeira_falta: falta, insuficiencia_centavos: reaisDaSpec("200"), margem_hoje_centavos: 0, saldo_final_centavos: reaisDaSpec("2.800"),
    sem_recebimentos: { insuficiencia_centavos: reaisDaSpec("200"), primeira_falta: falta, saldo_final_centavos: reaisDaSpec("−200") },
  };
};

describe("B1c · operações simuladas", () => {
  test("CR-40: proposta de guardar 500 na Viagem cria OP1 pendente, impacto de CR-02 e alerta de falta", () => {
    const estado = estadoNovo(P1);
    const antes = structuredClone(estado);
    const r = proporMovimentacao(P1, estado, { valor: "500", destino: "INV9" }, CONTEXTO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.operacao_pendente).toEqual({ id: "OP1", valor_centavos: reaisDaSpec("500"), destino: "INV9", criada_na_versao: 0 });
    expect(r.estado.operacao_pendente).toEqual(r.operacao_pendente);
    expect(r.estado.contadores.OP).toBe(1);
    expect(r.estado.operacoes).toEqual([]);
    expect(r.estado.versao).toBe(0);
    expect(r.destino).toEqual({ posicao_id: "INV9", nome: "Caixinha Viagem", rende: true, cdi_pct: 100 });
    expect(r.impacto.cenario_id).toBe("OP1");
    expect(r.impacto.indicadores).toEqual(indicadoresCR02());
    expect(r.impacto.avisos).toEqual(["saldo_final_positivo_com_falta"]);
    expect(r.alerta).toBe("Com essa movimentação, faltariam R$ 200,00 em 15/11.");
    expect(esquemaPropostaMovimentacao.safeParse(r).success).toBe(true);
    expect(calcularCenarios(P1, r.estado, CONTEXTO)).toEqual(calcularCenarios(P1, estado, CONTEXTO));
    expect(estado).toEqual(antes);
  });
});
