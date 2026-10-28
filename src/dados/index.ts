// Personas (spec §6.1 `dados`). B0: só a P1 mínima; o B2 troca pelas personas geradas.

import {
  CATEGORIAS_VARIAVEIS,
  DIAS_HISTORICO,
  FIM_HISTORICO,
  FIM_JANELA,
  HOJE,
  INICIO_HISTORICO,
  erro,
  esquemaPersona,
  type Persona,
  type ResultadoDominio,
  type ResumoPersona,
} from "@/contratos";
import p1 from "../../dados/personas/p1.json";
import p2 from "../../dados/personas/p2.json";
import p3 from "../../dados/personas/p3.json";

const BRUTAS: Record<string, unknown> = { p1, p2, p3 };

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

  // 3. Valor de cada fatura = soma dos itens. (Ciclos × compras do histórico: B2.)
  for (const f of p.cartao?.faturas ?? []) {
    const soma = f.itens.reduce((s, i) => s + i.valor_centavos, 0);
    if (soma !== f.valor_centavos) {
      v.push({ invariante: 3, mensagem: `fatura ${f.id}: valor ${f.valor_centavos} ≠ soma dos itens ${soma}` });
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
