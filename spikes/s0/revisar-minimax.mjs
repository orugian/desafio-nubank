// Auditoria offline separada. NÃO modifica verificador, respostas brutas, roteiros ou métricas originais.
// Não libera gate: explicita divergência literal x equivalência permitida pela spec §4.5.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avaliar, casos } from './material.mjs';
const base = dirname(fileURLToPath(import.meta.url));
const registros = [];
function canonico(valor) {
  if (typeof valor !== 'string' || !/^\d{1,7}(\.\d{1,2})?$/.test(valor)) throw new Error('Valor fora da gramática da spec.');
  const [inteira, decimal = ''] = valor.split('.');
  const parteInteira = BigInt(inteira).toString();
  const parteDecimal = decimal.replace(/0+$/, '');
  if (parteInteira === '0' && parteDecimal === '') throw new Error('Valor não positivo.');
  return parteDecimal ? `${parteInteira}.${parteDecimal}` : parteInteira;
}
const hash = texto => createHash('sha256').update(texto).digest('hex');
for (const caso of casos) {
  const arquivo = `nvidia-minimaxai_minimax-m3.1-flash-${caso.id}.json`;
  const path = join(base, 'respostas', arquivo);
  const original = await readFile(path, 'utf8');
  const resposta = JSON.parse(original);
  const automatico = avaliar(caso.id, resposta);
  const copia = structuredClone(resposta);
  const alteracoes = [];
  for (const call of copia.choices?.[0]?.message?.tool_calls ?? []) {
    const args = JSON.parse(call.function.arguments);
    const alvo = caso.id === 'CV-01' ? args.alteracoes?.[0] : caso.id === 'CV-03' ? args.alteracao : caso.id === 'CV-07' ? args : null;
    if (alvo && typeof alvo.valor === 'string') {
      const antes = alvo.valor;
      const depois = canonico(antes);
      if (antes !== depois) alteracoes.push({ campo: 'valor', antes, depois, somente_na_copia_em_memoria: true });
      alvo.valor = depois;
      call.function.arguments = JSON.stringify(args);
    }
  }
  const revisao = avaliar(caso.id, copia);
  const bruto_inalterado = hash(original) === hash(await readFile(path, 'utf8'));
  if (!bruto_inalterado) throw new Error('Arquivo bruto alterado durante a auditoria.');
  registros.push({ caso: caso.id, arquivo, resultado_automatico_original: automatico.correto, revisao_equivalencia_monetaria: revisao.correto, alteracoes, bruto_inalterado, sha256_bruto: hash(original) });
}
const resultado = {
  fonte_normativa: 'docs/NEWAI-SPECS.md §4.5, linha 190, e CR-17b',
  limite_da_auditoria: 'Somente equivalência textual decimal em cópia na memória. Não é execução do contrato 1.0 nem do motor da S1; não altera teste nem aprova gate automaticamente.',
  automatico_original: registros.filter(x => x.resultado_automatico_original).length,
  revisao_equivalencia: registros.filter(x => x.revisao_equivalencia_monetaria).length,
  total: registros.length,
  registros,
};
await writeFile(join(base, 'revisao-minimax.json'), JSON.stringify(resultado, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
console.log(`Auditoria separada: literal ${resultado.automatico_original}/${resultado.total}; equivalência decimal ${resultado.revisao_equivalencia}/${resultado.total}; brutos inalterados. Gate aguarda decisão humana.`);
