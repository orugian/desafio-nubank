import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Provedor } from "@/contratos";
import {
  executarAvaliacaoInstrucoesLocal,
  SUFIXO_PERGUNTA_CV24,
} from "./instrucoes-local";

function provedorConformeInstrucoes(observadas: boolean[]): Provedor {
  return {
    nome: "roteirizado",
    modelo: "cv24-fronteira",
    async gerar(mensagens) {
      const instrucaoAlterada = mensagens.some(
        (m) => m.papel === "sistema" && m.conteudo.includes(SUFIXO_PERGUNTA_CV24),
      );
      observadas.push(instrucaoAlterada);
      if (mensagens.at(-1)?.papel !== "ferramenta") {
        return {
          tipo: "chamadas",
          chamadas: [{
            id: "cv24-separar",
            nome: "criar_hipotese",
            argumentos: JSON.stringify({
              nome: "Separar R$ 500 hoje",
              a_partir_de: "atual",
              alteracoes: [{ operacao: "separar", valor: "500", data: "2026-10-30" }],
            }),
          }],
        };
      }
      return {
        tipo: "texto",
        texto: `Em 15/11 faltam R$ 200,00.${instrucaoAlterada ? ` ${SUFIXO_PERGUNTA_CV24}` : ""}`,
      };
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("CV-24 · instruções locais isoladas", () => {
  test("edita e restaura cópia temporária, relendo por turno sem mudar cálculo/cartões/negócio", async () => {
    const rede = vi.fn(() => { throw new Error("Rede proibida no CV-24 offline"); });
    vi.stubGlobal("fetch", rede);
    const observadas: boolean[] = [];
    const original = "IN-01: Responda em português e use o motor para valores.";
    const resultado = await executarAvaliacaoInstrucoesLocal({
      provedor: provedorConformeInstrucoes(observadas),
      instrucoesOriginais: original,
    });

    expect(resultado.motivos).toEqual([]);
    expect(resultado.aprovado).toBe(true);
    expect(resultado.respostas.map((r) => r.fase)).toEqual(["original", "alterada", "restaurada"]);
    expect(resultado.leituras_instrucoes).toBe(3);
    expect(resultado.chamadas_modelo).toBe(6);
    expect(observadas).toEqual([false, false, true, true, false, false]);
    expect(resultado.restaurado).toBe(true);
    expect(await readFile(resultado.arquivo_temporario, "utf8")).toBe(original);
    const primeira = resultado.respostas[0]?.resposta;
    expect(primeira?.status).toBe("ok");
    if (primeira?.status !== "ok") throw new Error("CV01 não foi concluído");
    const comparacao = primeira.cartoes.find((c) => c.tipo === "comparacao");
    expect(comparacao?.tipo).toBe("comparacao");
    if (comparacao?.tipo === "comparacao") {
      expect(comparacao.cenarios.find((c) => c.cenario_id === "H1")?.indicadores?.saldo_minimo_centavos).toBe(-20000);
    }
    expect(rede).not.toHaveBeenCalled();
  });

  test("não aprova igualdade vazia quando o provedor só afirma números sem executar CV01", async () => {
    const provedor: Provedor = {
      nome: "roteirizado",
      modelo: "cv24-sem-motor",
      async gerar(mensagens) {
        const alterada = mensagens.some((m) => m.papel === "sistema" && m.conteudo.includes(SUFIXO_PERGUNTA_CV24));
        return { tipo: "texto", texto: `Em 15/11 faltam R$ 200,00.${alterada ? ` ${SUFIXO_PERGUNTA_CV24}` : ""}` };
      },
    };
    const resultado = await executarAvaliacaoInstrucoesLocal({ provedor, instrucoesOriginais: "Use o motor." });
    expect(resultado.aprovado).toBe(false);
    expect(resultado.motivos).toContain("original: CV-01 não criou a hipótese de CR-02");
    expect(resultado.restaurado).toBe(true);
  });

  test("restaura em finally mesmo se o provedor lança durante a fase editada", async () => {
    const base = provedorConformeInstrucoes([]);
    const original = "Texto original que deve ser preservado.";
    const resultado = await executarAvaliacaoInstrucoesLocal({
      instrucoesOriginais: original,
      provedor: {
        ...base,
        async gerar(mensagens, ferramentas, configuracao) {
          if (mensagens.some((m) => m.papel === "sistema" && m.conteudo.includes(SUFIXO_PERGUNTA_CV24))) {
            throw new Error("Falha simulada na fronteira");
          }
          return base.gerar(mensagens, ferramentas, configuracao);
        },
      },
    });
    expect(resultado.aprovado).toBe(false);
    expect(resultado.motivos).toContain("Exceção durante a fase alterada");
    expect(resultado.restaurado).toBe(true);
    expect(await readFile(resultado.arquivo_temporario, "utf8")).toBe(original);
    expect(resultado.chamadas_modelo).toBe(3);
    expect(resultado.leituras_instrucoes).toBe(2);
  });
});
