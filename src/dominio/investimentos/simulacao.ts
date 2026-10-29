import Decimal from "decimal.js";
import {
  HOJE,
  LIMITE_SIMULACAO_INVESTIMENTO,
  dataExiste,
  erro,
  textos,
  type Contexto,
  type ResultadoDominio,
  type ResultadoSimulacaoInvestimento,
  type SnapshotMercado,
} from "@/contratos";
import { diaJuliano } from "@/dominio/calendario";

const DecimalSimulacao = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

const TABELA_IOF = [
  96, // 0
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, // 1..10
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33, // 11..20
  30, 26, 23, 20, 16, 13, 10, 6, 3, // 21..29
];

function aliquotaIof(dias: number): string {
  if (dias >= 30 || dias < 0) return "0.00";
  const val = TABELA_IOF[dias] ?? 0;
  return new DecimalSimulacao(val).toFixed(2);
}

function aliquotaIr(dias: number): string {
  if (dias <= 180) return "22.50";
  if (dias <= 360) return "20.00";
  if (dias <= 720) return "17.50";
  return "15.00";
}

function formatarPct2Casas(numerador: Decimal, denominador: Decimal): string {
  if (denominador.isZero()) return "0.00";
  return numerador.mul(100).div(denominador).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

const REGEX_TAXA_PCT = /^\d{1,3}(\.\d{1,4})?$/;

export function simularInvestimento(
  mercado: SnapshotMercado,
  contexto: Contexto,
  pedido: {
    valor_centavos: number;
    indexador: "cdi" | "prefixado";
    cdi_pct?: number;
    taxa_aa_pct?: string;
    prazo_meses?: number;
    ate_data?: string;
  },
): ResultadoDominio<ResultadoSimulacaoInvestimento> {
  if (typeof pedido.valor_centavos !== "number" || !Number.isInteger(pedido.valor_centavos) || pedido.valor_centavos <= 0) {
    return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["valor"]);
  }

  const temPrazo = pedido.prazo_meses !== undefined;
  const temData = pedido.ate_data !== undefined;
  if ((temPrazo && temData) || (!temPrazo && !temData)) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["prazo_meses"]);
  }

  if (temPrazo && (typeof pedido.prazo_meses !== "number" || !Number.isInteger(pedido.prazo_meses) || pedido.prazo_meses < 1 || pedido.prazo_meses > 60)) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["prazo_meses"]);
  }

  let cdiPct: number | null = null;
  if (pedido.indexador === "cdi") {
    cdiPct = pedido.cdi_pct ?? 100;
    if (typeof cdiPct !== "number" || isNaN(cdiPct) || cdiPct <= 0 || cdiPct > 300) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["cdi_pct"]);
    }
  } else if (pedido.indexador === "prefixado") {
    if (pedido.taxa_aa_pct === undefined || typeof pedido.taxa_aa_pct !== "string" || !REGEX_TAXA_PCT.test(pedido.taxa_aa_pct)) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["taxa_aa_pct"]);
    }
    const t = Number(pedido.taxa_aa_pct);
    if (t <= 0 || t > 100) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["taxa_aa_pct"]);
    }
  } else {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["indexador"]);
  }

  let fim: string;
  if (temData) {
    if (!dataExiste(pedido.ate_data!)) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["ate_data"]);
    }
    fim = pedido.ate_data!;
  } else {
    const n = pedido.prazo_meses!;
    const [anoHoje, mesHoje] = HOJE.split("-").map(Number);
    const totalMeses = anoHoje * 12 + (mesHoje - 1) + n;
    const anoFim = Math.floor(totalMeses / 12);
    const mesFim = (totalMeses % 12) + 1;
    const bissexto = (anoFim % 4 === 0 && anoFim % 100 !== 0) || anoFim % 400 === 0;
    const diasNoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mesFim - 1];
    const diaFim = Math.min(30, diasNoMes);
    fim = `${anoFim}-${String(mesFim).padStart(2, "0")}-${String(diaFim).padStart(2, "0")}`;
  }

  if (fim < HOJE) {
    return erro("DATA_ANTES_DE_HOJE", textos.erros.DATA_ANTES_DE_HOJE, ["ate_data"]);
  }
  if (fim === HOJE) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["ate_data"]);
  }
  if (fim > LIMITE_SIMULACAO_INVESTIMENTO) {
    return erro("DATA_FORA_DA_JANELA", "A simulação vai até 5 anos (30/10/2031).", ["ate_data"]);
  }

  const du = contexto.calendario.diasUteisEntre(HOJE, fim);
  const dias_corridos = diaJuliano(fim) - diaJuliano(HOJE);

  let fator: Decimal;
  let taxaDiariaCdiPct: string | null = null;
  let cdiDataRef: string | null = null;
  let taxaAaPct: string | null = null;
  let rotulo: string;

  if (pedido.indexador === "cdi") {
    const taxaDia = new DecimalSimulacao(mercado.cdi.taxa_diaria_pct).div(100);
    const cdiPctDec = new DecimalSimulacao(cdiPct!).div(100);
    const fatorDiario = new DecimalSimulacao(1).add(taxaDia.mul(cdiPctDec));
    fator = fatorDiario.pow(du);

    taxaDiariaCdiPct = mercado.cdi.taxa_diaria_pct;
    cdiDataRef = mercado.cdi.data_ref;
    taxaAaPct = null;
    rotulo = "estimativa; CDI constante na última taxa conhecida; IR regressivo e IOF se resgatar antes de 30 dias; não é recomendação";
  } else {
    const tDec = new DecimalSimulacao(pedido.taxa_aa_pct!).div(100);
    const base = new DecimalSimulacao(1).add(tDec);
    const exp = new DecimalSimulacao(du).div(252);
    fator = base.pow(exp);

    cdiPct = null;
    taxaDiariaCdiPct = null;
    cdiDataRef = null;
    taxaAaPct = pedido.taxa_aa_pct!;
    rotulo = "estimativa; taxa prefixada informada; IR regressivo e IOF se resgatar antes de 30 dias; não é recomendação";
  }

  const valorDec = new DecimalSimulacao(pedido.valor_centavos);
  const brutoDec = valorDec.mul(fator.sub(1)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const bruto = brutoDec.toNumber();

  const alIof = aliquotaIof(dias_corridos);
  const alIr = aliquotaIr(dias_corridos);

  const iofDec = brutoDec.mul(new DecimalSimulacao(alIof).div(100)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const iof = iofDec.toNumber();

  const baseIrDec = brutoDec.sub(iofDec);
  const irDec = baseIrDec.mul(new DecimalSimulacao(alIr).div(100)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const ir = irDec.toNumber();

  const liquido = bruto - iof - ir;
  const valorFinalLiquido = pedido.valor_centavos + liquido;
  const rentabilidadeLiquidaPct = formatarPct2Casas(new DecimalSimulacao(liquido), valorDec);

  return {
    ok: true,
    valor_centavos: pedido.valor_centavos,
    indexador: pedido.indexador,
    cdi_pct: cdiPct,
    taxa_aa_pct: taxaAaPct,
    taxa_diaria_cdi_pct: taxaDiariaCdiPct,
    cdi_data_ref: cdiDataRef,
    inicio: HOJE,
    fim,
    dias_corridos,
    dias_uteis: du,
    rendimento_bruto_centavos: bruto,
    aliquota_iof_pct: alIof,
    iof_centavos: iof,
    aliquota_ir_pct: alIr,
    ir_centavos: ir,
    rendimento_liquido_centavos: liquido,
    valor_final_liquido_centavos: valorFinalLiquido,
    rentabilidade_liquida_pct: rentabilidadeLiquidaPct,
    rotulo,
  };
}
