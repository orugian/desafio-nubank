import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import {
  HOJE,
  esquemaResultadoPixCredito,
  estadoInicial,
} from "@/contratos";
import { simularPixCredito } from "@/dominio/credito";
import { alocarCompra, consultarCartao } from "@/dominio/cartao";
import { diaJuliano } from "@/dominio/calendario";
import { MERCADO_TESTE, P1, P2 } from "@/dominio/caixa/testes/personas";

describe("T4 · simulação de Pix no crédito", () => {
  test("1. P1, R$ 300 em 1x, sem juros informado: premissa 4.99%, IOF e PV conferidos", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);
    const r = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.juros_origem).toBe("premissa");
    expect(r.juros_am_pct).toBe("4.99");

    const aloc = alocarCompra(P1, estado, { data: HOJE, valor_centavos: 30000, parcelas: 1 });
    expect(aloc.ok).toBe(true);
    if (!aloc.ok) return;

    expect(r.cronograma).toHaveLength(1);
    expect(r.cronograma[0].fatura_id).toBe(aloc.parcelas[0].fatura_id);
    expect(r.cronograma[0].vencimento).toBe(aloc.parcelas[0].vencimento);

    // IOF à mão:
    // dias = vencimento (2026-12-05) - HOJE (2026-10-30) = 36 dias
    // IOF = round(30000 * 0,0038 + 30000 * 0,000082 * 36)
    //     = round(114 + 88,56) = round(202,56) = 203 centavos
    const dias = diaJuliano(aloc.parcelas[0].vencimento) - diaJuliano(HOJE);
    const iofEsperado = new Decimal(30000)
      .times(0.0038)
      .plus(new Decimal(30000).times(0.000082).times(dias))
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    expect(r.iof_centavos).toBe(iofEsperado);
    expect(r.iof_centavos).toBe(203);

    // PV = 30000 + 203 = 30203 centavos
    const pvEsperado = 30000 + iofEsperado;
    expect(r.total_financiado_centavos).toBe(pvEsperado);

    // valor_1 = PV + round(PV * 0,0499)
    //         = 30203 + round(1507,1297) = 30203 + 1507 = 31710 centavos
    const juros1Esperado = new Decimal(pvEsperado)
      .times(0.0499)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    const valor1Esperado = pvEsperado + juros1Esperado;
    expect(r.cronograma[0].valor_centavos).toBe(valor1Esperado);
    expect(r.cronograma[0].juros_centavos).toBe(juros1Esperado);
    expect(r.cronograma[0].amortizacao_centavos).toBe(pvEsperado);
    expect(r.parcela_centavos).toBe(valor1Esperado);
    expect(r.total_pago_centavos).toBe(valor1Esperado);

    // Rótulo
    expect(r.rotulo).toBe(
      "simulação; juros de 4,99% a.m. (premissa do protótipo), IOF 0,38% + 0,0082% ao dia; nenhum Pix foi feito",
    );

    const { ok, ...dados } = r;
    expect(esquemaResultadoPixCredito.parse(dados)).toBeDefined();
  });

  test("2. P1, R$ 1.000 em 3x com juros '5': PMT, cronograma Price, somas e totais", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);
    const r = simularPixCredito(P1, estado, {
      valor_centavos: 100000,
      parcelas: 3,
      juros_am_pct: "5",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.juros_origem).toBe("informado");
    expect(r.juros_am_pct).toBe("5.00");

    const pv = r.total_financiado_centavos;
    // PMT = round(PV * 0,05 / (1 - 1,05^-3))
    const i = new Decimal("0.05");
    const denominador = new Decimal(1).minus(new Decimal(1.05).pow(-3));
    const pmtEsperado = new Decimal(pv)
      .times(i)
      .div(denominador)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();

    expect(r.parcela_centavos).toBe(pmtEsperado);

    expect(r.cronograma).toHaveLength(3);
    expect(r.cronograma.map((c) => c.numero)).toEqual([1, 2, 3]);

    // Vencimentos estritamente crescentes
    expect(r.cronograma[0].vencimento < r.cronograma[1].vencimento).toBe(true);
    expect(r.cronograma[1].vencimento < r.cronograma[2].vencimento).toBe(true);

    // Σ amortizações = PV
    const somaAmortizacoes = r.cronograma.reduce((s, c) => s + c.amortizacao_centavos, 0);
    expect(somaAmortizacoes).toBe(pv);

    // total_pago = Σ valores
    const somaValores = r.cronograma.reduce((s, c) => s + c.valor_centavos, 0);
    expect(r.total_pago_centavos).toBe(somaValores);

    // juros_total = total_pago - PV
    expect(r.juros_total_centavos).toBe(r.total_pago_centavos - pv);

    // custo_total = total_pago - 100000
    expect(r.custo_total_centavos).toBe(r.total_pago_centavos - 100000);

    // Rótulo
    expect(r.rotulo).toBe(
      "simulação; juros de 5,00% a.m. (informado), IOF 0,38% + 0,0082% ao dia; nenhum Pix foi feito",
    );

    const { ok, ...dados } = r;
    expect(esquemaResultadoPixCredito.parse(dados)).toBeDefined();
  });

  test("3. CET para o caso 2: VP a menos de 0,01% do valor e cet_am_pct > 5.00", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);
    const r = simularPixCredito(P1, estado, {
      valor_centavos: 100000,
      parcelas: 3,
      juros_am_pct: "5",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // cet_am_pct > 5.00 (porque inclui IOF)
    expect(new Decimal(r.cet_am_pct).gt(new Decimal("5.00"))).toBe(true);

    // Σ valor_k / (1 + cet)^k com cet = Number(cet_am_pct)/100
    const cet = new Decimal(r.cet_am_pct).div(100);
    const umMaisCet = new Decimal(1).plus(cet);
    let somaVp = new Decimal(0);
    for (let k = 1; k <= r.cronograma.length; k++) {
      somaVp = somaVp.plus(new Decimal(r.cronograma[k - 1].valor_centavos).div(umMaisCet.pow(k)));
    }

    // Tolerância de 0,01% sobre o valor (0,01% de 100.000 = 10 centavos)
    const diferenca = somaVp.minus(100000).abs();
    const tolerancia = new Decimal(100000).times(0.0001);
    expect(diferenca.lte(tolerancia)).toBe(true);
  });

  test("4. Saldo: P1 (saldo 1.800) com R$ 300 → suficiente, falta 0; com R$ 2.500 → false, falta 70000", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);

    // R$ 300 (30000 centavos): saldo 180000 >= 30000
    const r1 = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 1 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.saldo_disponivel_hoje_centavos).toBe(180000);
    expect(r1.saldo_suficiente).toBe(true);
    expect(r1.falta_saldo_centavos).toBe(0);

    // R$ 2.500 (250000 centavos): saldo 180000 < 250000 -> falta 70000
    const r2 = simularPixCredito(P1, estado, { valor_centavos: 250000, parcelas: 1 });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.saldo_disponivel_hoje_centavos).toBe(180000);
    expect(r2.saldo_suficiente).toBe(false);
    expect(r2.falta_saldo_centavos).toBe(70000);
  });

  test("5. P2 (sem cartão) → OPERACAO_NAO_PERMITIDA campo 'cartao'", () => {
    const estado = estadoInicial(P2.id, MERCADO_TESTE);
    const r = simularPixCredito(P2, estado, { valor_centavos: 30000, parcelas: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.codigo).toBe("OPERACAO_NAO_PERMITIDA");
    expect(r.erro.campos).toEqual(["cartao"]);
    expect(r.erro.mensagem).toBe("Pix no crédito usa o cartão de crédito; esta persona não tem cartão.");
  });

  test("6. Erros de validação: parcelas 0 e 13, juros 0, 31, abc, valor 0", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);

    // parcelas 0
    const rParc0 = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 0 });
    expect(rParc0.ok).toBe(false);
    if (!rParc0.ok) {
      expect(rParc0.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rParc0.erro.campos).toEqual(["parcelas"]);
    }

    // parcelas 13
    const rParc13 = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 13 });
    expect(rParc13.ok).toBe(false);
    if (!rParc13.ok) {
      expect(rParc13.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rParc13.erro.campos).toEqual(["parcelas"]);
    }

    // juros "0"
    const rJur0 = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 1, juros_am_pct: "0" });
    expect(rJur0.ok).toBe(false);
    if (!rJur0.ok) {
      expect(rJur0.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rJur0.erro.campos).toEqual(["juros_am_pct"]);
    }

    // juros "31"
    const rJur31 = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 1, juros_am_pct: "31" });
    expect(rJur31.ok).toBe(false);
    if (!rJur31.ok) {
      expect(rJur31.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rJur31.erro.campos).toEqual(["juros_am_pct"]);
    }

    // juros "abc"
    const rJurAbc = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 1, juros_am_pct: "abc" });
    expect(rJurAbc.ok).toBe(false);
    if (!rJurAbc.ok) {
      expect(rJurAbc.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rJurAbc.erro.campos).toEqual(["juros_am_pct"]);
    }

    // valor 0
    const rVal0 = simularPixCredito(P1, estado, { valor_centavos: 0, parcelas: 1 });
    expect(rVal0.ok).toBe(false);
    if (!rVal0.ok) {
      expect(rVal0.erro.codigo).toBe("VALOR_INVALIDO");
      expect(rVal0.erro.campos).toEqual(["valor"]);
    }
  });

  test("7. Limite: P1 conferido recomputando com consultarCartao; Pix R$ 3.500 em 12x juros 10 excede", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);
    const c = consultarCartao(P1, estado);
    expect(c).not.toBeNull();
    if (!c) return;

    const fechada = c.fatura_fechada && c.fatura_fechada.vencimento >= HOJE ? c.fatura_fechada.valor_centavos : 0;
    const aberta = c.fatura_aberta.valor_centavos;
    const proximas = c.proximas.reduce((s, f) => s + f.valor_centavos, 0);
    const limiteDisponivelEsperado = 400000 - fechada - aberta - proximas;

    const rNormal = simularPixCredito(P1, estado, { valor_centavos: 30000, parcelas: 1 });
    expect(rNormal.ok).toBe(true);
    if (!rNormal.ok) return;
    expect(rNormal.limite_disponivel_centavos).toBe(limiteDisponivelEsperado);
    expect(rNormal.excede_limite).toBe(false);

    // Pix de R$ 3.500 em 12x com juros "10"
    const rGrande = simularPixCredito(P1, estado, { valor_centavos: 350000, parcelas: 12, juros_am_pct: "10" });
    expect(rGrande.ok).toBe(true);
    if (!rGrande.ok) return;
    expect(rGrande.excede_limite).toBe(true);
    expect(rGrande.total_pago_centavos).toBeGreaterThan(rGrande.limite_disponivel_centavos);
  });

  test("8. Estado de entrada idêntico após a chamada (somente leitura)", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);
    const clone = structuredClone(estado);
    const r = simularPixCredito(P1, estado, { valor_centavos: 50000, parcelas: 2 });
    expect(r.ok).toBe(true);
    expect(estado).toEqual(clone);
  });

  test("9. Todo resultado ok passa em esquemaResultadoPixCredito.parse", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);

    const casos = [
      { valor_centavos: 10000, parcelas: 1 },
      { valor_centavos: 50000, parcelas: 3, juros_am_pct: "3.5" },
      { valor_centavos: 120000, parcelas: 6, juros_am_pct: "4.999" },
      { valor_centavos: 200000, parcelas: 12, juros_am_pct: "2.50" },
      { valor_centavos: 350000, parcelas: 12, juros_am_pct: "10" },
    ];

    for (const caso of casos) {
      const r = simularPixCredito(P1, estado, caso);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const { ok, ...dados } = r;
      expect(() => esquemaResultadoPixCredito.parse(dados)).not.toThrow();
    }
  });

  test("normalização de juros_am_pct com diferentes casas decimais", () => {
    const estado = estadoInicial(P1.id, MERCADO_TESTE);

    // 1 casa: "3.5" -> "3.50"
    const r1 = simularPixCredito(P1, estado, { valor_centavos: 10000, parcelas: 1, juros_am_pct: "3.5" });
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.juros_am_pct).toBe("3.50");

    // 0 casas: "5" -> "5.00"
    const r2 = simularPixCredito(P1, estado, { valor_centavos: 10000, parcelas: 1, juros_am_pct: "5" });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.juros_am_pct).toBe("5.00");

    // 2 casas: "4.99" -> "4.99"
    const r3 = simularPixCredito(P1, estado, { valor_centavos: 10000, parcelas: 1, juros_am_pct: "4.99" });
    expect(r3.ok).toBe(true);
    if (r3.ok) expect(r3.juros_am_pct).toBe("4.99");

    // 3 casas: "4.999" -> "4.999"
    const r4 = simularPixCredito(P1, estado, { valor_centavos: 10000, parcelas: 1, juros_am_pct: "4.999" });
    expect(r4.ok).toBe(true);
    if (r4.ok) expect(r4.juros_am_pct).toBe("4.999");

    // 4 casas: "4.9999" -> "4.9999"
    const r5 = simularPixCredito(P1, estado, { valor_centavos: 10000, parcelas: 1, juros_am_pct: "4.9999" });
    expect(r5.ok).toBe(true);
    if (r5.ok) expect(r5.juros_am_pct).toBe("4.9999");
  });
});
