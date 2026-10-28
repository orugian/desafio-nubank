import { describe, expect, test } from "vitest";
import { esquemaConfirmacaoMovimentacao, esquemaPropostaMovimentacao } from "@/contratos";
import { confirmarMovimentacao, proporMovimentacao } from "@/dominio/operacoes";
import { calcularCenarios, criarHipotese, registrarDeclaracao, validarEstado } from "@/dominio/caixa";
import { CONTEXTO, P1, estadoNovo, origem, reaisDaSpec, saldosDaSpec } from "@/dominio/caixa/testes/personas";

const indicadoresCR02 = () => {
  const falta = { data: "2026-11-15", valor_descoberto_centavos: reaisDaSpec("200"), saidas_do_dia: ["C"] };
  return {
    saldo_inicial_centavos: reaisDaSpec("1.800"), saldo_minimo_centavos: reaisDaSpec("−200"), data_saldo_minimo: "2026-11-15",
    primeira_falta: falta, insuficiencia_centavos: reaisDaSpec("200"), margem_hoje_centavos: 0, saldo_final_centavos: reaisDaSpec("2.800"),
    sem_recebimentos: { insuficiencia_centavos: reaisDaSpec("200"), primeira_falta: falta, saldo_final_centavos: reaisDaSpec("−200") },
  };
};

describe("B1c · operações simuladas", () => {
  test("CR-42/CR-43/O-06: repetição é recusada, declaração expira e hipótese não expira proposta", () => {
    const p = proporMovimentacao(P1, estadoNovo(P1), { valor: "500", destino: "INV9" }, CONTEXTO);
    if (!p.ok) throw new Error(p.erro.mensagem);
    const executada = confirmarMovimentacao(P1, p.estado, "OP1");
    if (!executada.ok) throw new Error(executada.erro.mensagem);
    const repetida = confirmarMovimentacao(P1, executada.estado, "OP1");
    expect(repetida.ok ? "ok" : repetida.erro.codigo).toBe("OPERACAO_JA_EXECUTADA");
    expect(executada.estado.operacoes).toHaveLength(1);
    const d = registrarDeclaracao(P1, p.estado, { operacao: "alterar_evento", evento_id: "C", valor: "150" }, origem());
    if (!d.ok) throw new Error(d.erro.mensagem);
    expect(d.estado.operacao_pendente).toBeNull();
    const expirada = confirmarMovimentacao(P1, d.estado, "OP1");
    expect(expirada.ok ? "ok" : expirada.erro.codigo).toBe("OPERACAO_EXPIRADA");
    const h = criarHipotese(P1, p.estado, { nome: "Separar 500", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }, origem());
    if (!h.ok) throw new Error(h.erro.mensagem);
    const aposTurno = { ...h.estado, versao: 2 };
    expect(confirmarMovimentacao(P1, aposTurno, "OP1").ok).toBe(true);
    const nova = proporMovimentacao(P1, p.estado, { valor: "300", destino: "SEP" }, CONTEXTO);
    if (!nova.ok) throw new Error(nova.erro.mensagem);
    expect(nova.operacao_pendente.id).toBe("OP2");
    const antiga = confirmarMovimentacao(P1, nova.estado, "OP1");
    expect(antiga.ok ? "ok" : antiga.erro.codigo).toBe("OPERACAO_EXPIRADA");
  });
  test("CR-41: confirmar OP1 registra saída simulada, descarta H1/H2 e deixa saldo disponível 1.300", () => {
    const h1 = criarHipotese(P1, estadoNovo(P1), { nome: "Separar 500", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }, origem());
    if (!h1.ok) throw new Error(h1.erro.mensagem);
    const h2 = criarHipotese(P1, h1.estado, { nome: "Salário antes", a_partir_de: "H1", alteracoes: [{ operacao: "alterar_evento", evento_id: "R1", data: "2026-11-09" }] }, origem());
    if (!h2.ok) throw new Error(h2.erro.mensagem);
    const p = proporMovimentacao(P1, h2.estado, { valor: "500", destino: "INV9" }, CONTEXTO);
    if (!p.ok) throw new Error(p.erro.mensagem);
    const antes = structuredClone(p.estado);
    const r = confirmarMovimentacao(P1, p.estado, "OP1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.operacao).toEqual({ id: "OP1", valor_centavos: reaisDaSpec("500"), destino: "INV9", data: "2026-10-30" });
    expect(r.estado.operacoes).toEqual([r.operacao]);
    expect(r.estado.operacao_pendente).toBeNull();
    expect(r.estado.hipoteses).toEqual([]);
    expect(r.hipoteses_descartadas).toEqual(["H1", "H2"]);
    expect(r.estado.contadores).toEqual({ D: 0, H: 2, OP: 1 });
    expect(r.saldo_disponivel_hoje_centavos).toBe(reaisDaSpec("1.300"));
    const [atual, ...outros] = calcularCenarios(P1, r.estado, CONTEXTO);
    expect(outros).toEqual([]);
    expect(atual.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(saldosDaSpec("OP1 1.300 · A 600 · B 0 · C −200 · R1 2.800"));
    expect(atual.linhas[0]).toMatchObject({ meio: "movimentacao_interna", origem: "operacao", descricao: "Movimentação simulada para Caixinha Viagem" });
    expect(atual.indicadores).toEqual(indicadoresCR02());
    expect(esquemaConfirmacaoMovimentacao.safeParse(r).success).toBe(true);
    expect(validarEstado(P1, r.estado, CONTEXTO)).toEqual({ ok: true });
    expect(p.estado).toEqual(antes);
  });
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
