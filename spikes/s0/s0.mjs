// Spike descartável: sem SDK, sem leitura do arquivo de segredos, sem cabeçalhos gravados.
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const base = dirname(fileURLToPath(import.meta.url));
const respostas = join(base, 'respostas');
await mkdir(respostas, { recursive: true });
const provedores = {
  nvidia: { url: 'https://integrate.api.nvidia.com/v1', key: process.env.NVIDIA_API_KEY, limite: 40 },
  // Rodada adicional de 5 casos autorizada pelo responsável: 11 anteriores + 5 = 16.
  openrouter: { url: 'https://openrouter.ai/api/v1', key: process.env.OPENROUTER_API_KEY, limite: 16 },
};
const secretos = [process.env.NVIDIA_API_KEY, process.env.OPENROUTER_API_KEY, process.env.BRAPI_TOKEN, process.env.COINGECKO_API_KEY, process.env.CODIGO_ACESSO].filter(v => v && v.length > 5);
function seguro(texto) { for (const v of secretos) texto = texto.split(v).join('[SEGREDO REMOVIDO]'); return texto; }
async function gravar(nome, valor) { await writeFile(join(respostas, nome), seguro(JSON.stringify(valor, null, 2)) + '\n', 'utf8'); }
const modo = process.argv[2] ?? 'listar';
const slug = s => s.replaceAll(/[^a-zA-Z0-9_.-]/g, '_');

if (modo === 'listar') {
  for (const [nome, p] of Object.entries(provedores)) {
    if (!p.key) { console.log(`${nome}: chave ausente (não exibida)`); continue; }
    try {
      const r = await fetch(`${p.url}/models`, { headers: { Authorization: `Bearer ${p.key}` }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) {
        await gravar(`${nome}-modelos-erro.json`, { status: r.status, tipo: [401, 403].includes(r.status) ? 'chave recusada' : 'falha na listagem' });
        console.log(`${nome}: ${[401, 403].includes(r.status) ? 'chave recusada' : `HTTP ${r.status}`}`);
        if ([401, 403].includes(r.status)) process.exitCode = 2;
        continue;
      }
      const body = await r.json();
      await gravar(`${nome}-modelos.json`, body);
      const modelos = (body.data ?? []).filter(m => nome === 'nvidia' || (m.id.endsWith(':free') && m.supported_parameters?.includes('tools')));
      for (const m of modelos) console.log(`${nome}: ${m.id}${m.name ? ` | ${m.name}` : ''}`);
    } catch { console.log(`${nome}: falha de rede ou tempo na listagem (detalhes omitidos)`); process.exitCode = 3; }
  }
} else if (modo === 'avaliar') {
  const nome = process.argv[3];
  const modelo = process.argv[4];
  const p = provedores[nome];
  if (!p || !modelo || !p.key) throw new Error('Provedor/modelo inválido ou chave ausente; nenhum segredo exibido.');
  const { ferramentas, instrucoes, contexto, casos, avaliar } = await import('./material.mjs');
  const arquivos = await readdir(respostas);
  const feitos = arquivos.filter(f => f.startsWith('medicao-')).map(async f => JSON.parse(await readFile(join(respostas, f), 'utf8')));
  const medicoes = await Promise.all(feitos);
  // Neste spike há uma listagem efetiva gravada por provedor; incluí-la no total.
  const listagens = arquivos.includes(`${nome}-modelos.json`) ? 1 : 0;
  const usados = medicoes.filter(x => x.provedor === nome).length + listagens;
  if (usados + casos.length > p.limite) throw new Error('Teto de requisições do spike seria excedido.');
  for (const caso of casos) {
    const id = `${nome}-${slug(modelo)}-${caso.id}`;
    if (arquivos.includes(`medicao-${id}.json`)) throw new Error('Avaliação já registrada; não sobrescrever nem duplicar chamadas.');
    const inicio = performance.now();
    let status = null;
    let bruto;
    let tipoErro = null;
    let correto = false;
    try {
      const r = await fetch(`${p.url}/chat/completions`, {
        method: 'POST', headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelo, temperature: 0, max_tokens: 700, stream: false, ...(modelo === 'minimaxai/minimax-m3.1-flash' ? { chat_template_kwargs: { reasoning_effort: 'low' } } : {}), ...(modelo === 'deepseek-ai/deepseek-v4.1-flash' ? { reasoning_effort: 1 } : {}), ...(modelo === 'nvidia/nemotron-3.5-lightning-30b-a3b' ? { reasoning_budget: 0 } : {}), ...(nome === 'openrouter' ? { reasoning: { enabled: false } } : {}), messages: [
          { role: 'system', content: `${instrucoes}\nContexto determinístico da persona:\n${JSON.stringify(contexto)}` }, { role: 'user', content: caso.texto },
        ], tools: ferramentas, tool_choice: 'auto' }), signal: AbortSignal.timeout(20000),
      });
      status = r.status;
      if (!r.ok) {
        tipoErro = [401, 403].includes(status) ? 'chave recusada' : status === 402 ? 'pagamento exigido' : status === 429 ? '429' : status >= 500 ? '5xx' : `HTTP ${status}`;
        // Não persistir corpo bruto de falha: pode incluir dados de autenticação ou infraestrutura.
        bruto = { status, erro: tipoErro, corpo_omitido: true };
      } else {
        const texto = await r.text();
        try { bruto = JSON.parse(texto); } catch { tipoErro = 'formato'; bruto = { erro: 'formato', corpo_omitido: true }; }
        if (!tipoErro) {
          const resultado = avaliar(caso.id, bruto);
          correto = resultado.correto;
          tipoErro = resultado.formatoInvalido ? 'formato' : null;
        }
      }
    } catch { tipoErro = 'timeout/rede'; bruto = { erro: tipoErro, corpo_omitido: true }; }
    const latencia_ms = Math.round(performance.now() - inicio);
    await gravar(`${id}.json`, bruto);
    await gravar(`medicao-${id}.json`, { provedor: nome, modelo, caso: caso.id, status, latencia_ms, correto, erro: tipoErro, obtido_em: new Date().toISOString() });
    console.log(`${nome} | ${modelo} | ${caso.id} | ${correto ? 'acerto' : 'não passou'} | ${latencia_ms}ms | ${tipoErro ?? 'sem erro técnico'}`);
    if (tipoErro === 'chave recusada' || tipoErro === 'pagamento exigido') { process.exitCode = tipoErro === 'chave recusada' ? 2 : 4; break; }
  }
} else { throw new Error('Modo esperado: listar ou avaliar.'); }
