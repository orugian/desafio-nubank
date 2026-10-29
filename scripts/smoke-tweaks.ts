// Smoke test real dos tweaks de investimentos (autorizado pelo responsável em 29/10/2026).
// Uso: npx tsx --env-file=.env.local scripts/smoke-tweaks.ts [--modelo]
// - Sempre: mercado ao vivo (BCB, brapi, CoinGecko) com contagem de chamadas.
// - Com --modelo: 5 turnos reais pelo provedor configurado (LLM_PROVEDOR), uma mensagem por ferramenta nova.
// Nunca imprime segredos, cabeçalhos ou corpos de requisição.

import { esquemaCartaoResposta, estadoInicial, type EstadoSessao } from "@/contratos";
import { processarTurno } from "@/conversa";
import { criarDepsPadrao } from "@/conversa/config";
import { buscarAoVivo, buscarCotacao } from "@/mercado";

const LIMITE_MERCADO = 20;
const LIMITE_MODELO = 15;
const contagem = { mercado: 0, modelo: 0, status: [] as string[] };

const fetchOriginal = globalThis.fetch;
globalThis.fetch = (async (entrada: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  const host = new URL(url).host;
  const ehModelo = /openrouter\.ai|nvidia\.com/.test(host);
  if (ehModelo) {
    if (++contagem.modelo > LIMITE_MODELO) throw new Error("limite de chamadas ao modelo");
  } else {
    if (++contagem.mercado > LIMITE_MERCADO) throw new Error("limite de chamadas de mercado");
  }
  const t0 = Date.now();
  try {
    const r = await fetchOriginal(entrada, init);
    contagem.status.push(`${host} ${r.status} ${Date.now() - t0}ms`);
    return r;
  } catch (e) {
    contagem.status.push(`${host} ERRO ${(e as Error).name} ${Date.now() - t0}ms`);
    throw e;
  }
}) as typeof fetch;

async function main() {
  process.env.MERCADO_AO_VIVO = "1";
  console.log("== Mercado ao vivo (snapshot)");
  const snap = await buscarAoVivo({ timeout_ms: 5000 });
  console.log(JSON.stringify({ ao_vivo: snap.ao_vivo, cdi: snap.cdi, precos: snap.precos }, null, 1));

  console.log("== Cotações sob demanda");
  for (const t of ["PETR4", "VALE3", "BTC"]) {
    const r = await buscarCotacao(t, { timeout_ms: 5000 }, snap);
    console.log(t, JSON.stringify(r.ok ? r.cotacao : r.erro));
  }

  if (process.argv.includes("--modelo")) {
    const deps = criarDepsPadrao();
    console.log(`== Modelo: ${deps.provedor.nome} / ${deps.provedor.modelo}`);
    const mensagens: Array<[string, string]> = [
      ["p1", "Quanto está a PETR4 agora?"],
      ["p1", "Quanto eu teria ganho se tivesse colocado no CDI o que investi em PETR4?"],
      ["p1", "Quanto renderiam R$ 1.000 em 12 meses a 100% do CDI?"],
      ["p1", "E se eu fizer um Pix de R$ 2.500 hoje sem ter saldo, parcelado em 3x?"],
      ["p2", "Quanto vou pagar de imposto de renda?"],
    ];
    for (const [persona, texto] of mensagens) {
      const estado: EstadoSessao = estadoInicial(persona, deps.mercado.snapshotGravado());
      const t0 = Date.now();
      const r = await processarTurno({ estado, mensagem: { id: `smoke-${Date.now()}`, texto } }, deps);
      console.log(`\n--- [${persona}] ${texto} (${Date.now() - t0}ms)`);
      if (r.status !== "ok") {
        console.log("FALHA", JSON.stringify(r.falha));
        continue;
      }
      console.log("ferramentas:", r.rastro.map((x) => `${x.ferramenta}${(x.resultado as { ok?: boolean })?.ok ? "" : " (erro)"}`).join(", ") || "(nenhuma)");
      console.log("cartões:", r.cartoes.map((c) => `${c.tipo}${esquemaCartaoResposta.safeParse(c).success ? "" : " INVALIDO"}`).join(", "));
      console.log("avisos:", JSON.stringify(r.avisos));
      console.log("texto:", r.texto);
    }
  }

  console.log("\n== Chamadas", JSON.stringify({ mercado: contagem.mercado, modelo: contagem.modelo }));
  for (const s of contagem.status) console.log("  ", s);
}

main().catch((e) => {
  console.error("erro:", (e as Error).message);
  process.exit(1);
});
