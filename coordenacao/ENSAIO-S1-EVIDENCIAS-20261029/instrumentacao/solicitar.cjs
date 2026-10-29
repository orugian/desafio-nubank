'use strict';
// Cliente do controle local; não imprime o token de controle.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const arquivo = process.env.ENSAIO_CONTROLE_ARQUIVO ?? path.join(__dirname, 'controle-local.json');
const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const [acao, argumento, ...resto] = process.argv.slice(2);
const permitido = ['sessao', 'turno', 'bloquear', 'estado', 'encerrar'];
if (!permitido.includes(acao)) { console.error('Comando inválido.'); process.exit(2); }
const corpo = acao === 'sessao' ? { letra: argumento } : acao === 'turno' ? { numero: Number(argumento) } : acao === 'bloquear' ? { numero: Number(argumento), motivo: resto.join(' ') } : {};
const req = http.request({ hostname: '127.0.0.1', port: dados.porta, method: 'POST', path: `/${acao}`, headers: { 'x-controle-ensaio': dados.token, 'content-type': 'application/json' }, timeout: 110000 }, res => {
  let texto = '';
  res.on('data', x => { texto += x; });
  res.on('end', () => {
    console.log(texto);
    if (res.statusCode !== 200) process.exitCode = 1;
  });
});
req.on('error', () => { console.error('Controle local indisponível; não repetir sem conferir evidências.'); process.exitCode = 1; });
req.on('timeout', () => { req.destroy(); });
req.end(JSON.stringify(corpo));
