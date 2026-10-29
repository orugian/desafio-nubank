import { readFileSync } from "node:fs";
import type { RelatorioAvaliacaoB6 } from "./executar";
import { verificarOraculoB6 } from "./oraculos";

/** Diagnóstico offline: reaplica só o oráculo atual a evidências gravadas (sem modelo/rede). */
const [arquivo, id, oraculo] = process.argv.slice(2);
if (!arquivo || !id || !oraculo) throw new Error("Uso: reavaliar-oraculo.ts <relatorio.json> <CV-id> <CR-id>");
const relatorio = JSON.parse(readFileSync(arquivo, "utf8")) as RelatorioAvaliacaoB6;
for (const r of relatorio.resultados.filter((x) => x.id === id)) {
  const ultimo = r.turnos.at(-1)!;
  const resposta = ultimo.resposta;
  const motivos = resposta.status === "ok" ? verificarOraculoB6(oraculo, resposta, resposta.estado) : ["turno falhou"];
  console.log(`${id} rep ${r.repeticao}: ${motivos.length === 0 ? "oráculo OK" : motivos.join(" | ")}`);
}
