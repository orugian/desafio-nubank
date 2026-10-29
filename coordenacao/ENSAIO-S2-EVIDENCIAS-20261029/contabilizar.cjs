// Soma eventos sem ler cabeçalhos, corpos ou credenciais.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const eventos=fs.readFileSync(path.join(__dirname,'real-http.ndjson'),'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tentativas=eventos.filter(x=>x.tipo==='tentativa');const resultados=eventos.filter(x=>x.tipo==='resultado');const erros=eventos.filter(x=>x.tipo==='erro_rede');
const ids=new Set(tentativas.map(x=>x.id));assert.equal(ids.size,tentativas.length);
const terminais=[...resultados,...erros];assert.equal(terminais.length,tentativas.length);assert.equal(new Set(terminais.map(x=>x.id)).size,terminais.length);for(const x of terminais)assert(ids.has(x.id));
const turnos=JSON.parse(fs.readFileSync(path.join(__dirname,'resumo-turnos.json'),'utf8')).filter(x=>x.status==='ok');
assert.equal(turnos.reduce((a,x)=>a+x.chamadas,0),tentativas.length);
const resumo={provedor:'openrouter',tentativas:tentativas.length,sucesso_http_2xx:resultados.filter(x=>x.http_status>=200&&x.http_status<300).length,falhas_http:resultados.filter(x=>x.http_status<200||x.http_status>=300).length,erros_rede:erros.length,requisições_simuladas_na_rodada_real:tentativas.filter(x=>x.teste).length,externos_bloqueados:eventos.filter(x=>x.tipo==='externo_bloqueado').length,latencia_http_max_ms:Math.max(...resultados.map(x=>x.duracao_ms)),tempo_turno_max_ms:Math.max(...turnos.map(x=>x.tempo_ms)),por_turno:turnos.map(x=>({numero:x.numero,chamadas:x.chamadas,tempo_ms:x.tempo_ms}))};
fs.writeFileSync(path.join(__dirname,'contagem-http.json'),JSON.stringify(resumo,null,2)+'\n',{encoding:'utf8',flag:'wx'});console.log(JSON.stringify(resumo,null,2));
