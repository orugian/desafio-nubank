import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.argv[2] ?? 'http://localhost:3192';
const sessao = JSON.parse(await readFile('src/contratos/exemplos/api-sessao-p1.json', 'utf8')).dados;
await mkdir('.taste-skill/nina', { recursive: true });
const b = await chromium.launch();
for (const aba of ['home', 'conta', 'investimentos']) {
  const p = await b.newPage({ viewport: { width: 390, height: 300 }, deviceScaleFactor: 2 });
  await p.goto(base);
  await p.evaluate((s) => sessionStorage.setItem('newai_sessao_v1', JSON.stringify(s)), { ...sessao, abaAtual: aba, chatAberto: false });
  await p.reload();
  await p.getByRole('button', { name: 'Abrir chat com a Nina (NewAI)' }).waitFor();
  await p.screenshot({ path: `.taste-skill/nina/${aba}.png` });
  await p.close();
}
await b.close();
