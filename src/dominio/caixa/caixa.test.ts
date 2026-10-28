import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { calcularCenarios, compararCenarios, criarHipotese, desfazer, registrarDeclaracao } from "@/dominio/caixa";
import { CONTEXTO, P1, P2, P3, estadoNovo, origem, reaisDaSpec, saldosDaSpec } from "./testes/personas";
import { esquemaPersona, type Alteracao, type EstadoSessao, type Persona, type ResultadoCenario } from "@/contratos";

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

  describe("validações (estado inalterado em todo erro)", () => {
    const gasto = (extra: Record<string, unknown>) =>
      ({ operacao: "adicionar_evento", tipo: "saida", descricao: "Gasto extra", data: "2026-11-02", valor: "50", meio: "pix", ...extra }) as Alteracao;
    const codigoDecl = (persona: Persona, alt: Alteracao) => {
      const r = registrarDeclaracao(persona, estadoNovo(persona), alt, origem("m-9"));
      return r.ok ? "ok" : r.erro.codigo;
    };
    const hip = (estado: EstadoSessao, alteracoes: Alteracao[], a_partir_de = "atual") =>
      criarHipotese(P1, estado, { nome: "Teste", a_partir_de, alteracoes }, origem("m-9"));

    test("CR-15b: saída em 29/10 → DATA_ANTES_DE_HOJE", () => {
      expect(codigoDecl(P3, gasto({ data: "2026-10-29" }))).toBe("DATA_ANTES_DE_HOJE");
    });

    test("CR-17a: evento em 30/11 → DATA_FORA_DA_JANELA", () => {
      expect(codigoDecl(P1, gasto({ data: "2026-11-30" }))).toBe("DATA_FORA_DA_JANELA");
    });

    test.each([["0"], ["0.00"], ["-5"], ["1.500"], ["12,50"]])("CR-17b: valor %s → VALOR_INVALIDO", (valor) => {
      const r = hip(estadoNovo(P1), [{ operacao: "separar", valor }]);
      expect(r.ok ? "ok" : r.erro.codigo).toBe("VALOR_INVALIDO");
    });

    test("CR-17b: \"1500\" e \"12.50\" são aceitos e convertidos exatamente", () => {
      const r = hip(estadoNovo(P1), [{ operacao: "separar", valor: "1500" }, { operacao: "separar", valor: "12.50" }]);
      if (!r.ok) throw new Error(r.erro.mensagem);
      const [, h] = calcularCenarios(P1, r.estado, CONTEXTO);
      expect(h.linhas.filter((l) => l.origem === "hipotese").map((l) => l.valor_centavos)).toEqual([150000, 1250]);
    });

    test("CR-17c: alterar_evento com id inexistente → EVENTO_INEXISTENTE", () => {
      expect(codigoDecl(P1, { operacao: "alterar_evento", evento_id: "Z9", valor: "10" })).toBe("EVENTO_INEXISTENTE");
    });

    test("CR-17d: 4ª hipótese → LIMITE_HIPOTESES", () => {
      let estado = estadoNovo(P1);
      for (let i = 0; i < 3; i++) {
        const r = hip(estado, [{ operacao: "separar", valor: "10" }]);
        if (!r.ok) throw new Error(r.erro.mensagem);
        estado = r.estado;
      }
      const quarta = hip(estado, [{ operacao: "separar", valor: "10" }]);
      expect(quarta.ok ? "ok" : quarta.erro.codigo).toBe("LIMITE_HIPOTESES");
    });

    test("CR-17d: hipótese derivada com 6 alterações (1 copiada + 5) → LIMITE_ALTERACOES", () => {
      const h1 = hip(estadoNovo(P1), [{ operacao: "separar", valor: "500" }]);
      if (!h1.ok) throw new Error(h1.erro.mensagem);
      const cinco = Array.from({ length: 5 }, () => ({ operacao: "separar", valor: "10" }) as Alteracao);
      const r = hip(h1.estado, cinco, "H1");
      expect(r.ok ? "ok" : r.erro.codigo).toBe("LIMITE_ALTERACOES");
    });

    test("CR-17e: separar como declaração → OPERACAO_NAO_PERMITIDA", () => {
      expect(codigoDecl(P1, { operacao: "separar", valor: "500" })).toBe("OPERACAO_NAO_PERMITIDA");
    });

    test.each([
      ["sem meio", { meio: undefined }],
      ["sem data", { data: undefined }],
      ["entrada com cartao_credito", { tipo: "entrada", meio: "cartao_credito" }],
    ])("CR-17h: adicionar_evento %s → ARGUMENTOS_INVALIDOS", (_nome, extra) => {
      expect(codigoDecl(P1, gasto(extra))).toBe("ARGUMENTOS_INVALIDOS");
    });

    test.each([
      ["alterar A (fatura fechada de P1)", P1, { operacao: "alterar_evento", evento_id: "A", valor: "10" }],
      ["remover A (fatura fechada de P1)", P1, { operacao: "remover_evento", evento_id: "A" }],
      ["alterar G1 (bloco de P2)", P2, { operacao: "alterar_evento", evento_id: "G1", valor: "10" }],
      ["remover G1 (bloco de P2)", P2, { operacao: "remover_evento", evento_id: "G1" }],
    ])("CR-17l: %s → OPERACAO_NAO_PERMITIDA", (_nome, persona, alt) => {
      expect(codigoDecl(persona as Persona, alt as Alteracao)).toBe("OPERACAO_NAO_PERMITIDA");
      const r = criarHipotese(persona as Persona, estadoNovo(persona as Persona), { nome: "T", a_partir_de: "atual", alteracoes: [alt as Alteracao] }, origem());
      expect(r.ok ? "ok" : r.erro.codigo).toBe("OPERACAO_NAO_PERMITIDA");
    });
  });

  test("CR-17f: H1 altera B; D1 remove B → H1 inconsistente, sem indicadores", () => {
    const h = criarHipotese(P1, estadoNovo(P1), { nome: "Aluguel maior", a_partir_de: "atual", alteracoes: [{ operacao: "alterar_evento", evento_id: "B", valor: "700" }] }, origem("m-1"));
    if (!h.ok) throw new Error(h.erro.mensagem);
    const d = registrarDeclaracao(P1, h.estado, { operacao: "remover_evento", evento_id: "B" }, origem("m-2"));
    if (!d.ok) throw new Error(d.erro.mensagem);
    const [atual, h1] = calcularCenarios(P1, d.estado, CONTEXTO);
    expect(atual.linhas.map((l) => l.evento_id)).toEqual(["A", "C", "R1"]);
    expect(h1.status).toBe("inconsistente");
    expect(h1.indicadores).toBeNull();
  });

  test("CR-17i: P1 com R1 removido por declaração → sem_recebimentos null e sem avisos de R-12", () => {
    const h = criarHipotese(P1, estadoNovo(P1), { nome: "Separar R$ 500 hoje", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }, origem("m-1"));
    if (!h.ok) throw new Error(h.erro.mensagem);
    const d = registrarDeclaracao(P1, h.estado, { operacao: "remover_evento", evento_id: "R1" }, origem("m-2"));
    if (!d.ok) throw new Error(d.erro.mensagem);
    for (const c of calcularCenarios(P1, d.estado, CONTEXTO)) {
      expect(c.indicadores?.sem_recebimentos).toBeNull();
      expect(c.avisos).not.toContain("cobertura_depende_de_recebimento");
      expect(c.avisos).not.toContain("falta_maior_sem_recebimento");
    }
  });

  test("CR-17j: saldo 500 e duas saídas de 400 no mesmo dia, em qualquer ordem de cadastro → falta de 300 no dia com as duas", () => {
    const duas = (ordem: [string, string]) =>
      esquemaPersona.parse({
        ...P1,
        conta: { saldo_30_07_centavos: 50000, saldo_inicio_hoje_centavos: 50000 },
        cartao: null,
        compromissos: ordem.map((id) => ({ ...P1.compromissos[0], id, descricao: `Conta ${id}`, data: "2026-11-10", valor_centavos: 40000 })),
      });
    for (const ordem of [["X1", "X2"], ["X2", "X1"]] as Array<[string, string]>) {
      const p = duas(ordem);
      const [atual] = calcularCenarios(p, estadoNovo(p), CONTEXTO);
      expect(atual.indicadores?.primeira_falta).toEqual({ data: "2026-11-10", valor_descoberto_centavos: 30000, saidas_do_dia: ordem });
      expect(atual.indicadores?.insuficiencia_centavos).toBe(30000);
      expect(atual.indicadores?.saldo_minimo_centavos).toBe(-30000);
    }
  });

  describe("desfazer", () => {
    const comH1 = () => {
      const r = criarHipotese(P1, estadoNovo(P1), { nome: "Separar R$ 500 hoje", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }, origem("m-1"));
      if (!r.ok) throw new Error(r.erro.mensagem);
      return r.estado;
    };

    test("CR-17g: desfazer H1 após CR-02 deixa os números de CR-01 e H1 não é reutilizado", () => {
      const r = desfazer(P1, comH1(), "H1");
      expect(r.ok ? "" : r.erro.mensagem).toBe("");
      if (!r.ok) return;
      expect(r.removido).toBe("H1");
      const cenarios = calcularCenarios(P1, r.estado, CONTEXTO);
      expect(cenarios.map((c) => c.cenario_id)).toEqual(["atual"]);
      expect(saldos(cenarios[0])).toEqual(saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"));
      expect(cenarios[0].indicadores?.margem_hoje_centavos).toBe(reaisDaSpec("300"));

      const nova = criarHipotese(P1, r.estado, { nome: "Outra", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "100" }] }, origem("m-3"));
      expect(nova.ok && nova.hipotese_id).toBe("H2");
    });

    test("desfazer D1 depois de CR-04 volta atual a CR-01 e H1 a CR-02", () => {
      const d = registrarDeclaracao(P1, comH1(), { operacao: "alterar_evento", evento_id: "C", valor: "150" }, origem("m-2"));
      if (!d.ok) throw new Error(d.erro.mensagem);
      const r = desfazer(P1, d.estado, "D1");
      if (!r.ok) throw new Error(r.erro.mensagem);
      const [atual, h1] = calcularCenarios(P1, r.estado, CONTEXTO);
      expect(saldos(atual)).toEqual(saldosDaSpec("A 1.100 · B 500 · C 300 · R1 3.300"));
      expect(saldos(h1)).toEqual(saldosDaSpec("H1.1 1.300 · A 600 · B 0 · C −200 · R1 2.800"));
      expect(r.estado.contadores.D).toBe(1);
    });

    test("alvo inexistente → HIPOTESE_INEXISTENTE ou ALTERACAO_INEXISTENTE, estado inalterado", () => {
      const estado = comH1();
      const h = desfazer(P1, estado, "H7");
      const d = desfazer(P1, estado, "D3");
      expect([h.ok ? "ok" : h.erro.codigo, d.ok ? "ok" : d.erro.codigo]).toEqual(["HIPOTESE_INEXISTENTE", "ALTERACAO_INEXISTENTE"]);
    });
  });
});

describe("B1 · motor de caixa · P2", () => {
  test("CR-09: gasto diário de 15 vira blocos G1–G5; falta de 530 em 08/11 e ordem relevante em 08/11", () => {
    const [atual] = calcularCenarios(P2, estadoNovo(P2), CONTEXTO);
    expect(saldos(atual)).toEqual(
      saldosDaSpec("G1 795 · E1 675 · G2 570 · E2 −530 · E3 970 · E4 790 · G3 685 · G4 580 · E5 180 · G5 135"),
    );
    const blocos = atual.linhas.filter((l) => l.evento_id.startsWith("G"));
    expect(blocos.map((l) => [l.data, l.valor_centavos, l.origem, l.meio, l.estimativa?.metodo])).toEqual([
      ["2026-10-30", 10500, "estimado", "pix_ou_debito", "gasto_diario"],
      ["2026-11-06", 10500, "estimado", "pix_ou_debito", "gasto_diario"],
      ["2026-11-13", 10500, "estimado", "pix_ou_debito", "gasto_diario"],
      ["2026-11-20", 10500, "estimado", "pix_ou_debito", "gasto_diario"],
      ["2026-11-27", 4500, "estimado", "pix_ou_debito", "gasto_diario"],
    ]);
    const falta = { data: "2026-11-08", valor_descoberto_centavos: reaisDaSpec("530"), saidas_do_dia: ["E2"] };
    expect(atual.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("900"),
      saldo_minimo_centavos: reaisDaSpec("−530"),
      data_saldo_minimo: "2026-11-08",
      primeira_falta: falta,
      insuficiencia_centavos: reaisDaSpec("530"),
      margem_hoje_centavos: 0,
      saldo_final_centavos: reaisDaSpec("135"),
      sem_recebimentos: { insuficiencia_centavos: reaisDaSpec("1.365"), primeira_falta: falta, saldo_final_centavos: reaisDaSpec("−1.365") },
    });
    expect(atual.avisos).toEqual(["saldo_final_positivo_com_falta", "falta_maior_sem_recebimento"]);
    expect(atual.datas_ordem_relevante).toEqual(["2026-11-08"]);
    const e4 = atual.linhas.find((l) => l.evento_id === "E4")!;
    expect(e4.estimativa?.metodo).toBe("media_3_ultimas");
  });

  const entradasPrimeiro = () => {
    const d = registrarDeclaracao(P2, estadoNovo(P2), { operacao: "definir_ordem_no_dia", data: "2026-11-08", ordem: "entradas_primeiro" }, origem("m-1"));
    if (!d.ok) throw new Error(d.erro.mensagem);
    return d.estado;
  };

  test("CR-09b: D1 entradas primeiro em 08/11 tira a falta e a pergunta de ordem", () => {
    const [atual] = calcularCenarios(P2, entradasPrimeiro(), CONTEXTO);
    expect(saldos(atual)).toEqual(
      saldosDaSpec("G1 795 · E1 675 · G2 570 · E3 2.070 · E2 970 · E4 790 · G3 685 · G4 580 · E5 180 · G5 135"),
    );
    expect(atual.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("900"),
      saldo_minimo_centavos: reaisDaSpec("135"),
      data_saldo_minimo: "2026-11-27",
      primeira_falta: null,
      insuficiencia_centavos: 0,
      margem_hoje_centavos: reaisDaSpec("135"),
      saldo_final_centavos: reaisDaSpec("135"),
      sem_recebimentos: {
        insuficiencia_centavos: reaisDaSpec("1.365"),
        primeira_falta: { data: "2026-11-08", valor_descoberto_centavos: reaisDaSpec("530"), saidas_do_dia: ["E2"] },
        saldo_final_centavos: reaisDaSpec("−1.365"),
      },
    });
    expect(atual.avisos).toEqual(["cobertura_depende_de_recebimento"]);
    expect(atual.datas_ordem_relevante).toEqual([]);
  });

  test("CR-10b: H1 separar 300 depois da D1 de CR-09b", () => {
    const h = criarHipotese(P2, entradasPrimeiro(), { nome: "Separar R$ 300 hoje", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "300" }] }, origem("m-2"));
    if (!h.ok) throw new Error(h.erro.mensagem);
    const [, h1] = calcularCenarios(P2, h.estado, CONTEXTO);
    expect(saldos(h1)).toEqual(
      saldosDaSpec("G1 795 · H1.1 495 · E1 375 · G2 270 · E3 1.770 · E2 670 · E4 490 · G3 385 · G4 280 · E5 −120 · G5 −165"),
    );
    expect(h1.indicadores).toEqual({
      saldo_inicial_centavos: reaisDaSpec("900"),
      saldo_minimo_centavos: reaisDaSpec("−165"),
      data_saldo_minimo: "2026-11-27",
      primeira_falta: { data: "2026-11-25", valor_descoberto_centavos: reaisDaSpec("120"), saidas_do_dia: ["E5"] },
      insuficiencia_centavos: reaisDaSpec("165"),
      margem_hoje_centavos: 0,
      saldo_final_centavos: reaisDaSpec("−165"),
      sem_recebimentos: {
        insuficiencia_centavos: reaisDaSpec("1.665"),
        primeira_falta: { data: "2026-11-08", valor_descoberto_centavos: reaisDaSpec("830"), saidas_do_dia: ["E2"] },
        saldo_final_centavos: reaisDaSpec("−1.665"),
      },
    });
    expect(h1.avisos).toEqual(["falta_maior_sem_recebimento"]);
    expect(h1.datas_ordem_relevante).toEqual([]);
  });
});

describe("B1 · motor de caixa · P3", () => {
  test("bloco estimado sozinho não dispara ordem relevante: 13/11 de CR-14 (G3 e salário) sem pergunta", () => {
    const h = criarHipotese(
      P3,
      estadoNovo(P3),
      {
        nome: "Conserto do carro",
        a_partir_de: "atual",
        alteracoes: [{ operacao: "adicionar_evento", tipo: "saida", descricao: "Conserto do carro", data: "2026-11-06", valor: "800", meio: "pix" }],
      },
      origem("m-1"),
    );
    if (!h.ok) throw new Error(h.erro.mensagem);
    const [, h1] = calcularCenarios(P3, h.estado, CONTEXTO);
    const g3 = h1.linhas.find((l) => l.evento_id === "G3")!;
    expect([g3.data, g3.saldo_apos_centavos]).toEqual(["2026-11-13", reaisDaSpec("−660")]);
    expect(h1.datas_ordem_relevante).toEqual([]);
  });
});
