// Pré-voo de troca/reset em contexto fictício isolado: apenas /api/sessao, sem /api/turno.
const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require(path.join(process.cwd(), 'node_modules', '@playwright', 'test'));
const log = path.join(__dirname, 'real-http.ndjson');
function contagem(){return fs.existsSync(log)?fs.readFileSync(log,'utf8').split('\n').filter(x=>x && JSON.parse(x).tipo==='tentativa').length:0;}
async function main(){
 const antes=contagem(); const browser=await chromium.launch({headless:true}); const ctx=await browser.newContext(); const page=await ctx.newPage();
 try {
  await page.goto('http://127.0.0.1:3102/',{waitUntil:'domcontentloaded'});
  const pessoas=[['Bia','p1'],['Caio','p2'],['Duda','p3'],['Bia','p1'],['Duda','p3']];
  for(let i=0;i<pessoas.length;i++){
   if(i){const [z]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/sessao')&&r.request().method()==='POST'),page.getByRole('button',{name:'Recomeçar',exact:true}).click()]); const j=await z.json(); if(j.status!=='ok'||j.estado.versao!==0)throw new Error('Reset inválido'); await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('newai_sessao_v1')||'null')?.estado?.versao===0); await page.getByRole('button',{name:'Trocar persona'}).click();}
   const [h]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/sessao')&&r.request().method()==='POST'),page.getByRole('button',{name:new RegExp('^'+pessoas[i][0]+' \\(fictíci[ao]\\)','i')}).click()]); const v=await h.json(); if(v.status!=='ok'||v.estado.persona_id!==pessoas[i][1]||v.estado.versao!==0)throw new Error('Seleção de persona inválida'); await page.waitForFunction(id=>JSON.parse(sessionStorage.getItem('newai_sessao_v1')||'null')?.estado?.persona_id===id,pessoas[i][1]);
  }
  const depois=contagem(); if(antes!==depois)throw new Error('Pré-voo gerou chamadas inesperadas');
  fs.writeFileSync(path.join(__dirname,'prevoo-troca.json'),JSON.stringify({status:'ok',sequencia:pessoas.map(x=>x[1]),chamadas_modelo:depois-antes},null,2)+'\n',{encoding:'utf8',flag:'wx'});
  console.log('Troca/reset P1→P2→P3→P1→P3 validada; zero chamadas ao modelo.');
 } finally {await ctx.close();await browser.close();}
}
main().catch(e=>{console.error('Pré-voo falhou:',e.message);process.exitCode=1;});
