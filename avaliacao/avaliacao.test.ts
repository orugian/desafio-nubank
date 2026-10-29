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

  test("10. CV-14 usa a mensagem original e rejeita qualquer mutação de negócio após duplicidade", async () => {
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
    expect(verificarOraculoB6("CR-15a", adulterada, adulterada.estado)).toContain(
      "Estado de negócio mudou apesar da duplicidade",
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
    expect(avaliarCasoExecutado(cv05, {
      ferramentasChamadas: [{ nome: "consultar_investimentos", argumentos: { ate_data: "2026-11-29" } }],
      textoFinal: "Reserva protegida; resultado bruto até 29/11.", oraculoOk: true,
    }).aprovado).toBe(false);
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
});
