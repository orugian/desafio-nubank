import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { estadoInicial } from "@/contratos";
import { carregarPersona, listarPersonas, verificarInvariantes } from "@/dados";
import { calcularCenarios } from "@/dominio/caixa";
import { consultarCartao } from "@/dominio/cartao";
import { CONTEXTO, MERCADO_TESTE, reaisDaSpec, saldosDaSpec } from "@/dominio/caixa/testes/personas";

// B0 · comportamento 4: carregarPersona("p1") com a P1 mínima passa nos
// invariantes aplicáveis (spec §4.2). A P1 mínima não tem histórico.

describe("carregarPersona com a P1 mínima", () => {
  test("carrega P1 com saldo 1.800, compromissos B, C e R1 e a fatura fechada A de 700 (spec §11.1)", () => {
    const r = carregarPersona("p1");
    expect(r.ok ? "" : r.erro.mensagem).toBe("");
    if (!r.ok) return;
    const p = r.persona;
    expect(p.conta.saldo_inicio_hoje_centavos).toBe(180000);
    expect(p.gasto_diario.valor_centavos).toBe(0);
    expect(p.compromissos.map((c) => [c.id, c.data, c.tipo, c.valor_centavos, c.previsto])).toEqual([
      ["B", "2026-11-10", "saida", 60000, false],
      ["C", "2026-11-15", "saida", 20000, false],
      ["R1", "2026-11-19", "entrada", 300000, true],
    ]);
    const a = p.cartao?.faturas.find((f) => f.id === "A");
    expect([a?.status, a?.fechamento, a?.vencimento, a?.valor_centavos]).toEqual(["fechada", "2026-10-29", "2026-11-05", 70000]);
    expect(p.posicoes.map((x) => x.id)).toEqual(["SEP", "INV1", "INV9", "INV2", "INV3"]);
  });

  test("persona inexistente é erro tipado, sem exceção", () => {
    const r = carregarPersona("p9");
    expect(r.ok).toBe(false);
  });

  test("listarPersonas inclui P1, P2 e P3 com nome e resumo", () => {
    expect(listarPersonas()).toEqual([
      { id: "p1", nome: "Bia (fictícia)", resumo: "Quer juntar dinheiro para uma viagem." },
      { id: "p2", nome: "Caio (fictício)", resumo: "Trabalha por conta própria e recebe de clientes por Pix." },
      { id: "p3", nome: "Duda (fictícia)", resumo: "Tem filhos na escola, financiamento e compras parceladas no cartão." },
    ]);
  });

  test("B2 · 1: cada persona gerada (p1, p2, p3) existe em dados/personas e é aceita pelo esquema e por carregarPersona", () => {
    for (const id of ["p1", "p2", "p3"] as const) {
      const caminho = join(__dirname, "..", "..", "dados", "personas", `${id}.json`);
      const bruta = JSON.parse(readFileSync(caminho, "utf8"));
      expect(bruta.id).toBe(id);
      expect(bruta.historico.length).toBeGreaterThan(0);
      const r = carregarPersona(id);
      expect(r.ok ? "" : JSON.stringify(r.erro)).toBe("");
    }
  });
});

describe("invariantes aplicáveis à P1 mínima (spec §4.2)", () => {
  const base = () => JSON.parse(readFileSync(join(__dirname, "..", "..", "dados", "personas", "p1-minima.json"), "utf8"));
  const numeros = (p: unknown) => verificarInvariantes(p).map((v) => v.invariante);

  test("a P1 mínima não viola nenhum", () => {
    expect(verificarInvariantes(base())).toEqual([]);
  });

  test("1: identificador repetido", () => {
    const p = base();
    p.compromissos[1].id = "B";
    expect(numeros(p)).toContain(1);
  });

  test("11: campo de renda declarada é rejeitado", () => {
    expect(numeros({ ...base(), renda_mensal_centavos: 500000 })).toContain(11);
  });

  test("2: saldo de 30/07 + lançamentos de conta ≠ saldo no início de hoje", () => {
    const p = base();
    p.conta.saldo_30_07_centavos = 170000;
    expect(numeros(p)).toContain(2);
  });

  test("3: valor da fatura A ≠ soma dos itens", () => {
    const p = base();
    p.cartao.faturas[0].valor_centavos = 71000;
    expect(numeros(p)).toContain(3);
  });

  test("4: parcela 4/10 do Celular na fatura de 05/11, que é a da parcela 5 (C-03)", () => {
    const p = base();
    p.cartao.faturas[0].itens[0].parcela = "4/10";
    expect(numeros(p)).toContain(4);
  });

  test("4: compra de 20/06 sem a marca anterior_ao_historico", () => {
    const p = base();
    p.cartao.parcelamentos[0].anterior_ao_historico = false;
    expect(numeros(p)).toContain(4);
  });

  test("6: gasto diário de 15,00 sem saídas variáveis por Pix ou débito no histórico", () => {
    const p = base();
    p.gasto_diario.valor_centavos = 1500;
    expect(numeros(p)).toContain(6);
  });

  test("9: fatura fechada que vence na janela com fechamento depois de 29/10", () => {
    const p = base();
    p.cartao.faturas[0].fechamento = "2026-10-30";
    expect(numeros(p)).toContain(9);
  });

  test("10: item de fatura de R$ 500,00, valor reservado das conversas de teste", () => {
    const p = base();
    p.cartao.faturas[0].itens[2].valor_centavos = 50000;
    p.cartao.faturas[0].valor_centavos = 97000;
    expect(numeros(p)).toEqual([10]);
  });
});

describe("B2 · 2: invariantes 1 a 11 da spec §4.2 nas 3 personas geradas", () => {
  const lerPersona = (id: "p1" | "p2" | "p3") =>
    JSON.parse(readFileSync(join(__dirname, "..", "..", "dados", "personas", `${id}.json`), "utf8"));
  const numeros = (p: unknown) => verificarInvariantes(p).map((v) => v.invariante);

  test("as 3 personas geradas (p1, p2, p3) passam sem nenhuma violação nos invariantes 1 a 11", () => {
    for (const id of ["p1", "p2", "p3"] as const) {
      expect(verificarInvariantes(lerPersona(id))).toEqual([]);
    }
  });

  test("3: compra no cartão no histórico fora da fatura do ciclo ou fatura paga sem débito correspondente", () => {
    const p1 = lerPersona("p1");
    p1.historico.push({
      id: "L19999",
      data: "2026-10-18",
      descricao: "Compra solta no cartão",
      tipo: "saida",
      meio: "cartao_credito",
      categoria: "compras",
      valor_centavos: 4500,
    });
    expect(numeros(p1)).toContain(3);

    const p1SemPagamento = lerPersona("p1");
    p1SemPagamento.historico = p1SemPagamento.historico.filter((l: { fatura_id?: string }) => l.fatura_id !== "F2609");
    p1SemPagamento.conta.saldo_30_07_centavos -= 62000;
    expect(numeros(p1SemPagamento)).toContain(3);
  });

  test("5: compromisso recorrente sem ocorrências coerentes no histórico", () => {
    const p1 = lerPersona("p1");
    const aluguelAgo = p1.historico.find((l: { recorrencia_id?: string }) => l.recorrencia_id === "B");
    aluguelAgo.valor_centavos = 61000;
    p1.conta.saldo_30_07_centavos += 1000;
    expect(numeros(p1)).toContain(5);
  });

  test("7: conta estimada diferente do teto da média das 3 últimas ocorrências citadas", () => {
    const p2 = lerPersona("p2");
    const luz = p2.compromissos.find((c: { id: string }) => c.id === "E4");
    luz.valor_centavos = 18500;
    expect(numeros(p2)).toContain(7);
  });

  test("8: compra de renda variável sem usar fechamento gravado da data ou sem débito em conta no histórico", () => {
    const p1 = lerPersona("p1");
    p1.posicoes.find((x: { id: string }) => x.id === "INV3").compras[0].preco_centavos = 4000;
    expect(numeros(p1)).toContain(8);

    const p2 = lerPersona("p2");
    p2.historico = p2.historico.filter((l: { posicao_id?: string }) => l.posicao_id !== "INV5");
    expect(numeros(p2)).toContain(8);
  });
});

describe("B2 · 3: com as personas geradas, motor reproduz CR-01, CR-09 e CR-13 e cartão reproduz fatura de P3", () => {
  test("CR-01 (P1), CR-09 (P2), CR-13 (P3) e fatura fechada E2 de P3 (1.250,00 com 4 itens)", () => {
    const r1 = carregarPersona("p1");
    const r2 = carregarPersona("p2");
    const r3 = carregarPersona("p3");
    if (!r1.ok || !r2.ok || !r3.ok) throw new Error("falha ao carregar personas geradas");

    // CR-01 (P1)
    const [cr01] = calcularCenarios(r1.persona, estadoInicial("p1", MERCADO_TESTE), CONTEXTO);
    expect(cr01.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(
      saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"),
    );
    expect(cr01.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("1.800"),
      saldo_minimo_centavos: reaisDaSpec("300"),
      data_saldo_minimo: "2026-11-15",
      primeira_falta: null,
      insuficiencia_centavos: 0,
      margem_hoje_centavos: reaisDaSpec("300"),
      saldo_final_centavos: reaisDaSpec("3.300"),
      sem_recebimentos: {
        insuficiencia_centavos: 0,
        primeira_falta: null,
        saldo_final_centavos: reaisDaSpec("300"),
      },
    });
    expect(cr01.avisos).toEqual([]);

    // CR-09 (P2)
    const [cr09] = calcularCenarios(r2.persona, estadoInicial("p2", MERCADO_TESTE), CONTEXTO);
    expect(cr09.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(
      saldosDaSpec("G1 795 · E1 675 · G2 570 · E2 −530 · E3 970 · E4 790 · G3 685 · G4 580 · E5 180 · G5 135"),
    );
    expect(cr09.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("900"),
      saldo_minimo_centavos: reaisDaSpec("−530"),
      data_saldo_minimo: "2026-11-08",
      primeira_falta: { data: "2026-11-08", valor_descoberto_centavos: reaisDaSpec("530"), saidas_do_dia: ["E2"] },
      insuficiencia_centavos: reaisDaSpec("530"),
      margem_hoje_centavos: 0,
      saldo_final_centavos: reaisDaSpec("135"),
      sem_recebimentos: {
        insuficiencia_centavos: reaisDaSpec("1.365"),
        primeira_falta: { data: "2026-11-08", valor_descoberto_centavos: reaisDaSpec("530"), saidas_do_dia: ["E2"] },
        saldo_final_centavos: reaisDaSpec("−1.365"),
      },
    });
    expect(cr09.datas_ordem_relevante).toEqual(["2026-11-08"]);
    expect(cr09.avisos).toEqual(["saldo_final_positivo_com_falta", "falta_maior_sem_recebimento"]);

    // CR-13 (P3)
    const [cr13] = calcularCenarios(r3.persona, estadoInicial("p3", MERCADO_TESTE), CONTEXTO);
    expect(cr13.linhas.map((l) => [l.evento_id, l.saldo_apos_centavos])).toEqual(
      saldosDaSpec("G1 2.430 · E1 1.530 · E2 280 · G2 210 · G3 140 · E3 4.340 · E4 3.040 · G4 2.970 · G5 2.940 · E5 2.290"),
    );
    expect(cr13.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("2.500"),
      saldo_minimo_centavos: reaisDaSpec("140"),
      data_saldo_minimo: "2026-11-13",
      primeira_falta: null,
      insuficiencia_centavos: 0,
      margem_hoje_centavos: reaisDaSpec("140"),
      saldo_final_centavos: reaisDaSpec("2.290"),
      sem_recebimentos: {
        insuficiencia_centavos: reaisDaSpec("1.910"),
        primeira_falta: { data: "2026-11-18", valor_descoberto_centavos: reaisDaSpec("1.160"), saidas_do_dia: ["E4"] },
        saldo_final_centavos: reaisDaSpec("−1.910"),
      },
    });
    expect(cr13.avisos).toEqual(["cobertura_depende_de_recebimento"]);

    // Cartão de P3 reproduz a fatura fechada E2 da spec §11.3
    const cartaoP3 = consultarCartao(r3.persona, estadoInicial("p3", MERCADO_TESTE));
    expect(cartaoP3).not.toBeNull();
    expect(cartaoP3!.fatura_fechada).toMatchObject({
      fatura_id: "E2",
      fechamento: "2026-10-29",
      vencimento: "2026-11-05",
      status: "fechada",
      valor_centavos: reaisDaSpec("1.250"),
    });
    expect(cartaoP3!.fatura_fechada!.itens.map((i) => [i.descricao, i.valor_centavos, i.parcela])).toEqual([
      ["Supermercado", reaisDaSpec("480"), null],
      ["Combustível", reaisDaSpec("320"), null],
      ["Restaurante", reaisDaSpec("200"), null],
      ["Geladeira", reaisDaSpec("250"), "3/10"],
    ]);
  });
});
