import Decimal from "decimal.js";
import {
  HOJE,
  PREMISSAS_CREDITO,
  erro,
  textos,
  type EstadoSessao,
  type Persona,
  type ResultadoDominio,
  type ResultadoPixCredito,
} from "@/contratos";
import { alocarCompra, consultarCartao } from "@/dominio/cartao";
import { saldoDisponivelHoje } from "@/dominio/caixa";
import { diaJuliano } from "@/dominio/calendario";

const DecimalCredito = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const REGEX_JUROS = /^\d{1,3}(\.\d{1,4})?$/;

function normalizarJuros(texto: string): string {
  const [inteiro, decimal = ""] = texto.split(".");
  if (decimal.length <= 2) {
    return `${inteiro}.${decimal.padEnd(2, "0")}`;
  }
  return texto;
}

export function simularPixCredito(
  persona: Persona,
  estado: EstadoSessao,
  pedido: { valor_centavos: number; parcelas: number; juros_am_pct?: string },
): ResultadoDominio<ResultadoPixCredito> {
  if (!persona.cartao) {
    return erro(
      "OPERACAO_NAO_PERMITIDA",
      "Pix no crédito usa o cartão de crédito; esta persona não tem cartão.",
      ["cartao"],
    );
  }

  if (!Number.isSafeInteger(pedido.valor_centavos) || pedido.valor_centavos <= 0) {
    return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["valor"]);
  }

  if (!Number.isInteger(pedido.parcelas) || pedido.parcelas < 1 || pedido.parcelas > 12) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["parcelas"]);
  }

  let jurosPublicado: string;
  let juros_origem: "premissa" | "informado";

  if (pedido.juros_am_pct !== undefined) {
    if (!REGEX_JUROS.test(pedido.juros_am_pct)) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["juros_am_pct"]);
    }
    const jDec = new DecimalCredito(pedido.juros_am_pct);
    if (jDec.lte(0) || jDec.gt(30)) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["juros_am_pct"]);
    }
    jurosPublicado = normalizarJuros(pedido.juros_am_pct);
    juros_origem = "informado";
  } else {
    jurosPublicado = PREMISSAS_CREDITO.juros_pix_credito_am_pct;
    juros_origem = "premissa";
  }

  const aloc = alocarCompra(persona, estado, {
    data: HOJE,
    valor_centavos: pedido.valor_centavos,
    parcelas: pedido.parcelas,
  });
  if (!aloc.ok) {
    return aloc;
  }

  const hojeJuliano = diaJuliano(HOJE);
  const diasParcelas: number[] = [];
  for (const p of aloc.parcelas) {
    const dias = Math.min(Math.max(0, diaJuliano(p.vencimento) - hojeJuliano), PREMISSAS_CREDITO.iof_dias_max);
    diasParcelas.push(dias);
  }

  // IOF = round( valor × 0,0038 + Σ_k (valor ÷ n) × 0,000082 × dias_k ) — tudo em Decimal, um único arredondamento no final.
  const valorDec = new DecimalCredito(pedido.valor_centavos);
  const nDec = new DecimalCredito(pedido.parcelas);
  const valorPorParcelaDec = valorDec.div(nDec);

  const iofFixoPct = new DecimalCredito(PREMISSAS_CREDITO.iof_adicional_pct).div(100);
  const iofDiarioPct = new DecimalCredito(PREMISSAS_CREDITO.iof_diario_pct).div(100);

  const iofFixo = valorDec.times(iofFixoPct);
  let somaIofVariavel = new DecimalCredito(0);
  for (const dias of diasParcelas) {
    somaIofVariavel = somaIofVariavel.plus(valorPorParcelaDec.times(iofDiarioPct).times(dias));
  }
  const iofExato = iofFixo.plus(somaIofVariavel);
  const iof_centavos = iofExato.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  // PV = valor + IOF (centavos inteiros)
  const total_financiado_centavos = pedido.valor_centavos + iof_centavos;
  const pvDec = new DecimalCredito(total_financiado_centavos);

  // i = j/100. PMT = round(PV × i ÷ (1 − (1+i)^−n))
  const iDec = new DecimalCredito(jurosPublicado).div(100);
  const umMaisI = new DecimalCredito(1).plus(iDec);
  const denominador = new DecimalCredito(1).minus(umMaisI.pow(-pedido.parcelas));
  const pmtExato = pvDec.times(iDec).div(denominador);
  const parcela_centavos = pmtExato.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  // Cronograma Price: saldo = PV; para k = 1..n−1: juros_k = round(saldo × i), amort_k = PMT − juros_k, valor_k = PMT, saldo −= amort_k;
  // na última: juros_n = round(saldo × i), amort_n = saldo, valor_n = saldo + juros_n.
  let saldo = total_financiado_centavos;
  const cronograma: Array<{
    numero: number;
    fatura_id: string;
    vencimento: string;
    valor_centavos: number;
    juros_centavos: number;
    amortizacao_centavos: number;
  }> = [];

  for (let k = 1; k < pedido.parcelas; k++) {
    const parcelaAloc = aloc.parcelas[k - 1];
    const juros_k = new DecimalCredito(saldo).times(iDec).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    const amort_k = parcela_centavos - juros_k;
    const valor_k = parcela_centavos;
    saldo -= amort_k;
    cronograma.push({
      numero: k,
      fatura_id: parcelaAloc.fatura_id,
      vencimento: parcelaAloc.vencimento,
      valor_centavos: valor_k,
      juros_centavos: juros_k,
      amortizacao_centavos: amort_k,
    });
  }

  // Última parcela
  const parcelaAlocFinal = aloc.parcelas[pedido.parcelas - 1];
  const juros_n = new DecimalCredito(saldo).times(iDec).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const amort_n = saldo;
  const valor_n = saldo + juros_n;
  cronograma.push({
    numero: pedido.parcelas,
    fatura_id: parcelaAlocFinal.fatura_id,
    vencimento: parcelaAlocFinal.vencimento,
    valor_centavos: valor_n,
    juros_centavos: juros_n,
    amortizacao_centavos: amort_n,
  });

  const total_pago_centavos = cronograma.reduce((s, p) => s + p.valor_centavos, 0);
  const juros_total_centavos = total_pago_centavos - total_financiado_centavos;
  const custo_total_centavos = total_pago_centavos - pedido.valor_centavos;

  // CET mensal c: resolva valor = Σ valor_k ÷ (1+c)^k por bisseção em Decimal no intervalo [0, 1] com 200 iterações
  let low = new DecimalCredito(0);
  let high = new DecimalCredito(1);
  for (let iter = 0; iter < 200; iter++) {
    const mid = low.plus(high).div(2);
    const umMaisC = new DecimalCredito(1).plus(mid);
    let vp = new DecimalCredito(0);
    for (let k = 1; k <= pedido.parcelas; k++) {
      const vk = new DecimalCredito(cronograma[k - 1].valor_centavos);
      vp = vp.plus(vk.div(umMaisC.pow(k)));
    }
    if (vp.gt(valorDec)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const c = low.plus(high).div(2);
  const cet_am_pct = c.times(100).toFixed(2);
  const cet_aa_pct = new DecimalCredito(1).plus(c).pow(12).minus(1).times(100).toFixed(2);

  // Saldo
  const saldo_disponivel_hoje_centavos = saldoDisponivelHoje(persona, estado);
  const saldo_suficiente = saldo_disponivel_hoje_centavos >= pedido.valor_centavos;
  const falta_saldo_centavos = Math.max(0, pedido.valor_centavos - Math.max(saldo_disponivel_hoje_centavos, 0));

  // Limite
  const cartaoVisao = consultarCartao(persona, estado);
  if (!cartaoVisao) {
    return erro(
      "OPERACAO_NAO_PERMITIDA",
      "Pix no crédito usa o cartão de crédito; esta persona não tem cartão.",
      ["cartao"],
    );
  }
  const fechadaValor =
    cartaoVisao.fatura_fechada && cartaoVisao.fatura_fechada.vencimento >= HOJE
      ? cartaoVisao.fatura_fechada.valor_centavos
      : 0;
  const abertaValor = cartaoVisao.fatura_aberta.valor_centavos;
  const proximasValor = cartaoVisao.proximas.reduce((s, f) => s + f.valor_centavos, 0);
  const usado = fechadaValor + abertaValor + proximasValor;
  const limite_disponivel_centavos = cartaoVisao.limite_centavos - usado;
  const excede_limite = total_pago_centavos > limite_disponivel_centavos;

  // Rótulo
  const jurosFormatado = jurosPublicado.replace(".", ",");
  const origemTexto = juros_origem === "premissa" ? "premissa do protótipo" : "informado";
  const rotulo = `simulação; juros de ${jurosFormatado}% a.m. (${origemTexto}), IOF 0,38% + 0,0082% ao dia; nenhum Pix foi feito`;

  const resultado: ResultadoPixCredito = {
    valor_centavos: pedido.valor_centavos,
    parcelas: pedido.parcelas,
    juros_am_pct: jurosPublicado,
    juros_origem,
    saldo_disponivel_hoje_centavos,
    saldo_suficiente,
    falta_saldo_centavos,
    iof_centavos,
    total_financiado_centavos,
    parcela_centavos,
    cronograma,
    total_pago_centavos,
    juros_total_centavos,
    custo_total_centavos,
    cet_am_pct,
    cet_aa_pct,
    limite_disponivel_centavos,
    excede_limite,
    rotulo,
  };

  return {
    ok: true,
    ...resultado,
  };
}
