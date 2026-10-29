// Instrumentação opt-in do B7: só contabiliza chamadas, sem corpo, headers ou credenciais.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

if (process.env.B7_REAL === "1") {
  const original = globalThis.fetch;
  const destino = resolve(process.cwd(), "test-results", "contagem-modelo.jsonl");
  let sequencia = 0;
  function gravar(evento) {
    mkdirSync(dirname(destino), { recursive: true });
    appendFileSync(destino, JSON.stringify(evento) + "\n", "utf8");
  }
  globalThis.fetch = async function (...args) {
    const entrada = args[0];
    const endereco = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const url = new URL(endereco);
    if (url.hostname !== "integrate.api.nvidia.com" || url.pathname !== "/v1/chat/completions") {
      return original.apply(this, args);
    }
    const id = `${process.pid}-${++sequencia}`;
    gravar({ evento: "inicio", id });
    try {
      const resposta = await original.apply(this, args);
      gravar({ evento: "fim", id, status: resposta.status });
      return resposta;
    } catch (err) {
      gravar({ evento: "falha_rede", id, tipo: err instanceof Error ? err.name : "erro" });
      throw err;
    }
  };
}
