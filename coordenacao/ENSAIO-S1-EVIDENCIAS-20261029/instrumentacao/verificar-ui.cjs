'use strict';
// Confere transparência da aplicação antes de qualquer mensagem ao modelo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3101/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const httpSessao = page.waitForResponse(r => r.url().endsWith('/api/sessao') && r.request().method() === 'POST', { timeout: 30000 });
    await page.getByRole('button', { name: /Bia \(fictícia\)/i }).click();
    const sessao = await (await httpSessao).json();
    assert.equal(sessao.status, 'ok');
    assert.equal(sessao.config.provedor, 'openrouter');
    assert.equal(sessao.config.modelo, 'deepseek/deepseek-v4.1-flash-1017');
    assert.equal(sessao.estado.mercado.ao_vivo, false);
    assert.equal(sessao.config.instrucoes, fs.readFileSync(path.join(process.cwd(), 'instrucoes.md'), 'utf8'));
    await page.getByRole('button', { name: 'Como funciona', exact: true }).click();
    await page.getByRole('heading', { name: 'Configuração e transparência' }).waitFor();
    const corpo = await page.locator('body').innerText();
    for (const item of ['openrouter', 'deepseek/deepseek-v4.1-flash-1017', 'Fontes de mercado', 'BCB SGS 12', 'brapi', 'CoinGecko', 'Instruções atuais']) assert(corpo.includes(item));
    const prova = { em: new Date().toISOString(), provedor: sessao.config.provedor, modelo: sessao.config.modelo, contrato: sessao.config.versao_contratos, hoje_dominio: '2026-10-30', mercado_ao_vivo: false, referencia_cdi: sessao.estado.mercado.cdi.data_ref, fontes: sessao.config.fontes_mercado.map(x => ({ nome: x.nome, obtido_em: x.obtido_em })), instrucoes_identicas_ao_arquivo: true, pagina_como_funciona_conferida: true, chamadas_modelo: 0 };
    fs.writeFileSync('C:/Users/orugi/Documents/Projetos/salesforce/intern/coordenacao/ENSAIO-S1-EVIDENCIAS-20261029/pre-verificacao.json', JSON.stringify(prova, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    console.log('Como funciona: provedor/modelo, instruções e fontes conferidos; snapshot gravado e nenhuma chamada ao modelo.');
  } finally { await browser.close(); }
})().catch(() => { console.error('Pré-verificação da interface falhou; não enviar mensagens.'); process.exitCode = 1; });
