import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { executarAvaliacao } from "./executar";
import { revisarRelatorioGravado } from "./revisar";

test("modo reavaliar recalcula do zero com os critérios atuais, sem chamar o modelo", async () => {
  const original = await executarAvaliacao({
    ids: ["CV-05"], conjunto: "todos", usarRoteirizado: true,
    dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-reavaliar-")),
  });
  // Motivo obsoleto de um critério que não existe mais.
  original.resultados[0]!.motivos = ["Critério antigo removido"];
  original.resultados[0]!.aprovado = false;
  const rede = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede proibida"));
  try {
    const conservador = revisarRelatorioGravado(original);
    expect(conservador.resultados[0]!.aprovado).toBe(false);
    const recalculado = revisarRelatorioGravado(original, [], { modo: "reavaliar" });
    expect(recalculado.resultados[0]!.motivos).toEqual([]);
    expect(recalculado.resultados[0]!.aprovado).toBe(true);
    expect(recalculado.revisao.modo).toBe("reavaliar");
    expect(rede).not.toHaveBeenCalled();
  } finally {
    rede.mockRestore();
  }
});

test("revisa critérios mais estritos sem nova chamada e preserva a evidência original", async () => {
  const original = await executarAvaliacao({
    ids: ["CV-05"], conjunto: "todos", usarRoteirizado: true,
    dirSaida: mkdtempSync(join(tmpdir(), "newai-b6-revisao-")),
  });
  const resultado = original.resultados[0]!;
  const turno = resultado.turnos[0]!;
  if (turno.resposta.status !== "ok") throw new Error("turno falhou");
  // Adultera a evidência gravada como se o modelo tivesse classificado até 29/11.
  turno.resposta.rastro[0]!.argumentos = { ate_data: "2026-11-29" };
  const cartao = turno.resposta.cartoes.find((c) => c.tipo === "investimentos");
  if (cartao?.tipo !== "investimentos") throw new Error("cartão ausente");
  cartao.resultado.ate_data = "2026-11-29";
  const antes = JSON.stringify(original);
  const rede = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede proibida"));
  try {
    const revisado = revisarRelatorioGravado(original, [{
      id: "CV-05", repeticao: 1, turno: 1,
      motivo: "Valor atual foi apresentado como principal aplicado",
    }]);
    expect(revisado.aprovados).toBe(0);
    expect(revisado.resultados[0]!.motivos).toContain(
      "Consulta classificou até 2026-11-29, mas a data padrão do motor é 2026-11-15",
    );
    expect(revisado.resultados[0]!.motivos).toContain("Revisão manual, turno 1: Valor atual foi apresentado como principal aplicado");
    expect(revisado.total_chamadas_modelo).toBe(original.total_chamadas_modelo);
    expect(revisado.revisao.sem_novas_chamadas).toBe(true);
    expect(JSON.stringify(original)).toBe(antes);
    expect(rede).not.toHaveBeenCalled();
  } finally {
    rede.mockRestore();
  }
});
