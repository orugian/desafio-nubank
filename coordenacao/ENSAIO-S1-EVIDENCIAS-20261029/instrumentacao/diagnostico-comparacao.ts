import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { criarExecutores } from '../src/conversa/executores';
const pasta = 'C:/Users/orugi/Documents/Projetos/salesforce/intern/coordenacao/ENSAIO-S1-EVIDENCIAS-20261029';
const ex = criarExecutores();
(async () => {
  for (const n of [12, 13, 18]) {
    const d = JSON.parse(readFileSync(`${pasta}/turno-${String(n).padStart(2, '0')}.json`, 'utf8'));
    const nome = n === 12 ? 'consultar_historico' : 'consultar_investimentos';
    const item = d.resposta.rastro.find((x: any) => x.ferramenta === nome);
    const resultado = await ex.ferramentas[nome](item.argumentos, { estado: d.estado_antes, mensagem_id: null });
    if (!resultado.ok) throw new Error('Consulta direta falhou.');
    const { ok, valores_formatados, ...observado } = item.resultado;
    void ok; void valores_formatados;
    const esperado = resultado.resultado;
    const { valores_formatados: formatoDireto, ...esperadoSemFormato } = esperado;
    void formatoDireto;
    const estruturaDireta = isDeepStrictEqual(observado, esperado);
    const simetrica = isDeepStrictEqual(observado, esperadoSemFormato);
    const aposJson = isDeepStrictEqual(JSON.parse(JSON.stringify(observado)), JSON.parse(JSON.stringify(esperadoSemFormato)));
    console.log(JSON.stringify({ turno: n, assimetrica: estruturaDireta, simetrica, simetrica_pos_json: aposJson, formato_no_resultado_direto: 'valores_formatados' in esperado }));
  }
})().catch(() => { console.error('Diagnóstico falhou.'); process.exitCode = 1; });
