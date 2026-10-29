import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
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

  test("5. Todos os 27 casos passam pelos oráculos reais com o provedor roteirizado", async () => {
    const relatorio = await executarAvaliacao({
      conjunto: "todos",
      repeticoes: 1,
      usarRoteirizado: true,
      dirSaida: join(__dirname, "resultados"),
    });

    expect(relatorio.aprovados).toBe(27);
    expect(relatorio.total_execucoes).toBe(27);
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
});
