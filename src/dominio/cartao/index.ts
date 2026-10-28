// Cartão e parcelas (spec §5.3, §6.1). Implementação no B1b.

import { HOJE, dataExiste, erro, textos, type FaturaVisao } from "@/contratos";
import { somarDias } from "@/dominio/calendario";
import type {
  AlocacaoCompra,
  CartaoVisao,
  EstadoSessao,
  Persona,
  ResultadoDominio,
  ResultadoDuplicidade,
} from "@/contratos";

// Aritmética pura sobre ISO; fevereiro limita o fechamento ao último dia.
function deslocarMes(mes: string, n: number): string {
  const [ano, numero] = mes.split("-").map(Number);
  const absoluto = ano * 12 + numero - 1 + n;
  return `${Math.floor(absoluto / 12).toString().padStart(4, "0")}-${(absoluto % 12 + 1).toString().padStart(2, "0")}`;
}

function dataNoMes(mes: string, dia: number): string {
  const ultimo = Number(somarDias(`${deslocarMes(mes, 1)}-01`, -1).slice(8));
  return `${mes}-${Math.min(dia, ultimo).toString().padStart(2, "0")}`;
}

/** C-02, C-03: faturas e valores de cada parcela de uma compra no cartão. */
export function alocarCompra(
  persona: Persona,
  estado: EstadoSessao,
  compra: { data: string; valor_centavos: number; parcelas: number },
): ResultadoDominio<AlocacaoCompra> {
  void estado;
  return distribuirCompra(persona, compra, true);
}

function distribuirCompra(persona: Persona, compra: { data: string; valor_centavos: number; parcelas: number }, protegerFechadas: boolean): ResultadoDominio<AlocacaoCompra> {
  if (!persona.cartao) return erro("OPERACAO_NAO_PERMITIDA", textos.erros.OPERACAO_NAO_PERMITIDA, ["meio"]);
  if (!dataExiste(compra.data) || !Number.isInteger(compra.parcelas) || compra.parcelas < 1 || compra.parcelas > 12) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["data", "parcelas"]);
  }
  if (!Number.isSafeInteger(compra.valor_centavos) || compra.valor_centavos <= 0) {
    return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["valor_centavos"]);
  }
  const { dia_fechamento, dia_vencimento } = persona.cartao;
  const mes = compra.data.slice(0, 7);
  const fechamento = dataNoMes(mes, dia_fechamento);
  const fechaEm = compra.data < fechamento ? mes : deslocarMes(mes, 1);
  const valor = Math.floor(compra.valor_centavos / compra.parcelas);
  if (valor === 0) return erro("VALOR_INVALIDO", "Cada parcela deve ter pelo menos um centavo.", ["valor_centavos", "parcelas"]);
  const parcelas: AlocacaoCompra["parcelas"] = [];
  for (let k = 0; k < compra.parcelas; k++) {
    const venceEm = deslocarMes(fechaEm, k + 1);
    const vencimento = dataNoMes(venceEm, dia_vencimento);
    const fatura = persona.cartao.faturas.find((f) => f.vencimento === vencimento);
    if (protegerFechadas && fatura?.status === "fechada") return erro("OPERACAO_NAO_PERMITIDA", textos.erros.OPERACAO_NAO_PERMITIDA, ["data"]);
    parcelas.push({ numero: k + 1, fatura_id: fatura?.id ?? `F${venceEm.slice(2).replace("-", "")}`, fechamento: dataNoMes(deslocarMes(fechaEm, k), dia_fechamento), vencimento, valor_centavos: valor + (k === 0 ? compra.valor_centavos % compra.parcelas : 0) });
  }
  return { ok: true, parcelas };
}

/** C-07: valor igual a item de fatura fechada ou aberta, ou a lançamento de 23/10 a 29/10. */
export function verificarDuplicidade(persona: Persona, gasto: { valor_centavos: number }): ResultadoDuplicidade {
  const itens: Extract<ResultadoDuplicidade, { duplicado: true }>["itens"] = [];
  for (const f of persona.cartao?.faturas ?? []) {
    for (const i of f.itens) {
      if (i.valor_centavos !== gasto.valor_centavos) continue;
      itens.push({ fonte: "fatura", fatura_id: f.id, vencimento: f.vencimento, lancamento_id: i.lancamento_id ?? null, data: i.data ?? null, descricao: i.descricao, valor_centavos: i.valor_centavos });
    }
  }
  for (const l of persona.historico) {
    if (l.data < "2026-10-23" || l.data > "2026-10-29" || l.valor_centavos !== gasto.valor_centavos) continue;
    if (itens.some((i) => i.lancamento_id === l.id)) continue;
    itens.push({ fonte: "lancamento", fatura_id: null, vencimento: null, lancamento_id: l.id, data: l.data, descricao: l.descricao, valor_centavos: l.valor_centavos });
  }
  return itens.length ? { duplicado: true, itens } : { duplicado: false };
}

/** Fatura fechada, aberta e próximas, na situação atual. null para persona sem cartão. */
export function consultarCartao(persona: Persona, estado: EstadoSessao): CartaoVisao | null {
  if (!persona.cartao) return null;
  const cartao = persona.cartao;
  const primeira = distribuirCompra(persona, { data: HOJE, valor_centavos: 1, parcelas: 1 }, false);
  if (!primeira.ok) return null;
  const aberta = primeira.parcelas[0];
  const faturas = new Map<string, FaturaVisao>();
  for (const f of cartao.faturas) {
    faturas.set(f.id, {
      fatura_id: f.id, fechamento: f.fechamento, vencimento: f.vencimento,
      status: f.status === "fechada" ? "fechada" : f.vencimento === aberta.vencimento ? "aberta" : "futura",
      valor_centavos: f.valor_centavos,
      itens: f.itens.map((i) => ({ lancamento_id: i.lancamento_id ?? null, data: i.data ?? null, descricao: i.descricao, valor_centavos: i.valor_centavos, parcelamento_id: i.parcelamento_id ?? null, parcela: i.parcela ?? null, origem: "dados_base" })),
    });
  }
  const obter = (p: AlocacaoCompra["parcelas"][number]) => {
    let f = faturas.get(p.fatura_id);
    if (!f) {
      f = { fatura_id: p.fatura_id, fechamento: p.fechamento, vencimento: p.vencimento, status: p.vencimento === aberta.vencimento ? "aberta" : "futura", valor_centavos: 0, itens: [] };
      faturas.set(p.fatura_id, f);
    }
    return f;
  };
  obter(aberta);
  // Reconstituir parcelas futuras; nunca completar nem reescrever fatura fechada.
  for (const pc of cartao.parcelamentos) {
    const r = distribuirCompra(persona, { data: pc.data_compra, valor_centavos: pc.valor_total_centavos, parcelas: pc.parcelas }, false);
    if (!r.ok) continue;
    for (const p of r.parcelas) {
      if (p.vencimento < aberta.vencimento) continue;
      const f = obter(p);
      const parcela = `${p.numero}/${pc.parcelas}`;
      if (f.status === "fechada" || f.itens.some((i) => i.parcelamento_id === pc.id && i.parcela === parcela)) continue;
      f.itens.push({ lancamento_id: null, data: pc.data_compra, descricao: pc.descricao, valor_centavos: p.valor_centavos, parcelamento_id: pc.id, parcela, origem: "dados_base" });
      f.valor_centavos += p.valor_centavos;
    }
  }
  // Replay de compras declaradas: correções/remover apontam para o id D original.
  const compras = new Map<string, Extract<EstadoSessao["declaracoes"][number]["alteracao"], { operacao: "adicionar_evento" }>>();
  for (const d of estado.declaracoes) {
    const a = d.alteracao;
    if (a.operacao === "adicionar_evento" && a.meio === "cartao_credito") compras.set(d.id, a);
    if (a.operacao === "remover_evento") compras.delete(a.evento_id);
    if (a.operacao === "alterar_evento") {
      const anterior = compras.get(a.evento_id);
      if (anterior) compras.set(a.evento_id, { ...anterior, data: a.data ?? anterior.data, valor: a.valor ?? anterior.valor });
    }
  }
  // A consulta inclui só declarações efetivas, nunca hipóteses.
  for (const a of compras.values()) {
    const [reais, cent = ""] = a.valor.split(".");
    const r = alocarCompra(persona, estado, { data: a.data, valor_centavos: Number(reais) * 100 + Number(cent.padEnd(2, "0")), parcelas: a.parcelas ?? 1 });
    if (!r.ok) continue;
    for (const p of r.parcelas) {
      const f = obter(p);
      if (f.status === "fechada") continue;
      f.itens.push({ lancamento_id: null, data: a.data, descricao: a.descricao, valor_centavos: p.valor_centavos, parcelamento_id: null, parcela: (a.parcelas ?? 1) > 1 ? `${p.numero}/${a.parcelas}` : null, origem: "declaracao" });
      f.valor_centavos += p.valor_centavos;
    }
  }
  const ordenadas = [...faturas.values()].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  return {
    limite_centavos: cartao.limite_centavos, dia_fechamento: cartao.dia_fechamento, dia_vencimento: cartao.dia_vencimento,
    fatura_fechada: ordenadas.filter((f) => f.status === "fechada").at(-1) ?? null,
    fatura_aberta: obter(aberta),
    proximas: ordenadas.filter((f) => f.status === "futura" && f.vencimento > aberta.vencimento),
  };
}
