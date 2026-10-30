import { describe, expect, test } from "vitest";
import { esquemaResultadoHistorico } from "@/contratos";
import { carregarPersona } from "@/dados";
import { consultarHistorico } from "@/dominio/historico";

describe("B2 · 4: consultarHistorico (H-01 a H-04, CR-17k)", () => {
  const obterP2 = () => {
    const r = carregarPersona("p2");
    if (!r.ok) throw new Error(r.erro.mensagem);
    return r.persona;
  };
  const obterP3 = () => {
    const r = carregarPersona("p3");
    if (!r.ok) throw new Error(r.erro.mensagem);
    return r.persona;
  };

  test("CR-17k: filtro fora de 30/04 a 29/10 retorna DATA_FORA_DO_HISTORICO", () => {
    const p2 = obterP2();
    const r1 = consultarHistorico(p2, { de: "2026-04-01", ate: "2026-04-29" });
    expect(r1.ok ? "ok" : r1.erro.codigo).toBe("DATA_FORA_DO_HISTORICO");

    const r2 = consultarHistorico(p2, { de: "2026-10-01", ate: "2026-10-30" });
    expect(r2.ok ? "ok" : r2.erro.codigo).toBe("DATA_FORA_DO_HISTORICO");

    const r3 = consultarHistorico(p2, { de: "2026-09-20", ate: "2026-09-10" });
    expect(r3.ok ? "ok" : r3.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
  });

  test("H-02: filtros por período, tipo, meio, categoria e busca; limite de 20 itens mais recentes", () => {
    const p2 = obterP2();
    const r = consultarHistorico(p2, {
      de: "2026-09-01",
      ate: "2026-09-30",
      tipo: "saida",
      categoria: "delivery",
    });
    if (!r.ok) throw new Error(r.erro.mensagem);
    esquemaResultadoHistorico.parse(r);
    expect(r.de).toBe("2026-09-01");
    expect(r.ate).toBe("2026-09-30");
    expect(r.quantidade).toBe(2);
    expect(r.total_saidas_centavos).toBe(16000);
    expect(r.total_entradas_centavos).toBe(0);
    expect(r.saldo_centavos).toBe(-16000);
    expect(r.grupos).toEqual([]);
    expect(r.itens.map((i) => [i.data, i.descricao, i.valor_centavos])).toEqual([
      ["2026-09-18", "Delivery Japonês", 9600],
      ["2026-09-04", "Delivery Hambúrguer", 6400],
    ]);

    // Filtro por meio e busca textual case-insensitive
    const rBusca = consultarHistorico(p2, { meio: "debito_automatico", busca: "luz" });
    if (!rBusca.ok) throw new Error(rBusca.erro.mensagem);
    expect(rBusca.quantidade).toBe(6);
    expect(rBusca.total_saidas_centavos).toBe(17000 + 16000 + 17500 + 16500 + 18000 + 19500);

    // Sem filtro: retorna período completo 30/04..29/10 e no máximo 20 itens mais recentes
    const p3 = obterP3();
    expect(p3.historico.length).toBeGreaterThan(20);
    const todos = consultarHistorico(p3, {});
    if (!todos.ok) throw new Error(todos.erro.mensagem);
    esquemaResultadoHistorico.parse(todos);
    expect(todos.de).toBe("2026-04-30");
    expect(todos.ate).toBe("2026-10-29");
    expect(todos.quantidade).toBe(p3.historico.length);
    expect(todos.itens).toHaveLength(20);
    expect(todos.itens[0].data >= todos.itens[19].data).toBe(true);
  });

  test("H-02 e H-04: agrupamento por categoria, mês e semana (chave = segunda-feira)", () => {
    const p2 = obterP2();

    const porCat = consultarHistorico(p2, { agrupar_por: "categoria" });
    if (!porCat.ok) throw new Error(porCat.erro.mensagem);
    esquemaResultadoHistorico.parse(porCat);
    const catMoradia = porCat.grupos.find((g) => g.chave === "moradia")!;
    expect(catMoradia).toMatchObject({
      chave: "moradia",
      quantidade: 6,
      total_saidas_centavos: 660000,
      total_entradas_centavos: 0,
      saldo_centavos: -660000,
    });

    const porMes = consultarHistorico(p2, { agrupar_por: "mes" });
    if (!porMes.ok) throw new Error(porMes.erro.mensagem);
    esquemaResultadoHistorico.parse(porMes);
    expect(porMes.grupos.map((g) => g.chave)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);

    // 2026-08-03 foi segunda-feira; 2026-08-02 foi domingo (semana de 2026-07-27)
    const porSemana = consultarHistorico(p2, { de: "2026-08-01", ate: "2026-08-09", agrupar_por: "semana" });
    if (!porSemana.ok) throw new Error(porSemana.erro.mensagem);
    esquemaResultadoHistorico.parse(porSemana);
    expect(porSemana.grupos.map((g) => g.chave)).toEqual(["2026-07-27", "2026-08-03"]);
  });

  test("H-02: para agrupar_por 'mes', todo grupo tem saldo_centavos === total_entradas_centavos - total_saidas_centavos e a soma dos saldos é igual ao saldo_centavos de topo", () => {
    const p2 = obterP2();
    const r2 = consultarHistorico(p2, { agrupar_por: "mes" });
    if (!r2.ok) throw new Error(r2.erro.mensagem);
    esquemaResultadoHistorico.parse(r2);
    expect(r2.grupos.length).toBeGreaterThan(0);
    for (const g of r2.grupos) {
      expect(g.saldo_centavos).toBe(g.total_entradas_centavos - g.total_saidas_centavos);
    }
    const somaDosSaldos2 = r2.grupos.reduce((acc, g) => acc + g.saldo_centavos, 0);
    expect(somaDosSaldos2).toBe(r2.saldo_centavos);
    expect(r2.saldo_centavos).toBe(r2.total_entradas_centavos - r2.total_saidas_centavos);

    const p3 = obterP3();
    const r3 = consultarHistorico(p3, { agrupar_por: "mes" });
    if (!r3.ok) throw new Error(r3.erro.mensagem);
    esquemaResultadoHistorico.parse(r3);
    expect(r3.grupos.length).toBeGreaterThan(0);
    for (const g of r3.grupos) {
      expect(g.saldo_centavos).toBe(g.total_entradas_centavos - g.total_saidas_centavos);
    }
    const somaDosSaldos3 = r3.grupos.reduce((acc, g) => acc + g.saldo_centavos, 0);
    expect(somaDosSaldos3).toBe(r3.saldo_centavos);
    expect(r3.saldo_centavos).toBe(r3.total_entradas_centavos - r3.total_saidas_centavos);
  });
});
