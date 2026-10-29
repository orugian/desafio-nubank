'use strict';
// Controle local para ensaio original: uma chamada explícita por turno; sem credenciais no log.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const raiz = 'C:/Users/orugi/Documents/Projetos/salesforce/intern';
const provas = process.env.ENSAIO_PROVAS ?? path.join(raiz, 'coordenacao/ENSAIO-S1-EVIDENCIAS-20261029');
const fonte = path.join(raiz, 'coordenacao/ENSAIO-S1.md');
const logHttp = path.join(provas, 'http-modelo.jsonl');
const stopCota = path.join(provas, 'parada-cota.flag');
const controle = process.env.ENSAIO_CONTROLE_ARQUIVO ?? path.join(__dirname, 'controle-local.json');
const mensagens = fs.readFileSync(fonte, 'utf8').split(/\r?\n/).filter(x => x.startsWith('> ')).map(x => x.slice(2));
assert.equal(mensagens.length, 20);
const sessoes = [
  { letra: 'A', persona: 'p1', nome: /Bia \(fictícia\)/i, inicio: 1, fim: 5 },
  { letra: 'B', persona: 'p1', nome: /Bia \(fictícia\)/i, inicio: 6, fim: 8 },
  { letra: 'C', persona: 'p2', nome: /Caio \(fictício\)/i, inicio: 9, fim: 13 },
  { letra: 'D', persona: 'p3', nome: /Duda \(fictícia\)/i, inicio: 14, fim: 17 },
  { letra: 'E', persona: 'p3', nome: /Duda \(fictícia\)/i, inicio: 18, fim: 20 },
];
const token = randomUUID();
let browser, page, servidor;
let sessaoIndex = -1;
let proximo = 1;
let ocupado = false;
let parado = false;
const salvar = (nome, objeto) => fs.writeFileSync(path.join(provas, nome), JSON.stringify(objeto, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
const lerEventos = () => fs.existsSync(logHttp) ? fs.readFileSync(logHttp, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const storageEstado = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('newai_sessao_v1') || 'null')?.estado || null);
const infoEstado = (e) => !e ? null : ({ persona_id: e.persona_id, versao: e.versao, declaracoes: e.declaracoes, hipoteses: e.hipoteses, operacao_pendente: e.operacao_pendente, operacoes: e.operacoes, contadores: e.contadores });
const curtoCenario = (c) => ({ cenario_id: c.cenario_id, indicadores: c.indicadores, datas_ordem_relevante: c.datas_ordem_relevante, faturas_afetadas: c.faturas_afetadas, avisos: c.avisos });
const resumoCartao = (c) => {
  if (c.tipo === 'comparacao') return { tipo: c.tipo, cenarios: c.cenarios.map(curtoCenario) };
  if (c.tipo === 'operacao_pendente') return { ...c, impacto: curtoCenario(c.impacto) };
  return c;
};
const resumoRastro = (r) => {
  let resultado = r.resultado;
  if (resultado && Array.isArray(resultado.cenarios)) resultado = { ...resultado, cenarios: resultado.cenarios.map(x => typeof x === 'object' ? curtoCenario(x) : x) };
  return { chamada: r.chamada, ferramenta: r.ferramenta, argumentos: r.argumentos, resultado };
};
function gravarResumo(n, reg) {
  const r = reg.resposta;
  const texto = [
    `# Turno ${n} — sessão ${reg.sessao} / ${reg.persona}`,
    '', `Mensagem: ${reg.mensagem}`, '',
    `Resposta: ${r?.status === 'ok' ? r.texto : JSON.stringify(r?.falha ?? 'sem resposta')}`, '',
    `Latência: ${reg.latencia_ms} ms. Visível no chat: ${reg.texto_visivel}.`, '',
    '## Estado antes', '```json', JSON.stringify(infoEstado(reg.estado_antes), null, 2), '```', '',
    '## Estado depois', '```json', JSON.stringify(infoEstado(r?.estado), null, 2), '```', '',
    '## Saldo, rastro e cartões', '```json', JSON.stringify({ saldo_conta: r?.visao?.conta?.saldo_disponivel_hoje_centavos, rastro: (r?.rastro || []).map(resumoRastro), cartoes: (r?.cartoes || []).map(resumoCartao), avisos: r?.avisos }, null, 2), '```', '',
    '## Eventos HTTP do turno', '```json', JSON.stringify(reg.http, null, 2), '```', '',
  ].join('\n');
  fs.writeFileSync(path.join(provas, `turno-${String(n).padStart(2, '0')}-resumo.md`), texto, { encoding: 'utf8', flag: 'wx' });
}
async function respostaSessao(acao) {
  const p = page.waitForResponse(r => r.url().endsWith('/api/sessao') && r.request().method() === 'POST', { timeout: 30000 });
  await acao();
  const s = await (await p).json();
  assert.equal(s.status, 'ok');
  assert.equal(s.config.provedor, 'openrouter');
  assert.equal(s.config.modelo, 'deepseek/deepseek-v4.1-flash-1017');
  assert.equal(s.estado.versao, 0);
  return s;
}
async function abrirSessao(letra) {
  assert(!parado && !fs.existsSync(stopCota), 'Ensaio parado.');
  const alvo = sessoes[sessaoIndex + 1];
  assert(alvo && alvo.letra === letra && proximo === alvo.inicio, 'Sessão fora da sequência.');
  if (sessaoIndex < 0) {
    await page.goto('http://127.0.0.1:3101/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    const anterior = sessoes[sessaoIndex];
    const dialogo = page.getByRole('dialog', { name: 'Chat NewAI' });
    if (await dialogo.isVisible()) await dialogo.getByRole('button', { name: 'Fechar chat' }).click();
    const reset = await respostaSessao(() => page.getByRole('button', { name: 'Recomeçar', exact: true }).click());
    assert.equal(reset.estado.persona_id, anterior.persona);
    await page.waitForFunction(p => { const s = JSON.parse(sessionStorage.getItem('newai_sessao_v1') || 'null'); return s?.estado?.versao === 0 && s.estado.persona_id === p; }, anterior.persona);
    if (anterior.persona !== alvo.persona) await page.getByRole('button', { name: 'Trocar persona' }).click();
  }
  let sessao;
  if (sessaoIndex < 0 || sessoes[sessaoIndex].persona !== alvo.persona) {
    sessao = await respostaSessao(() => page.getByRole('button', { name: alvo.nome }).click({ timeout: 30000 }));
  } else {
    const armazenado = await page.evaluate(() => JSON.parse(sessionStorage.getItem('newai_sessao_v1') || 'null'));
    sessao = { status: 'ok', estado: armazenado.estado, visao: armazenado.visao, config: armazenado.config };
  }
  assert.equal(sessao.estado.persona_id, alvo.persona);
  assert.equal(sessao.estado.versao, 0);
  await page.getByRole('button', { name: /NewAI/i }).click();
  await page.getByRole('dialog', { name: 'Chat NewAI' }).waitFor({ state: 'visible' });
  salvar(`sessao-${letra}.json`, { em: new Date().toISOString(), sessao: letra, persona: alvo.persona, provedor: sessao.config.provedor, modelo: sessao.config.modelo, estado_inicial: sessao.estado, visao_inicial: sessao.visao, reset_anterior: sessaoIndex >= 0 });
  sessaoIndex++;
  return { sessao: letra, persona: alvo.persona, versao_inicial: 0, provedor: sessao.config.provedor, modelo: sessao.config.modelo };
}
async function enviar(n) {
  assert(!parado && !fs.existsSync(stopCota), 'Ensaio parado.');
  const sessao = sessoes[sessaoIndex];
  assert(sessao && n === proximo && n >= sessao.inicio && n <= sessao.fim, 'Turno fora da sequência.');
  const estadoAntes = await storageEstado();
  assert(estadoAntes && estadoAntes.persona_id === sessao.persona, 'Estado de sessão inválido.');
  const mensagem = mensagens[n - 1];
  const numero = String(n).padStart(2, '0');
  salvar(`turno-${numero}-iniciado.json`, { em: new Date().toISOString(), sessao: sessao.letra, persona: sessao.persona, numero: n, mensagem, versao_antes: estadoAntes.versao });
  const eventosAntes = lerEventos().length;
  const inicio = Date.now();
  let resposta;
  try {
    const dialogo = page.getByRole('dialog', { name: 'Chat NewAI' });
    await dialogo.getByPlaceholder('Digite sua mensagem...').fill(mensagem);
    const p = page.waitForResponse(r => r.url().endsWith('/api/turno') && r.request().method() === 'POST', { timeout: 90000 });
    await dialogo.getByRole('button', { name: 'Enviar mensagem' }).click();
    resposta = await (await p).json();
    const latencia = Date.now() - inicio;
    let visivel = false;
    if (resposta.status === 'ok') {
      try { await dialogo.getByText(resposta.texto, { exact: true }).waitFor({ state: 'visible', timeout: 10000 }); visivel = true; } catch {}
      await page.waitForFunction(v => JSON.parse(sessionStorage.getItem('newai_sessao_v1') || 'null')?.estado?.versao === v, resposta.estado.versao, { timeout: 10000 });
    }
    const eventos = lerEventos().slice(eventosAntes);
    const reg = { em: new Date().toISOString(), numero: n, sessao: sessao.letra, persona: sessao.persona, mensagem, estado_antes: estadoAntes, resposta, texto_visivel: visivel, latencia_ms: latencia, http: eventos };
    salvar(`turno-${numero}.json`, reg);
    gravarResumo(n, reg);
    proximo++;
    const tentadas = eventos.filter(x => x.evento === 'tentativa').length;
    const resultados = eventos.filter(x => x.evento === 'resultado' || x.evento === 'erro_transporte').length;
    if (tentadas !== resultados || (resposta.status === 'ok' && tentadas === 0) || fs.existsSync(stopCota)) parado = true;
    return { numero: n, status: resposta.status, falha: resposta.status === 'ok' ? null : resposta.falha, texto: resposta.status === 'ok' ? resposta.texto : null, versao_antes: estadoAntes.versao, versao_depois: resposta.estado?.versao, tentadas, resultados, parado, evidencia: `turno-${numero}-resumo.md` };
  } catch (e) {
    parado = true;
    try { salvar(`turno-${numero}-interrompido.json`, { em: new Date().toISOString(), numero: n, etapa: 'captura_ou_interface', latencia_ms: Date.now() - inicio, http: lerEventos().slice(eventosAntes), alerta: 'Não repetir automaticamente: verificar se o turno foi enviado.' }); } catch {}
    throw e;
  }
}
function bloquear(n, motivo) {
  const sessao = sessoes[sessaoIndex];
  assert(sessao && n === proximo && n >= sessao.inicio && n <= sessao.fim, 'Turno bloqueado fora da sequência.');
  assert(typeof motivo === 'string' && motivo.trim().length >= 8 && motivo.length <= 400, 'Motivo é obrigatório.');
  salvar(`turno-${String(n).padStart(2, '0')}-bloqueado.json`, { em: new Date().toISOString(), numero: n, sessao: sessao.letra, persona: sessao.persona, mensagem: mensagens[n - 1], motivo });
  proximo++;
  return { numero: n, status: 'bloqueado', motivo };
}
(async () => {
  if (fs.existsSync(controle) || fs.existsSync(stopCota) || lerEventos().some(x => x.evento === 'tentativa')) throw new Error('Há controle, cota ou tentativas prévias; não reutilizar.');
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  servidor = http.createServer((req, res) => {
    if (req.headers['x-controle-ensaio'] !== token || req.method !== 'POST') { res.writeHead(403); res.end(); return; }
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 4096) req.destroy(); });
    req.on('end', async () => {
      if (ocupado) { res.writeHead(409); res.end(); return; }
      ocupado = true;
      try {
        const b = JSON.parse(raw || '{}');
        let saida;
        if (req.url === '/sessao') saida = await abrirSessao(b.letra);
        else if (req.url === '/turno') saida = await enviar(b.numero);
        else if (req.url === '/bloquear') saida = bloquear(b.numero, b.motivo);
        else if (req.url === '/estado') saida = { sessao: sessoes[sessaoIndex]?.letra ?? null, proximo, parado, cota: fs.existsSync(stopCota) };
        else if (req.url === '/encerrar') { saida = { encerrado: true }; setImmediate(async () => { await browser.close(); servidor.close(); }); }
        else throw new Error('Comando desconhecido.');
        res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(saida));
      } catch { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ erro: 'Operação recusada ou interrompida; conferir evidências e não repetir automaticamente.' })); }
      finally { ocupado = false; }
    });
  });
  servidor.listen(0, '127.0.0.1', () => {
    fs.writeFileSync(controle, JSON.stringify({ porta: servidor.address().port, token }), { encoding: 'utf8', flag: 'wx' });
    console.log('Controle local iniciado; aguardando comandos da S1.');
  });
})().catch(() => { console.error('Não foi possível iniciar o controle local.'); process.exitCode = 1; });
