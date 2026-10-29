'use strict';
// Teste isolado: nenhum fetch desta simulação chega à rede.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = __dirname;
const log = path.join(base, 'contagem-smoke.jsonl');
const stop = path.join(base, 'cota-smoke.flag');
if (fs.existsSync(log) || fs.existsSync(stop)) throw new Error('Arquivos do teste já existem; não sobrescrever.');
process.env.ENSAIO_CONTADOR_LOG = log;
process.env.ENSAIO_CONTADOR_STOP = stop;
let redeSimulada = 0;
globalThis.fetch = async () => {
  redeSimulada++;
  return new Response('', { status: redeSimulada === 1 ? 200 : 429 });
};
require('./contador.cjs');
(async () => {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  assert.equal((await fetch(url, { headers: { Authorization: 'segredo-ficticio-nao-gravar' }, body: 'corpo-ficticio-nao-gravar' })).status, 200);
  assert.equal((await fetch(url)).status, 429);
  await assert.rejects(() => fetch(url), /cota/i);
  await assert.rejects(() => fetch('https://example.invalid/'), /bloqueada/i);
  assert.equal(redeSimulada, 2);
  const linhas = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(linhas.filter(x => x.evento === 'tentativa').length, 2);
  assert.deepEqual(linhas.filter(x => x.evento === 'resultado').map(x => x.status), [200, 429]);
  assert.equal(fs.existsSync(stop), true);
  assert(!JSON.stringify(linhas).includes('segredo-ficticio'));
  assert(!JSON.stringify(linhas).includes('corpo-ficticio'));
  console.log('Contador: 2 tentativas simuladas, 200/429, bloqueio após cota e rede externa; nenhum corpo ou cabeçalho gravado.');
})().catch(() => { console.error('Teste isolado do contador falhou.'); process.exitCode = 1; });
