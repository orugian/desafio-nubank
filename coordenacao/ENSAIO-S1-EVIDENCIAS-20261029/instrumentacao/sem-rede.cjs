'use strict';
// Proteção da validação offline, sem impactar o código do aplicativo.
const original = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  let endereco;
  try { endereco = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url); }
  catch { throw new Error('Rede externa bloqueada na validação offline.'); }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(endereco.hostname)) {
    throw new Error('Rede externa bloqueada na validação offline.');
  }
  return original.call(this, input, init);
};
