import { describe, expect, test } from "vitest";
import { esquemaAlocacaoCompra, esquemaCartaoVisao, esquemaResultadoCenario, type Alteracao } from "@/contratos";
import { alocarCompra, consultarCartao, verificarDuplicidade } from "@/dominio/cartao";
import { calcularCenarios, criarHipotese, registrarDeclaracao, validarEstado } from "@/dominio/caixa";
import { CONTEXTO, P1, P2, P3, estadoNovo, origem, reaisDaSpec, saldosDaSpec } from "@/dominio/caixa/testes/personas";

describe("B1b · cartão e caixa", () => {
  test("C-07: compra declarada na aberta também exige confirmação em gasto posterior, sem detectar a si própria", () => {
    const compra: Alteracao = { operacao: "adicionar_evento", tipo: "saida", descricao: "Compra fictícia", data: "2026-10-30", valor: "200", meio: "cartao_credito" };
    const gasto: Alteracao = { ...compra, descricao: "Outra compra", meio: "pix" };
    const d1 = registrarDeclaracao(P1, estadoNovo(P1), compra, origem());
    if (!d1.ok) throw new Error(d1.erro.mensagem);
    expect(validarEstado(P1, d1.estado, CONTEXTO)).toEqual({ ok: true });
    const d2 = registrarDeclaracao(P1, d1.estado, gasto, origem());
    expect(d2.ok ? "ok" : d2.erro.codigo).toBe("POSSIVEL_DUPLICIDADE");
    if (!d2.ok) expect(d2.erro.mensagem).toContain("Compra fictícia 200,00, fatura de 05/12");
    const h = criarHipotese(P1, estadoNovo(P1), { nome: "Duas compras", a_partir_de: "atual", alteracoes: [compra, gasto] }, origem());
    expect(h.ok ? "ok" : h.erro.codigo).toBe("POSSIVEL_DUPLICIDADE");
    const confirmado = registrarDeclaracao(P1, d1.estado, { ...gasto, confirmar_nao_duplicado: true }, origem());
    if (!confirmado.ok) throw new Error(confirmado.erro.mensagem);
    expect(validarEstado(P1, confirmado.estado, CONTEXTO)).toEqual({ ok: true });
  });
  test("C-03: correção de compra parcelada com menos centavos que parcelas é recusada antes de aplicar", () => {
    const d = registrarDeclaracao(P1, estadoNovo(P1), { operacao: "adicionar_evento", tipo: "saida", descricao: "Compra em 3x", data: "2026-10-30", valor: "1000", meio: "cartao_credito", parcelas: 3 }, origem());
    if (!d.ok) throw new Error(d.erro.mensagem);
    const antes = structuredClone(d.estado);
    const r = registrarDeclaracao(P1, d.estado, { operacao: "alterar_evento", evento_id: "D1", valor: "0.01" }, origem());
    expect(r.ok ? "ok" : r.erro.codigo).toBe("VALOR_INVALIDO");
    expect(d.estado).toEqual(antes);
  });
  test("C-01/C-05/R-18: compra declarada em fatura aberta pode ser corrigida e removida sem virar caixa", () => {
    const d1 = registrarDeclaracao(P1, estadoNovo(P1), { operacao: "adicionar_evento", tipo: "saida", descricao: "Compra fictícia", data: "2026-10-30", valor: "200", meio: "cartao_credito" }, origem());
    if (!d1.ok) throw new Error(d1.erro.mensagem);
    const d2 = registrarDeclaracao(P1, d1.estado, { operacao: "alterar_evento", evento_id: "D1", valor: "150", data: "2026-11-29" }, origem());
    expect(d2.ok).toBe(true);
    if (!d2.ok) return;
    const c = calcularCenarios(P1, d2.estado, CONTEXTO)[0];
    expect(c.faturas_afetadas).toEqual([{ fatura_id: "F2701", vencimento: "2027-01-05", total_antes_centavos: reaisDaSpec("150"), total_depois_centavos: reaisDaSpec("300") }]);
    const cartao = consultarCartao(P1, d2.estado)!;
    expect(cartao.fatura_aberta.valor_centavos).toBe(reaisDaSpec("150"));
    expect(cartao.proximas[0].valor_centavos).toBe(reaisDaSpec("300"));
    const d3 = registrarDeclaracao(P1, d2.estado, { operacao: "remover_evento", evento_id: "D1" }, origem());
    if (!d3.ok) throw new Error(d3.erro.mensagem);
    expect(calcularCenarios(P1, d3.estado, CONTEXTO)[0].faturas_afetadas).toEqual([]);
    expect(consultarCartao(P1, d3.estado)).toEqual(consultarCartao(P1, estadoNovo(P1)));
    expect(c.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"));
  });
  test("C-01/C-03/C-05/C-06: consulta fechada, aberta e próximas inclui celular anterior ao histórico sem duplicar", () => {
    const estado = estadoNovo(P1);
    const antes = structuredClone({ persona: P1, estado });
    const base = consultarCartao(P1, estado)!;
    expect(esquemaCartaoVisao.safeParse(base).success).toBe(true);
    expect(base.limite_centavos).toBe(P1.cartao!.limite_centavos);
    expect(base.fatura_fechada).toMatchObject({ fatura_id: "A", valor_centavos: reaisDaSpec("700"), status: "fechada" });
    expect(base.fatura_fechada!.itens).toHaveLength(3);
    expect(base.fatura_aberta).toMatchObject({ fatura_id: "F2612", fechamento: "2026-11-29", vencimento: "2026-12-05", valor_centavos: reaisDaSpec("150"), status: "aberta" });
    expect(base.fatura_aberta.itens).toEqual([{ descricao: "Celular", valor_centavos: reaisDaSpec("150"), lancamento_id: null, data: "2026-06-20", parcelamento_id: "PC1", parcela: "6/10", origem: "dados_base" }]);
    expect(base.proximas.map((f) => [f.vencimento, f.valor_centavos, f.itens[0].parcela, f.status])).toEqual([
      ["2027-01-05", reaisDaSpec("150"), "7/10", "futura"], ["2027-02-05", reaisDaSpec("150"), "8/10", "futura"],
      ["2027-03-05", reaisDaSpec("150"), "9/10", "futura"], ["2027-04-05", reaisDaSpec("150"), "10/10", "futura"],
    ]);
    const d = registrarDeclaracao(P1, estado, { operacao: "adicionar_evento", tipo: "saida", descricao: "Compra fictícia", data: "2026-10-30", valor: "200", meio: "cartao_credito" }, origem());
    if (!d.ok) throw new Error(d.erro.mensagem);
    const consulta = consultarCartao(P1, d.estado)!;
    expect(consulta.fatura_aberta.valor_centavos).toBe(reaisDaSpec("350"));
    expect(consulta.fatura_aberta.itens[1]).toMatchObject({ descricao: "Compra fictícia", origem: "declaracao", valor_centavos: reaisDaSpec("200") });
    expect(consulta.fatura_fechada).toEqual(base.fatura_fechada);
    expect(calcularCenarios(P1, d.estado, CONTEXTO)[0].faturas_afetadas).toEqual([{ fatura_id: "F2612", vencimento: "2026-12-05", total_antes_centavos: reaisDaSpec("150"), total_depois_centavos: reaisDaSpec("350") }]);
    expect(consultarCartao(P2, estadoNovo(P2))).toBeNull();
    expect({ persona: P1, estado }).toEqual(antes);
  });
  test("CR-15a/C-07: saída igual à fatura fechada, aberta ou lançamento recente exige confirmação", () => {
    const estado = estadoNovo(P3);
    const antes = structuredClone(estado);
    for (const [valor, descricao, fonte] of [["480", "Supermercado", "fatura"], ["76", "Café fictício", "fatura"], ["67", "Consulta fictícia", "lancamento"]]) {
      const alt: Alteracao = { operacao: "adicionar_evento", tipo: "saida", descricao, data: "2026-10-30", valor, meio: "pix" };
      const r = registrarDeclaracao(P3, estado, alt, origem());
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.erro.codigo).toBe("POSSIVEL_DUPLICIDADE");
      expect(r.erro.mensagem).toContain(descricao);
      if (valor === "480") expect(r.erro.mensagem).toContain("Supermercado 480,00, fatura de 05/11");
      const consulta = verificarDuplicidade(P3, { valor_centavos: reaisDaSpec(valor) });
      expect(consulta.duplicado).toBe(true);
      if (consulta.duplicado) expect(consulta.itens[0]).toMatchObject({ fonte, descricao, valor_centavos: reaisDaSpec(valor) });
      const h = criarHipotese(P3, estado, { nome: "Gasto repetido", a_partir_de: "atual", alteracoes: [alt] }, origem());
      expect(h.ok ? "ok" : h.erro.codigo).toBe("POSSIVEL_DUPLICIDADE");
    }
    expect(verificarDuplicidade(P3, { valor_centavos: reaisDaSpec("800") })).toEqual({ duplicado: false });
    expect(estado).toEqual(antes);
    expect(calcularCenarios(P3, estado, CONTEXTO)[0].linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(saldosDaSpec("G1 2.430 · E1 1.530 · E2 280 · G2 210 · G3 140 · E3 4.340 · E4 3.040 · G4 2.970 · G5 2.940 · E5 2.290"));
  });
  test.each(["alterar_evento", "remover_evento"] as const)("C-01: %s não altera item L0131 da fatura fechada", (operacao) => {
    const estado = estadoNovo(P1);
    const antes = structuredClone(estado);
    const alteracao: Alteracao = operacao === "alterar_evento" ? { operacao, evento_id: "L0131", valor: "10" } : { operacao, evento_id: "L0131" };
    const d = registrarDeclaracao(P1, estado, alteracao, origem());
    const h = criarHipotese(P1, estado, { nome: "Item fechado", a_partir_de: "atual", alteracoes: [alteracao] }, origem());
    expect([d.ok ? "ok" : d.erro.codigo, h.ok ? "ok" : h.erro.codigo]).toEqual(["OPERACAO_NAO_PERMITIDA", "OPERACAO_NAO_PERMITIDA"]);
    expect(estado).toEqual(antes);
  });
  test("CR-21: compra 1.000 em 3x tem resto na primeira parcela e cruza o ano", () => {
    const r = alocarCompra(P1, estadoNovo(P1), { data: "2026-10-30", valor_centavos: reaisDaSpec("1.000"), parcelas: 3 });
    if (!r.ok) throw new Error(r.erro.mensagem);
    expect(r.parcelas.map((p) => [p.numero, p.fatura_id, p.vencimento, p.valor_centavos])).toEqual([
      [1, "F2612", "2026-12-05", reaisDaSpec("333,34")],
      [2, "F2701", "2027-01-05", reaisDaSpec("333,33")],
      [3, "F2702", "2027-02-05", reaisDaSpec("333,33")],
    ]);
    expect(r.parcelas.map((p) => p.fechamento)).toEqual(["2026-11-29", "2026-12-29", "2027-01-29"]);
  });
  test("CR-22: compra 300 à vista em 29/11 vai para a fatura de 05/01/2027", () => {
    const r = alocarCompra(P1, estadoNovo(P1), { data: "2026-11-29", valor_centavos: reaisDaSpec("300"), parcelas: 1 });
    if (!r.ok) throw new Error(r.erro.mensagem);
    expect(r.parcelas).toEqual([{ numero: 1, fatura_id: "F2701", fechamento: "2026-12-29", vencimento: "2027-01-05", valor_centavos: reaisDaSpec("300") }]);
  });
  test.each(["declaracao", "hipotese"] as const)("C-02/C-04/C-05: compra à vista em 30/10 (%s) vence em 05/12 sem saída de caixa", (camada) => {
    // Exemplo de §6.3: fatura antes zero, compra de 200; sem parcelamentos anteriores.
    const persona = { ...P1, cartao: { ...P1.cartao!, parcelamentos: [] } };
    const estado = estadoNovo(persona);
    const anterior = structuredClone({ persona, estado });
    const alteracao: Alteracao = { operacao: "adicionar_evento", tipo: "saida", descricao: "Compra fictícia", data: "2026-10-30", valor: "200", meio: "cartao_credito" };
    const r = camada === "declaracao"
      ? registrarDeclaracao(persona, estado, alteracao, origem())
      : criarHipotese(persona, estado, { nome: "Compra no cartão", a_partir_de: "atual", alteracoes: [alteracao] }, origem());
    if (!r.ok) throw new Error(r.erro.mensagem);
    const cenarios = calcularCenarios(persona, r.estado, CONTEXTO);
    const c = cenarios[camada === "declaracao" ? 0 : 1];
    expect(c.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"));
    expect(c.indicadores).toEqual(calcularCenarios(persona, estado, CONTEXTO)[0].indicadores);
    expect(c.faturas_afetadas).toEqual([{ fatura_id: "F2612", vencimento: "2026-12-05", total_antes_centavos: 0, total_depois_centavos: reaisDaSpec("200") }]);
    expect(esquemaResultadoCenario.safeParse(c).success).toBe(true);
    if (camada === "hipotese") expect(cenarios[0].faturas_afetadas).toEqual([]);
    const alocacao = alocarCompra(persona, estado, { data: "2026-10-30", valor_centavos: reaisDaSpec("200"), parcelas: 1 });
    if (!alocacao.ok) throw new Error(alocacao.erro.mensagem);
    expect(alocacao.parcelas).toEqual([{ numero: 1, fatura_id: "F2612", fechamento: "2026-11-29", vencimento: "2026-12-05", valor_centavos: reaisDaSpec("200") }]);
    expect(esquemaAlocacaoCompra.safeParse(alocacao).success).toBe(true);
    expect({ persona, estado }).toEqual(anterior);
  });
});
