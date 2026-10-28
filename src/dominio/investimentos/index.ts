// Investimentos (spec §5.4, §6.1). Implementação no B3b.

import Decimal from "decimal.js";
import { HOJE, INICIO_HISTORICO, formatarDiaMes, textos } from "@/contratos";
import type {
  Contexto,
  DataISO,
  EstadoSessao,
  Persona,
  Posicao,
  PosicaoAvaliada,
  ResultadoDominio,
  ResultadoInvestimentos,
  ResultadoProjecao,
  SnapshotMercado,
} from "@/contratos";
import { somarDias } from "@/dominio/calendario";

const DecimalCdi = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

function formatarPct2Casas(numerador: Decimal, denominador: Decimal): string {
  if (denominador.isZero()) return "0.00";
  return numerador.mul(100).div(denominador).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

function precoBasePeriodo(ticker: string, contexto: Contexto): number | null {
  const serie = contexto.series.fechamentos[ticker]?.serie;
  if (!serie?.length) return null;
  const ordenada = [...serie].sort((a, b) => a.data.localeCompare(b.data));
  const em3007 = ordenada.find((p) => p.data >= INICIO_HISTORICO);
  return (em3007 ?? ordenada[0]).preco_centavos;
}

function avaliarRendaVariavel(
  pos: Extract<Posicao, { categoria: "acao" | "cripto" }>,
  estado: EstadoSessao,
  contexto: Contexto,
): {
  quantidade: string;
  aplicado: number;
  valorAtual: number;
  valorizacaoPct: string | null;
  rotuloEstimativa: string | null;
  fonte: string;
} {
  let qtdTotal = new DecimalCdi(0);
  let custoAcumulado = new DecimalCdi(0);
  for (const c of pos.compras) {
    const q = new DecimalCdi(c.quantidade);
    qtdTotal = qtdTotal.add(q);
    custoAcumulado = custoAcumulado.add(q.mul(c.preco_centavos));
  }
  const aplicado = custoAcumulado.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const cotacao = estado.mercado.precos[pos.ticker];
  const serieAtivo = contexto.series.fechamentos[pos.ticker];
  const precoAtual = cotacao?.preco_centavos ?? serieAtivo?.serie.at(-1)?.preco_centavos ?? 0;
  const valorAtual = qtdTotal.mul(precoAtual).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  const base3007 = precoBasePeriodo(pos.ticker, contexto);
  const valorizacaoPct =
    base3007 !== null && base3007 > 0
      ? formatarPct2Casas(new DecimalCdi(precoAtual - base3007), new DecimalCdi(base3007))
      : null;

  const dataHora = cotacao?.data_hora ?? serieAtivo?.obtido_em ?? estado.mercado.obtido_em;
  const fonteNome = cotacao?.fonte ?? serieAtivo?.fonte ?? "mercado";
  const rotuloEstimativa = textos.rotulos.estimado_com_cotacao(dataHora, fonteNome);
  const fonte = serieAtivo
    ? `${serieAtivo.fonte}, gravado em ${formatarDiaMes(serieAtivo.obtido_em.slice(0, 10))}`
    : fonteNome;

  return {
    quantidade: qtdTotal.toString(),
    aplicado,
    valorAtual,
    valorizacaoPct,
    rotuloEstimativa,
    fonte,
  };
}

function indiceTaxasCdi(contexto: Contexto): {
  taxaNoDia: (d: DataISO) => { taxa: string; dataRef: DataISO };
  ultimaDataSerie: DataISO;
} {
  const ordenada = [...contexto.series.cdi.serie].sort((a, b) => a.data.localeCompare(b.data));
  const porData = new Map<DataISO, string>();
  for (const item of ordenada) porData.set(item.data, item.taxa_diaria_pct);
  const ultima = ordenada.at(-1)!;

  const taxaNoDia = (d: DataISO): { taxa: string; dataRef: DataISO } => {
    const direta = porData.get(d);
    if (direta !== undefined) return { taxa: direta, dataRef: d };
    for (let i = ordenada.length - 1; i >= 0; i--) {
      if (ordenada[i].data <= d) return { taxa: ordenada[i].taxa_diaria_pct, dataRef: ordenada[i].data };
    }
    return { taxa: ordenada[0].taxa_diaria_pct, dataRef: ordenada[0].data };
  };

  return { taxaNoDia, ultimaDataSerie: ultima.data };
}

function avaliarRendaFixaCdi(
  aportes: ReadonlyArray<{ data: DataISO; valor_centavos: number }>,
  cdiPct: number,
  contexto: Contexto,
  taxaNoDia: (d: DataISO) => { taxa: string; dataRef: DataISO },
): { aplicado: number; valorAtual: number; ultimaRefUsada: DataISO | null } {
  let aplicado = 0;
  let acumulado = new DecimalCdi(0);
  let ultimaRefUsada: DataISO | null = null;
  const pct = new DecimalCdi(cdiPct).div(100);

  for (const ap of aportes) {
    aplicado += ap.valor_centavos;
    let fator = new DecimalCdi(1);
    for (let d = ap.data; d < HOJE; d = somarDias(d, 1)) {
      if (!contexto.calendario.ehDiaUtil(d)) continue;
      const { taxa, dataRef } = taxaNoDia(d);
      if (ultimaRefUsada === null || dataRef > ultimaRefUsada) ultimaRefUsada = dataRef;
      const taxaDia = new DecimalCdi(taxa).div(100);
      fator = fator.mul(new DecimalCdi(1).add(taxaDia.mul(pct)));
    }
    acumulado = acumulado.add(new DecimalCdi(ap.valor_centavos).mul(fator));
  }

  const valorAtual = acumulado.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  return { aplicado, valorAtual, ultimaRefUsada };
}

/** I-03 a I-07, I-10. Sem `ate_data`, usa o default de I-10. */
export function consultarInvestimentos(
  persona: Persona,
  estado: EstadoSessao,
  contexto: Contexto,
  filtro: { ate_data?: DataISO },
): ResultadoDominio<ResultadoInvestimentos> {
  const ateData: DataISO = filtro.ate_data ?? HOJE;
  const { taxaNoDia, ultimaDataSerie } = indiceTaxasCdi(contexto);
  let cdiDataRef: DataISO = ultimaDataSerie;

  const posicoes: PosicaoAvaliada[] = persona.posicoes.map((pos) => {
    const disponibilidade = dataDisponivel(pos, contexto);
    let aplicado = 0;
    let valorAtual = 0;
    let cdiPct: number | null = null;
    let ticker: string | null = null;
    let quantidade: string | null = null;
    let valorizacaoPct: string | null = null;
    let estimado = false;
    let rotuloEstimativa: string | null = null;
    let fonte = "sem rendimento";

    if (pos.categoria === "saldo_separado") {
      for (const ap of pos.aportes) aplicado += ap.valor_centavos;
      valorAtual = aplicado;
    } else if (
      pos.categoria === "caixinha" ||
      pos.categoria === "cdb_liquidez_diaria" ||
      pos.categoria === "cdb_vencimento" ||
      pos.categoria === "fundo"
    ) {
      cdiPct = pos.cdi_pct;
      const aval = avaliarRendaFixaCdi(pos.aportes, pos.cdi_pct, contexto, taxaNoDia);
      aplicado = aval.aplicado;
      valorAtual = aval.valorAtual;
      if (aval.ultimaRefUsada && aval.ultimaRefUsada > cdiDataRef) cdiDataRef = aval.ultimaRefUsada;
      fonte = `${contexto.series.cdi.fonte}, gravado em ${formatarDiaMes(contexto.series.cdi.obtido_em.slice(0, 10))}`;
    } else {
      ticker = pos.ticker;
      const rv = avaliarRendaVariavel(pos, estado, contexto);
      quantidade = rv.quantidade;
      aplicado = rv.aplicado;
      valorAtual = rv.valorAtual;
      valorizacaoPct = rv.valorizacaoPct;
      estimado = true;
      rotuloEstimativa = rv.rotuloEstimativa;
      fonte = rv.fonte;
    }

    const resultado = valorAtual - aplicado;
    const rentabilidade = formatarPct2Casas(new DecimalCdi(resultado), new DecimalCdi(aplicado));

    return {
      posicao_id: pos.id,
      nome: pos.nome,
      categoria: pos.categoria,
      cdi_pct: cdiPct,
      ticker,
      quantidade,
      aplicado_centavos: aplicado,
      valor_atual_centavos: valorAtual,
      resultado_centavos: resultado,
      rentabilidade_pct: rentabilidade,
      valorizacao_periodo_pct: valorizacaoPct,
      data_disponibilidade: disponibilidade,
      classificacao: "resgatavel_ate_data",
      protegido_centavos: 0,
      nao_resgatavel_centavos: 0,
      resgatavel_centavos: valorAtual,
      protecao: pos.protecao,
      restricao: pos.restricao ?? null,
      estimado,
      rotulo_estimativa: rotuloEstimativa,
      fonte,
    };
  });

  const totais = posicoes.reduce(
    (acc, p) => ({
      valor_total_centavos: acc.valor_total_centavos + p.valor_atual_centavos,
      protegido_centavos: acc.protegido_centavos + p.protegido_centavos,
      nao_resgatavel_centavos: acc.nao_resgatavel_centavos + p.nao_resgatavel_centavos,
      resgatavel_centavos: acc.resgatavel_centavos + p.resgatavel_centavos,
    }),
    { valor_total_centavos: 0, protegido_centavos: 0, nao_resgatavel_centavos: 0, resgatavel_centavos: 0 },
  );

  return {
    ok: true,
    ate_data: ateData,
    ate_data_origem: "informada",
    posicoes,
    totais,
    rotulo_rentabilidade: textos.rotulos.rentabilidade,
    cdi_data_ref: cdiDataRef,
    mercado: estado.mercado,
  };
}

/** I-08: rendimento bruto com CDI constante; `ate_data` > 29/11 → erro. */
export function projetarRendimento(
  mercado: SnapshotMercado,
  contexto: Contexto,
  pedido: { valor_centavos: number; cdi_pct: number; ate_data: DataISO },
): ResultadoDominio<Omit<ResultadoProjecao, "destino">> {
  void mercado, contexto, pedido;
  throw new Error("não implementado");
}

/** I-01, I-02: primeiro dia com o valor em conta se o pedido for feito hoje. */
export function dataDisponivel(posicao: Posicao, contexto: Contexto): DataISO {
  const liquidez = posicao.liquidez;
  switch (liquidez.regra) {
    case "imediata":
      return HOJE;
    case "d_mais_uteis":
      return contexto.calendario.somarDiasUteis(HOJE, liquidez.dias);
    case "no_vencimento":
      // CR-35: CDB no vencimento, na data.
      return posicao.categoria === "cdb_vencimento" ? posicao.vencimento : HOJE;
  }
}
