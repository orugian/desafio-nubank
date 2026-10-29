'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3101/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const sessionResponse = page.waitForResponse(r => r.url().endsWith('/api/sessao') && r.request().method() === 'POST', { timeout: 30000 });
    await page.getByRole('button', { name: /Bia \(fictícia\)/i }).click({ timeout: 30000 });
    const sessao = await (await sessionResponse).json();
    assert.equal(sessao.status, 'ok');
    assert.equal(sessao.config.provedor, 'openrouter');
    assert.equal(sessao.config.modelo, 'deepseek/deepseek-v4.1-flash-1017');
    await page.getByRole('button', { name: /NewAI/i }).click();
    const dialogo = page.getByRole('dialog', { name: 'Chat NewAI' });
    await dialogo.getByPlaceholder('Digite sua mensagem...').fill('Olá, teste local de instrumentação.');
    const anterior = fs.existsSync(process.env.ENSAIO_CONTADOR_LOG) ? fs.readFileSync(process.env.ENSAIO_CONTADOR_LOG, 'utf8').split('\n').filter(Boolean).length : 0;
    const resposta = page.waitForResponse(r => r.url().endsWith('/api/turno') && r.request().method() === 'POST', { timeout: 45000 });
    await dialogo.getByRole('button', { name: 'Enviar mensagem' }).click();
    const resultado = await (await resposta).json();
    assert.equal(resultado.status, 'ok');
    assert.equal(resultado.texto, 'Teste local de instrumentação.');
    const linhas = fs.readFileSync(process.env.ENSAIO_CONTADOR_LOG, 'utf8').split('\n').filter(Boolean).slice(anterior).map(JSON.parse);
    assert.equal(linhas.filter(x => x.evento === 'tentativa').length, 1);
    assert.equal(linhas.filter(x => x.evento === 'resultado' && x.status === 200).length, 1);
    assert.equal(linhas.filter(x => x.evento === 'rede_bloqueada').length, 0);
    console.log('Pré-voo integrado: UI e API funcionam; contador capturou 1 HTTP 200 simulado; 0 chamadas reais.');
  } finally { await browser.close(); }
})().catch(() => { console.error('Pré-voo integrado falhou; não iniciar ensaio pago.'); process.exitCode = 1; });
