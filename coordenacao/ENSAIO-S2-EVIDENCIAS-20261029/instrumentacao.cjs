// Instrumentação exclusiva do ensaio S2: não registra corpo, credenciais, cabeçalhos ou URL.
// Bloqueia fetch externo exceto o endpoint autorizado; após 429 não faz nova chamada paga.
const fs = require('node:fs');
const crypto = require('node:crypto');
const caminho = process.env.ENSAIO_S2_LOG;
const parada = process.env.ENSAIO_S2_PARADA;
if (!caminho || !parada) throw new Error('Caminhos de instrumentação do ensaio ausentes.');
const fetchOriginal = globalThis.fetch;
function registrar(evento) {
  fs.appendFileSync(caminho, JSON.stringify({ instante: new Date().toISOString(), pid: process.pid, ...evento }) + '\n', { encoding: 'utf8' });
}
function numeroDeTentativas() {
  if (!fs.existsSync(caminho)) return 0;
  return fs.readFileSync(caminho, 'utf8').split('\n').filter((linha) => {
    if (!linha) return false;
    try { return JSON.parse(linha).tipo === 'tentativa'; } catch { return false; }
  }).length;
}
globalThis.fetch = async function instrumentado(input, init) {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
  let url;
  try { url = new URL(raw); } catch { return fetchOriginal(input, init); }
  if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) return fetchOriginal(input, init);
  if (url.protocol !== 'https:' || url.hostname !== 'openrouter.ai' || url.pathname !== '/api/v1/chat/completions') {
    registrar({ tipo: 'externo_bloqueado' });
    throw new Error('Rede externa não autorizada durante o ensaio.');
  }
  if (fs.existsSync(parada) || numeroDeTentativas() >= 60) {
    registrar({ tipo: 'chamada_bloqueada_por_limite_ou_cota' });
    throw new Error('Ensaio suspenso por cota ou limite de chamadas.');
  }
  const id = crypto.randomUUID();
  const inicio = Date.now();
  registrar({ tipo: 'tentativa', id, provedor: 'openrouter', teste: process.env.ENSAIO_S2_TESTE === '1' });
  try {
    const resposta = process.env.ENSAIO_S2_TESTE === '1'
      ? new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Pré-voo simulado, sem modelo real.' } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
      : await fetchOriginal(input, init);
    registrar({ tipo: 'resultado', id, http_status: resposta.status, duracao_ms: Date.now() - inicio });
    if (resposta.status === 429) fs.writeFileSync(parada, 'cota\n', { flag: 'wx' });
    return resposta;
  } catch (err) {
    registrar({ tipo: 'erro_rede', id, classe: err instanceof Error ? err.name : 'Erro', duracao_ms: Date.now() - inicio });
    throw err;
  }
};
