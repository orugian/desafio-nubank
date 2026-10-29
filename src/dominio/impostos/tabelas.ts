import Decimal from "decimal.js";

const DecimalTabelas = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

/**
 * Constantes da tributação de 2026 (Lei 15.191/2025 e Lei 15.270/2025, Receita Federal).
 */
export const DESCONTO_SIMPLIFICADO_MENSAL = 60720;
export const DESCONTO_SIMPLIFICADO_ANUAL_MAX = 1764000;
export const ISENCAO_ACOES_MES = 2000000;
export const ISENCAO_CRIPTO_MES = 3500000;
export const ALIQUOTA_COME_COTAS = "15.00";
export const ALIQUOTA_GANHO_CAPITAL = "15.00";

/**
 * Alíquota regressiva de IR para renda fixa:
 * ≤ 180 dias: 22,50%
 * 181 a 360 dias: 20,00%
 * 361 a 720 dias: 17,50%
 * > 720 dias: 15,00%
 */
export function aliquotaIrRendaFixaPct(diasCorridos: number): string {
  if (diasCorridos <= 180) return "22.50";
  if (diasCorridos <= 360) return "20.00";
  if (diasCorridos <= 720) return "17.50";
  return "15.00";
}

/**
 * Tabela regressiva de IOF para resgates de renda fixa em menos de 30 dias.
 * Dia 0: "96.00", Dia 1: "96.00", ..., Dia 29: "3.00", ≥ 30: "0.00".
 */
const TABELA_IOF_REGRESSIVO: readonly string[] = [
  "96.00", // dia 0
  "96.00", // dia 1
  "93.00", // dia 2
  "90.00", // dia 3
  "86.00", // dia 4
  "83.00", // dia 5
  "80.00", // dia 6
  "76.00", // dia 7
  "73.00", // dia 8
  "70.00", // dia 9
  "66.00", // dia 10
  "63.00", // dia 11
  "60.00", // dia 12
  "56.00", // dia 13
  "53.00", // dia 14
  "50.00", // dia 15
  "46.00", // dia 16
  "43.00", // dia 17
  "40.00", // dia 18
  "36.00", // dia 19
  "33.00", // dia 20
  "30.00", // dia 21
  "26.00", // dia 22
  "23.00", // dia 23
  "20.00", // dia 24
  "16.00", // dia 25
  "13.00", // dia 26
  "10.00", // dia 27
  "6.00",  // dia 28
  "3.00",  // dia 29
];

export function aliquotaIofPct(diasCorridos: number): string {
  if (diasCorridos <= 0) return "96.00";
  if (diasCorridos >= 30) return "0.00";
  return TABELA_IOF_REGRESSIVO[diasCorridos] ?? "0.00";
}

/**
 * Imposto mensal pela tabela progressiva de 2026 (antes da redução):
 * - até 242.880 centavos (R$ 2.428,80): isento
 * - até 282.665 centavos (R$ 2.826,65): 7,5% − 18.216 centavos
 * - até 375.105 centavos (R$ 3.751,05): 15% − 39.416 centavos
 * - até 466.468 centavos (R$ 4.664,68): 22,5% − 67.549 centavos
 * - acima: 27,5% − 90.873 centavos
 * Faixas com limite superior inclusivo.
 */
export function impostoTabelaMensal(baseCentavos: number): number {
  if (baseCentavos <= 242880) return 0;
  const base = new DecimalTabelas(baseCentavos);
  let imposto: Decimal;
  if (baseCentavos <= 282665) {
    imposto = base.mul(new DecimalTabelas("0.075")).sub(new DecimalTabelas("18216"));
  } else if (baseCentavos <= 375105) {
    imposto = base.mul(new DecimalTabelas("0.15")).sub(new DecimalTabelas("39416"));
  } else if (baseCentavos <= 466468) {
    imposto = base.mul(new DecimalTabelas("0.225")).sub(new DecimalTabelas("67549"));
  } else {
    imposto = base.mul(new DecimalTabelas("0.275")).sub(new DecimalTabelas("90873"));
  }
  const arredondado = imposto.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  return Math.max(0, arredondado);
}

/**
 * Redução mensal do IR (Lei 15.270/2025):
 * - rendimento ≤ 500.000: redução = imposto (zera o imposto)
 * - entre 500.000 e 735.000: max(0, 97.862 − 0,133145 × rendimento), limitada ao imposto
 * - ≥ 735.000: 0
 */
export function reducaoMensal(rendimentoCentavos: number, impostoCentavos: number): number {
  if (impostoCentavos <= 0) return 0;
  if (rendimentoCentavos <= 500000) return impostoCentavos;
  if (rendimentoCentavos >= 735000) return 0;
  const red = new DecimalTabelas("97862")
    .sub(new DecimalTabelas("0.133145").mul(rendimentoCentavos))
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  return Math.min(impostoCentavos, Math.max(0, red));
}

/**
 * Imposto anual pela tabela progressiva de 2026 (exercício 2027, antes da redução):
 * - até 2.914.560 centavos (R$ 29.145,60): isento
 * - até 3.391.980 centavos (R$ 33.919,80): 7,5% − 218.592 centavos
 * - até 4.501.260 centavos (R$ 45.012,60): 15% − 472.991 centavos
 * - até 5.597.616 centavos (R$ 55.976,16): 22,5% − 810.585 centavos
 * - acima: 27,5% − 1.090.466 centavos
 * Faixas com limite superior inclusivo.
 */
export function impostoTabelaAnual(baseCentavos: number): number {
  if (baseCentavos <= 2914560) return 0;
  const base = new DecimalTabelas(baseCentavos);
  let imposto: Decimal;
  if (baseCentavos <= 3391980) {
    imposto = base.mul(new DecimalTabelas("0.075")).sub(new DecimalTabelas("218592"));
  } else if (baseCentavos <= 4501260) {
    imposto = base.mul(new DecimalTabelas("0.15")).sub(new DecimalTabelas("472991"));
  } else if (baseCentavos <= 5597616) {
    imposto = base.mul(new DecimalTabelas("0.225")).sub(new DecimalTabelas("810585"));
  } else {
    imposto = base.mul(new DecimalTabelas("0.275")).sub(new DecimalTabelas("1090466"));
  }
  const arredondado = imposto.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  return Math.max(0, arredondado);
}

/**
 * Redução anual do IR (Lei 15.270/2025):
 * - rendimento ≤ 6.000.000: redução = imposto (zera o imposto)
 * - entre 6.000.000 e 8.820.000: max(0, 842.973 − 0,095575 × rendimento), limitada ao imposto
 * - ≥ 8.820.000: 0
 */
export function reducaoAnual(rendimentoCentavos: number, impostoCentavos: number): number {
  if (impostoCentavos <= 0) return 0;
  if (rendimentoCentavos <= 6000000) return impostoCentavos;
  if (rendimentoCentavos >= 8820000) return 0;
  const red = new DecimalTabelas("842973")
    .sub(new DecimalTabelas("0.095575").mul(rendimentoCentavos))
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  return Math.min(impostoCentavos, Math.max(0, red));
}
