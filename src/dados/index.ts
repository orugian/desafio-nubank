// Personas (spec §6.1 `dados`). B0: só a P1 mínima; o B2 troca pelas personas geradas.

import Decimal from "decimal.js";
import {
  CATEGORIAS_VARIAVEIS,
  DIAS_HISTORICO,
  FIM_HISTORICO,
  FIM_JANELA,
  HOJE,
  INICIO_HISTORICO,
  erro,
  esquemaPersona,
  esquemaSerieFechamentos,
  type Persona,
  type ResultadoDominio,
  type ResumoPersona,
} from "@/contratos";
import btcBruto from "../../dados/mercado/fechamentos-BTC.json";
import petr4Bruto from "../../dados/mercado/fechamentos-PETR4.json";
import p1 from "../../dados/personas/p1.json";
import p2 from "../../dados/personas/p2.json";
import p3 from "../../dados/personas/p3.json";

const BRUTAS: Record<string, unknown> = { p1, p2, p3 };

const SERIES_FECHAMENTOS: Record<string, Map<string, number>> = {
  PETR4: new Map(esquemaSerieFechamentos.parse(petr4Bruto).serie.map((x) => [x.data, x.preco_centavos])),
  BTC: new Map(esquemaSerieFechamentos.parse(btcBruto).serie.map((x) => [x.data, x.preco_centavos])),
};

// C-02: compra com data < fechamento do mês vai para a fatura que fecha nesse
// dia; data ≥ fechamento, para a seguinte. Fechamento no último dia em meses
// mais curtos; vencimento no mês seguinte ao fechamento.
function diaNoMes(ano: number, mes: number, dia: number): string {
  const ultimo = [31, ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
  return `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}
function somarMeses(data: string, n: number): string {
  const [a, m, d] = data.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return diaNoMes(Math.floor(total / 12), (total % 12) + 1, d);
}
function vencimentoDaCompra(data: string, diaFechamento: number, diaVencimento: number): string {
  const [a, m] = data.split("-").map(Number);
  const fechamentoDoMes = diaNoMes(a, m, diaFechamento);
  const mesFechamento = data < fechamentoDoMes ? `${a}-${String(m).padStart(2, "0")}-01` : somarMeses(`${a}-${String(m).padStart(2, "0")}-01`, 1);
  const vencimentoBase = somarMeses(mesFechamento, 1);
  return diaNoMes(Number(vencimentoBase.slice(0, 4)), Number(vencimentoBase.slice(5, 7)), diaVencimento);
}

export function listarPersonas(): ResumoPersona[] {
  return Object.values(BRUTAS).map((b) => {
    const p = b as Persona;
    return { id: p.id, nome: p.nome, resumo: p.resumo };
  });
}

export type ViolacaoInvariante = { invariante: number; mensagem: string };

/** Invariante 10: valores das conversas de teste, em centavos. */
export const VALORES_RESERVADOS_CENTAVOS = [300, 500, 800, 1000, 1400, 2000, 2100, 5000].map((r) => r * 100);

/**
 * Invariantes da spec §4.2 aplicáveis aos dados presentes. Recebe o JSON bruto:
 * o esquema estrito cobre o invariante 11 (campos proibidos). Usado no
 * carregamento e pelo gerador de personas (B2).
 */
export function verificarInvariantes(bruta: unknown): ViolacaoInvariante[] {
  const r = esquemaPersona.safeParse(bruta);
  if (!r.success) {
    return r.error.issues.map((i) => ({ invariante: 11, mensagem: `${i.path.join(".")}: ${i.message}` }));
  }
  const p = r.data;
  const v: ViolacaoInvariante[] = [];

  // 1. Identificadores únicos.
  const ids = [
    ...p.historico.map((l) => l.id),
    ...p.compromissos.map((c) => c.id),
    ...(p.cartao?.faturas.map((f) => f.id) ?? []),
    ...(p.cartao?.parcelamentos.map((x) => x.id) ?? []),
    ...p.posicoes.map((x) => x.id),
  ];
  const vistos = new Set<string>();
  for (const id of ids) {
    if (vistos.has(id)) v.push({ invariante: 1, mensagem: `id repetido: ${id}` });
    vistos.add(id);
  }

  // 2. saldo_30_07 + lançamentos de conta (sem compras no cartão) = saldo no início de hoje.
  const movimento = p.historico
    .filter((l) => l.meio !== "cartao_credito")
    .reduce((s, l) => s + (l.tipo === "entrada" ? l.valor_centavos : -l.valor_centavos), 0);
  if (p.conta.saldo_30_07_centavos + movimento !== p.conta.saldo_inicio_hoje_centavos) {
    v.push({
      invariante: 2,
      mensagem: `saldo 30/07 ${p.conta.saldo_30_07_centavos} + movimento ${movimento} ≠ saldo hoje ${p.conta.saldo_inicio_hoje_centavos}`,
    });
  }

  // 3. Valor de cada fatura = soma dos itens. Itens de cada ciclo = compras no cartão do ciclo (C-02) + parcelas do ciclo.
  //    Cada fatura paga uma vez no vencimento com débito em conta. Nenhuma compra em duas faturas.
  const lancamentosEmFatura = new Set<string>();
  for (const f of p.cartao?.faturas ?? []) {
    const soma = f.itens.reduce((s, i) => s + i.valor_centavos, 0);
    if (soma !== f.valor_centavos) {
      v.push({ invariante: 3, mensagem: `fatura ${f.id}: valor ${f.valor_centavos} ≠ soma dos itens ${soma}` });
    }
    for (const item of f.itens) {
      if (item.lancamento_id) {
        if (lancamentosEmFatura.has(item.lancamento_id)) {
          v.push({ invariante: 3, mensagem: `compra ${item.lancamento_id} repetida em mais de uma fatura` });
        }
        lancamentosEmFatura.add(item.lancamento_id);
      }
    }
    if (p.historico.length > 0 && f.status === "fechada" && f.vencimento >= INICIO_HISTORICO && f.vencimento <= FIM_HISTORICO) {
      const pagamentos = p.historico.filter((l) => l.fatura_id === f.id);
      if (
        pagamentos.length !== 1 ||
        pagamentos[0].data !== f.vencimento ||
        pagamentos[0].meio !== "debito" ||
        pagamentos[0].valor_centavos !== f.valor_centavos
      ) {
        v.push({ invariante: 3, mensagem: `fatura ${f.id}: pagamento no vencimento incoerente no histórico` });
      }
    }
  }
  if (p.cartao && p.historico.length > 0) {
    for (const l of p.historico) {
      if (l.meio !== "cartao_credito") continue;
      const vencimento = vencimentoDaCompra(l.data, p.cartao.dia_fechamento, p.cartao.dia_vencimento);
      const fatura = p.cartao.faturas.find((f) => f.vencimento === vencimento);
      const item = fatura?.itens.find((i) => i.lancamento_id === l.id);
      const valorEsperado = l.parcelamento_id
        ? (() => {
            const pc = p.cartao!.parcelamentos.find((x) => x.id === l.parcelamento_id);
            if (!pc) return -1;
            const base = Math.floor(pc.valor_total_centavos / pc.parcelas);
            return pc.valor_total_centavos - base * (pc.parcelas - 1);
          })()
        : l.valor_centavos;
      if (!fatura || !item || item.valor_centavos !== valorEsperado) {
        v.push({ invariante: 3, mensagem: `compra no cartão ${l.id} sem item correspondente na fatura de ${vencimento}` });
      }
    }
  }

  // 4. Parcelas coerentes com C-03; compra anterior a 30/07 marcada.
  for (const pc of p.cartao?.parcelamentos ?? []) {
    if ((pc.data_compra < INICIO_HISTORICO) !== pc.anterior_ao_historico) {
      v.push({ invariante: 4, mensagem: `parcelamento ${pc.id}: anterior_ao_historico incoerente com ${pc.data_compra}` });
    }
  }
  for (const f of p.cartao?.faturas ?? []) {
    for (const item of f.itens) {
      if (!item.parcelamento_id) continue;
      const pc = p.cartao!.parcelamentos.find((x) => x.id === item.parcelamento_id);
      const m = /^(\d+)\/(\d+)$/.exec(item.parcela ?? "");
      if (!pc || !m) {
        v.push({ invariante: 4, mensagem: `fatura ${f.id}: parcela sem parcelamento ou rótulo` });
        continue;
      }
      const k = Number(m[1]);
      const n = Number(m[2]);
      const base = Math.floor(pc.valor_total_centavos / pc.parcelas);
      const esperado = k === 1 ? pc.valor_total_centavos - base * (pc.parcelas - 1) : base;
      const vencimento = somarMeses(vencimentoDaCompra(pc.data_compra, p.cartao!.dia_fechamento, p.cartao!.dia_vencimento), k - 1);
      if (n !== pc.parcelas || item.valor_centavos !== esperado || vencimento !== f.vencimento) {
        v.push({ invariante: 4, mensagem: `fatura ${f.id}: parcela ${item.parcela} de ${pc.id} incoerente com C-03` });
      }
    }
  }

  // 5. Cada compromisso recorrente tem ocorrências no histórico coerentes em valor e dia (quando há histórico).
  if (p.historico.length > 0) {
    for (const c of p.compromissos) {
      if (!c.recorrente) continue;
      const ocorrencias = p.historico.filter((l) => l.recorrencia_id === c.id);
      if (ocorrencias.length < 3) {
        v.push({ invariante: 5, mensagem: `compromisso recorrente ${c.id} com menos de 3 ocorrências no histórico` });
        continue;
      }
      const diaComp = Number(c.data.slice(8, 10));
      for (const oc of ocorrencias) {
        const diaOc = Number(oc.data.slice(8, 10));
        const diaCoerente = diaOc === diaComp || (diaComp === 19 && diaOc === 20);
        const valorCoerente = c.estimativa !== null || oc.valor_centavos === c.valor_centavos;
        if (!diaCoerente || !valorCoerente || oc.tipo !== c.tipo) {
          v.push({ invariante: 5, mensagem: `ocorrência ${oc.id} de ${c.id} incoerente em dia ou valor` });
        }
      }
    }
  }

  // 6. gasto_diario = teto(saídas variáveis por Pix ou débito no histórico / 92).
  const variaveis: readonly string[] = CATEGORIAS_VARIAVEIS;
  const totalVariavel = p.historico
    .filter((l) => l.tipo === "saida" && (l.meio === "pix" || l.meio === "debito") && variaveis.includes(l.categoria))
    .reduce((s, l) => s + l.valor_centavos, 0);
  const diario = Math.floor((totalVariavel + DIAS_HISTORICO - 1) / DIAS_HISTORICO);
  const b = p.gasto_diario.base;
  if (
    p.gasto_diario.valor_centavos !== diario ||
    b.total_centavos !== totalVariavel ||
    b.dias !== DIAS_HISTORICO ||
    b.de !== INICIO_HISTORICO ||
    b.ate !== FIM_HISTORICO
  ) {
    v.push({ invariante: 6, mensagem: `gasto diário ${p.gasto_diario.valor_centavos} ≠ teto(${totalVariavel} / ${DIAS_HISTORICO}) = ${diario}` });
  }

  // 7. Conta estimada = teto(média das 3 últimas ocorrências), citadas em `estimativa`.
  for (const c of p.compromissos) {
    if (c.origem_dado !== "conta_estimada" && c.estimativa === null) continue;
    if (!c.estimativa || c.estimativa.metodo !== "media_3_ultimas") {
      v.push({ invariante: 7, mensagem: `compromisso ${c.id} sem estimativa media_3_ultimas` });
      continue;
    }
    const ocs = c.estimativa.ocorrencias;
    const soma = ocs.reduce((s, o) => s + o.valor_centavos, 0);
    const mediaTeto = Math.ceil(soma / 3);
    if (c.valor_centavos !== mediaTeto) {
      v.push({ invariante: 7, mensagem: `conta estimada ${c.id}: valor ${c.valor_centavos} ≠ teto(${soma}/3) = ${mediaTeto}` });
    }
    if (p.historico.length > 0) {
      const doHist = p.historico
        .filter((l) => l.recorrencia_id === c.id)
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(-3);
      if (
        doHist.length !== 3 ||
        doHist.some(
          (h, idx) =>
            h.id !== ocs[idx].lancamento_id || h.data !== ocs[idx].data || h.valor_centavos !== ocs[idx].valor_centavos,
        )
      ) {
        v.push({ invariante: 7, mensagem: `conta estimada ${c.id}: ocorrências não batem com as 3 últimas do histórico` });
      }
    }
  }

  // 8. Compras de renda variável no histórico usam o fechamento gravado da data e aparecem como débito em conta; aportes dentro do histórico também.
  if (p.historico.length > 0) {
    for (const pos of p.posicoes) {
      if (pos.categoria === "acao" || pos.categoria === "cripto") {
        const mapaTicker = SERIES_FECHAMENTOS[pos.ticker];
        for (const comp of pos.compras) {
          if (comp.data < INICIO_HISTORICO || comp.data > FIM_HISTORICO) continue;
          const fechamento = mapaTicker?.get(comp.data);
          if (fechamento === undefined || comp.preco_centavos !== fechamento) {
            v.push({
              invariante: 8,
              mensagem: `posição ${pos.id}: compra em ${comp.data} com preço ${comp.preco_centavos} ≠ fechamento gravado ${fechamento}`,
            });
          }
          const custo = new Decimal(comp.quantidade)
            .mul(comp.preco_centavos)
            .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
            .toNumber();
          const lanc = p.historico.find(
            (l) =>
              l.posicao_id === pos.id &&
              l.data === comp.data &&
              l.tipo === "saida" &&
              l.meio !== "cartao_credito" &&
              l.valor_centavos === custo,
          );
          if (!lanc) {
            v.push({ invariante: 8, mensagem: `posição ${pos.id}: compra em ${comp.data} sem saída correspondente no histórico` });
          }
        }
      } else {
        for (const ap of pos.aportes) {
          if (ap.data < INICIO_HISTORICO || ap.data > FIM_HISTORICO) continue;
          const lanc = p.historico.find(
            (l) =>
              l.posicao_id === pos.id &&
              l.data === ap.data &&
              l.tipo === "saida" &&
              l.meio !== "cartao_credito" &&
              l.valor_centavos === ap.valor_centavos,
          );
          if (!lanc) {
            v.push({ invariante: 8, mensagem: `posição ${pos.id}: aporte em ${ap.data} sem saída correspondente no histórico` });
          }
        }
      }
    }
  }

  // 9. Fatura fechada que vence na janela tem fechamento ≤ 29/10.
  for (const f of p.cartao?.faturas ?? []) {
    if (f.status === "fechada" && f.vencimento >= HOJE && f.vencimento <= FIM_JANELA && f.fechamento > FIM_HISTORICO) {
      v.push({ invariante: 9, mensagem: `fatura fechada ${f.id} com fechamento ${f.fechamento} depois de ${FIM_HISTORICO}` });
    }
  }

  // 10. Valores das conversas de teste não aparecem em itens de fatura nem em lançamentos de 23/10 a 29/10.
  const reservados = new Set<number>(VALORES_RESERVADOS_CENTAVOS);
  for (const f of p.cartao?.faturas ?? []) {
    for (const item of f.itens) {
      if (reservados.has(item.valor_centavos)) {
        v.push({ invariante: 10, mensagem: `fatura ${f.id}: item ${item.descricao} com valor reservado ${item.valor_centavos}` });
      }
    }
  }
  for (const l of p.historico) {
    if (l.data >= "2026-10-23" && l.data <= FIM_HISTORICO && reservados.has(l.valor_centavos)) {
      v.push({ invariante: 10, mensagem: `lançamento ${l.id} com valor reservado ${l.valor_centavos}` });
    }
  }

  // 12. Se renda existir: líquido <= bruto; e se houver entradas com categoria receitas no histórico,
  // média mensal (soma ÷ meses distintos AAAA-MM, meio para cima) deve ser igual a liquido_mensal_centavos.
  if (p.renda) {
    if (p.renda.liquido_mensal_centavos > p.renda.bruto_mensal_centavos) {
      v.push({
        invariante: 12,
        mensagem: `renda: líquido mensal ${p.renda.liquido_mensal_centavos} > bruto mensal ${p.renda.bruto_mensal_centavos}`,
      });
    }
    const entradasReceita = p.historico.filter((l) => l.tipo === "entrada" && l.categoria === "receitas");
    if (entradasReceita.length > 0) {
      const mesesDistintos = new Set(entradasReceita.map((l) => l.data.slice(0, 7)));
      const numMeses = mesesDistintos.size;
      const somaReceitas = entradasReceita.reduce((s, l) => s + l.valor_centavos, 0);
      const media = new Decimal(somaReceitas).div(numMeses).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
      if (media !== p.renda.liquido_mensal_centavos) {
        v.push({
          invariante: 12,
          mensagem: `renda: líquido mensal ${p.renda.liquido_mensal_centavos} ≠ média mensal das receitas no histórico ${media} (soma ${somaReceitas} em ${numMeses} meses)`,
        });
      }
    }
  }

  return v;
}

/** Carrega a persona e valida esquema e invariantes. */
export function carregarPersona(id: string): ResultadoDominio<{ persona: Persona }> {
  const bruta = BRUTAS[id];
  if (bruta === undefined) return erro("ARGUMENTOS_INVALIDOS", `persona ${id} não existe`, ["persona_id"]);
  const violacoes = verificarInvariantes(bruta);
  if (violacoes.length > 0) {
    return erro("ESTADO_INVALIDO", `persona ${id} viola invariantes`, [], { violacoes });
  }
  return { ok: true, persona: esquemaPersona.parse(bruta) };
}
