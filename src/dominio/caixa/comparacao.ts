// R-24: alterações do turno e diferenças de indicadores por cenário. Interno ao módulo caixa.

import {
  INDICADORES_COMPARADOS,
  formatarDiaMes,
  formatarReais,
  type Declaracao,
  type EntradaComparacao,
  type OQueMudou,
  type ResultadoCenario,
} from "@/contratos";

type Indicador = (typeof INDICADORES_COMPARADOS)[number];
type Valor = number | string | null;

function valores(c: ResultadoCenario): Record<Indicador, Valor> {
  const i = c.indicadores;
  return {
    status: c.status,
    saldo_minimo_centavos: i?.saldo_minimo_centavos ?? null,
    data_saldo_minimo: i?.data_saldo_minimo ?? null,
    primeira_falta_data: i?.primeira_falta?.data ?? null,
    primeira_falta_valor_centavos: i?.primeira_falta?.valor_descoberto_centavos ?? null,
    insuficiencia_centavos: i?.insuficiencia_centavos ?? null,
    margem_hoje_centavos: i?.margem_hoje_centavos ?? null,
    saldo_final_centavos: i?.saldo_final_centavos ?? null,
    sem_recebimentos_insuficiencia_centavos: i?.sem_recebimentos?.insuficiencia_centavos ?? null,
    sem_recebimentos_saldo_final_centavos: i?.sem_recebimentos?.saldo_final_centavos ?? null,
  };
}

function descreverDeclaracao(d: Declaracao, antes: ResultadoCenario | undefined, depois: ResultadoCenario | undefined): string {
  const a = d.alteracao;
  if (a.operacao === "alterar_evento") {
    const velha = antes?.linhas.find((l) => l.evento_id === a.evento_id);
    const nova = depois?.linhas.find((l) => l.evento_id === a.evento_id);
    const nome = `${velha?.descricao ?? nova?.descricao ?? a.evento_id} (${a.evento_id})`;
    const partes: string[] = [];
    if (a.data !== undefined) partes.push(`${velha ? formatarDiaMes(velha.data) : "?"} → ${formatarDiaMes(a.data)}`);
    if (a.valor !== undefined && velha && nova) partes.push(`${formatarReais(velha.valor_centavos)} → ${formatarReais(nova.valor_centavos)}`);
    const quando = a.data === undefined && velha ? ` em ${formatarDiaMes(velha.data)}` : "";
    return `${nome}${quando}: ${partes.join("; ")}`;
  }
  if (a.operacao === "remover_evento") {
    const velha = antes?.linhas.find((l) => l.evento_id === a.evento_id);
    return `${velha?.descricao ?? a.evento_id} (${a.evento_id}) removido`;
  }
  if (a.operacao === "adicionar_evento") {
    const nova = depois?.linhas.find((l) => l.evento_id === d.id);
    const valor = nova ? formatarReais(nova.valor_centavos) : a.valor;
    return `${a.descricao} (${d.id}): ${a.tipo === "saida" ? "saída" : "entrada"} de ${valor} em ${formatarDiaMes(a.data)}`;
  }
  if (a.operacao === "definir_ordem_no_dia") return `Em ${formatarDiaMes(a.data)}, entradas antes das saídas`;
  if (a.operacao === "alterar_gasto_diario") return `Gasto diário estimado: R$ ${a.valor_por_dia.replace(".", ",")} por dia`;
  return d.id;
}

export function comparar(antes: EntradaComparacao, depois: EntradaComparacao): OQueMudou {
  const alteracoes: OQueMudou["alteracoes"] = [];
  const atualAntes = antes.cenarios.find((c) => c.cenario_id === "atual");
  const atualDepois = depois.cenarios.find((c) => c.cenario_id === "atual");
  const idsAntes = new Set(antes.estado.declaracoes.map((d) => d.id));
  const idsDepois = new Set(depois.estado.declaracoes.map((d) => d.id));
  for (const d of depois.estado.declaracoes) {
    if (!idsAntes.has(d.id)) alteracoes.push({ tipo: "declaracao_registrada", id: d.id, descricao: descreverDeclaracao(d, atualAntes, atualDepois) });
  }
  for (const d of antes.estado.declaracoes) {
    if (!idsDepois.has(d.id)) alteracoes.push({ tipo: "declaracao_desfeita", id: d.id, descricao: descreverDeclaracao(d, atualDepois, atualAntes) });
  }
  const hipAntes = new Set(antes.estado.hipoteses.map((h) => h.id));
  const hipDepois = new Set(depois.estado.hipoteses.map((h) => h.id));
  for (const h of depois.estado.hipoteses) {
    if (!hipAntes.has(h.id)) alteracoes.push({ tipo: "hipotese_criada", id: h.id, descricao: h.nome });
  }
  for (const h of antes.estado.hipoteses) {
    if (!hipDepois.has(h.id)) alteracoes.push({ tipo: "hipotese_desfeita", id: h.id, descricao: h.nome });
  }

  const porIdAntes = new Map(antes.cenarios.map((c) => [c.cenario_id, c]));
  const porIdDepois = new Map(depois.cenarios.map((c) => [c.cenario_id, c]));
  const cenarios: OQueMudou["cenarios"] = [];
  for (const c of depois.cenarios) {
    const velho = porIdAntes.get(c.cenario_id);
    if (!velho) {
      cenarios.push({ cenario_id: c.cenario_id, nome: c.nome, situacao: "novo", diferencas: [] });
      continue;
    }
    const va = valores(velho);
    const vd = valores(c);
    const diferencas = INDICADORES_COMPARADOS.filter((k) => va[k] !== vd[k]).map((k) => ({ indicador: k, antes: va[k], depois: vd[k] }));
    cenarios.push({ cenario_id: c.cenario_id, nome: c.nome, situacao: diferencas.length ? "alterado" : "inalterado", diferencas });
  }
  for (const c of antes.cenarios) {
    if (!porIdDepois.has(c.cenario_id)) cenarios.push({ cenario_id: c.cenario_id, nome: c.nome, situacao: "removido", diferencas: [] });
  }
  return { alteracoes, cenarios };
}
