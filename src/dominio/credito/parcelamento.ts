import Decimal from "decimal.js";
import {
  PREMISSAS_CREDITO,
  erro,
  textos,
  type EstadoSessao,
  type OpcaoParcelamento,
  type Persona,
  type ResultadoDominio,
  type ResultadoSimulacaoParcelamento,
} from "@/contratos";

// Simulação de compra parcelada (loja, carnê, financiamento, cartão) com valores
// informados pela pessoa. Função pura: não lança; erros via `erro(...)`.
//
// Fórmulas (Decimal com precision 50, ROUND_HALF_UP; só valores publicados são arredondados):
// - à vista            = round(valor × (1 − desconto/100))
// - financiado         = valor − entrada
// - sem juros (i = 0)  : parcela = round(financiado ÷ n); última = financiado − (n − 1) × parcela
// - com juros (Price)  : PMT = round(financiado × i ÷ (1 − (1 + i)^−n)); cronograma como no Pix no crédito:
//                        juros_k = round(saldo × i), amort_k = PMT − juros_k (k < n); a última fecha o saldo
//                        (saldo + round(saldo × i)), por isso pode diferir de PMT em alguns centavos.
// - total pago         = entrada + Σ parcelas; juros = total − valor; custo vs à vista = total − à vista
// - CDI mensal         = (1 + taxa_diária)^21 − 1  (premissa: 21 dias úteis por mês; bruto, sem IR)
// - valor presente     = entrada + Σ parcela_k ÷ (1 + CDI mensal)^k  (1ª parcela em 1 mês)
// - vantagem vs à vista = à vista − valor presente (positivo = parcelar custa menos que pagar à vista)
// - CET mensal         = c tal que financiado = Σ parcela_k ÷ (1 + c)^k (bisseção em [0, 1])

const D = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const REGEX_TAXA = /^\d{1,3}(\.\d{1,4})?$/;
const DIAS_UTEIS_MES = 21;
const OPCOES_PADRAO_MAX = [6, 12, 18, 24, 36, 48, 60, 72];
const OPCOES_SEM_MAX = [3, 6, 10, 12];
const MAX_OPCOES = 6;

export type PedidoParcelamento = {
  valor_centavos: number;
  entrada_centavos?: number;
  parcelas_max?: number;
  opcoes_parcelas?: number[];
  juros_am_pct?: string;
  desconto_a_vista_pct?: string;
};

/** "2.9" → "2.90", "0" → "0.00", "2.995" → "2.995" (mínimo de 2 casas). */
function normalizarPct(texto: string): string {
  const [inteiro, decimal = ""] = texto.split(".");
  const inteiroLimpo = String(Number(inteiro));
  return `${inteiroLimpo}.${decimal.length <= 2 ? decimal.padEnd(2, "0") : decimal}`;
}

function arred(x: Decimal): number {
  return x.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

function pct2(x: Decimal): string {
  return x.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

/** Opções de parcelas a simular (ordenadas, sem repetição). */
export function escolherOpcoes(parcelas_max?: number, opcoes_parcelas?: number[]): number[] {
  if (opcoes_parcelas !== undefined) return [...opcoes_parcelas].sort((a, b) => a - b);
  if (parcelas_max !== undefined) {
    const conjunto = [...new Set([...OPCOES_PADRAO_MAX.filter((n) => n <= parcelas_max), parcelas_max])].sort(
      (a, b) => a - b,
    );
    // No máximo 6: ficam as maiores (o máximo oferecido sempre entra).
    return conjunto.slice(-MAX_OPCOES);
  }
  return [...OPCOES_SEM_MAX];
}

/** Valor presente de fluxos mensais (k = 1..n) a uma taxa mensal. */
function valorPresente(fluxos: number[], taxa: Decimal): Decimal {
  const desconto = new D(1).div(new D(1).plus(taxa));
  let fator = new D(1);
  let vp = new D(0);
  for (const f of fluxos) {
    fator = fator.times(desconto);
    vp = vp.plus(new D(f).times(fator));
  }
  return vp;
}

/** Taxa mensal c em [0, 1] tal que Σ fluxo_k ÷ (1 + c)^k = alvo (bisseção, 100 iterações). */
function taxaInterna(fluxos: number[], alvo: number): Decimal {
  const alvoDec = new D(alvo);
  let low = new D(0);
  let high = new D(1);
  for (let iter = 0; iter < 100; iter++) {
    const mid = low.plus(high).div(2);
    if (valorPresente(fluxos, mid).gt(alvoDec)) low = mid;
    else high = mid;
  }
  return low.plus(high).div(2);
}

/** Fluxo de parcelas para n meses (ver fórmulas no topo). */
function parcelasDe(financiado: number, n: number, i: Decimal): number[] {
  if (i.isZero()) {
    const base = arred(new D(financiado).div(n));
    const fluxos = Array.from({ length: n }, () => base);
    fluxos[n - 1] = financiado - base * (n - 1);
    return fluxos;
  }
  const umMaisI = new D(1).plus(i);
  const pmt = arred(new D(financiado).times(i).div(new D(1).minus(umMaisI.pow(-n))));
  const fluxos: number[] = [];
  let saldo = financiado;
  for (let k = 1; k < n; k++) {
    const juros = arred(new D(saldo).times(i));
    saldo -= pmt - juros;
    fluxos.push(pmt);
  }
  fluxos.push(saldo + arred(new D(saldo).times(i)));
  return fluxos;
}

export function simularParcelamento(
  persona: Persona,
  estado: EstadoSessao,
  pedido: PedidoParcelamento,
): ResultadoDominio<ResultadoSimulacaoParcelamento> {
  const valor = pedido.valor_centavos;
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["valor"]);
  }

  const entrada = pedido.entrada_centavos ?? 0;
  if (!Number.isSafeInteger(entrada) || entrada < 0) {
    return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["entrada"]);
  }
  if (entrada >= valor) {
    return erro("ARGUMENTOS_INVALIDOS", "A entrada precisa ser menor que o valor da compra.", ["entrada"]);
  }

  if (pedido.parcelas_max !== undefined) {
    const m = pedido.parcelas_max;
    if (!Number.isInteger(m) || m < 2 || m > 72) {
      return erro("ARGUMENTOS_INVALIDOS", "parcelas_max deve ser um inteiro de 2 a 72.", ["parcelas_max"]);
    }
  }
  if (pedido.opcoes_parcelas !== undefined) {
    const ops = pedido.opcoes_parcelas;
    const validas =
      ops.length >= 1 &&
      ops.length <= MAX_OPCOES &&
      ops.every((n) => Number.isInteger(n) && n >= 1 && n <= 72) &&
      new Set(ops).size === ops.length;
    if (!validas) {
      return erro(
        "ARGUMENTOS_INVALIDOS",
        "opcoes_parcelas deve ter de 1 a 6 inteiros distintos entre 1 e 72.",
        ["opcoes_parcelas"],
      );
    }
  }

  let jurosPublicado: string;
  let juros_origem: "premissa" | "informado";
  if (pedido.juros_am_pct !== undefined) {
    if (!REGEX_TAXA.test(pedido.juros_am_pct) || new D(pedido.juros_am_pct).gt(30)) {
      return erro("ARGUMENTOS_INVALIDOS", "juros_am_pct deve estar entre 0 e 30 (% ao mês).", ["juros_am_pct"]);
    }
    jurosPublicado = normalizarPct(pedido.juros_am_pct);
    juros_origem = "informado";
  } else {
    jurosPublicado = PREMISSAS_CREDITO.juros_parcelamento_am_pct;
    juros_origem = "premissa";
  }

  let descontoPublicado = "0.00";
  if (pedido.desconto_a_vista_pct !== undefined) {
    if (!REGEX_TAXA.test(pedido.desconto_a_vista_pct) || new D(pedido.desconto_a_vista_pct).gt(50)) {
      return erro(
        "ARGUMENTOS_INVALIDOS",
        "desconto_a_vista_pct deve estar entre 0 e 50 (%).",
        ["desconto_a_vista_pct"],
      );
    }
    descontoPublicado = normalizarPct(pedido.desconto_a_vista_pct);
  }

  const taxaDiaria = estado.mercado.cdi.taxa_diaria_pct;
  const cdiMensal = new D(1).plus(new D(taxaDiaria).div(100)).pow(DIAS_UTEIS_MES).minus(1);
  const i = new D(jurosPublicado).div(100);
  const financiado = valor - entrada;
  const a_vista_centavos = arred(new D(valor).times(new D(1).minus(new D(descontoPublicado).div(100))));
  const renda = persona.renda?.liquido_mensal_centavos ?? null;

  const opcoes: OpcaoParcelamento[] = [];
  for (const n of escolherOpcoes(pedido.parcelas_max, pedido.opcoes_parcelas)) {
    const fluxos = parcelasDe(financiado, n, i);
    if (fluxos.some((f) => f <= 0)) {
      return erro(
        "ARGUMENTOS_INVALIDOS",
        "O valor financiado é pequeno demais para esse número de parcelas.",
        ["opcoes_parcelas"],
      );
    }
    const parcela_centavos = fluxos[0]!;
    const ultima_parcela_centavos = fluxos[n - 1]!;
    const total_pago_centavos = entrada + fluxos.reduce((s, f) => s + f, 0);
    const valor_presente_centavos = arred(new D(entrada).plus(valorPresente(fluxos, cdiMensal)));
    opcoes.push({
      parcelas: n,
      parcela_centavos,
      ultima_parcela_centavos,
      total_pago_centavos,
      juros_total_centavos: total_pago_centavos - valor,
      custo_vs_a_vista_centavos: total_pago_centavos - a_vista_centavos,
      valor_presente_centavos,
      vantagem_vs_a_vista_centavos: a_vista_centavos - valor_presente_centavos,
      cet_am_pct: pct2(taxaInterna(fluxos, financiado).times(100)),
      comprometimento_renda_pct: renda === null ? null : pct2(new D(parcela_centavos).div(renda).times(100)),
    });
  }

  // Menor custo: menor valor presente; empate com à vista → à vista; empate entre opções → menos parcelas.
  let menor_custo: "a_vista" | number = "a_vista";
  let menorValor = a_vista_centavos;
  for (const o of opcoes) {
    if (o.valor_presente_centavos < menorValor) {
      menorValor = o.valor_presente_centavos;
      menor_custo = o.parcelas;
    }
  }
  let menor_parcela = opcoes[0]!.parcelas;
  let menorParcelaValor = opcoes[0]!.parcela_centavos;
  for (const o of opcoes) {
    if (o.parcela_centavos < menorParcelaValor) {
      menorParcelaValor = o.parcela_centavos;
      menor_parcela = o.parcelas;
    }
  }

  const cdi_mensal_pct = pct2(cdiMensal.times(100));
  const jurosTexto = jurosPublicado.replace(".", ",");
  const origemTexto = juros_origem === "premissa" ? "premissa do protótipo" : "informado";
  const cdiTexto = cdi_mensal_pct.replace(".", ",");
  const rotulo = `simulação; juros de ${jurosTexto}% a.m. (${origemTexto}), sem IOF e tarifas; custo de oportunidade pelo CDI de ${cdiTexto}% a.m. (bruto); nada foi contratado`;

  const premissas = [
    juros_origem === "premissa"
      ? `juros de ${jurosTexto}% a.m. é premissa do protótipo, não a taxa da loja`
      : `juros de ${jurosTexto}% a.m. informado pela pessoa`,
    i.isZero()
      ? "sem juros: parcelas iguais; a última absorve a diferença de arredondamento"
      : "parcelas mensais fixas (tabela Price); a última fecha o saldo e pode variar alguns centavos",
    `CDI mensal = (1 + CDI diário de ${taxaDiaria.replace(".", ",")}%)^21 − 1 (21 dias úteis por mês), CDI de ${estado.mercado.cdi.data_ref}`,
    "valor presente: quanto as parcelas valem hoje se o dinheiro ficasse rendendo no CDI (bruto, sem IR)",
    "sem IOF, tarifas ou seguros",
  ];

  return {
    ok: true,
    valor_centavos: valor,
    entrada_centavos: entrada,
    financiado_centavos: financiado,
    desconto_a_vista_pct: descontoPublicado,
    a_vista_centavos,
    juros_am_pct: jurosPublicado,
    juros_origem,
    cdi_mensal_pct,
    cdi_data_ref: estado.mercado.cdi.data_ref,
    renda_liquida_mensal_centavos: renda,
    opcoes,
    menor_custo,
    menor_parcela,
    premissas,
    rotulo,
  };
}
