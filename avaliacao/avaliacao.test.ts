import { existsSync, readFileSync } from "node:fs";
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
  });
});
