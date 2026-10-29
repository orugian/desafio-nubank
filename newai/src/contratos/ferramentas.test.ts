import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { NOMES_FERRAMENTAS, definicoesFerramentas, validarArgumentos } from "@/contratos";

// B0 · comportamento 2: argumentos de exemplo de cada ferramenta são aceitos
// pelo esquema da ferramenta; entrada com `cartao_credito` é rejeitada.

const exemplo = JSON.parse(readFileSync(join(__dirname, "exemplos", "argumentos-ferramentas.json"), "utf8")).dados as Record<
  string,
  unknown
>;

const adicionar = (extra: Record<string, unknown>) => ({
  alteracao: {
    operacao: "adicionar_evento",
    tipo: "saida",
    descricao: "Conserto do carro",
    data: "2026-11-06",
    valor: "800",
    meio: "pix",
    ...extra,
  },
});

describe("argumentos das ferramentas", () => {
  test.each(NOMES_FERRAMENTAS.map((n) => [n]))("exemplo de %s é aceito", (nome) => {
    expect(exemplo[nome]).toBeDefined();
    const r = validarArgumentos(nome, exemplo[nome]);
    expect(r.ok ? "" : r.erro.mensagem).toBe("");
  });

  test("entrada com cartao_credito é rejeitada como ARGUMENTOS_INVALIDOS", () => {
    const r = validarArgumentos("registrar_declaracao", adicionar({ tipo: "entrada", meio: "cartao_credito" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(r.erro.campos).toContain("alteracao.meio");
    }
  });

  test("saída no cartão parcelada em 4x é aceita (CR-14b)", () => {
    const r = validarArgumentos("criar_hipotese", {
      nome: "Conserto em 4x",
      a_partir_de: "atual",
      alteracoes: [adicionar({ meio: "cartao_credito", parcelas: 4 }).alteracao],
    });
    expect(r.ok).toBe(true);
  });

  test.each([["0"], ["0.00"], ["-5"], ["1.500"], ["12,50"]])("valor %s → VALOR_INVALIDO (CR-17b)", (valor) => {
    const r = validarArgumentos("propor_movimentacao", { valor, destino: "INV9" });
    expect(r.ok ? null : r.erro.codigo).toBe("VALOR_INVALIDO");
  });

  test.each([["1500"], ["12.50"]])("valor %s é aceito (CR-17b)", (valor) => {
    expect(validarArgumentos("propor_movimentacao", { valor, destino: "INV9" }).ok).toBe(true);
  });

  test.each([["meio"], ["data"]])("adicionar_evento sem %s → ARGUMENTOS_INVALIDOS (CR-17h)", (campo) => {
    const args = adicionar({});
    delete (args.alteracao as Record<string, unknown>)[campo];
    const r = validarArgumentos("registrar_declaracao", args);
    expect(r.ok ? null : r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
  });

  test("as definições enviadas ao modelo têm as 11 ferramentas P0 com parâmetros de objeto", () => {
    const defs = definicoesFerramentas();
    expect(defs.map((d) => d.function.name)).toEqual(NOMES_FERRAMENTAS.filter((n) => n !== "preparar_resumo_atendimento"));
    for (const d of defs) {
      expect(d.function.parameters.type).toBe("object");
      expect(d.function.description.length).toBeGreaterThan(10);
    }
    expect(definicoesFerramentas({ incluir_p1: true })).toHaveLength(12);
  });
});
