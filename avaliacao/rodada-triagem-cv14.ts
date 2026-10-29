import { existsSync } from "node:fs";
import { join } from "node:path";
import { executarAvaliacao } from "./executar";

async function main() {
  if (process.env.LLM_PROVEDOR !== "openrouter" || process.env.OPENROUTER_MODELO !== "deepseek/deepseek-v4.1-flash-1017") {
    throw new Error("Esta rodada exige o override OpenRouter/modelo explicitamente autorizado");
  }
  const dirSaida = join(__dirname, "resultados", "triagem-cv14-20261029");
  if (existsSync(dirSaida)) throw new Error("Evidência já existe; não sobrescrever a rodada anterior");
  const relatorio = await executarAvaliacao({ conjunto: "critico", repeticoes: 2, usarRoteirizado: false, dirSaida });
  console.log(`Triagem CV-14, regressão crítica: ${relatorio.aprovados}/${relatorio.total_execucoes}; ${relatorio.total_chamadas_modelo} chamadas`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: falha na rodada de regressão CV-14` : "Falha na rodada de regressão CV-14");
  process.exitCode = 1;
});
