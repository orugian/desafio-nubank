// Verificação independente offline das evidências do ensaio 1; não chama provedor.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { criarExecutores } from '../src/conversa/executores';

const root = 'C:/Users/orugi/Documents/Projetos/salesforce/intern';
const pasta = join(root, 'coordenacao/ENSAIO-S1-EVIDENCIAS-20261029');
const mensagens = readFileSync(join(root, 'coordenacao/ENSAIO-S1.md'), 'utf8').split(/\r?\n/).filter(x => x.startsWith('> ')).map(x => x.slice(2));
const eventos = readFileSync(join(pasta, 'http-modelo.jsonl'), 'utf8').split('\n').filter(Boolean).map(x => JSON.parse(x));
const ex = criarExecutores();
const mesmas = (a: unknown, b: unknown) => isDeepStrictEqual(a, b);
const parteNegocio = (e: any) => ({ persona_id: e.persona_id, declaracoes: e.declaracoes, hipoteses: e.hipoteses, operacoes: e.operacoes, operacao_pendente: e.operacao_pendente, contadores: e.contadores });
const semFormato = (x: any) => { const { valores_formatados, ok, ...resto } = x; void valores_formatados; void ok; return resto; };
const resultados: any[] = [];
const alertas: string[] = [];
async function main() {
  if (mensagens.length !== 20) throw new Error('Contagem de mensagens incorreta.');
  let totalIncluido = 0;
  for (let n = 1; n <= 20; n++) {
    const nome = `turno-${String(n).padStart(2, '0')}.json`;
    const d = JSON.parse(readFileSync(join(pasta, nome), 'utf8'));
    const r = d.resposta;
    const checagens: Record<string, boolean> = {
      mensagem_original: d.mensagem === mensagens[n - 1],
      resposta_ok: r?.status === 'ok',
      texto_visivel: d.texto_visivel === true,
      versao_incrementada: r?.estado?.versao === d.estado_antes.versao + 1,
      persona_preservada: r?.estado?.persona_id === d.persona && d.estado_antes.persona_id === d.persona,
      http_emparelhado: d.http.filter((x: any) => x.evento === 'tentativa').length === d.http.filter((x: any) => ['resultado', 'erro_transporte'].includes(x.evento)).length,
    };
    totalIncluido += d.http.filter((x: any) => x.evento === 'tentativa').length;
    if (r?.status !== 'ok') { resultados.push({ numero: n, checagens }); continue; }
    const comps = r.cartoes.filter((c: any) => c.tipo === 'comparacao');
    if (comps.length) {
      const esperado = await ex.ferramentas.exibir_comparacao({}, { estado: r.estado, mensagem_id: null });
      checagens.cartoes_comparacao_contra_motor = esperado.ok && comps.every((c: any) => mesmas(c.cenarios, esperado.cartoes.find((t: any) => t.tipo === 'comparacao')?.cenarios));
    }
    if ([4, 8, 12, 13, 14, 18, 19, 20].includes(n)) checagens.negocio_sem_mutacao = mesmas(parteNegocio(d.estado_antes), parteNegocio(r.estado));
    if ([12, 13, 18].includes(n)) {
      const ferramenta = n === 12 ? 'consultar_historico' : 'consultar_investimentos';
      const item = r.rastro.find((x: any) => x.ferramenta === ferramenta);
      const direct = item ? await ex.ferramentas[ferramenta](item.argumentos, { estado: d.estado_antes, mensagem_id: null }) : null;
      checagens.consulta_contra_motor_mesmo_filtro = Boolean(direct?.ok && mesmas(semFormato(item.resultado), semFormato(direct.resultado)));
      const tipoCartao = n === 12 ? 'historico' : 'investimentos';
      checagens.cartao_contra_motor_mesmo_filtro = Boolean(direct?.ok && r.cartoes.some((c: any) => c.tipo === tipoCartao && mesmas(c, direct.cartoes.find((x: any) => x.tipo === tipoCartao))));
    }
    if (n === 6) {
      const direct = await ex.ferramentas.propor_movimentacao({ valor: '350', destino: 'INV9' }, { estado: d.estado_antes, mensagem_id: null });
      checagens.proposta_e_rendimento_contra_motor = Boolean(direct.ok && mesmas(r.cartoes.find((c: any) => c.tipo === 'operacao_pendente'), direct.cartoes.find((c: any) => c.tipo === 'operacao_pendente')));
    }
    if (n === 12) {
      const direct = await ex.ferramentas.consultar_historico({ de: '2026-10-01', ate: '2026-10-29', tipo: 'saida', categoria: 'delivery', agrupar_por: 'nenhum' }, { estado: d.estado_antes, mensagem_id: null });
      if (!direct.ok) throw new Error('Falha ao consultar o oráculo filtrado de outubro.');
      const efetivo = r.cartoes.find((c: any) => c.tipo === 'historico')?.resultado;
      const desejado = direct.resultado as any;
      const iguais = efetivo && efetivo.quantidade === desejado.quantidade && efetivo.total_saidas_centavos === desejado.total_saidas_centavos && mesmas(efetivo.itens, desejado.itens);
      checagens.historico_conforme_outubro_pedido = Boolean(iguais);
      alertas.push(`Turno 12: motor para outubro retorna ${desejado.quantidade} item(ns), ${desejado.total_saidas_centavos} centavos; cartão efetivo retorna ${efetivo?.quantidade} item(ns), ${efetivo?.total_saidas_centavos} centavos, no período ${efetivo?.de} a ${efetivo?.ate}.`);
    }
    if (n === 15) {
      const comparacao = r.cartoes.find((x: any) => x.tipo === 'comparacao');
      const atual = comparacao?.cenarios.find((x: any) => x.cenario_id === 'atual');
      const h = comparacao?.cenarios.find((x: any) => x.cenario_id === 'H1');
      checagens.caixa_inalterado_por_parcelamento = Boolean(atual && h && mesmas(atual.linhas, h.linhas));
      checagens.parcelas_exatas = Boolean(h && mesmas(h.faturas_afetadas.map((x: any) => [x.vencimento, x.total_depois_centavos - x.total_antes_centavos]), [['2026-12-05',15976],['2027-01-05',15975],['2027-02-05',15975],['2027-03-05',15975]]));
    }
    if ([14, 15, 16, 17].includes(n)) {
      const antes = await ex.montarVisao(d.estado_antes);
      const depois = await ex.montarVisao(r.estado);
      checagens.visao_cartao_inalterada = mesmas(antes.cartao, depois.cartao);
    }
    if (n === 18) {
      const c = r.cartoes.find((x: any) => x.tipo === 'investimentos')?.resultado;
      const inv6 = c?.posicoes.find((x: any) => x.posicao_id === 'INV6');
      const inv7 = c?.posicoes.find((x: any) => x.posicao_id === 'INV7');
      checagens.protecao_e_liquidez = Boolean(c?.ate_data === '2026-11-06' && inv6?.classificacao === 'protegida' && inv6.protegido_centavos === inv6.valor_atual_centavos && inv7?.classificacao === 'resgatavel_ate_data');
    }
    const falhas = Object.entries(checagens).filter(([, ok]) => !ok).map(([nome]) => nome);
    resultados.push({ numero: n, sessao: d.sessao, persona: d.persona, latencia_ms: d.latencia_ms, http_tentadas: d.http.filter((x: any) => x.evento === 'tentativa').length, falhas, checagens });
  }
  const starts = eventos.filter((x: any) => x.evento === 'tentativa');
  const ends = eventos.filter((x: any) => x.evento === 'resultado');
  const erros = eventos.filter((x: any) => x.evento === 'erro_transporte');
  const ids = starts.map((x: any) => x.id);
  const pareados = starts.every((x: any) => [...ends, ...erros].filter((e: any) => e.id === x.id).length === 1);
  const latencias = resultados.map(x => x.latencia_ms).sort((a, b) => a - b);
  const relatorio = {
    versao: 'auditoria-offline-2-comparacao-simetrica', mensagens: resultados.length, resultados,
    http: { tentadas: starts.length, sucesso_http_2xx: ends.filter((x: any) => x.status >= 200 && x.status < 300).length, falhas_http: ends.filter((x: any) => x.status < 200 || x.status >= 300).length, erros_transporte: erros.length, ids_unicos: new Set(ids).size === ids.length, pareados, contadas_nos_turnos: totalIncluido, chamadas_externas_nao_autorizadas_bloqueadas: eventos.filter((x: any) => x.evento === 'rede_bloqueada').length },
    latencia_ms: { minimo: latencias[0], mediana: (latencias[9] + latencias[10]) / 2, maximo: latencias.at(-1) },
    alertas,
    observacao: 'Verificações mecânicas selecionadas; a classificação final exige revisão semântica humana dos textos e dos critérios de cada turno.',
  };
  writeFileSync(join(pasta, 'auditoria-offline-revisada.json'), JSON.stringify(relatorio, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  console.log(JSON.stringify({ turnos: resultados.length, http: relatorio.http, latencia_ms: relatorio.latencia_ms, falhas_mecanicas: resultados.filter(x => x.falhas?.length).map(x => ({ numero: x.numero, falhas: x.falhas })), alertas }, null, 2));
}
main().catch(() => { console.error('Auditoria offline interrompida; conferir diagnóstico sem reenviar mensagens.'); process.exitCode = 1; });
