import { describe, expect, test } from "vitest";
import { esquemaAlocacaoCompra, esquemaResultadoCenario, type Alteracao } from "@/contratos";
import { alocarCompra } from "@/dominio/cartao";
import { calcularCenarios, criarHipotese, registrarDeclaracao } from "@/dominio/caixa";
import { CONTEXTO, P1, estadoNovo, origem, reaisDaSpec, saldosDaSpec } from "@/dominio/caixa/testes/personas";

describe("B1b · cartão e caixa", () => {
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
