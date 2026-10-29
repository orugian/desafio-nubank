'use strict';
const fs = require('node:fs');
const path = require('node:path');
const arquivo = 'C:/Users/orugi/Documents/Projetos/salesforce/intern/coordenacao/ENSAIO-S1-RESULTADOS.md';
const conteudo = fs.readFileSync(arquivo, 'utf8');
const expressao = /\]\(<([^>]+)>\)/g;
const ausentes = [];
let links = 0;
for (const match of conteudo.matchAll(expressao)) {
  const alvo = match[1].split('#')[0];
  if (!alvo || /^https?:/.test(alvo)) continue;
  links++;
  if (!fs.existsSync(path.resolve(path.dirname(arquivo), alvo))) ausentes.push(alvo);
}
console.log(JSON.stringify({ links_locais: links, ausentes }));
if (ausentes.length) process.exitCode = 1;
