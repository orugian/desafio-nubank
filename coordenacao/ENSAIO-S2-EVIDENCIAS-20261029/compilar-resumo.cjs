// Resumo para leitura humana de evidências previamente capturadas; não chama modelos nem altera evidências.
const fs=require('node:fs');const path=require('node:path');
function visaoCarta(c){
 if(c.tipo==='comparacao')return {tipo:c.tipo,cenarios:c.cenarios.map(x=>({id:x.cenario_id,indicadores:x.indicadores,ordem:x.datas_ordem_relevante,faturas:x.faturas_afetadas,avisos:x.avisos}))};
 if(c.tipo==='operacao_pendente')return {tipo:c.tipo,operacao:c.operacao,impacto:c.impacto?.indicadores,alerta:c.alerta,rendimento:c.rendimento_estimado};
 if(c.tipo==='investimentos')return {tipo:c.tipo,ate_data:c.resultado?.ate_data,totais:c.resultado?.totais,posicoes:c.resultado?.posicoes};
 if(c.tipo==='historico')return {tipo:c.tipo,resultado:c.resultado};
 if(c.tipo==='cartao_credito')return {tipo:c.tipo,cartao:c.cartao};
 return {tipo:c.tipo};
}
let itens=[];
for(let n=1;n<=20;n++){
 const arq=path.join(__dirname,`real-turno-${String(n).padStart(2,'0')}.json`);
 if(!fs.existsSync(arq)){itens.push({numero:n,status:'nao_executado'});continue;}
 const x=JSON.parse(fs.readFileSync(arq,'utf8'));
 if(x.status==='bloqueado'){itens.push(x);continue;}
 const r=x.resposta;
 if(r.status!=='ok'){itens.push({numero:n,mensagem:x.mensagem,status:r.status,falha:r.falha,tempo_ms:x.tempo_ms,chamadas:x.chamadas_depois-x.chamadas_antes});continue;}
 const e=r.estado;const v=r.visao;
 itens.push({numero:n,mensagem:x.mensagem,status:r.status,tempo_ms:x.tempo_ms,chamadas:x.chamadas_depois-x.chamadas_antes,texto:r.texto,avisos:r.avisos,
  ferramentas:r.rastro.map(q=>({nome:q.ferramenta,argumentos:q.argumentos,ok:q.resultado?.ok,erro:q.resultado?.erro,hipotese_id:q.resultado?.hipotese_id,declaracao_id:q.resultado?.declaracao_id})),
  estado:{versao_antes:x.estado_entrada.versao,versao_depois:e.versao,hipoteses:e.hipoteses,declaracoes:e.declaracoes,operacao_pendente:e.operacao_pendente,operacoes:e.operacoes,contadores:e.contadores,saldo_conta_centavos:v?.conta?.saldo_disponivel_hoje_centavos},cartoes:r.cartoes.map(visaoCarta)});
}
const destino=path.join(__dirname,'resumo-turnos.json');fs.writeFileSync(destino,JSON.stringify(itens,null,2)+'\n',{encoding:'utf8',flag:'wx'});
console.log(`Resumo criado: ${itens.length} itens; ${itens.filter(x=>x.status==='ok').length} respostas; ${itens.filter(x=>x.status==='bloqueado').length} bloqueios.`);
