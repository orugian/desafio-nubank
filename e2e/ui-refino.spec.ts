import { test, expect, type Page } from '@playwright/test';
import sessao from '../src/contratos/exemplos/api-sessao-p1.json';
import comparacao from '../src/contratos/exemplos/cartao-comparacao-cr02.json';
import parcelamento from '../src/contratos/exemplos/cartao-simulacao-parcelamento.json';
const texto='Se você separar R$ 500 hoje, faltam R$ 200,00 em 15/11. Esta explicação deve permanecer disponível integralmente.';
async function iniciar(page:Page,chatAberto:boolean,cartao:unknown=comparacao.dados){
 await page.goto('/');
 await page.evaluate(({base,chatAberto,cartao,texto})=>{
  const estado={...base.estado,conversa:chatAberto?[{mensagem_id:'u1',papel:'usuario',texto:'Quero comparar os cenários.',versao:1,cartoes:[],rastro:[]},{mensagem_id:'r1',papel:'assistente',texto,versao:1,cartoes:[cartao],rastro:[]}]:[]};
  sessionStorage.setItem('ui_test_fixture',JSON.stringify({...base,estado,abaAtual:'home',chatAberto}));
 },{base:sessao.dados,chatAberto,cartao,texto});
 await page.reload();
}
async function visivelSemCobertura(page:Page,selector:string){
 const el=page.locator(selector);await expect(el).toBeVisible();
 expect(await el.evaluate(e=>{const r=e.getBoundingClientRect();const target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&!!target&&(target===e||e.contains(target));})).toBe(true);
}
test.beforeEach(async({page,baseURL})=>{
 await page.addInitScript(()=>{const fixture=sessionStorage.getItem('ui_test_fixture');if(fixture) sessionStorage.setItem('newai_sessao_v1',fixture);});
 await page.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===new URL(baseURL!).origin&&!u.pathname.startsWith('/api/')?route.continue():route.abort();});
});
for(const width of [1440,768,390,320]){
 test(`${width}px: acesso nativo, estilos reais e leitura progressiva`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await iniciar(page,false);
  const abrir=page.getByRole('button',{name:'Abrir chat com a Nina (NewAI)'});
  await expect(abrir).toBeVisible();
  expect(await abrir.evaluate(e=>!!e.closest('header')&&!e.closest('.newai-topbar'))).toBe(true);
  await page.locator('.newai-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
  await visivelSemCobertura(page,'.newai-nina');
  await abrir.click();
  const chat=page.getByRole('dialog');
  await expect(chat.locator('.nu-chat-surface')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(chat.locator('.nu-chat-surface')).toHaveCSS('display','flex');
  await chat.getByRole('button',{name:'Fechar chat'}).click();
  await page.getByRole('button',{name:'Conta e extrato'}).click();
  await expect(abrir).toBeVisible();
  await visivelSemCobertura(page,'.newai-nina');
  await iniciar(page,true);
  const resposta=page.getByRole('region',{name:'Comparação de cenários'});
  await expect(resposta).toHaveCSS('padding',width<350?'16px':'20px');
  await expect(resposta.getByRole('heading',{name:'Seu planejamento'})).toBeVisible();
  await expect(resposta.getByText(/^Primeira falta de/)).toBeVisible();
  await expect(chat.getByText(texto)).toBeHidden();
  await chat.getByText('Explicação da Nina',{exact:true}).click();
  await expect(chat.getByText(texto)).toBeVisible();
  await chat.getByText('Entender os valores',{exact:true}).click();
  await expect(chat.getByText('Premissas',{exact:true})).toBeVisible();
  await visivelSemCobertura(page,'textarea[aria-label=Mensagem]');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const fechar=chat.getByRole('button',{name:'Fechar chat'});
  await fechar.focus();await page.keyboard.press('Shift+Tab');
  await expect(chat.getByRole('textbox',{name:'Mensagem'})).toBeFocused();
 });
}
// Regressão: abrir a Nina a partir de qualquer tela (após rolar) não pode esconder o topo do chat.
const telas:[string,string|null][]=[['home',null],['investimentos','Investimentos'],['conta','Conta e extrato'],['cartao','Meus cartões'],['como_funciona','Como funciona o protótipo']];
for(const width of [390,1440]){
 for(const [aba,botao] of telas){
  test(`${width}px ${aba}: chat abre com o topo visível e fecha`,async({page})=>{
   await page.setViewportSize({width,height:844});
   await iniciar(page,false);
   if(botao) await page.getByRole('button',{name:botao,exact:true}).first().click();
   await page.locator('.newai-scroll').evaluate(e=>{e.scrollTop=e.scrollHeight});
   const abrir=page.getByRole('button',{name:'Abrir chat com a Nina (NewAI)'});
   // Contraste do acesso: texto/fundo com razão mínima de 4.5:1 (WCAG AA).
   const razao=await abrir.evaluate(e=>{
    const lum=(c:string)=>{const v=c.match(/\d+(\.\d+)?/g)!.slice(0,3).map(Number).map(x=>{x/=255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};
    const s=getComputedStyle(e);const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
   });
   expect(razao).toBeGreaterThanOrEqual(4.5);
   await abrir.click();
   const chat=page.getByRole('dialog');
   await expect(chat.getByRole('heading',{name:'Nina',level:1})).toBeVisible();
   expect(await page.evaluate(()=>document.querySelector('.newai-frame')!.scrollTop)).toBe(0);
   await visivelSemCobertura(page,'[aria-label="Fechar chat"]');
   await chat.getByRole('button',{name:'Fechar chat'}).click();
   await expect(chat).toBeHidden();
   await expect(abrir).toBeVisible();
  });
 }
}
test('parcelamento preserva todas as opções, total e última parcela sem exigir tabela horizontal',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await iniciar(page,true,parcelamento.dados);
 const lista=page.getByRole('list',{name:'Opções de parcelamento simuladas'});
 await expect(lista.getByRole('listitem')).toHaveCount(parcelamento.dados.resultado.opcoes.length);
 await page.getByText('Ver custos e premissas',{exact:true}).click();
 const detalhe=page.getByRole('region',{name:'Detalhes de 48 parcelas'});
 await expect(detalhe.getByText('Última parcela',{exact:true})).toBeVisible();
 await visivelSemCobertura(page,'textarea[aria-label=Mensagem]');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
