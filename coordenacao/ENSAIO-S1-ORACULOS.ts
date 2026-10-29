// Conferência offline de critérios numéricos do ENSAIO-S1. Não envia mensagens a um modelo.
// Executar a partir da raiz newai: node_modules/.bin/tsx ../coordenacao/ENSAIO-S1-ORACULOS.ts
const assert = require('node:assert/strict');
const path = require('node:path');
const raiz = process.cwd();
const { estadoInicial } = require(path.join(raiz, 'src/contratos'));
const { criarExecutores } = require(path.join(raiz, 'src/conversa/executores'));
const { snapshotGravado } = require(path.join(raiz, 'src/mercado'));
const ex = criarExecutores();
let id = 0;
async function ferramenta(nome: string, argumentos: object, estado: any) {
  const r = await ex.ferramentas[nome](argumentos, { estado, mensagem_id: `ensaio-s1-oraculo-${++id}` });
  assert.equal(r.ok, true, `${nome}: ${JSON.stringify(r.ok ? null : r.erro)}`);
  return { ...r, estado: { ...r.estado, versao: estado.versao + 1 } };
}
function cenario(r: any, nome: string) {
  const c = r.cartoes.find((x: any) => x.tipo === 'comparacao')?.cenarios.find((x: any) => x.cenario_id === nome);
  assert(c, `cenário ausente: ${nome}`);
  return c;
}
function indicadores(c: any, minimo: number, data: string, final: number) {
  assert.equal(c.indicadores.saldo_minimo_centavos, minimo);
  assert.equal(c.indicadores.data_saldo_minimo, data);
  assert.equal(c.indicadores.saldo_final_centavos, final);
}
async function principal() {
  let s = estadoInicial('p1', snapshotGravado());
  let r = await ferramenta('criar_hipotese', { nome: 'Separação 420', a_partir_de: 'atual', alteracoes: [{ operacao: 'separar', valor: '420' }] }, s);
  indicadores(cenario(r, 'H1'), -12000, '2026-11-15', 288000);
  assert.equal(cenario(r, 'H1').indicadores.primeira_falta.data, '2026-11-15');
  assert.equal(cenario(r, 'H1').indicadores.primeira_falta.valor_descoberto_centavos, 12000);
  s = r.estado;
  r = await ferramenta('criar_hipotese', { nome: 'Salário dia 9', a_partir_de: 'H1', alteracoes: [{ operacao: 'alterar_evento', evento_id: 'R1', data: '2026-11-09' }] }, s);
  indicadores(cenario(r, 'H2'), 68000, '2026-11-05', 288000);
  assert.equal(cenario(r, 'H2').indicadores.primeira_falta, null);
  s = r.estado;
  r = await ferramenta('registrar_declaracao', { alteracao: { operacao: 'alterar_evento', evento_id: 'C', valor: '175' } }, s);
  indicadores(cenario(r, 'atual'), 32500, '2026-11-15', 332500);
  indicadores(cenario(r, 'H1'), -9500, '2026-11-15', 290500);
  indicadores(cenario(r, 'H2'), 68000, '2026-11-05', 290500);
  s = r.estado;
  r = await ferramenta('desfazer', { alvo_id: 'H2' }, s);
  assert.deepEqual(r.estado.hipoteses.map((h: any) => h.id), ['H1']);
  assert.equal(r.estado.declaracoes.length, 1);

  s = estadoInicial('p1', snapshotGravado());
  r = await ferramenta('propor_movimentacao', { valor: '350', destino: 'INV9' }, s);
  const proposta = r.cartoes.find((x: any) => x.tipo === 'operacao_pendente');
  assert(proposta);
  indicadores(proposta.impacto, -5000, '2026-11-15', 295000);
  assert.equal(proposta.impacto.indicadores.primeira_falta.data, '2026-11-15');
  assert.equal(proposta.impacto.indicadores.primeira_falta.valor_descoberto_centavos, 5000);
  assert.equal(r.estado.operacoes.length, 0);
  s = r.estado;
  r = await ferramenta('cancelar_movimentacao', { operacao_id: s.operacao_pendente.id }, s);
  assert.equal(r.estado.operacao_pendente, null);
  assert.equal(r.estado.operacoes.length, 0);

  s = estadoInicial('p2', snapshotGravado());
  r = await ferramenta('criar_hipotese', { nome: 'Separação 180', a_partir_de: 'atual', alteracoes: [{ operacao: 'separar', valor: '180' }] }, s);
  indicadores(cenario(r, 'H1'), -71000, '2026-11-08', -4500);
  assert.equal(cenario(r, 'H1').indicadores.primeira_falta.data, '2026-11-08');
  assert.equal(cenario(r, 'H1').indicadores.primeira_falta.valor_descoberto_centavos, 71000);
  assert(cenario(r, 'H1').datas_ordem_relevante.includes('2026-11-08'));
  s = r.estado;
  r = await ferramenta('registrar_declaracao', { alteracao: { operacao: 'definir_ordem_no_dia', data: '2026-11-08', ordem: 'entradas_primeiro' } }, s);
  indicadores(cenario(r, 'atual'), 13500, '2026-11-27', 13500);
  indicadores(cenario(r, 'H1'), -4500, '2026-11-27', -4500);
  assert.equal(cenario(r, 'H1').indicadores.primeira_falta.data, '2026-11-27');
  assert.equal(cenario(r, 'H1').indicadores.primeira_falta.valor_descoberto_centavos, 4500);
  s = r.estado;
  r = await ferramenta('registrar_declaracao', { alteracao: { operacao: 'alterar_evento', evento_id: 'E1', valor: '135' } }, s);
  assert.equal(cenario(r, 'atual').indicadores.saldo_final_centavos, 12000);
  assert.equal(cenario(r, 'H1').indicadores.saldo_final_centavos, -6000);

  s = estadoInicial('p3', snapshotGravado());
  r = await ferramenta('criar_hipotese', { nome: 'Bicicleta no cartão', a_partir_de: 'atual', alteracoes: [{ operacao: 'adicionar_evento', tipo: 'saida', descricao: 'Conserto bicicleta', valor: '639.01', data: '2026-11-06', meio: 'cartao_credito', parcelas: 4 }] }, s);
  const h = cenario(r, 'H1');
  assert.deepEqual(h.linhas, cenario(r, 'atual').linhas);
  assert.deepEqual(h.faturas_afetadas.map((f: any) => f.vencimento), ['2026-12-05', '2027-01-05', '2027-02-05', '2027-03-05']);
  assert.deepEqual(h.faturas_afetadas.map((f: any) => f.total_depois_centavos - f.total_antes_centavos), [15976, 15975, 15975, 15975]);
  s = r.estado;
  r = await ferramenta('criar_hipotese', { nome: 'Bicicleta no Pix', a_partir_de: 'atual', alteracoes: [{ operacao: 'adicionar_evento', tipo: 'saida', descricao: 'Conserto bicicleta', valor: '639.01', data: '2026-11-06', meio: 'pix' }] }, s);
  assert.equal(cenario(r, 'H2').faturas_afetadas.length, 0);
  s = r.estado;
  r = await ferramenta('desfazer', { alvo_id: 'H2' }, s);
  assert.deepEqual(r.estado.hipoteses.map((h: any) => h.id), ['H1']);
  console.log('Oráculos offline conferidos: sessões A, B, C e D (critérios numéricos/estado indicados); 0 chamadas ao modelo ou mercado ao vivo. Não é ensaio real.');
}
principal().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
