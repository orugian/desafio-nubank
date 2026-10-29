import { existsSync } from "node:fs";
import { join } from "node:path";
import { executarAvaliacao } from "./executar";

async function main() {
  if (process.env.LLM_PROVEDOR !== "openrouter" || process.env.OPENROUTER_MODELO !== "deepseek/deepseek-v4.1-flash-1017") {
    throw new Error("Esta rodada exige o override OpenRouter/modelo explicitamente autorizado");
  }
  const pasta = process.argv[2] ?? "triagem-cv14-20261029";
  if (!/^[a-z0-9-]+$/.test(pasta)) throw new Error("Nome de pasta inválido");
  const dirSaida = join(__dirname, "resultados", pasta);
  if (existsSync(dirSaida)) throw new Error("Evidência já existe; não sobrescrever a rodada anterior");
  const relatorio = await executarAvaliacao({ conjunto: "critico", repeticoes: 2, usarRoteirizado: false, dirSaida });
  console.log(`Regressão crítica (${pasta}): ${relatorio.aprovados}/${relatorio.total_execucoes}; ${relatorio.total_chamadas_modelo} chamadas`);
  // Os ids gravam em arquivo de diagnóstico próprio, sem sobrescrever o relatório crítico.
  const cv12 = await executarAvaliacao({ conjunto: "todos", ids: ["CV-12"], repeticoes: 1, usarRoteirizado: false, dirSaida });
  console.log(`CV-12 (${pasta}): ${cv12.aprovados}/${cv12.total_execucoes}; ${cv12.total_chamadas_modelo} chamadas`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: falha na rodada de regressão CV-14` : "Falha na rodada de regressão CV-14");
  process.exitCode = 1;
});
