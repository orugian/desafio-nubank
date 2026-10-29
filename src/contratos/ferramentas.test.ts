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

  test("as definições enviadas ao modelo têm as 16 ferramentas P0 com parâmetros de objeto", () => {
    const defs = definicoesFerramentas();
    expect(defs.map((d) => d.function.name)).toEqual(NOMES_FERRAMENTAS.filter((n) => n !== "preparar_resumo_atendimento"));
    for (const d of defs) {
      expect(d.function.parameters.type).toBe("object");
      expect(d.function.description.length).toBeGreaterThan(10);
    }
    expect(definicoesFerramentas({ incluir_p1: true })).toHaveLength(17);
  });

  test("simular_investimento sem prazo_meses e sem ate_data → ARGUMENTOS_INVALIDOS", () => {
    const r = validarArgumentos("simular_investimento", {
      valor: "1000",
      indexador: "cdi",
      cdi_pct: 100,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(r.erro.campos).toContain("prazo_meses");
      expect(r.erro.mensagem).toContain("informe prazo_meses ou ate_data (um dos dois)");
    }
  });

  test("simular_investimento com os dois → ARGUMENTOS_INVALIDOS", () => {
    const r = validarArgumentos("simular_investimento", {
      valor: "1000",
      indexador: "cdi",
      cdi_pct: 100,
      prazo_meses: 12,
      ate_data: "2027-10-30",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(r.erro.campos).toContain("prazo_meses");
      expect(r.erro.mensagem).toContain("informe prazo_meses ou ate_data (um dos dois)");
    }
  });

  test("simular_investimento prefixado sem taxa_aa_pct → ARGUMENTOS_INVALIDOS", () => {
    const r = validarArgumentos("simular_investimento", {
      valor: "1000",
      indexador: "prefixado",
      prazo_meses: 12,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(r.erro.campos).toContain("taxa_aa_pct");
      expect(r.erro.mensagem).toContain("taxa_aa_pct é obrigatória para prefixado");
    }
  });

  test("simular_pix_credito com parcelas 13 → ARGUMENTOS_INVALIDOS", () => {
    const r = validarArgumentos("simular_pix_credito", {
      valor: "300",
      parcelas: 13,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(r.erro.campos).toContain("parcelas");
    }
  });

  test("simular_pix_credito com valor \"0\" → VALOR_INVALIDO", () => {
    const r = validarArgumentos("simular_pix_credito", {
      valor: "0",
      parcelas: 3,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe("VALOR_INVALIDO");
      expect(r.erro.campos).toContain("valor");
    }
  });

  test("consultar_cotacao com ticker \"PETR4\" ok e \"PE TR4\" inválido", () => {
    expect(validarArgumentos("consultar_cotacao", { ticker: "PETR4" }).ok).toBe(true);
    const r = validarArgumentos("consultar_cotacao", { ticker: "PE TR4" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(r.erro.campos).toContain("ticker");
    }
  });
});
