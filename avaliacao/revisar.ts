import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { avaliarCasoExecutado, carregarCasosAvaliacao, type RelatorioAvaliacaoB6 } from "./executar";

export type AchadoManualB6 = { id: string; repeticao: number; turno: number; motivo: string };

/** Revisão conservadora: só acrescenta reprovações a evidências já gravadas.
 * Não executa turnos/provedores e não transforma falha anterior em aprovação.
 */
export function revisarRelatorioGravado(original: RelatorioAvaliacaoB6, achados: AchadoManualB6[] = []) {
  const revisado = structuredClone(original);
  const casos = carregarCasosAvaliacao("todos");
  const preparatorios: Record<string, string[]> = {
    "CV-02": ["CV-01"], "CV-09": ["CV-08"], "CV-12": ["CV-11"], "CV-13": ["CV-11"],
    "CV-23": ["CV-01", "CV-02", "CV-23"], "CV-28": ["CV-07", "CV-28"],
  };
  for (const resultado of revisado.resultados) {
    const caso = casos.find((c) => c.id === resultado.id);
    if (!caso || !resultado.turnos?.length) throw new Error(`Evidência por turno ausente: ${resultado.id}`);
    for (const [indice, turno] of resultado.turnos.entries()) {
      const ultimo = indice === resultado.turnos.length - 1;
      const id = caso.modo === "instrucoes_local" || ultimo ? caso.id : preparatorios[caso.id]?.[indice];
      const esperado = casos.find((c) => c.id === id);
      if (!esperado) throw new Error(`Critério por turno ausente: ${caso.id}/${indice + 1}`);
      const r = turno.resposta;
      const aval = avaliarCasoExecutado(esperado, {
        ferramentasChamadas: r.status === "ok" ? r.rastro.map((item) => ({ nome: item.ferramenta, argumentos: item.argumentos })) : [],
        textoFinal: r.status === "ok" ? r.texto : "",
        // Os oráculos originais continuam nos motivos; esta etapa só reforça texto/argumentos.
        oraculoOk: r.status === "ok",
      });
      resultado.motivos.push(...aval.motivos.map((m) => ultimo ? m : `Turno ${indice + 1}: ${m}`));
    }
    resultado.motivos.push(...achados
      .filter((a) => a.id === resultado.id && a.repeticao === resultado.repeticao)
      .map((a) => `Revisão manual, turno ${a.turno}: ${a.motivo}`));
    resultado.motivos = [...new Set(resultado.motivos)];
    resultado.aprovado = resultado.aprovado && resultado.motivos.length === 0;
  }
  revisado.aprovados = revisado.resultados.filter((r) => r.aprovado).length;
  return {
    ...revisado,
    revisao: { sem_novas_chamadas: true as const, executado_em: new Date().toISOString(), achados_manuais: achados },
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("avaliacao/revisar.ts")) {
  const opcao = (nome: string) => {
    const indice = process.argv.indexOf(nome);
    return indice < 0 ? undefined : process.argv[indice + 1];
  };
  const origem = opcao("--origem");
  const saida = opcao("--saida");
  if (!origem || !saida) throw new Error("Informe --origem arquivo.json e --saida prefixo");
  const caminhoAchados = opcao("--achados");
  const achados: AchadoManualB6[] = caminhoAchados ? JSON.parse(readFileSync(caminhoAchados, "utf8")) : [];
  const revisado = revisarRelatorioGravado(JSON.parse(readFileSync(origem, "utf8")), achados);
  if (existsSync(`${saida}.json`) || existsSync(`${saida}.md`)) throw new Error("Saída já existe; preserve a evidência anterior");
  writeFileSync(`${saida}.json`, JSON.stringify(revisado, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  const linhas = [
    "# B6 — revisão offline das evidências reais", "",
    `- Evidência original preservada: [${basename(origem)}](<${basename(origem)}>)`,
    `- Provedor: ${revisado.provedor}; modelo: ${revisado.modelo}`,
    `- Resultado revisado: **${revisado.aprovados}/${revisado.total_execucoes}**`,
    `- Chamadas históricas: ${revisado.total_chamadas_modelo}; **0 novas chamadas** nesta revisão.`, "",
    "| Caso | Rep. | Resultado | Motivos |", "|---|---|---|---|",
    ...revisado.resultados.map((r) => `| ${r.id} | ${r.repeticao} | ${r.aprovado ? "OK" : "FALHA"} | ${r.motivos.join("; ").replaceAll("|", "\\|") || "—"} |`), "",
  ];
  writeFileSync(`${saida}.md`, linhas.join("\n"), { encoding: "utf8", flag: "wx" });
  console.log(`Revisão offline: ${revisado.aprovados}/${revisado.total_execucoes}; 0 novas chamadas`);
}
