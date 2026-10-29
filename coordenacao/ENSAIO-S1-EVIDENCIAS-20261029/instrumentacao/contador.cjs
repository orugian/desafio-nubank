'use strict';
// Instrumentação temporária: não registra headers, conteúdo, tokens ou URLs.
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const log = process.env.ENSAIO_CONTADOR_LOG;
const stop = process.env.ENSAIO_CONTADOR_STOP;
if (!log || !stop) throw new Error('Contador exige caminhos explícitos para log e parada.');
const chave = Symbol.for('newai.ensaio1.contador');
if (!globalThis[chave]) {
  globalThis[chave] = true;
  const original = globalThis.fetch;
  const escrever = (obj) => fs.appendFileSync(log, JSON.stringify(obj) + '\n', 'utf8');
  globalThis.fetch = async function (input, init) {
    let url;
    try { url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url); }
    catch { throw new Error('Endereço de rede inválido ou bloqueado.'); }
    const alvo = url.protocol === 'https:' && url.hostname === 'openrouter.ai' && url.pathname === '/api/v1/chat/completions' && !url.search;
    const local = (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]') && (url.protocol === 'http:' || url.protocol === 'https:');
    if (!alvo && !local) {
      escrever({ evento: 'rede_bloqueada', em: new Date().toISOString() });
      throw new Error('Rede externa não autorizada bloqueada.');
    }
    if (!alvo) return original.call(this, input, init);
    if (fs.existsSync(stop)) throw new Error('Parada obrigatória por cota.');
    const id = randomUUID();
    const inicio = Date.now();
    escrever({ evento: 'tentativa', id, em: new Date().toISOString(), provedor: 'openrouter' });
    try {
      const resposta = await original.call(this, input, init);
      if (resposta.status === 429) {
        try { fs.writeFileSync(stop, '429\n', { encoding: 'utf8', flag: 'wx' }); }
        catch (e) { if (!e || e.code !== 'EEXIST') throw e; }
      }
      escrever({ evento: 'resultado', id, em: new Date().toISOString(), status: resposta.status, duracao_ms: Date.now() - inicio });
      return resposta;
    } catch (e) {
      escrever({ evento: 'erro_transporte', id, em: new Date().toISOString(), duracao_ms: Date.now() - inicio });
      throw e;
    }
  };
}
