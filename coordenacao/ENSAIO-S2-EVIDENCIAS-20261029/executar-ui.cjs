// Executa o ensaio pela UI isolada, sem roteiro de respostas e com evidências incrementais.
// EN S2_TESTE=1 é pré-voo totalmente simulado; a execução real exige instrumentação.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(path.join(process.cwd(), 'node_modules', '@playwright', 'test'));
const pasta = __dirname;
const raiz = path.resolve(process.cwd(), '..');
const roteiroPath = path.join(raiz, 'coordenacao', 'ENSAIO-S2.md');
const simulado = process.env.ENSAIO_S2_TESTE === '1';
const prefixo = simulado ? 'prevoo' : 'real';
const log = process.env.ENSAIO_S2_LOG;
const parada = process.env.ENSAIO_S2_PARADA;
if (!log || !parada) throw new Error('Instrumentação não configurada.');
function gravar(nome, dado) {
  fs.writeFileSync(path.join(pasta, nome), JSON.stringify(dado, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
}
function eventos() {
  if (!fs.existsSync(log)) return [];
  return fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s));
}
function tentativas() { return eventos().filter((e) => e.tipo === 'tentativa'); }
function dadosDeNegocio(s) {
  if (!s) return null;
  const c = structuredClone(s);
  delete c.conversa; delete c.versao; delete c.mensagens_processadas;
  return c;
}
function hipotese(res, operacao) {
  return res?.status === 'ok' && res.estado.hipoteses.some((h) => h.alteracoes.some((a) => a.alteracao?.operacao === operacao || a.operacao === operacao));
}
function negocioInalterado(turno) {
  return turno?.resposta?.status === 'ok' && JSON.stringify(dadosDeNegocio(turno.estado_entrada)) === JSON.stringify(dadosDeNegocio(turno.resposta.estado));
}
function precondicao(n, dados) {
  const t = (i) => dados.find((x) => x.numero === i);
  if (n === 2 && !hipotese(t(1)?.resposta, 'separar')) return 'Mensagem 1 não criou a hipótese de separação necessária.';
  if (n === 3) {
    const r = t(2)?.resposta; const p = r?.estado?.operacao_pendente;
    if (!(r?.status === 'ok' && p?.destino === 'INV9' && p?.valor_centavos === 12500 && r.estado.operacoes.length === 0)) return 'Mensagem 2 não deixou a proposta correta pendente.';
  }
  if (n === 4) {
    const r = t(3)?.resposta;
    if (!(r?.status === 'ok' && r.estado.operacoes.length === 1 && r.estado.operacoes[0].destino === 'INV9' && r.estado.operacoes[0].valor_centavos === 12500)) return 'Mensagem 3 não confirmou a operação esperada exatamente uma vez.';
  }
  if (n === 7 && !hipotese(t(6)?.resposta, 'alterar_gasto_diario')) return 'Mensagem 6 não criou a hipótese de gasto diário.';
  if (n === 12 && !hipotese(t(11)?.resposta, 'adicionar_evento')) return 'Mensagem 11 não criou a hipótese da compra parcelada.';
  if (n === 16) {
    const v = t(15); const texto = v?.resposta?.texto || '';
    if (!(v?.resposta?.status === 'ok' && negocioInalterado(v) && /(?:meio|forma|como).{0,55}(?:pag|débito|pix|cartão)|(?:pagamento|pagaria|pagar).{0,50}(?:pix|débito|cartão|meio|forma)/i.test(texto))) return 'Mensagem 15 não deixou uma pergunta verificável sobre meio e negócio inalterado.';
  }
  return null;
}
async function escolherPersona(page, pessoa, reiniciar) {
  if (reiniciar) {
    const dialogo = page.getByRole('dialog', { name: /Chat NewAI/i });
    if (await dialogo.isVisible().catch(() => false)) await dialogo.getByRole('button', { name: /Fechar chat/i }).click();
    const [reset] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/sessao') && r.request().method() === 'POST', { timeout: 30000 }),
      page.getByRole('button', { name: 'Recomeçar', exact: true }).click(),
    ]);
    const rr = await reset.json();
    if (rr.status !== 'ok' || rr.estado.versao !== 0) throw new Error('Reset de sessão anterior falhou.');
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('newai_sessao_v1') || 'null')?.estado?.versao === 0);
    await page.getByRole('button', { name: 'Trocar persona' }).click();
  }
  const [respHttp] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/sessao') && r.request().method() === 'POST', { timeout: 30000 }),
    page.getByRole('button', { name: new RegExp('^' + pessoa + ' \\(fictíci[ao]\\)', 'i') }).click(),
  ]);
  const res = await respHttp.json();
  if (res.status !== 'ok' || res.config.provedor !== 'openrouter' || res.config.modelo !== 'deepseek/deepseek-v4.1-flash-1017' || res.estado.versao !== 0) throw new Error('Sessão/configuração não corresponde ao provedor/modelo/base esperados.');
  await page.waitForFunction((id) => JSON.parse(sessionStorage.getItem('newai_sessao_v1') || 'null')?.estado?.persona_id === id, res.estado.persona_id);
  await page.getByRole('button', { name: /NewAI/i }).click();
  await page.getByRole('dialog', { name: /Chat NewAI/i }).waitFor({ state: 'visible', timeout: 30000 });
  return { persona_id: res.estado.persona_id, estado_inicial: res.estado, visao_inicial: res.visao, provedor: res.config.provedor, modelo: res.config.modelo };
}
async function enviar(page, numero, texto) {
  const dialogo = page.getByRole('dialog', { name: /Chat NewAI/i });
  const input = dialogo.getByPlaceholder('Digite sua mensagem...');
  await input.waitFor({ state: 'visible', timeout: 30000 });
  await input.fill(texto);
  const antes = tentativas().length;
  const inicio = Date.now();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/turno') && r.request().method() === 'POST', { timeout: 120000 }),
    dialogo.getByRole('button', { name: /Enviar mensagem/i }).click(),
  ]);
  const request = response.request().postDataJSON();
  const resposta = await response.json();
  const item = { numero, mensagem: texto, tempo_ms: Date.now() - inicio, estado_entrada: request.estado, resposta, chamadas_antes: antes, chamadas_depois: tentativas().length };
  gravar(`${prefixo}-turno-${String(numero).padStart(2, '0')}.json`, item);
  if (resposta.status === 'ok') await page.waitForFunction((v) => JSON.parse(sessionStorage.getItem('newai_sessao_v1') || 'null')?.estado?.versao === v, resposta.estado.versao, { timeout: 30000 });
  await input.waitFor({ state: 'visible', timeout: 30000 });
  return item;
}
async function principal() {
  const fonte = fs.readFileSync(roteiroPath, 'utf8');
  const textos = [...fonte.matchAll(/^> (.+)$/gm)].map((m) => m[1].trim());
  if (textos.length !== 20) throw new Error(`Quantidade inesperada de mensagens: ${textos.length}.`);
  const hash = crypto.createHash('sha256').update(fonte).digest('hex');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const page = await context.newPage();
  const inicioSessao = process.env.ENSAIO_S2_INICIO_SESSAO || 'A';
  const dados = [];
  if (!simulado && inicioSessao !== 'A') {
    for (let n = 1; n <= 20; n++) {
      const nome = path.join(pasta, `real-turno-${String(n).padStart(2, '0')}.json`);
      if (fs.existsSync(nome)) dados.push(JSON.parse(fs.readFileSync(nome, 'utf8')));
    }
  }
  const sessoes = [];
  let motivoParada = null;
  try {
    await page.goto('http://127.0.0.1:3102/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (simulado) {
      const sessao = await escolherPersona(page, 'Bia', false);
      const retorno = await enviar(page, 0, 'Olá, este é um pré-voo técnico sem dados reais.');
      if (retorno.resposta.status !== 'ok' || tentativas().length !== 1 || !retorno.resposta.texto.includes('Pré-voo simulado')) throw new Error('Pré-voo não comprovou UI, configuração e instrumentação.');
      gravar('prevoo-resultado.json', { status: 'ok', provedor: sessao.provedor, modelo: sessao.modelo, chamadas_simuladas: tentativas().length, chamadas_reais: 0 });
      console.log('Pré-voo concluído: UI/API e instrumentação com provedor simulado; 0 chamadas reais.');
      return;
    }
    const todosPlanos = [{ letra:'A', pessoa:'Bia', inicio:1, fim:5 }, { letra:'B', pessoa:'Caio', inicio:6, fim:10 }, { letra:'C', pessoa:'Duda', inicio:11, fim:14 }, { letra:'D', pessoa:'Bia', inicio:15, fim:17 }, { letra:'E', pessoa:'Duda', inicio:18, fim:20 }];
    const iInicio = todosPlanos.findIndex((p) => p.letra === inicioSessao);
    if (iInicio < 0) throw new Error('Sessão de retomada inválida.');
    const planos = todosPlanos.slice(iInicio);
    for (let s = 0; s < planos.length; s++) {
      if (motivoParada || fs.existsSync(parada)) break;
      const plano = planos[s];
      const info = await escolherPersona(page, plano.pessoa, s > 0);
      sessoes.push({ ...plano, ...info });
      gravar(`real-sessao-${plano.letra}.json`, sessoes.at(-1));
      console.log(`Sessão ${plano.letra}/${info.persona_id} iniciada na versão zero.`);
      for (let n = plano.inicio; n <= plano.fim; n++) {
        if (dados.some((x) => x.numero === n)) throw new Error(`Turno ${n} já foi registrado; não repetir.`);
        if (fs.existsSync(parada)) { motivoParada = 'cota/429'; break; }
        const motivo = precondicao(n, dados);
        if (motivo) {
          const bloqueado = { numero: n, mensagem: textos[n-1], status: 'bloqueado', motivo };
          dados.push(bloqueado); gravar(`real-turno-${String(n).padStart(2, '0')}.json`, bloqueado);
          console.log(`Mensagem ${n}: bloqueada por pré-condição.`); continue;
        }
        const item = await enviar(page, n, textos[n-1]); dados.push(item);
        console.log(`Mensagem ${n}: status ${item.resposta.status}, chamadas ${item.chamadas_depois-item.chamadas_antes}.`);
        if (n === 1 && item.chamadas_depois === 0) { motivoParada = 'instrumentação não observou chamadas reais'; break; }
        if (item.resposta.status !== 'ok') { motivoParada = `falha técnica/domínio ${item.resposta.falha?.codigo || 'não classificada'}`; break; }
      }
    }
  } catch (e) {
    motivoParada = e instanceof Error ? e.message : 'Erro não classificado';
    console.log(`Execução interrompida: ${motivoParada}`);
    process.exitCode = 1;
  } finally {
    if (!simulado) gravar(`real-manifesto-${inicioSessao}.json`, { encerrado: new Date().toISOString(), roteiro_sha256: hash, provedor:'openrouter', modelo:'deepseek/deepseek-v4.1-flash-1017', sessoes, itens_registrados: dados.map((x) => x.numero), motivo_parada: motivoParada, tentativas_http: tentativas().length, parada_por_cota: fs.existsSync(parada) });
    await context.close(); await browser.close();
  }
  if (motivoParada) process.exitCode = 1;
}
principal().catch((e) => { console.error('Falha antes da execução:', e instanceof Error ? e.message : 'erro não classificado'); process.exitCode = 1; });
