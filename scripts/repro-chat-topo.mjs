// Ciclo de reprodução: abre a Nina a partir de cada tela e verifica se o topo do chat
// (botão Fechar) continua visível e clicável. Uso: node scripts/repro-chat-topo.mjs [url]
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const base = process.argv[2] ?? 'http://localhost:3192';
const ler = async (n) => JSON.parse(await readFile(`src/contratos/exemplos/${n}.json`, 'utf8')).dados;
const sessao = await ler('api-sessao-p1');
const cartoes = [await ler('cartao-comparacao-cr02'), await ler('cartao-simulacao-parcelamento')];
const conversa = cartoes.flatMap((c, i) => [
  { mensagem_id: `u${i}`, papel: 'usuario', texto: 'Pergunta de teste?', versao: 1, cartoes: [], rastro: [] },
  { mensagem_id: `r${i}`, papel: 'assistente', texto: 'Resposta de teste.', versao: 1, cartoes: [c], rastro: [] },
]);
const telas = { home: null, investimentos: 'Investimentos', conta: 'Conta e extrato', cartao: 'Meus cartões', como_funciona: 'Como funciona o protótipo' };
const browser = await chromium.launch();
let falhas = 0;
for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  for (const [aba, botao] of Object.entries(telas)) {
    // Também cobre o caminho com conversa longa já aberta (rolagem automática da lista).
    const page = await browser.newPage({ viewport: vp });
    await page.route('**/*', (r) => { const u = new URL(r.request().url()); return u.origin === new URL(base).origin && !u.pathname.startsWith('/api/') ? r.continue() : r.abort(); });
    await page.goto(base);
    await page.evaluate((s) => sessionStorage.setItem('newai_sessao_v1', JSON.stringify(s)), { ...sessao, estado: { ...sessao.estado, conversa }, abaAtual: 'home', chatAberto: false });
    await page.reload();
    await page.getByText('Saldo em conta', { exact: true }).waitFor();
    if (botao) await page.getByRole('button', { name: botao, exact: true }).first().click();
    // Interação realista: rolar a tela antes de abrir a Nina.
    await page.locator('.newai-scroll').evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await page.getByRole('button', { name: 'Abrir chat com a Nina (NewAI)' }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const f = document.querySelector('[aria-label="Fechar chat"]');
      const r = f.getBoundingClientRect();
      const alvo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const frame = document.querySelector('.newai-frame');
      return { topoFechar: Math.round(r.top), clicavel: !!alvo && (alvo === f || f.contains(alvo)), docScroll: document.scrollingElement.scrollTop, frameScroll: frame.scrollTop, scrollAreaScroll: document.querySelector('.newai-scroll').scrollTop };
    });
    const ok = m.topoFechar >= 0 && m.clicavel && m.docScroll === 0 && m.frameScroll === 0;
    if (!ok) falhas++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${vp.width}px ${aba.padEnd(13)} ${JSON.stringify(m)}`);
    await page.close();
  }
}
await browser.close();
process.exit(falhas ? 1 : 0);
