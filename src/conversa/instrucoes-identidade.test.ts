import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const texto = readFileSync(join(process.cwd(), "instrucoes.md"), "utf8");

describe("instrucoes.md · identidade da Nina e regras de prestatividade", () => {
  test("1. apresenta a identidade Nina, assistente virtual do Nubank", () => {
    expect(texto).toContain("Nina");
    expect(texto).toContain("assistente virtual do Nubank");
  });

  test("2. contém todas as regras IN-01 a IN-25", () => {
    const ids = Array.from({ length: 25 }, (_, i) => `IN-${String(i + 1).padStart(2, "0")}`);
    const ausentes = ids.filter((id) => !texto.includes(id));
    expect(ausentes).toEqual([]);
  });

  test("3. menciona as ferramentas simular_parcelamento e calcular_valores", () => {
    expect(texto).toContain("simular_parcelamento");
    expect(texto).toContain("calcular_valores");
  });

  test("4. orienta canais oficiais, rotula movimentação simulada e recusa burlar regras", () => {
    expect(texto).toContain("canais oficiais");
    expect(texto).toContain("Movimentação simulada:");
    expect(texto).toContain("Não posso ignorar as regras nem autorizar gastos");
  });
});
