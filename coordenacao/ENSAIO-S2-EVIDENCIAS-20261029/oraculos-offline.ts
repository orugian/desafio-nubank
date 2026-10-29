// Oráculos determinísticos complementares do ensaio 2: sem modelo ou rede.
// Executar a partir de newai/ com tsx; a saída é criada uma vez e nunca sobrescrita.
const fs = require('node:fs');
const path = require('node:path');
const raiz = process.cwd();
const { estadoInicial } = require(path.join(raiz, 'src/contratos'));
const { criarExecutores } = require(path.join(raiz, 'src/conversa/executores'));
const { snapshotGravado } = require(path.join(raiz, 'src/mercado'));
const ex = criarExecutores(); let indice = 0;
async function f(nome: string, args: object, estado: any) {
  const res = await ex.ferramentas[nome](args, { estado, mensagem_id: `oraculo-s2-${++indice}` });
  if (!res.ok) throw new Error(`${nome}: ${JSON.stringify(res.erro)}`);
  return { ...res, estado: { ...res.estado, versao: estado.versao + 1 } };
}
async function main() {
  let estado = estadoInicial('p1', snapshotGravado());
  const a1 = await f('criar_hipotese', {nome:'Separar 275', a_partir_de:'atual', alteracoes:[{operacao:'separar',valor:'275'}]}, estado); estado=a1.estado;
  const a2 = await f('propor_movimentacao', {valor:'125',destino:'INV9'}, estado); estado=a2.estado;
  const a3 = await f('confirmar_movimentacao', {operacao_id:estado.operacao_pendente.id}, estado); estado=a3.estado;
  const a5 = await f('consultar_investimentos', {}, estado);
  estado = estadoInicial('p2', snapshotGravado());
  const b6 = await f('criar_hipotese', {nome:'Gasto 12', a_partir_de:'atual', alteracoes:[{operacao:'alterar_gasto_diario',valor_por_dia:'12'}]}, estado); estado=b6.estado;
  const b7 = await f('registrar_declaracao', {alteracao:{operacao:'definir_ordem_no_dia',data:'2026-11-08',ordem:'entradas_primeiro'}}, estado); estado=b7.estado;
  const b8 = await f('consultar_historico', {de:'2026-09-30',ate:'2026-10-29',tipo:'saida',categoria:'mercado'}, estado); estado=b8.estado;
  const b9 = await f('consultar_investimentos', {}, estado);
  estado = estadoInicial('p3', snapshotGravado());
  const c11 = await f('criar_hipotese', {nome:'Material 743,21', a_partir_de:'atual', alteracoes:[{operacao:'adicionar_evento',tipo:'saida',descricao:'Material',valor:'743.21',data:'2026-11-07',meio:'cartao_credito',parcelas:3}]}, estado); estado=c11.estado;
  const c12 = await f('desfazer', {alvo_id:'H1'}, estado); estado=c12.estado;
  const c13 = await f('consultar_investimentos', {ate_data:'2026-11-12'}, estado); estado=c13.estado;
  const c14 = await f('consultar_cartao', {}, estado);
  estado = estadoInicial('p1', snapshotGravado());
  const d16 = await f('registrar_declaracao',{alteracao:{operacao:'adicionar_evento',tipo:'saida',descricao:'Despesa',valor:'180',data:'2026-11-12',meio:'debito'}},estado);
  const out = { finalidade:'Oráculos offline; não são execução de linguagem.', chamadas_reais:0, a1:a1.cartoes, a2:a2.cartoes, a3:{estado:a3.estado,visao:await ex.montarVisao(a3.estado)}, a5:a5.cartoes, b6:b6.cartoes, b7:b7.cartoes, b8:b8.cartoes, b9:b9.cartoes, c11:c11.cartoes, c12:c12.cartoes, c13:c13.cartoes, c14:c14.cartoes, d16:d16.cartoes };
  fs.writeFileSync(path.join(__dirname,'oraculos-offline.json'),JSON.stringify(out,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  const a = a5.cartoes.find((x:any)=>x.tipo==='investimentos').resultado.posicoes.find((x:any)=>x.posicao_id==='INV3');
  const b = b9.cartoes.find((x:any)=>x.tipo==='investimentos').resultado.posicoes.find((x:any)=>x.posicao_id==='INV5');
  console.log(JSON.stringify({btc:b,petr4:a,historico:b8.cartoes},null,2));
}
main().catch((e:unknown)=>{console.error(e);process.exitCode=1;});
