import { describe, expect, test } from "vitest";
import Decimal from "decimal.js";
import {
  HOJE,
  esquemaResultadoComparativo,
  esquemaResultadoSimulacaoInvestimento,
  estadoInicial,
  type Contexto,
  type EstadoSessao,
} from "@/contratos";
import { carregarPersona } from "@/dados";
import { snapshotGravado } from "@/mercado";
import { criarCalendario } from "@/dominio/calendario";
import { consultarInvestimentos, indiceTaxasCdi, avaliarRendaFixaCdi } from "@/dominio/investimentos";
import { compararInvestimento } from "./comparativo";
import { simularInvestimento } from "./simulacao";
import cdiJson from "../../../dados/mercado/cdi.json";
import btcJson from "../../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../../dados/mercado/fechamentos-PETR4.json";

const contextoReal: Contexto = {
  series: {
    cdi: cdiJson,
    fechamentos: {
      PETR4: petr4Json,
      BTC: btcJson,
    },
  },
  calendario: criarCalendario({ datas_cdi: cdiJson.serie.map((x) => x.data) }),
};

const mercadoReal = snapshotGravado();
const rP1 = carregarPersona("p1");
if (!rP1.ok) throw new Error("Falha ao carregar persona p1");
const p1 = rP1.persona;
const estadoP1 = estadoInicial("p1", mercadoReal);

const rP2 = carregarPersona("p2");
if (!rP2.ok) throw new Error("Falha ao carregar persona p2");
const p2 = rP2.persona;
const estadoP2 = estadoInicial("p2", mercadoReal);

describe("T5 — Comparativo de investimento e simulação de retorno", () => {
  test("1. P1 INV3 (PETR4): aportes [{2026-08-14, 42090}], aplicado 42090, real.valor = valor_atual de consultarInvestimentos, cdi.valor = avaliarRendaFixaCdi recalculado no teste; diferença = cdi − real; melhor coerente; dias_corridos 77", () => {
    const r = compararInvestimento(p1, estadoP1, contextoReal, { posicao_id: "INV3" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Aportes: 1 compra de 10 PETR4 a 4209 centavos = 42090 centavos em 2026-08-14
    expect(r.aportes).toEqual([{ data: "2026-08-14", valor_centavos: 42090 }]);
    expect(r.aplicado_centavos).toBe(42090);
    // 2026-08-14 até 2026-10-30: 17 dias (ago) + 30 dias (set) + 30 dias (out) = 77 dias corridos
    expect(r.dias_corridos).toBe(77);

    const rInv = consultarInvestimentos(p1, estadoP1, contextoReal, {});
    expect(rInv.ok).toBe(true);
    if (!rInv.ok) return;
    const posInv3 = rInv.posicoes.find((p) => p.posicao_id === "INV3")!;
    expect(r.real.valor_centavos).toBe(posInv3.valor_atual_centavos);
    expect(r.real.resultado_centavos).toBe(posInv3.resultado_centavos);
    expect(r.real.rentabilidade_pct).toBe(posInv3.rentabilidade_pct);

    const { taxaNoDia } = indiceTaxasCdi(contextoReal);
    const avalCdi = avaliarRendaFixaCdi(
      [{ data: "2026-08-14", valor_centavos: 42090 }],
      100,
      contextoReal,
      taxaNoDia,
    );
    const altCdi = r.alternativas.find((a) => a.id === "cdi")!;
    expect(altCdi.valor_centavos).toBe(avalCdi.valorAtual);
    // diferença = cdi - real
    expect(altCdi.diferenca_centavos).toBe(avalCdi.valorAtual - posInv3.valor_atual_centavos);

    const esperadoMelhor = avalCdi.valorAtual > posInv3.valor_atual_centavos ? "cdi" : "real";
    expect(r.melhor).toBe(esperadoMelhor);
  });

  test("2. Mesmo caso com prefixado_aa_pct: '12': 2 alternativas, prefixado conferido no teste com Decimal (du contado com o calendário)", () => {
    const r = compararInvestimento(p1, estadoP1, contextoReal, {
      posicao_id: "INV3",
      prefixado_aa_pct: "12",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.alternativas).toHaveLength(2);
    const altPrefixado = r.alternativas.find((a) => a.id === "prefixado")!;
    expect(altPrefixado.nome).toBe("Prefixado 12% a.a.");

    // Cálculo à mão no teste com Decimal:
    // du de 2026-08-14 até HOJE (2026-10-30)
    const du = contextoReal.calendario.diasUteisEntre("2026-08-14", HOJE);
    const taxa = new Decimal("12").div(100);
    const exp = new Decimal(du).div(252);
    const fator = new Decimal(1).add(taxa).pow(exp);
    const valorEsperado = new Decimal(42090).mul(fator).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

    expect(altPrefixado.valor_centavos).toBe(valorEsperado);
    expect(altPrefixado.resultado_centavos).toBe(valorEsperado - 42090);
    expect(altPrefixado.diferenca_centavos).toBe(valorEsperado - r.real.valor_centavos);
  });

  test("3. P1 INV1 (caixinha 100% CDI) comparado com cdi_pct 100: alternativa cdi.valor == real.valor e melhor 'real' (empate). Com cdi_pct 120: alternativa maior e melhor 'cdi'", () => {
    const r100 = compararInvestimento(p1, estadoP1, contextoReal, { posicao_id: "INV1", cdi_pct: 100 });
    expect(r100.ok).toBe(true);
    if (!r100.ok) return;

    const altCdi100 = r100.alternativas.find((a) => a.id === "cdi")!;
    expect(altCdi100.valor_centavos).toBe(r100.real.valor_centavos);
    // Empate favorece "real"
    expect(r100.melhor).toBe("real");

    const r120 = compararInvestimento(p1, estadoP1, contextoReal, { posicao_id: "INV1", cdi_pct: 120 });
    expect(r120.ok).toBe(true);
    if (!r120.ok) return;

    const altCdi120 = r120.alternativas.find((a) => a.id === "cdi")!;
    expect(altCdi120.valor_centavos).toBeGreaterThan(r120.real.valor_centavos);
    expect(r120.melhor).toBe("cdi");
  });

  test("4. P2 INV5 (BTC) e P2 INV4 (fundo 98%): resultados válidos; INV4 com cdi 100 → melhor 'cdi'", () => {
    const rBtc = compararInvestimento(p2, estadoP2, contextoReal, { posicao_id: "INV5" });
    expect(rBtc.ok).toBe(true);
    if (!rBtc.ok) return;
    expect(rBtc.posicao.categoria).toBe("cripto");
    expect(rBtc.posicao.ticker).toBe("BTC");
    expect(rBtc.alternativas).toHaveLength(1);

    const rFundo = compararInvestimento(p2, estadoP2, contextoReal, { posicao_id: "INV4", cdi_pct: 100 });
    expect(rFundo.ok).toBe(true);
    if (!rFundo.ok) return;
    // INV4 rende 98% CDI, alternativa tem 100% CDI → alternativa rende mais
    expect(rFundo.melhor).toBe("cdi");
  });

  test("5. Erros: SEP; INV9 (sem aportes); 'INV99'; prefixado '0'; cdi_pct 0", () => {
    // SEP: saldo_separado
    const rSep = compararInvestimento(p1, estadoP1, contextoReal, { posicao_id: "SEP" });
    expect(rSep.ok).toBe(false);
    if (!rSep.ok) {
      expect(rSep.erro.codigo).toBe("OPERACAO_NAO_PERMITIDA");
      expect(rSep.erro.mensagem).toBe("Saldo separado não rende; não há o que comparar.");
      expect(rSep.erro.campos).toEqual(["posicao_id"]);
    }

    // INV9: caixinha sem aportes
    const rInv9 = compararInvestimento(p1, estadoP1, contextoReal, { posicao_id: "INV9" });
    expect(rInv9.ok).toBe(false);
    if (!rInv9.ok) {
      expect(rInv9.erro.codigo).toBe("OPERACAO_NAO_PERMITIDA");
      expect(rInv9.erro.mensagem).toBe("Essa posição ainda não tem aplicações para comparar.");
      expect(rInv9.erro.campos).toEqual(["posicao_id"]);
    }

    // INV99: inexistente
    const rInexistente = compararInvestimento(p1, estadoP1, contextoReal, { posicao_id: "INV99" });
    expect(rInexistente.ok).toBe(false);
    if (!rInexistente.ok) {
      expect(rInexistente.erro.codigo).toBe("POSICAO_INEXISTENTE");
      expect(rInexistente.erro.campos).toEqual(["posicao_id"]);
    }

    // Prefixado "0"
    const rPrefZero = compararInvestimento(p1, estadoP1, contextoReal, {
      posicao_id: "INV1",
      prefixado_aa_pct: "0",
    });
    expect(rPrefZero.ok).toBe(false);
    if (!rPrefZero.ok) {
      expect(rPrefZero.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rPrefZero.erro.campos).toEqual(["prefixado_aa_pct"]);
    }

    // CDI 0
    const rCdiZero = compararInvestimento(p1, estadoP1, contextoReal, {
      posicao_id: "INV1",
      cdi_pct: 0,
    });
    expect(rCdiZero.ok).toBe(false);
    if (!rCdiZero.ok) {
      expect(rCdiZero.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rCdiZero.erro.campos).toEqual(["cdi_pct"]);
    }
  });

  test("6. INV9 com operação executada de R$ 500 hoje (estado com operacoes e contadores.OP): aceito; dias_corridos 0; resultado 0 nas duas pontas", () => {
    const estadoComOp: EstadoSessao = {
      ...estadoP1,
      operacoes: [
        {
          id: "OP1",
          valor_centavos: 50000,
          destino: "INV9",
          data: HOJE,
        },
      ],
      contadores: {
        ...estadoP1.contadores,
        OP: 1,
      },
    };

    const r = compararInvestimento(p1, estadoComOp, contextoReal, { posicao_id: "INV9" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.dias_corridos).toBe(0);
    expect(r.real.resultado_centavos).toBe(0);
    const altCdi = r.alternativas.find((a) => a.id === "cdi")!;
    expect(altCdi.resultado_centavos).toBe(0);
  });

  test("7. simularInvestimento CDI R$ 1.000, 100%, prazo 12 meses: fim 2027-10-30, dias 365 → IR '17.50', IOF '0.00'; bruto conferido no teste com Decimal e du do calendário; líquido = bruto − round(bruto × 17,5%)", () => {
    const r = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "cdi",
      cdi_pct: 100,
      prazo_meses: 12,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.fim).toBe("2027-10-30");
    expect(r.dias_corridos).toBe(365);
    expect(r.aliquota_iof_pct).toBe("0.00");
    expect(r.iof_centavos).toBe(0);
    expect(r.aliquota_ir_pct).toBe("17.50");

    // Cálculo com Decimal:
    const du = contextoReal.calendario.diasUteisEntre(HOJE, "2027-10-30");
    const taxaDia = new Decimal(mercadoReal.cdi.taxa_diaria_pct).div(100);
    const fator = new Decimal(1).add(taxaDia).pow(du);
    const brutoEsp = new Decimal(100000).mul(fator.sub(1)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    const irEsp = new Decimal(brutoEsp).mul("0.175").toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    const liquidoEsp = brutoEsp - irEsp;

    expect(r.rendimento_bruto_centavos).toBe(brutoEsp);
    expect(r.ir_centavos).toBe(irEsp);
    expect(r.rendimento_liquido_centavos).toBe(liquidoEsp);
    expect(r.valor_final_liquido_centavos).toBe(100000 + liquidoEsp);
  });

  test("8. Prefixado R$ 1.000 a '12' por ate_data 2026-11-10 (11 dias): IOF '63.00', IR '22.50'; contas conferidas", () => {
    const r = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "prefixado",
      taxa_aa_pct: "12",
      ate_data: "2026-11-10",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.dias_corridos).toBe(11);
    expect(r.aliquota_iof_pct).toBe("63.00");
    expect(r.aliquota_ir_pct).toBe("22.50");

    // Cálculo com Decimal:
    const du = contextoReal.calendario.diasUteisEntre(HOJE, "2026-11-10");
    const taxa = new Decimal("12").div(100);
    const exp = new Decimal(du).div(252);
    const fator = new Decimal(1).add(taxa).pow(exp);
    const brutoEsp = new Decimal(100000).mul(fator.sub(1)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    const iofEsp = new Decimal(brutoEsp).mul("0.63").toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    const baseIr = brutoEsp - iofEsp;
    const irEsp = new Decimal(baseIr).mul("0.225").toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    const liquidoEsp = brutoEsp - iofEsp - irEsp;

    expect(r.rendimento_bruto_centavos).toBe(brutoEsp);
    expect(r.iof_centavos).toBe(iofEsp);
    expect(r.ir_centavos).toBe(irEsp);
    expect(r.rendimento_liquido_centavos).toBe(liquidoEsp);
    expect(r.valor_final_liquido_centavos).toBe(100000 + liquidoEsp);
  });

  test("9. prazo_meses 4 → fim 2027-02-28 e erros de datas e argumentos", () => {
    const rPrazo4 = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "cdi",
      prazo_meses: 4,
    });
    expect(rPrazo4.ok).toBe(true);
    if (rPrazo4.ok) {
      expect(rPrazo4.fim).toBe("2027-02-28");
    }

    // ate_data 2026-10-30 → ARGUMENTOS_INVALIDOS (fim == HOJE)
    const rHoje = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "cdi",
      ate_data: "2026-10-30",
    });
    expect(rHoje.ok).toBe(false);
    if (!rHoje.ok) {
      expect(rHoje.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rHoje.erro.campos).toEqual(["ate_data"]);
    }

    // ate_data 2026-10-29 → DATA_ANTES_DE_HOJE
    const rPassado = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "cdi",
      ate_data: "2026-10-29",
    });
    expect(rPassado.ok).toBe(false);
    if (!rPassado.ok) {
      expect(rPassado.erro.codigo).toBe("DATA_ANTES_DE_HOJE");
      expect(rPassado.erro.campos).toEqual(["ate_data"]);
    }

    // 2031-11-01 → DATA_FORA_DA_JANELA
    const rForaJanela = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "cdi",
      ate_data: "2031-11-01",
    });
    expect(rForaJanela.ok).toBe(false);
    if (!rForaJanela.ok) {
      expect(rForaJanela.erro.codigo).toBe("DATA_FORA_DA_JANELA");
      expect(rForaJanela.erro.mensagem).toBe("A simulação vai até 5 anos (30/10/2031).");
      expect(rForaJanela.erro.campos).toEqual(["ate_data"]);
    }

    // Prazo e ate_data juntos → ARGUMENTOS_INVALIDOS
    const rJuntos = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "cdi",
      prazo_meses: 4,
      ate_data: "2027-02-28",
    });
    expect(rJuntos.ok).toBe(false);
    if (!rJuntos.ok) {
      expect(rJuntos.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rJuntos.erro.campos).toEqual(["prazo_meses"]);
    }

    // Prefixado sem taxa → ARGUMENTOS_INVALIDOS
    const rSemTaxa = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "prefixado",
      prazo_meses: 4,
    });
    expect(rSemTaxa.ok).toBe(false);
    if (!rSemTaxa.ok) {
      expect(rSemTaxa.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rSemTaxa.erro.campos).toEqual(["taxa_aa_pct"]);
    }
  });

  test("10. Todo resultado ok passa no esquema zod correspondente", () => {
    const rComp1 = compararInvestimento(p1, estadoP1, contextoReal, { posicao_id: "INV3" });
    expect(rComp1.ok).toBe(true);
    if (rComp1.ok) {
      const { ok: _, ...dados } = rComp1;
      void _;
      expect(() => esquemaResultadoComparativo.parse(dados)).not.toThrow();
    }

    const rComp2 = compararInvestimento(p1, estadoP1, contextoReal, {
      posicao_id: "INV3",
      prefixado_aa_pct: "12",
    });
    expect(rComp2.ok).toBe(true);
    if (rComp2.ok) {
      const { ok: _, ...dados } = rComp2;
      void _;
      expect(() => esquemaResultadoComparativo.parse(dados)).not.toThrow();
    }

    const rSim1 = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "cdi",
      cdi_pct: 100,
      prazo_meses: 12,
    });
    expect(rSim1.ok).toBe(true);
    if (rSim1.ok) {
      const { ok: _, ...dados } = rSim1;
      void _;
      expect(() => esquemaResultadoSimulacaoInvestimento.parse(dados)).not.toThrow();
    }

    const rSim2 = simularInvestimento(mercadoReal, contextoReal, {
      valor_centavos: 100000,
      indexador: "prefixado",
      taxa_aa_pct: "12",
      ate_data: "2026-11-10",
    });
    expect(rSim2.ok).toBe(true);
    if (rSim2.ok) {
      const { ok: _, ...dados } = rSim2;
      void _;
      expect(() => esquemaResultadoSimulacaoInvestimento.parse(dados)).not.toThrow();
    }
  });
});
