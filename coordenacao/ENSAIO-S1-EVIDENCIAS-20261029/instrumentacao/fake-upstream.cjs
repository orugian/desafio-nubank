'use strict';
// Pré-voo offline: intercepta o endpoint de modelo e não permite acesso externo.
const original = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const u = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url);
  if (u.hostname === 'openrouter.ai' && u.pathname === '/api/v1/chat/completions') {
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Teste local de instrumentação.' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return original.call(this, input, init);
  throw new Error('Rede externa bloqueada no pré-voo.');
};
