import { describe, expect, test } from "vitest";
import { esquemaConfirmacaoMovimentacao, esquemaPropostaMovimentacao } from "@/contratos";
import { cancelarMovimentacao, confirmarMovimentacao, proporMovimentacao } from "@/dominio/operacoes";
import { calcularCenarios, compararCenarios, criarHipotese, registrarDeclaracao, validarEstado } from "@/dominio/caixa";
import { CONTEXTO, P1, P3, estadoNovo, origem, reaisDaSpec, saldosDaSpec } from "@/dominio/caixa/testes/personas";

const indicadoresCR02 = () => {
  const falta = { data: "2026-11-15", valor_descoberto_centavos: reaisDaSpec("200"), saidas_do_dia: ["C"] };
  return {
    saldo_inicial_centavos: reaisDaSpec("1.800"), saldo_minimo_centavos: reaisDaSpec("−200"), data_saldo_minimo: "2026-11-15",
    primeira_falta: falta, insuficiencia_centavos: reaisDaSpec("200"), margem_hoje_centavos: 0, saldo_final_centavos: reaisDaSpec("2.800"),
    sem_recebimentos: { insuficiencia_centavos: reaisDaSpec("200"), primeira_falta: falta, saldo_final_centavos: reaisDaSpec("−200") },
  };
};

describe("B1c · operações simuladas", () => {
  test("R-24/CR-40/CR-41: comparação distingue proposta, cancelamento, expiração e hipóteses descartadas", () => {
    const inicial = estadoNovo(P1);
    const entrada = (estado: typeof inicial) => ({ estado, cenarios: calcularCenarios(P1, estado, CONTEXTO) });
    const p = proporMovimentacao(P1, inicial, { valor: "500", destino: "INV9" }, CONTEXTO);
    if (!p.ok) throw new Error(p.erro.mensagem);
    expect(compararCenarios(entrada(inicial), entrada(p.estado)).alteracoes.map((a) => [a.tipo, a.id])).toEqual([["operacao_proposta", "OP1"]]);
    const c = cancelarMovimentacao(p.estado, "OP1");
    if (!c.ok) throw new Error(c.erro.mensagem);
    expect(compararCenarios(entrada(p.estado), entrada(c.estado)).alteracoes.map((a) => [a.tipo, a.id])).toEqual([["operacao_cancelada", "OP1"]]);
    const d = registrarDeclaracao(P1, p.estado, { operacao: "alterar_evento", evento_id: "C", valor: "150" }, origem());
    if (!d.ok) throw new Error(d.erro.mensagem);
    expect(compararCenarios(entrada(p.estado), entrada(d.estado)).alteracoes.map((a) => a.tipo)).toEqual(["declaracao_registrada", "operacao_expirada"]);
    const h = criarHipotese(P1, p.estado, { nome: "Separar", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }, origem());
    if (!h.ok) throw new Error(h.erro.mensagem);
    const r = confirmarMovimentacao(P1, h.estado, "OP1");
    if (!r.ok) throw new Error(r.erro.mensagem);
    const mudou = compararCenarios(entrada(h.estado), entrada(r.estado));
    expect(mudou.alteracoes.map((a) => [a.tipo, a.id])).toEqual([["hipotese_descartada", "H1"], ["operacao_executada", "OP1"]]);
    expect(mudou.cenarios[0].diferencas).toContainEqual({ indicador: "insuficiencia_centavos", antes: 0, depois: reaisDaSpec("200") });
  });
  test("O-06: cancelar OP1 zera só a pendente e o id não é reutilizado", () => {
    const p = proporMovimentacao(P1, estadoNovo(P1), { valor: "500", destino: "INV9" }, CONTEXTO);
    if (!p.ok) throw new Error(p.erro.mensagem);
    const antes = structuredClone(p.estado);
    const errado = cancelarMovimentacao(p.estado, "OP2");
    expect(errado.ok ? "ok" : errado.erro.codigo).toBe("OPERACAO_EXPIRADA");
    const r = cancelarMovimentacao(p.estado, "OP1");
    if (!r.ok) throw new Error(r.erro.mensagem);
    expect(r.estado).toEqual({ ...antes, operacao_pendente: null });
    expect(p.estado).toEqual(antes);
    const confirmar = confirmarMovimentacao(P1, r.estado, "OP1");
    expect(confirmar.ok ? "ok" : confirmar.erro.codigo).toBe("OPERACAO_EXPIRADA");
    const nova = proporMovimentacao(P1, r.estado, { valor: "500", destino: "INV9" }, CONTEXTO);
    expect(nova.ok && nova.operacao_pendente.id).toBe("OP2");
  });
  test("CR-44/CR-44b: recusa 2.000 com 1.800, 1.400 após OP1 e 2.100 após saída declarada de 480", () => {
    const estado = estadoNovo(P1);
    const antes = structuredClone(estado);
    const acima = proporMovimentacao(P1, estado, { valor: "2000", destino: "INV9" }, CONTEXTO);
    expect(acima.ok ? "ok" : acima.erro.codigo).toBe("SALDO_INSUFICIENTE_HOJE");
    const p = proporMovimentacao(P1, estado, { valor: "500", destino: "INV9" }, CONTEXTO);
    if (!p.ok) throw new Error(p.erro.mensagem);
    const r = confirmarMovimentacao(P1, p.estado, "OP1");
    if (!r.ok) throw new Error(r.erro.mensagem);
    const apos = proporMovimentacao(P1, r.estado, { valor: "1400", destino: "INV9" }, CONTEXTO);
    expect(apos.ok ? "ok" : apos.erro.codigo).toBe("SALDO_INSUFICIENTE_HOJE");
    const d = registrarDeclaracao(P3, estadoNovo(P3), { operacao: "adicionar_evento", tipo: "saida", descricao: "Supermercado", data: "2026-10-30", valor: "480", meio: "pix", confirmar_nao_duplicado: true }, origem());
    if (!d.ok) throw new Error(d.erro.mensagem);
    const p3 = proporMovimentacao(P3, d.estado, { valor: "2100", destino: "SEP" }, CONTEXTO);
    expect(p3.ok ? "ok" : p3.erro.codigo).toBe("SALDO_INSUFICIENTE_HOJE");
    if (!p3.ok) expect(p3.erro.detalhes).toEqual({ saldo_disponivel_hoje_centavos: reaisDaSpec("2.020") });
    expect(estado).toEqual(antes);
  });
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
