// Investimentos (spec §5.4, §6.1). Implementação no B3b.

import Decimal from "decimal.js";
import { FIM_JANELA, HOJE, INICIO_HISTORICO, dataExiste, erro, formatarDiaMes, textos } from "@/contratos";
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
import { calcularCenarios } from "@/dominio/caixa";

const DecimalCdi = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

function resolverAteData(
  persona: Persona,
  estado: EstadoSessao,
  contexto: Contexto,
  ateDataInformada?: DataISO,
): { ateData: DataISO; origem: ResultadoInvestimentos["ate_data_origem"] } {
  if (ateDataInformada !== undefined) {
    return { ateData: ateDataInformada, origem: "informada" };
  }
  const cenarios = calcularCenarios(persona, estado, contexto);
  const faltas: DataISO[] = [];
  for (const c of cenarios) {
    if (c.status === "calculado" && c.indicadores?.primeira_falta) {
      faltas.push(c.indicadores.primeira_falta.data);
    }
  }
  if (faltas.length > 0) {
    faltas.sort();
    return { ateData: faltas[0], origem: "falta_mais_proxima" };
  }
  const atual = cenarios[0];
  const dataMinimo = atual?.status === "calculado" && atual.indicadores ? atual.indicadores.data_saldo_minimo : HOJE;
  return { ateData: dataMinimo, origem: "saldo_minimo" };
}

function classificarPosicao(
  pos: Posicao,
  valorAtual: number,
  disponibilidade: DataISO,
  ateData: DataISO,
): {
  classificacao: PosicaoAvaliada["classificacao"];
  protegido: number;
  naoResgatavel: number;
  resgatavel: number;
} {
  if (pos.protecao?.tipo === "integral") {
    return {
      classificacao: "protegida",
      protegido: valorAtual,
      naoResgatavel: 0,
      resgatavel: 0,
    };
  }
  const protecaoParcial = pos.protecao?.tipo === "parcial" ? Math.min(pos.protecao.valor_centavos, valorAtual) : 0;
  const livreDeProtecao = Math.max(0, valorAtual - protecaoParcial);
  if (disponibilidade > ateData) {
    return {
      classificacao: "nao_resgatavel_ate_data",
      protegido: protecaoParcial,
      naoResgatavel: livreDeProtecao,
      resgatavel: 0,
    };
  }
  return {
    classificacao: "resgatavel_ate_data",
    protegido: protecaoParcial,
    naoResgatavel: 0,
    resgatavel: livreDeProtecao,
  };
}

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
  const { ateData, origem: ateDataOrigem } = resolverAteData(persona, estado, contexto, filtro.ate_data);
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
      const aportesOperacao = estado.operacoes
        .filter((op) => op.destino === pos.id)
        .map((op) => ({ data: op.data, valor_centavos: op.valor_centavos }));
      for (const ap of [...pos.aportes, ...aportesOperacao]) aplicado += ap.valor_centavos;
      valorAtual = aplicado;
    } else if (
      pos.categoria === "caixinha" ||
      pos.categoria === "cdb_liquidez_diaria" ||
      pos.categoria === "cdb_vencimento" ||
      pos.categoria === "fundo"
    ) {
      cdiPct = pos.cdi_pct;
      const aportesOperacao = estado.operacoes
        .filter((op) => op.destino === pos.id)
        .map((op) => ({ data: op.data, valor_centavos: op.valor_centavos }));
      const aval = avaliarRendaFixaCdi([...pos.aportes, ...aportesOperacao], pos.cdi_pct, contexto, taxaNoDia);
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
    const { classificacao, protegido, naoResgatavel, resgatavel } = classificarPosicao(
      pos,
      valorAtual,
      disponibilidade,
      ateData,
    );

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
      classificacao,
      protegido_centavos: protegido,
      nao_resgatavel_centavos: naoResgatavel,
      resgatavel_centavos: resgatavel,
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
    ate_data_origem: ateDataOrigem,
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
  if (!Number.isInteger(pedido.valor_centavos) || pedido.valor_centavos <= 0) {
    return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["valor_centavos"]);
  }
  if (!(pedido.cdi_pct > 0 && pedido.cdi_pct <= 300)) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["cdi_pct"]);
  }
  if (!dataExiste(pedido.ate_data)) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["ate_data"]);
  }
  if (pedido.ate_data < HOJE) {
    return erro("DATA_ANTES_DE_HOJE", textos.erros.DATA_ANTES_DE_HOJE, ["ate_data"]);
  }
  if (pedido.ate_data > FIM_JANELA) {
    return erro("DATA_FORA_DA_JANELA", textos.erros.DATA_FORA_DA_JANELA, ["ate_data"]);
  }

  const diasUteis = contexto.calendario.diasUteisEntre(HOJE, pedido.ate_data);
  const taxaDia = new DecimalCdi(mercado.cdi.taxa_diaria_pct).div(100);
  const pct = new DecimalCdi(pedido.cdi_pct).div(100);
  const fatorDiario = new DecimalCdi(1).add(taxaDia.mul(pct));
  const fatorPeriodo = fatorDiario.pow(diasUteis).sub(1);
  const rendimentoBruto = new DecimalCdi(pedido.valor_centavos)
    .mul(fatorPeriodo)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();

  return {
    ok: true,
    valor_centavos: pedido.valor_centavos,
    cdi_pct: pedido.cdi_pct,
    ate_data: pedido.ate_data,
    dias_uteis: diasUteis,
    taxa_diaria_pct: mercado.cdi.taxa_diaria_pct,
    cdi_data_ref: mercado.cdi.data_ref,
    rendimento_bruto_centavos: rendimentoBruto,
    rotulo: textos.rotulos.projecao,
  };
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
