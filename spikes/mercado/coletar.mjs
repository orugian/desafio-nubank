// Coleta exploratória, sem SDK e sem ler/exibir o arquivo de segredos.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = dirname(fileURLToPath(import.meta.url));
const rodada = process.argv[3] ?? '';
if (rodada && !/^[a-z0-9-]+$/.test(rodada)) throw new Error('Identificador de rodada inválido.');
const destino = join(base, 'respostas', rodada);
await mkdir(destino, { recursive: true });
const secretos = [process.env.NVIDIA_API_KEY, process.env.OPENROUTER_API_KEY, process.env.BRAPI_TOKEN, process.env.COINGECKO_API_KEY, process.env.CODIGO_ACESSO].filter(v => v && v.length > 5);
function seguro(s) { for (const v of secretos) s = s.split(v).join('[SEGREDO REMOVIDO]'); return s; }
async function novo(nome, texto) { const path = join(destino, nome); try { await access(path); throw new Error('Arquivo já existe: não sobrescrever.'); } catch (e) { if (e.code !== 'ENOENT') throw e; } await writeFile(path, seguro(texto), { encoding: 'utf8', flag: 'wx' }); }
const registros = [];
const somenteBrapi = process.argv[2] === 'brapi';
let chamadas = 0;
async function coletar(nome, url, headers = {}, formato = 'json') {
  const inicio = Date.now();
  chamadas++;
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    const registro = { fonte: nome, url, obtido_em: new Date().toISOString(), status: r.status, latencia_ms: Date.now() - inicio };
    if (!r.ok) {
      registro.erro = r.status === 401 ? 'chave recusada' : r.status === 402 ? 'pagamento exigido' : r.status === 403 ? 'acesso negado (chave/plano não distinguidos)' : r.status === 429 ? '429' : `HTTP ${r.status}`;
      registros.push(registro);
      await novo(`${nome}-falha.json`, JSON.stringify({ ...registro, corpo_omitido: true }, null, 2));
      console.log(`${nome}: ${registro.erro}`);
      return null;
    }
    const texto = await r.text();
    let body;
    if (formato === 'json') { try { body = JSON.parse(texto); } catch { registro.erro = 'formato'; } }
    else body = texto;
    if (!registro.erro) await novo(`${nome}.${formato === 'json' ? 'json' : 'html'}`, texto);
    registros.push(registro);
    return body;
  } catch (e) {
    if (e.message === 'Arquivo já existe: não sobrescrever.') throw e;
    const registro = { fonte: nome, url, obtido_em: new Date().toISOString(), erro: 'rede/timeout', latencia_ms: Date.now() - inicio };
    registros.push(registro);
    await novo(`${nome}-falha.json`, JSON.stringify(registro, null, 2));
    console.log(`${nome}: rede/timeout (detalhes omitidos)`);
    return null;
  }
}

const bcb = somenteBrapi ? null : await coletar('bcb-sgs12', 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=03/11/2025&dataFinal=29/10/2026');
if (Array.isArray(bcb)) {
  const iso = d => d.split('/').reverse().join('-');
  const datas = bcb.map(x => iso(x.data)).sort();
  console.log(`BCB: ${bcb.length} observações, primeira ${datas[0] ?? 'nenhuma'}, última ${datas.at(-1) ?? 'nenhuma'}`);
  registros.at(-1).primeira_data = datas[0] ?? null;
  registros.at(-1).ultima_data = datas.at(-1) ?? null;
  registros.at(-1).quantidade = datas.length;
}

let escolhido = null;
if (!process.env.BRAPI_TOKEN) {
  console.log('brapi: chave ausente no nome esperado BRAPI_TOKEN (não exibida); nenhuma chamada');
  registros.push({ fonte: 'brapi', erro: 'chave ausente', tickers_nao_testados: ['PETR4', 'VALE3', 'ITUB4', 'MGLU3', 'BOVA11'] });
} else {
  for (const ticker of ['PETR4', 'VALE3', 'ITUB4', 'MGLU3', 'BOVA11']) {
    const body = await coletar(`brapi-${ticker}`, `https://brapi.dev/api/quote/${ticker}?range=3mo&interval=1d`, { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` });
    if (['chave recusada', 'pagamento exigido', '429'].includes(registros.at(-1)?.erro)) break;
    const hist = body?.results?.[0]?.historicalDataPrice ?? [];
    const datas = hist.map(x => new Date(x.date * 1000).toISOString().slice(0, 10)).sort();
    registros.at(-1).primeira_data = datas[0] ?? null;
    registros.at(-1).ultima_data = datas.at(-1) ?? null;
    registros.at(-1).quantidade = datas.length;
    const cobre = datas.some(d => d === '2026-07-30');
    if (cobre && !escolhido) escolhido = ticker;
    console.log(`brapi ${ticker}: ${datas.length} fechamentos; ${datas[0] ?? 'sem início'} a ${datas.at(-1) ?? 'sem fim'}; cobre 30/07: ${cobre ? 'sim' : 'não'}`);
  }
}
const cgHeaders = process.env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } : {};
const cg = somenteBrapi ? null : await coletar('coingecko-bitcoin-brl', 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=brl&days=92&interval=daily', cgHeaders);
if (Array.isArray(cg?.prices)) {
  const datas = cg.prices.map(([t]) => new Date(t).toISOString());
  registros.at(-1).primeira_data_hora = datas[0] ?? null;
  registros.at(-1).ultima_data_hora = datas.at(-1) ?? null;
  registros.at(-1).quantidade = datas.length;
  console.log(`CoinGecko: ${datas.length} pontos; ${datas[0]} a ${datas.at(-1)}`);
}
if (!somenteBrapi) {
  await coletar('anbima-feriados-2026', 'https://www.anbima.com.br/feriados/fer_nacionais/2026.asp', {}, 'html');
  await coletar('anbima-feriados-2027', 'https://www.anbima.com.br/feriados/fer_nacionais/2027.asp', {}, 'html');
}
await novo(somenteBrapi ? 'manifesto-brapi.json' : 'manifesto.json', JSON.stringify({ chamadas, ticker_escolhido: escolhido, registros }, null, 2) + '\n');
console.log(`Coleta encerrada: ${chamadas} chamadas de mercado/calendário; ticker escolhido: ${escolhido ?? 'nenhum'}`);
