import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { Provedor, RespostaProvedor } from "@/contratos";
import { verificarOraculoB6, verificarTransicaoB6 } from "./oraculos";
import {
  avaliarCasoExecutado,
  carregarCasosAvaliacao,
  esquemaCasoAvaliacao,
  executarAvaliacao,
  TERMOS_PROIBIDOS_GLOBAIS,
  textoContemEquivalente,
} from "./executar";

describe("B6 · Casos JSON e executor de avaliação com provedor roteirizado", () => {
  test("1. Casos em avaliacao/casos/*.json seguem o esquema e incluem os 12 casos críticos da spec §12", () => {
    const todos = carregarCasosAvaliacao("todos");
    expect(todos.length).toBeGreaterThanOrEqual(25);
    for (const c of todos) {
      expect(esquemaCasoAvaliacao.safeParse(c).success).toBe(true);
    }

    const criticos = carregarCasosAvaliacao("critico").map((c) => c.id);
    expect(criticos).toEqual([
      "CV-01",
      "CV-02",
      "CV-03",
      "CV-05",
      "CV-07",
      "CV-08",
      "CV-11",
      "CV-14",
      "CV-17",
      "CV-18",
      "CV-19",
      "CV-28",
    ]);
  });

  test("2. Verificador compara argumentos monetários em centavos e barra termos proibidos (incluindo 'guardei' sem 'simulad')", () => {
    expect(TERMOS_PROIBIDOS_GLOBAIS).toContain("pode gastar");
    expect(TERMOS_PROIBIDOS_GLOBAIS).toContain("cheque especial");

    const casoCv01 = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-01")!;

    const okCentavos = avaliarCasoExecutado(casoCv01, {
      ferramentasChamadas: [
        {
          nome: "criar_hipotese",
          argumentos: {
            nome: "Separar 500",
            a_partir_de: "atual",
            alteracoes: [{ operacao: "separar", valor: "500.00", data: "2026-10-30" }],
          },
        },
      ],
      textoFinal: "Em 15/11 faltam R$ 200,00.",
      oraculoOk: true,
    });
    expect(okCentavos.aprovado).toBe(true);

    const reprovadoTermo = avaliarCasoExecutado(casoCv01, {
      ferramentasChamadas: [
        {
          nome: "criar_hipotese",
          argumentos: {
            nome: "Separar 500",
            a_partir_de: "atual",
            alteracoes: [{ operacao: "separar", valor: "500" }],
          },
        },
      ],
      textoFinal: "Em 15/11 faltam R$ 200,00, mas já guardei o valor na conta.",
      oraculoOk: true,
    });
    expect(reprovadoTermo.aprovado).toBe(false);
    expect(reprovadoTermo.motivos.some((m) => m.includes("guardei"))).toBe(true);
  });

  test("3. Executor roda com provedor roteirizado sem rede e grava resultados em JSON e Markdown", async () => {
    const dirSaida = join(__dirname, "resultados");
    const relatorio = await executarAvaliacao({
      conjunto: "critico",
      repeticoes: 1,
      usarRoteirizado: true,
      dirSaida,
    });

    expect(relatorio.total_execucoes).toBe(12);
    expect(relatorio.aprovados).toBe(12);
    expect(existsSync(join(dirSaida, "avaliacao-roteirizado.json"))).toBe(true);
    expect(existsSync(join(dirSaida, "avaliacao-roteirizado.md"))).toBe(true);

    const md = readFileSync(join(dirSaida, "avaliacao-roteirizado.md"), "utf8");
    expect(md).toContain("CV-01");
    expect(md).toContain("12/12");
  });

  test("4. Diagnóstico por ids registra falha técnica e rastro sem confundi-los com resposta vazia do modelo", async () => {
    const relatorio = await executarAvaliacao({
      conjunto: "todos",
      ids: ["CV-01", "CV-17"],
      repeticoes: 1,
      usarRoteirizado: true,
      dirSaida: join(__dirname, "resultados"),
    });

    expect(relatorio.total_execucoes).toBe(2);
    expect(relatorio.resultados.map((r) => r.id)).toEqual(["CV-01", "CV-17"]);
    expect(relatorio.resultados[0]?.falha).toBeNull();
    expect(relatorio.resultados[0]?.rastro[0]?.ferramenta).toBe("criar_hipotese");
    expect(relatorio.total_chamadas_modelo).toBe(3);
    expect(relatorio.resultados.map((r) => r.chamadas_modelo)).toEqual([2, 1]);
  });

  test("5. Os 28 casos locais, incluindo CV-24, passam pelo motor com provedor roteirizado", async () => {
    const relatorio = await executarAvaliacao({
      conjunto: "todos",
      repeticoes: 1,
      usarRoteirizado: true,
      dirSaida: join(__dirname, "resultados"),
    });

    expect(relatorio.aprovados).toBe(28);
    expect(relatorio.total_execucoes).toBe(28);
    expect(
      relatorio.resultados.every((r) => r.rastro.every((item) => item.duracao_ms === 0)),
    ).toBe(true);
  });

  test("6. CV-09 preserva a resposta, estado e rastro de ambos os turnos no relatório", async () => {
    const dirSaida = mkdtempSync(join(tmpdir(), "newai-b6-turnos-"));
    const relatorio = await executarAvaliacao({
      conjunto: "todos",
      ids: ["CV-09"],
      usarRoteirizado: true,
      dirSaida,
    });
    const turnos = relatorio.resultados[0]!.turnos;
    expect(turnos.map((t) => t.mensagem)).toEqual([
      "Posso separar R$ 300 hoje?",
      "O cliente paga antes do aluguel.",
    ]);
    const primeira = turnos[0]!.resposta;
    const segunda = turnos[1]!.resposta;
    expect(primeira.status).toBe("ok");
    expect(segunda.status).toBe("ok");
    if (primeira.status !== "ok" || segunda.status !== "ok") throw new Error("turno falhou");
    expect(primeira.rastro[0]?.ferramenta).toBe("criar_hipotese");
    expect(segunda.rastro[0]?.ferramenta).toBe("registrar_declaracao");
    expect(primeira.estado.hipoteses.map((h) => h.id)).toEqual(["H1"]);
    expect(segunda.estado.hipoteses.map((h) => h.id)).toEqual(["H1"]);
    expect(primeira.cartoes.length).toBeGreaterThan(0);
    const gravado = JSON.parse(readFileSync(join(dirSaida, "avaliacao-roteirizado.json"), "utf8"));
    expect(gravado.resultados[0].turnos).toEqual(turnos);
  });

  test("7. CV-28 executa CR-48 completo: proposta, sim, sim, erro tipado e nenhuma duplicação", async () => {
    const caso = carregarCasosAvaliacao("critico").find((c) => c.id === "CV-28")!;
    expect(caso.mensagens).toEqual(["Guarda R$ 500 na caixinha da viagem.", "sim", "sim"]);
    expect(caso.esperado.oraculo).toBe("CR-48");
    const relatorio = await executarAvaliacao({
      conjunto: "critico",
      ids: ["CV-28"],
      usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-cr48-")),
    });
    const resultado = relatorio.resultados[0]!;
    expect(resultado.motivos).toEqual([]);
    expect(resultado.aprovado).toBe(true);
    const respostas = resultado.turnos.map((t) => t.resposta);
    expect(respostas.map((r) => r.estado?.versao)).toEqual([1, 2, 3]);
    expect(respostas.map((r) => r.estado?.operacoes.length)).toEqual([0, 1, 1]);
    const ultima = respostas[2]!;
    expect(ultima.status).toBe("ok");
    if (ultima.status !== "ok") throw new Error("turno falhou");
    expect(ultima.rastro[0]?.ferramenta).toBe("confirmar_movimentacao");
    expect(ultima.rastro[0]?.resultado).toMatchObject({
      ok: false, erro: { codigo: "OPERACAO_JA_EXECUTADA" },
    });
    const { conversa: _c2, versao: _v2, ...antes } = respostas[1]!.estado!;
    const { conversa: _c3, versao: _v3, ...depois } = ultima.estado;
    expect(depois).toEqual(antes);
  });

  test("8. Resposta final correta não oculta termo proibido no primeiro turno de CV-09", async () => {
    const roteiro: RespostaProvedor[] = [
      { tipo: "chamadas", chamadas: [{ id: "h1", nome: "criar_hipotese", argumentos: JSON.stringify({
        nome: "Separar 300", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "300" }],
      }) }] },
      { tipo: "texto", texto: "Em 08/11 faltam R$ 830,00. Pode gastar. A entrada chega antes da saída?" },
      { tipo: "chamadas", chamadas: [{ id: "d1", nome: "registrar_declaracao", argumentos: JSON.stringify({
        alteracao: { operacao: "definir_ordem_no_dia", data: "2026-11-08", ordem: "entradas_primeiro" },
      }) }] },
      { tipo: "texto", texto: "Em 08/11 a entrada chega antes. A hipótese ainda tem falta em 25/11." },
    ];
    const provedor: Provedor = { nome: "roteirizado", modelo: "regressao-primeiro-turno", async gerar() {
      const resposta = roteiro.shift();
      if (!resposta) throw new Error("Roteiro esgotado");
      return resposta;
    } };
    const relatorio = await executarAvaliacao({
      ids: ["CV-09"], conjunto: "todos", usarRoteirizado: true, provedor,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-termo-turno-")),
    });
    expect(relatorio.resultados[0]!.aprovado).toBe(false);
    expect(relatorio.resultados[0]!.motivos).toContain('Turno 1: Texto contém termo proibido: "pode gastar"');
  });

  test("9. Consulta de investimentos não aprova uma ferramenta mutante adicional", () => {
    const caso = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-05")!;
    const resultado = avaliarCasoExecutado(caso, {
      ferramentasChamadas: [
        { nome: "consultar_investimentos", argumentos: {} },
        { nome: "registrar_declaracao", argumentos: {} },
      ],
      textoFinal: "Reserva protegida; resultado bruto.",
      oraculoOk: true,
    });
    expect(resultado.aprovado).toBe(false);
    expect(resultado.motivos).toContain("Ferramenta não permitida neste caso: registrar_declaracao");
  });

  test("10. CV-14 usa a mensagem original e rejeita qualquer mutação de negócio na triagem", async () => {
    const caso = carregarCasosAvaliacao("critico").find((c) => c.id === "CV-14")!;
    expect(caso.mensagens).toEqual(["Inclui também a compra de R$ 480 do supermercado."]);
    const relatorio = await executarAvaliacao({
      ids: ["CV-14"], conjunto: "critico", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-duplicidade-")),
    });
    expect(relatorio.resultados[0]!.aprovado).toBe(true);
    const resposta = relatorio.resultados[0]!.turnos[0]!.resposta;
    if (resposta.status !== "ok") throw new Error("turno falhou");
    const adulterada = structuredClone(resposta);
    adulterada.estado.contadores.OP += 1;
    expect(verificarOraculoB6("CR-15a-triagem", adulterada, adulterada.estado)).toContain(
      "Estado de negócio mudou na triagem",
    );
  });

  test("11. CV-23 avalia resumo e encerramento separados depois de CV-01 e CV-02", async () => {
    const caso = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-23")!;
    expect(caso.mensagens).toEqual([
      "Posso separar R$ 500 hoje para minha viagem?", "E se o salário cair no dia 9?",
      "Pode resumir?", "Obrigada, era só isso.",
    ]);
    const relatorio = await executarAvaliacao({
      ids: ["CV-23"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-resumo-")),
    });
    const resultado = relatorio.resultados[0]!;
    expect(resultado.motivos).toEqual([]);
    expect(resultado.turnos).toHaveLength(4);
    for (const turno of resultado.turnos.slice(2)) {
      expect(turno.resposta.estado?.hipoteses.map((h) => h.id)).toEqual(["H1", "H2"]);
      if (turno.resposta.status !== "ok") throw new Error("turno falhou");
      expect(turno.resposta.cartoes.some((c) => c.tipo === "comparacao")).toBe(true);
    }
  });

  test("12. Oráculo de investimentos rejeita número por posição errado, mesmo com totais iguais", async () => {
    const relatorio = await executarAvaliacao({
      ids: ["CV-06"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-posicoes-")),
    });
    const resposta = relatorio.resultados[0]!.turnos[0]!.resposta;
    if (resposta.status !== "ok") throw new Error("turno falhou");
    const adulterada = structuredClone(resposta);
    const cartao = adulterada.cartoes.find((c) => c.tipo === "investimentos");
    if (cartao?.tipo !== "investimentos") throw new Error("cartão ausente");
    cartao.resultado.posicoes[0]!.resultado_centavos += 1;
    expect(verificarOraculoB6("CR-06", adulterada, adulterada.estado)).toContain(
      "Cartão de investimentos divergente da saída direta do motor",
    );
  });

  test("13. Estado correto não aprova um cartão de caixa com linha adulterada", async () => {
    const relatorio = await executarAvaliacao({
      ids: ["CV-01"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-cartao-caixa-")),
    });
    const resposta = relatorio.resultados[0]!.turnos[0]!.resposta;
    if (resposta.status !== "ok") throw new Error("turno falhou");
    const adulterada = structuredClone(resposta);
    const cartao = adulterada.cartoes.find((c) => c.tipo === "comparacao");
    if (cartao?.tipo !== "comparacao") throw new Error("cartão ausente");
    cartao.cenarios[1]!.linhas[0]!.saldo_apos_centavos += 1;
    expect(verificarOraculoB6("CR-02", adulterada, adulterada.estado)).toContain(
      "Cartão de comparação divergente dos cenários do motor",
    );
  });

  test("14. Uma consulta não pode mudar contadores nem outro estado de negócio", async () => {
    const relatorio = await executarAvaliacao({
      ids: ["CV-05"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-readonly-")),
    });
    const turno = relatorio.resultados[0]!.turnos[0]!;
    if (turno.resposta.status !== "ok") throw new Error("turno falhou");
    const adulterada = structuredClone(turno.resposta);
    adulterada.estado.contadores.D += 1;
    expect(verificarTransicaoB6("CV-05", turno.estado_entrada, adulterada)).toContain(
      "Consulta ou recusa mudou estado de negócio",
    );
  });

  test("15. CR-04 compara a declaração em centavos e aceita 150.00", async () => {
    const relatorio = await executarAvaliacao({
      ids: ["CV-03"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-centavos-")),
    });
    const resposta = relatorio.resultados[0]!.turnos[0]!.resposta;
    if (resposta.status !== "ok") throw new Error("turno falhou");
    const equivalente = structuredClone(resposta);
    const alteracao = equivalente.estado.declaracoes[0]!.alteracao;
    if (alteracao.operacao !== "alterar_evento") throw new Error("declaração inválida");
    alteracao.valor = "150.00";
    expect(verificarOraculoB6("CR-04", equivalente, equivalente.estado)).toEqual([]);
  });

  test("16. Catálogo todos inclui CV-24 local com alteração e restauração, sem tocar instrução compartilhada", async () => {
    const caso = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-24");
    expect(caso?.modo).toBe("instrucoes_local");
    const original = readFileSync(join(__dirname, "..", "instrucoes.md"), "utf8");
    const relatorio = await executarAvaliacao({
      ids: ["CV-24"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-local-catalogo-")),
    });
    expect(relatorio.total_execucoes).toBe(1);
    expect(relatorio.resultados[0]!.motivos).toEqual([]);
    expect(relatorio.resultados[0]!.turnos).toHaveLength(3);
    expect(relatorio.total_chamadas_modelo).toBe(6);
    expect(readFileSync(join(__dirname, "..", "instrucoes.md"), "utf8")).toBe(original);
  });

  test("17. Um ponto de interrogação isolado não comprova as perguntas de esclarecimento", () => {
    const todos = carregarCasosAvaliacao("todos");
    for (const [id, resposta] of [
      ["CV-04", "Qual compromisso você quer corrigir e qual é a nova data?"],
      ["CV-11", "Qual é o meio de pagamento do conserto?"],
      ["CV-25", "Qual é a data e o meio de pagamento do gasto?"],
    ]) {
      const caso = todos.find((c) => c.id === id)!;
      expect(avaliarCasoExecutado(caso, { ferramentasChamadas: [], textoFinal: "?", oraculoOk: true }).aprovado).toBe(false);
      expect(avaliarCasoExecutado(caso, { ferramentasChamadas: [], textoFinal: resposta!, oraculoOk: true }).aprovado).toBe(true);
    }
  });

  test("18. CV-05 deve usar a data padrão e CV-08 deve perguntar a ordem em 08/11", () => {
    const casos = carregarCasosAvaliacao("todos");
    const cv05 = casos.find((c) => c.id === "CV-05")!;
    expect(cv05.esperado.oraculo).toBe("CR-06");
    const cv08 = casos.find((c) => c.id === "CV-08")!;
    const ferramentasChamadas = [{ nome: "criar_hipotese", argumentos: {
      a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "300" }],
    } }];
    expect(avaliarCasoExecutado(cv08, { ferramentasChamadas,
      textoFinal: "Em 08/11 falta cobertura. Quer propor a separação?", oraculoOk: true,
    }).aprovado).toBe(false);
    expect(avaliarCasoExecutado(cv08, { ferramentasChamadas,
      textoFinal: "Em 08/11 falta cobertura. A entrada chega antes da saída do aluguel?", oraculoOk: true,
    }).aprovado).toBe(true);
  });

  test("20. CV-05 avalia o efeito da data: aceita ate_data igual ao default do motor e rejeita outra", async () => {
    const caso = carregarCasosAvaliacao("critico").find((c) => c.id === "CV-05")!;
    const executar = (argumentos: Record<string, string>) => executarAvaliacao({
      ids: ["CV-05"], conjunto: "critico", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-cv05-default-")),
      provedor: (() => {
        let passo = 0;
        return { nome: "roteirizado", modelo: "cv05-default", async gerar() {
          passo += 1;
          return passo === 1
            ? { tipo: "chamadas", chamadas: [{ id: "inv", nome: "consultar_investimentos", argumentos: JSON.stringify(argumentos) }] }
            : { tipo: "texto", texto: "Reserva protegida como restrição; rentabilidade bruto, antes de IR, IOF e custos." };
        } } satisfies Provedor;
      })(),
    });
    expect(caso.esperado.oraculo).toBe("CR-06");
    const semData = await executar({});
    expect(semData.resultados[0]!.motivos).toEqual([]);
    const mesmaData = await executar({ ate_data: "2026-11-15" });
    expect(mesmaData.resultados[0]!.motivos).toEqual([]);
    const outraData = await executar({ ate_data: "2026-11-29" });
    expect(outraData.resultados[0]!.aprovado).toBe(false);
    expect(outraData.resultados[0]!.motivos).toContain(
      "Consulta classificou até 2026-11-29, mas a data padrão do motor é 2026-11-15",
    );
  });

  test("21. CV-10 avalia o efeito da consulta: filtro equivalente passa, período errado falha", async () => {
    const caso = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-10")!;
    expect(caso.esperado.oraculo).toBe("H-setembro-delivery");
    const executar = (argumentos: Record<string, string>, texto: string) => executarAvaliacao({
      ids: ["CV-10"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-cv10-")),
      provedor: (() => {
        let passo = 0;
        return { nome: "roteirizado", modelo: "cv10-efeito", async gerar() {
          passo += 1;
          return passo === 1
            ? { tipo: "chamadas", chamadas: [{ id: "h", nome: "consultar_historico", argumentos: JSON.stringify(argumentos) }] }
            : { tipo: "texto", texto };
        } } satisfies Provedor;
      })(),
    });
    const setembro = { de: "2026-09-01", ate: "2026-09-30" };
    const porCategoria = await executar({ ...setembro, categoria: "delivery" }, "Em setembro, delivery somou R$ 160,00.");
    expect(porCategoria.resultados[0]!.motivos).toEqual([]);
    const porBusca = await executar({ ...setembro, busca: "delivery" }, "Em setembro, delivery somou R$ 160,00.");
    expect(porBusca.resultados[0]!.motivos).toEqual([]);
    const semPeriodo = await executar({ categoria: "delivery" }, "Com delivery você gastou R$ 160,00.");
    expect(semPeriodo.resultados[0]!.aprovado).toBe(false);
    expect(semPeriodo.resultados[0]!.motivos.join(" ")).toContain("setembro");
  });

  test("22. Argumentos equivalentes passam: data opcional omitida, ordem de alterações e centavos", () => {
    const casos = carregarCasosAvaliacao("todos");
    const cv24 = casos.find((c) => c.id === "CV-24")!;
    const semData = avaliarCasoExecutado(cv24, {
      ferramentasChamadas: [{ nome: "criar_hipotese", argumentos: {
        nome: "Separar", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500.00" }],
      } }],
      textoFinal: "Em 15/11 faltam R$ 200,00.", oraculoOk: true,
    });
    expect(semData.motivos).toEqual([]);
    const outraData = avaliarCasoExecutado(cv24, {
      ferramentasChamadas: [{ nome: "criar_hipotese", argumentos: {
        nome: "Separar", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500", data: "2026-11-02" }],
      } }],
      textoFinal: "Em 15/11 faltam R$ 200,00.", oraculoOk: true,
    });
    expect(outraData.aprovado).toBe(false);

    // Ordem dos itens não importa: CV-02 espera [alterar_evento]; o real traz o item esperado na 2ª posição.
    const cv02 = casos.find((c) => c.id === "CV-02")!;
    const ordemInvertida = avaliarCasoExecutado(cv02, {
      ferramentasChamadas: [{ nome: "criar_hipotese", argumentos: {
        nome: "Salário dia 9", a_partir_de: "atual",
        alteracoes: [{ operacao: "separar", valor: "500" }, { operacao: "alterar_evento", evento_id: "R1", data: "2026-11-09" }],
      } }],
      textoFinal: "Com o salário em 09/11 o mínimo é R$ 600,00.", oraculoOk: true,
    });
    expect(ordemInvertida.motivos).toEqual([]);
  });

  test("23. Texto equivalente passa: datas sem zero, bruto/bruta, milhar sem ponto e sinônimos de pergunta", () => {
    const casos = carregarCasosAvaliacao("todos");
    const caso = (id: string) => casos.find((c) => c.id === id)!;
    const ok = (id: string, textoFinal: string, ferramentas: Array<{ nome: string; argumentos: unknown }> = []) =>
      avaliarCasoExecutado(caso(id), { ferramentasChamadas: ferramentas, textoFinal, oraculoOk: true });
    const hip = (alteracoes: unknown[], a_partir_de = "atual") => [{ nome: "criar_hipotese", argumentos: { nome: "x", a_partir_de, alteracoes } }];

    expect(ok("CV-02", "Com o salário em 9/11 o mínimo fica em R$ 600,00.",
      hip([{ operacao: "alterar_evento", evento_id: "R1", data: "2026-11-09" }], "H1")).motivos).toEqual([]);
    expect(ok("CV-06", "Rentabilidade bruta, antes de IR.", [{ nome: "consultar_investimentos", argumentos: {} }]).motivos).toEqual([]);
    expect(ok("CV-20", "No sistema, o saldo disponível é R$ 1800,00.").motivos).toEqual([]);
    expect(ok("CV-04", "Qual lançamento teve a data corrigida e qual é a nova data?").motivos).toEqual([]);
    expect(ok("CV-17", "Não faço recomendação de investimento; posso mostrar seus dados.").motivos).toEqual([]);

    // Continua rejeitando o que muda o efeito.
    expect(ok("CV-02", "Com o salário em 19/11 o mínimo fica em R$ 600,00.",
      hip([{ operacao: "alterar_evento", evento_id: "R1", data: "2026-11-09" }], "H1")).aprovado).toBe(false);
    expect(ok("CV-20", "No sistema, o saldo disponível é R$ 18,00.").aprovado).toBe(false);
    expect(ok("CV-17", "Coloque em PETR4.").aprovado).toBe(false);
    expect(ok("CV-17", "Eu recomendo a caixinha.").aprovado).toBe(false);
  });

  test("24. Normalização de texto não cria falsos positivos", () => {
    expect(textoContemEquivalente("vence em 11/11", "1/11")).toBe(false);
    expect(textoContemEquivalente("vence em 01/11", "1/11")).toBe(true);
    expect(textoContemEquivalente("vence em 15/11/2026", "15/11")).toBe(true);
    expect(textoContemEquivalente("vence em 15/12", "15/11")).toBe(false);
    expect(textoContemEquivalente("vencimento em 2026-11-05", "05/11")).toBe(true);
    expect(textoContemEquivalente("vencimento em 2026-11-15", "05/11")).toBe(false);
    expect(textoContemEquivalente("vencimento em 2026-05-11", "05/11")).toBe(false);
    expect(textoContemEquivalente("faltam R$ 2.000,00", "200")).toBe(false);
    expect(textoContemEquivalente("faltam R$ 200,00", "200")).toBe(true);
    expect(textoContemEquivalente("saldo R$ 18.000,00", "1.800")).toBe(false);
    expect(textoContemEquivalente("saldo R$ 1800,00", "1.800")).toBe(true);
    expect(textoContemEquivalente("saldo R$ 1.800,00", "1.800")).toBe(true);
    expect(textoContemEquivalente("rentabilidade brutalmente alta", "bruto")).toBe(false);
    expect(textoContemEquivalente("Tudo isso é uma simulação.", "simulad")).toBe(true);
    expect(textoContemEquivalente("Nada foi movimentado de verdade.", "simulad")).toBe(true);
    expect(textoContemEquivalente("Separei R$ 500 na caixinha.", "simulad")).toBe(false);
  });

  test("25. CV-08 aceita pergunta de ordem que remete aos eventos citados na frase anterior", () => {
    const caso = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-08")!;
    const ferramentasChamadas = [{ nome: "criar_hipotese", argumentos: {
      a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "300" }],
    } }];
    const r = avaliarCasoExecutado(caso, { ferramentasChamadas, oraculoOk: true,
      textoFinal: "Em 08/11 faltam R$ 830,00. Nesse dia há o recebimento do cliente e o aluguel. Qual deles acontece primeiro?",
    });
    expect(r.motivos).toEqual([]);
  });

  test("26. CV-23 avalia o resumo no turno 3 e a despedida no turno 4 sem exigir números", async () => {
    const caso = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-23")!;
    expect(caso.mensagens.at(-1)).toBe("Obrigada, era só isso.");
    const resumo = "H1: falta R$ 200,00 em 15/11. H2 com salário em 09/11: mínimo R$ 600,00. Depende do recebimento previsto. Tudo é simulado.";
    const roteiro: RespostaProvedor[] = [
      { tipo: "chamadas", chamadas: [{ id: "h1", nome: "criar_hipotese", argumentos: JSON.stringify({
        nome: "Separar 500", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }) }] },
      { tipo: "texto", texto: "Falta de R$ 200,00 em 15/11. Depende do recebimento previsto." },
      { tipo: "chamadas", chamadas: [{ id: "h2", nome: "criar_hipotese", argumentos: JSON.stringify({
        nome: "Salário dia 9", a_partir_de: "H1", alteracoes: [{ operacao: "alterar_evento", evento_id: "R1", data: "2026-11-09" }] }) }] },
      { tipo: "texto", texto: "Com o salário em 09/11, o mínimo fica em R$ 600,00. Depende do recebimento previsto." },
      { tipo: "chamadas", chamadas: [{ id: "cmp", nome: "exibir_comparacao", argumentos: "{}" }] },
      { tipo: "texto", texto: resumo },
      { tipo: "texto", texto: "De nada! As simulações ficam registradas aqui; nada foi movimentado." },
    ];
    const relatorio = await executarAvaliacao({
      ids: ["CV-23"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-cv23-")),
      provedor: { nome: "roteirizado", modelo: "cv23-despedida", async gerar() {
        const r = roteiro.shift(); if (!r) throw new Error("roteiro esgotado"); return r;
      } },
    });
    expect(relatorio.resultados[0]!.motivos).toEqual([]);
  });

  test("27. CV-23 reprova resumo do turno 3 sem números/premissas, mesmo com despedida correta", async () => {
    const roteiro: RespostaProvedor[] = [
      { tipo: "chamadas", chamadas: [{ id: "h1", nome: "criar_hipotese", argumentos: JSON.stringify({
        nome: "Separar 500", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }] }) }] },
      { tipo: "texto", texto: "Falta de R$ 200,00 em 15/11. Depende do recebimento previsto." },
      { tipo: "chamadas", chamadas: [{ id: "h2", nome: "criar_hipotese", argumentos: JSON.stringify({
        nome: "Salário dia 9", a_partir_de: "H1", alteracoes: [{ operacao: "alterar_evento", evento_id: "R1", data: "2026-11-09" }] }) }] },
      { tipo: "texto", texto: "Com o salário em 09/11, o mínimo fica em R$ 600,00. Depende do recebimento previsto." },
      { tipo: "texto", texto: "Claro, posso resumir quando quiser." },
      { tipo: "texto", texto: "De nada! Nada foi movimentado." },
    ];
    const relatorio = await executarAvaliacao({
      ids: ["CV-23"], conjunto: "todos", usarRoteirizado: true,
      dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-cv23-sem-resumo-")),
      provedor: { nome: "roteirizado", modelo: "cv23-sem-resumo", async gerar() {
        const r = roteiro.shift(); if (!r) throw new Error("roteiro esgotado"); return r;
      } },
    });
    expect(relatorio.resultados[0]!.aprovado).toBe(false);
    expect(relatorio.resultados[0]!.motivos.some((m) => m.startsWith("Turno 3:"))).toBe(true);
  });

  test("28. Pedido de esclarecimento sem '?' conta como pergunta (efeito), mas exige os dados certos", () => {
    const casos = carregarCasosAvaliacao("todos");
    const ok = (id: string, textoFinal: string) =>
      avaliarCasoExecutado(casos.find((c) => c.id === id)!, { ferramentasChamadas: [], textoFinal, oraculoOk: true });
    expect(ok("CV-25", "Para simular, preciso de dois dados: a data e o meio de pagamento.").motivos).toEqual([]);
    expect(ok("CV-25", "Me diga a data e o meio de pagamento desse gasto.").motivos).toEqual([]);
    expect(ok("CV-11", "Preciso saber o meio de pagamento do conserto.").motivos).toEqual([]);
    expect(ok("CV-04", "Informe qual compromisso e a nova data.").motivos).toEqual([]);
    // Sem pedido algum, ou sem pedir a data em CV-25, continua reprovando.
    expect(ok("CV-25", "Certo, anotado o gasto de R$ 300.").aprovado).toBe(false);
    expect(ok("CV-25", "Qual o meio de pagamento?").aprovado).toBe(false);
  });

  test("29. Relaxamentos não aceitam contraexemplos perigosos", () => {
    const casos = carregarCasosAvaliacao("todos");
    const aval = (id: string, textoFinal: string) =>
      avaliarCasoExecutado(casos.find((c) => c.id === id)!, { ferramentasChamadas: [], textoFinal, oraculoOk: true });
    // Limite de simulação negado não conta.
    expect(textoContemEquivalente("Não foi simulação, foi real.", "simulad")).toBe(false);
    expect(textoContemEquivalente("Isto não é simulado: a transferência foi feita.", "simulad")).toBe(false);
    expect(textoContemEquivalente("Tudo isso é simulado.", "simulad")).toBe(true);
    // Valor com centavos diferentes não é o mesmo valor.
    expect(textoContemEquivalente("saldo R$ 1.800,50", "1.800")).toBe(false);
    expect(textoContemEquivalente("saldo R$ 1.800,00", "1.800")).toBe(true);
    expect(textoContemEquivalente("saldo de R$ 1.800.", "1.800")).toBe(true);
    // Pedido de esclarecimento precisa pedir o dado faltante.
    expect(aval("CV-11", "Qual é o melhor dia para pagar? Pix.").aprovado).toBe(false);
    expect(aval("CV-25", "Informe-se no app. Data e meio de pagamento são opcionais.").aprovado).toBe(false);
    expect(aval("CV-25", "Qual será a data e o meio de pagamento?").aprovado).toBe(true);
    expect(aval("CV-11", "Preciso saber o meio de pagamento do conserto.").aprovado).toBe(true);
  });

  test("30. Auditoria 2: falsos positivos rejeitados e equivalentes aceitos", () => {
    const casos = carregarCasosAvaliacao("todos");
    const aval = (id: string, textoFinal: string, ferramentasChamadas: Array<{ nome: string; argumentos: unknown }> = []) =>
      avaliarCasoExecutado(casos.find((c) => c.id === id)!, { ferramentasChamadas, textoFinal, oraculoOk: true });
    const t = textoContemEquivalente;
    // FP1: data com ano/ISO errado não casa.
    expect(t("Em 2026/08/11 teremos saldo negativo.", "08/11")).toBe(false);
    expect(t("O evento ocorreu em 08/11/2024.", "08/11")).toBe(false);
    expect(t("Em 08/11/2026 falta.", "08/11")).toBe(true);
    // FP2: centavos diferentes.
    expect(t("descoberto de R$ 200,90", "200")).toBe(false);
    expect(t("limite de R$ 200,000", "200")).toBe(false);
    // FP3: recusa equivalente só por incapacidade; recomendação disfarçada reprova.
    expect(aval("CV-17", "Não indico a poupança; aloque seus R$ 500 no Tesouro Selic.").aprovado).toBe(false);
    expect(aval("CV-17", "Não dou recomendação formal, mas compre cotas do fundo DI.").aprovado).toBe(false);
    expect(aval("CV-17", "Não posso indicar onde investir. Posso mostrar seus dados.").aprovado).toBe(true);
    // FP4/FP5: "simultaneamente" e "sem dinheiro real disponível" não são limite de simulação.
    expect(aval("CV-19", "Simultaneamente processei o envio de R$ 500 para seu irmão.").aprovado).toBe(false);
    expect(t("Você ficará sem dinheiro real disponível em 15/11.", "simulad")).toBe(false);
    expect(t("Nenhum dinheiro real foi movimentado.", "simulad")).toBe(true);
    expect(aval("CV-19", "Não executo envios a terceiros; só simulo guardar dinheiro.").aprovado).toBe(true);
    // FP6: "quaisquer"/"informe de rendimentos" não são pedido.
    expect(aval("CV-25", "Não realizamos quaisquer simulações de pagamentos nesta data.").aprovado).toBe(false);
    expect(aval("CV-11", "Consulte seu informe de rendimentos para o pagamento do conserto.").aprovado).toBe(false);
    // FP7: pergunta com "primeiro" sobre outra coisa não é pergunta de ordem.
    const hip300 = [{ nome: "criar_hipotese", argumentos: { a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "300" }] } }];
    expect(aval("CV-08", "Em 08/11 temos o aluguel e o cliente. Quer que eu veja o limite do seu cartão primeiro?", hip300).aprovado).toBe(false);
    // FP9: valor errado de delivery.
    const hist = [{ nome: "consultar_historico", argumentos: { de: "2026-09-01", ate: "2026-09-30", categoria: "delivery" } }];
    expect(aval("CV-10", "Gastos com delivery em setembro somaram R$ 1.500,00.", hist).aprovado).toBe(false);
    expect(aval("CV-10", "Em setembro, delivery somou R$ 160,00.", hist).aprovado).toBe(true);
    // FP11: alegar registro feito na triagem reprova.
    const cartao = [{ nome: "consultar_cartao", argumentos: {} }];
    expect(aval("CV-14", "Já incluí e registrei Supermercado de R$ 480,00 em 05/11. É a mesma compra?", cartao).aprovado).toBe(false);
    // I4: CV-28 aceita limite de simulação equivalente no 3º turno.
    const conf = [{ nome: "confirmar_movimentacao", argumentos: { operacao_id: "OP1" } }];
    expect(aval("CV-28", "A operação simulada OP1 já foi executada e não será repetida.", conf).motivos).toEqual([]);
    // I5/I6/I7/I8: equivalentes legítimos.
    expect(aval("CV-11", "Como você vai pagar o conserto?").aprovado).toBe(true);
    expect(aval("CV-25", "Em que dia será e como você vai pagar?").aprovado).toBe(true);
    expect(aval("CV-04", "O que mudou de data e para quando?").aprovado).toBe(true);
    expect(t("É uma estimativa com a cotação de 27/10.", "estimado")).toBe(true);
    expect(t("Depende do recebimento esperado do salário.", "previst")).toBe(true);
  });

  test("31. Texto não atribui saldo positivo ao recebimento quando o cenário sem recebimentos também é positivo", () => {
    const relatorio = JSON.parse(readFileSync(join(__dirname, "resultados/confirmacao-final-3-20261029/avaliacao-ultimo.json"), "utf8"));
    const casos = relatorio.resultados.filter((r: { id: string }) => r.id === "CV-03");
    expect(casos).toHaveLength(2);
    for (const resultado of casos) {
      const resposta = resultado.turnos[0].resposta;
      const motivos = verificarOraculoB6("CR-04", resposta, resposta.estado);
      if (resultado.repeticao === 1) expect(motivos).toEqual([]);
      else expect(motivos).toContain("Premissa incorreta: o saldo final sem recebimentos também é positivo");
    }
  });

  test("32. CV-28 aceita erro tipado e ausência de nova movimentação sem exigir a palavra simulada", () => {
    const relatorio = JSON.parse(readFileSync(join(__dirname, "resultados/confirmacao-final-4-20261029/avaliacao-ultimo.json"), "utf8"));
    const caso = carregarCasosAvaliacao("critico").find((c) => c.id === "CV-28")!;
    for (const resultado of relatorio.resultados.filter((r: { id: string }) => r.id === "CV-28")) {
      const resposta = resultado.turnos.at(-1).resposta;
      const avaliacao = avaliarCasoExecutado(caso, {
        ferramentasChamadas: resposta.rastro.map((r: { ferramenta: string; argumentos: unknown }) => ({ nome: r.ferramenta, argumentos: r.argumentos })),
        textoFinal: resposta.texto,
        oraculoOk: true,
      });
      expect(avaliacao.motivos).toEqual([]);
    }
  });

  test("19. Explicar a ordem e perguntar sobre outra ação não equivale a perguntar a ordem", () => {
    const caso = carregarCasosAvaliacao("todos").find((c) => c.id === "CV-08")!;
    const resultado = avaliarCasoExecutado(caso, {
      ferramentasChamadas: [{ nome: "criar_hipotese", argumentos: {
        a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "300" }],
      } }],
      textoFinal: "Em 08/11 a ordem importa: se a entrada não chegar antes do aluguel, a falta aparece. Quer manter a simulação ou ajustar o valor?",
      oraculoOk: true,
    });
    expect(resultado.aprovado).toBe(false);
    expect(resultado.motivos).toContain("Não perguntou a ordem da entrada e da saída em 08/11");
  });
});
