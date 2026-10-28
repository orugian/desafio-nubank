// Projeção de caixa (R-05 a R-12, R-22, R-23). Interno ao módulo caixa.

import {
  HOJE,
  textos,
  type AvisoCenario,
  type DataISO,
  type Estimativa,
  type Indicadores,
  type LinhaCenario,
  type Meio,
  type OrigemLinha,
  type PrimeiraFalta,
} from "@/contratos";

/** Evento datado da projeção (glossário). `cadastro` desempata a exibição (R-05). */
export type Evento = {
  id: string;
  data: DataISO;
  descricao: string;
  tipo: "saida" | "entrada";
  meio: Meio;
  origem: OrigemLinha;
  estimativa: Estimativa | null;
  previsto: boolean;
  valor_centavos: number;
  original: { data: DataISO; valor_centavos: number } | null;
  cadastro: number;
  /** Bloco de gasto estimado (R-21): não dispara ordem relevante (R-22). */
  bloco: boolean;
};

export type Projecao = {
  linhas: LinhaCenario[];
  indicadores: Indicadores;
  datas_ordem_relevante: DataISO[];
  avisos: AvisoCenario[];
};

function ordenar(eventos: Evento[], entradasPrimeiro: ReadonlySet<string>): Evento[] {
  const prioridade = (e: Evento) => {
    const saidaAntes = !entradasPrimeiro.has(e.data);
    return e.tipo === "saida" ? (saidaAntes ? 0 : 1) : saidaAntes ? 1 : 0;
  };
  return [...eventos].sort((a, b) =>
    a.data !== b.data ? (a.data < b.data ? -1 : 1) : prioridade(a) - prioridade(b) || a.cadastro - b.cadastro,
  );
}

type Basica = {
  linhas: LinhaCenario[];
  saldo_minimo: number;
  data_saldo_minimo: DataISO;
  primeira_falta: PrimeiraFalta | null;
  saldo_final: number;
};

function rotular(saldo: number): string | null {
  if (saldo === 0) return textos.rotulos.saldo_zerado;
  if (saldo < 0) return textos.rotulos.saldo_insuficiente(-saldo);
  return null;
}

function percorrer(eventos: Evento[], saldoInicial: number, entradasPrimeiro: ReadonlySet<string>): Basica {
  const ordenados = ordenar(eventos, entradasPrimeiro);
  let saldo = saldoInicial;
  let minimo = saldoInicial;
  let dataMinimo: DataISO = HOJE;
  const linhas: LinhaCenario[] = [];
  for (const e of ordenados) {
    saldo += e.tipo === "entrada" ? e.valor_centavos : -e.valor_centavos;
    if (saldo < minimo) {
      minimo = saldo;
      dataMinimo = e.data;
    }
    linhas.push({
      data: e.data,
      evento_id: e.id,
      descricao: e.descricao,
      tipo: e.tipo,
      meio: e.meio,
      origem: e.origem,
      estimativa: e.estimativa,
      previsto: e.previsto,
      valor_centavos: e.valor_centavos,
      saldo_apos_centavos: saldo,
      rotulo: rotular(saldo),
      original: e.original,
    });
  }

  // R-08: primeiro dia com saldo < 0 depois das saídas do dia.
  let primeira_falta: PrimeiraFalta | null = null;
  const dias = [...new Set(linhas.map((l) => l.data))];
  for (const dia of dias) {
    const doDia = linhas.filter((l) => l.data === dia);
    const saidas = doDia.filter((l) => l.tipo === "saida");
    if (saidas.length === 0) continue;
    const aposSaidas = saidas[saidas.length - 1].saldo_apos_centavos;
    if (aposSaidas < 0) {
      primeira_falta = { data: dia, valor_descoberto_centavos: -aposSaidas, saidas_do_dia: saidas.map((l) => l.evento_id) };
      break;
    }
  }

  return {
    linhas,
    saldo_minimo: minimo,
    data_saldo_minimo: dataMinimo,
    primeira_falta,
    saldo_final: linhas.length ? linhas[linhas.length - 1].saldo_apos_centavos : saldoInicial,
  };
}

/** R-22: dia com entrada e saída que não seja bloco, com saldo ≤ 0 depois das saídas (saídas antes). */
function datasOrdemRelevante(eventos: Evento[], saldoInicial: number, entradasPrimeiro: ReadonlySet<string>): DataISO[] {
  const { linhas } = percorrer(eventos, saldoInicial, new Set());
  const porId = new Map(eventos.map((e) => [e.id, e]));
  const dias = [...new Set(linhas.map((l) => l.data))];
  return dias.filter((dia) => {
    if (entradasPrimeiro.has(dia)) return false;
    const doDia = linhas.filter((l) => l.data === dia);
    const saidas = doDia.filter((l) => l.tipo === "saida");
    const temEntrada = doDia.some((l) => l.tipo === "entrada");
    const temSaidaReal = saidas.some((l) => !porId.get(l.evento_id)?.bloco);
    return temEntrada && temSaidaReal && saidas[saidas.length - 1].saldo_apos_centavos <= 0;
  });
}

export function projetar(eventos: Evento[], saldoInicial: number, entradasPrimeiro: ReadonlySet<string>): Projecao {
  const b = percorrer(eventos, saldoInicial, entradasPrimeiro);
  const insuficiencia = Math.max(0, -b.saldo_minimo);

  // R-12: só com entrada prevista na janela.
  const temPrevisto = eventos.some((e) => e.tipo === "entrada" && e.previsto);
  let sem_recebimentos: Indicadores["sem_recebimentos"] = null;
  if (temPrevisto) {
    const s = percorrer(
      eventos.filter((e) => !(e.tipo === "entrada" && e.previsto)),
      saldoInicial,
      entradasPrimeiro,
    );
    sem_recebimentos = {
      insuficiencia_centavos: Math.max(0, -s.saldo_minimo),
      primeira_falta: s.primeira_falta,
      saldo_final_centavos: s.saldo_final,
    };
  }

  const avisos: AvisoCenario[] = [];
  if (b.saldo_final > 0 && insuficiencia > 0) avisos.push("saldo_final_positivo_com_falta");
  if (sem_recebimentos) {
    if (insuficiencia === 0 && sem_recebimentos.insuficiencia_centavos > 0) avisos.push("cobertura_depende_de_recebimento");
    if (insuficiencia > 0 && insuficiencia < sem_recebimentos.insuficiencia_centavos) avisos.push("falta_maior_sem_recebimento");
  }

  return {
    linhas: b.linhas,
    indicadores: {
      saldo_inicial_centavos: saldoInicial,
      saldo_minimo_centavos: b.saldo_minimo,
      data_saldo_minimo: b.data_saldo_minimo,
      primeira_falta: b.primeira_falta,
      insuficiencia_centavos: insuficiencia,
      margem_hoje_centavos: Math.max(0, b.saldo_minimo),
      saldo_final_centavos: b.saldo_final,
      sem_recebimentos,
    },
    datas_ordem_relevante: datasOrdemRelevante(eventos, saldoInicial, entradasPrimeiro),
    avisos,
  };
}
