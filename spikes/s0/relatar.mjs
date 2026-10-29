// Consolidação offline das medições; não carrega credenciais nem faz chamadas externas.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = dirname(fileURLToPath(import.meta.url));
const diretorio = join(base, 'respostas');
const arquivos = await readdir(diretorio);
const medicoes = await Promise.all(arquivos.filter(f => f.startsWith('medicao-') && f.endsWith('.json')).map(async f => ({ ...JSON.parse(await readFile(join(diretorio, f), 'utf8')), arquivo: f })));
const grupos = new Map();
for (const m of medicoes) {
  const k = `${m.provedor}|${m.modelo}`;
  if (!grupos.has(k)) grupos.set(k, []);
  grupos.get(k).push(m);
}
const resultado = [];
for (const linhas of grupos.values()) {
  const tempos = linhas.map(l => l.latencia_ms).sort((a, b) => a - b);
  const meio = Math.floor(tempos.length / 2);
  const mediana = tempos.length % 2 ? tempos[meio] : (tempos[meio - 1] + tempos[meio]) / 2;
  const maximo = tempos.at(-1);
  const acertos = linhas.filter(l => l.correto).length;
  const sucessos_http = linhas.filter(l => l.status === 200).length;
  const erros = {};
  for (const l of linhas.filter(l => l.erro)) erros[l.erro] = (erros[l.erro] ?? 0) + 1;
  resultado.push({ provedor: linhas[0].provedor, modelo: linhas[0].modelo, acertos, casos: linhas.length, sucessos_http, mediana_ms: mediana, maxima_ms: maximo, erros, gate: linhas.length === 5 && acertos >= 4 && maximo < 15000, detalhes: linhas.sort((a, b) => a.caso.localeCompare(b.caso)) });
}
resultado.sort((a, b) => b.acertos - a.acertos || b.sucessos_http - a.sucessos_http || a.maxima_ms - b.maxima_ms);
await writeFile(join(base, 'medicoes.json'), JSON.stringify({ gerado_em: new Date().toISOString(), completions: medicoes.length, resultados: resultado }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(resultado.map(({ detalhes, ...x }) => x), null, 2));
