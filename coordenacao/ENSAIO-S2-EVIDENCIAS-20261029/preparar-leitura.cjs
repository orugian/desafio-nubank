// Extrai os dados essenciais já registrados para revisão humana; sem rede.
const fs=require('node:fs');const path=require('node:path');const itens=JSON.parse(fs.readFileSync(path.join(__dirname,'resumo-turnos.json'),'utf8'));
let out='# Leitura de respostas e rastros do ensaio 2\n\n';
for(const x of itens){out+=`## ${x.numero} — ${x.status}\n\nMensagem: ${x.mensagem||'não enviada'}\n\n`;
 if(x.status==='bloqueado'){out+=`Bloqueio: ${x.motivo}\n\n`;continue;}
 if(x.status!=='ok'){out+=`Falha: ${JSON.stringify(x.falha||null)}\n\n`;continue;}
 out+=`Chamadas: ${x.chamadas}; tempo do turno: ${x.tempo_ms} ms.\n\nResposta:\n\n${x.texto}\n\n`;
 out+=`Ferramentas: ${JSON.stringify(x.ferramentas)}\n\nEstado: ${JSON.stringify(x.estado)}\n\n`;
 for(const c of x.cartoes){if(c.tipo==='comparacao')out+=`Comparação: ${JSON.stringify(c.cenarios)}\n\n`;else if(c.tipo==='investimentos')out+=`Investimentos: ${JSON.stringify({ate_data:c.ate_data,totais:c.totais,posicoes:c.posicoes?.map(p=>({id:p.posicao_id,valor:p.valor_atual_centavos,aplicado:p.aplicado_centavos,resultado:p.resultado_centavos,rentabilidade:p.rentabilidade_pct,valorizacao:p.valorizacao_periodo_pct,data:p.data_disponibilidade,classificacao:p.classificacao,rotulo:p.rotulo_estimativa}))})}\n\n`;else if(c.tipo==='historico')out+=`Histórico: ${JSON.stringify(c.resultado)}\n\n`;else if(c.tipo==='operacao_pendente')out+=`Proposta: ${JSON.stringify(c)}\n\n`;else if(c.tipo==='cartao_credito')out+=`Cartão: ${JSON.stringify(c.cartao)}\n\n`;else out+=`Cartão: ${c.tipo}\n\n`;}
}
fs.writeFileSync(path.join(__dirname,'leitura-turnos.md'),out,{encoding:'utf8',flag:'wx'});console.log('Leitura humana preparada.');
