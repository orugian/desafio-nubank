import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const baseURL = process.env.UI_URL ?? 'http://localhost:3188';
const out = resolve(process.argv[2] ?? '.taste-skill/before');
await mkdir(out, { recursive: true });
const load = async (name) => JSON.parse(await readFile(`src/contratos/exemplos/${name}.json`, 'utf8')).dados;
const sessao = await load('api-sessao-p1');
const comparacao = await load('cartao-comparacao-cr02');
const cases = [
 ['cenario', comparacao, 'Posso separar R$ 500 hoje para minha viagem?', 'Se você separar R$ 500 hoje, o saldo zera em 10/11, no aluguel, e faltam R$ 200,00 em 15/11, no débito das contas da casa. O salário previsto de 19/11 só chega depois. Sem separar, o menor saldo fica em R$ 300,00, em 15/11.'],
 ['investimento', await load('cartao-simulacao-investimento'), 'Quanto renderia esse investimento?', 'Veja a projeção com o rendimento bruto, os impostos e o valor líquido ao final do período. Os valores são estimativas da simulação, não uma garantia de retorno.'],
 ['pix', await load('cartao-pix-credito'), 'E se eu fizer esse Pix no crédito?', 'Esta é uma simulação com juros e IOF. Confira o custo total do crédito e os vencimentos antes de decidir.'],
];
try { cases.push(['parcelamento', await load('cartao-simulacao-parcelamento'), 'À vista ou parcelado?', 'Compare o total pago e o valor de cada parcela. A análise considera o CDI informado na simulação.']); } catch {}
const browser = await chromium.launch();
for (const width of [1440,768,390,320]) {
 const page = await browser.newPage({viewport:{width,height:900}});
 await page.route('**/*', route => {const u=new URL(route.request().url()); return u.origin === new URL(baseURL).origin && !u.pathname.startsWith('/api/') ? route.continue() : route.abort();});
 await page.goto(baseURL);
 const persist = async (chatAberto, conversa=[]) => {
  await page.evaluate(({sessao,chatAberto,conversa})=>sessionStorage.setItem('newai_sessao_v1',JSON.stringify({...sessao,estado:{...sessao.estado,conversa},abaAtual:'home',chatAberto})),{sessao,chatAberto,conversa});
  await page.reload();
 };
 await persist(false);
 await page.getByText('Saldo em conta',{exact:true}).waitFor();
 await page.screenshot({path:resolve(out,`${width}-home.png`)});
 for (const [name,cartao,pergunta,texto] of cases) {
  await persist(true,[{mensagem_id:'u1',papel:'usuario',texto:pergunta,versao:1,cartoes:[],rastro:[]},{mensagem_id:'r1',papel:'assistente',texto,versao:1,cartoes:[cartao],rastro:[]}]);
  await page.getByRole('dialog').waitFor();
  const scroller=page.getByRole('dialog').locator('div.overflow-y-auto').first();
  await scroller.evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:resolve(out,`${width}-${name}.png`)});
  if(width===390 && name==='cenario') {
   const css=await page.evaluate(()=>Array.from(document.styleSheets).map(sheet=>{try{return Array.from(sheet.cssRules).map(r=>r.cssText).join('\n').replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(_,q,url)=>`url("${new URL(url,sheet.href || location.href).href}")`);}catch{return '';}}).join('\n'));
   let html=await page.evaluate(()=>{const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('.newai-frame > :not([role="dialog"])').forEach(el=>el.remove());return '<!doctype html>'+clone.outerHTML;});
   html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi,'');
   html=html.replace('</head>',`<style>${css}</style></head>`);
   await writeFile(resolve(out,'cenario.html'),html);
  }
 }
 await page.close();
}
await browser.close();
console.log(out);
