import { existsSync } from "node:fs";
import { join } from "node:path";
import { carregarCasosAvaliacao, executarAvaliacao } from "./executar";

/** Rodada 2 B6 (plano): conjunto crítico 2× e demais casos 1×, em pasta nova (nunca sobrescreve evidência). */
async function main() {
  if (process.env.LLM_PROVEDOR !== "openrouter" || process.env.OPENROUTER_MODELO !== "deepseek/deepseek-v4.1-flash-1017") {
    throw new Error("Esta rodada exige o override OpenRouter/modelo explicitamente autorizado");
  }
  const pasta = process.argv[2];
  if (!pasta || !/^[a-z0-9-]+$/.test(pasta)) throw new Error("Informe o nome da pasta de saída (a-z, 0-9, -)");
  const dirSaida = join(__dirname, "resultados", pasta);
  if (existsSync(dirSaida)) throw new Error("Evidência já existe; não sobrescrever a rodada anterior");

  const critico = await executarAvaliacao({ conjunto: "critico", repeticoes: 2, usarRoteirizado: false, dirSaida });
  console.log(`Críticos 2×: ${critico.aprovados}/${critico.total_execucoes}; ${critico.total_chamadas_modelo} chamadas`);

  const demaisIds = carregarCasosAvaliacao("todos").filter((c) => !c.critico).map((c) => c.id);
  const demais = await executarAvaliacao({ conjunto: "todos", ids: demaisIds, repeticoes: 1, usarRoteirizado: false, dirSaida });
  console.log(`Demais 1×: ${demais.aprovados}/${demais.total_execucoes}; ${demais.total_chamadas_modelo} chamadas`);
  console.log(`Total de chamadas: ${critico.total_chamadas_modelo + demais.total_chamadas_modelo}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : "Falha na rodada completa");
  process.exitCode = 1;
});
