// Compara cartões e visão reais com os mesmos executores/motor, sem chamada de modelo/rede.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const app=process.cwd();
const {criarExecutores}=require(path.join(app,'src/conversa/executores'));
const {carregarPersona}=require(path.join(app,'src/dados'));
const {criarCalendario}=require(path.join(app,'src/dominio/calendario'));
const {calcularCenarios}=require(path.join(app,'src/dominio/caixa'));
const cdi=require(path.join(app,'dados/mercado/cdi.json'));
const btc=require(path.join(app,'dados/mercado/fechamentos-BTC.json'));
const petr4=require(path.join(app,'dados/mercado/fechamentos-PETR4.json'));
const ctx={series:{cdi,fechamentos:{BTC:btc,PETR4:petr4}},calendario:criarCalendario({datas_cdi:cdi.serie.map((x:any)=>x.data)})};
const ex=criarExecutores();const resultados:any[]=[];
async function main(){
 for(let n=1;n<=20;n++){
  const p=path.join(__dirname,`real-turno-${String(n).padStart(2,'0')}.json`);if(!fs.existsSync(p))continue;
  const t=JSON.parse(fs.readFileSync(p,'utf8'));if(t.status==='bloqueado'||t.resposta?.status!=='ok')continue;
  const r=t.resposta; const pessoa=carregarPersona(r.estado.persona_id);if(!pessoa.ok)throw new Error('Persona inválida');
  const checks:any[]=[];
  async function check(nome:string,acao:()=>Promise<void>){try{await acao();checks.push({nome,igual:true});}catch(e){checks.push({nome,igual:false,erro:e instanceof Error?e.message:'erro'});}}
  await check('visao_vs_motor',async()=>assert.deepStrictEqual(r.visao,await ex.montarVisao(r.estado)));
  for(const [i,c] of r.cartoes.entries()){
   if(c.tipo==='comparacao')await check(`comparacao_${i}_vs_motor`,async()=>assert.deepStrictEqual(c.cenarios,calcularCenarios(pessoa.persona,r.estado,ctx)));
   const nome=({investimentos:'consultar_investimentos',historico:'consultar_historico',cartao_credito:'consultar_cartao'} as Record<string,string>)[c.tipo];
   if(nome){
    const chamadas=r.rastro.filter((v:any)=>v.ferramenta===nome&&v.resultado?.ok);
    if(chamadas.length===1)await check(`${c.tipo}_${i}_vs_motor`,async()=>{
      const direto=await ex.ferramentas[nome](chamadas[0].argumentos,{estado:r.estado,mensagem_id:'conferencia-offline'});
      assert.equal(direto.ok,true);assert.deepStrictEqual(c,direto.cartoes.find((x:any)=>x.tipo===c.tipo));
    });
    else checks.push({nome:`${c.tipo}_${i}_vs_motor`,igual:null,observacao:`${chamadas.length} chamadas candidatas`});
   }
  }
  resultados.push({numero:n,checks});
 }
 fs.writeFileSync(path.join(__dirname,'conferencia-motor.json'),JSON.stringify(resultados,null,2)+'\n',{encoding:'utf8',flag:'wx'});
 const todos=resultados.flatMap(x=>x.checks);console.log(JSON.stringify({turnos:resultados.length,comparacoes:todos.length,iguais:todos.filter(x=>x.igual===true).length,divergencias:resultados.flatMap(x=>x.checks.filter((c:any)=>c.igual===false).map((c:any)=>({numero:x.numero,nome:c.nome,erro:c.erro}))),nao_comparadas:todos.filter(x=>x.igual===null).length},null,2));
}
main().catch((e:unknown)=>{console.error(e);process.exitCode=1;});
