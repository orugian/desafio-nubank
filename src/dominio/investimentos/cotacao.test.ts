import { describe, expect, test } from "vitest";
import {
  esquemaResultadoCotacao,
  estadoInicial,
  type Contexto,
} from "@/contratos";
import { carregarPersona } from "@/dados";
import { criarCalendario } from "@/dominio/calendario";
import { consultarInvestimentos } from "@/dominio/investimentos";
import { snapshotGravado, type CotacaoBruta } from "@/mercado";
import { montarResultadoCotacao } from "./cotacao";
import cdiJson from "../../../dados/mercado/cdi.json";
import btcJson from "../../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../../dados/mercado/fechamentos-PETR4.json";

describe("T2 · montagem do resultado de cotação (cotacao.test.ts)", () => {
  const contextoReal: Contexto = {
    series: {
      cdi: cdiJson,
      fechamentos: {
        PETR4: petr4Json,
        BTC: btcJson,
      },
    },
    calendario: criarCalendario({ datas_cdi: cdiJson.serie.map((x: { data: string }) => x.data) }),
  };

  const rPersona = carregarPersona("p1");
  if (!rPersona.ok) throw new Error("Falha ao carregar P1");
  const personaP1 = rPersona.persona;
  const estadoP1 = estadoInicial("p1", snapshotGravado());

  test("8: PETR4 gravado: na_carteira com quantidade '10' e valor = 10 * preço; valorização igual à de consultarInvestimentos; rotulo gravado; variação do dia pela série", () => {
    const snap = snapshotGravado();
    const petr4Snap = snap.precos.PETR4;

    const brutaPetr4: CotacaoBruta = {
      ticker: "PETR4",
      nome: null,
      tipo: "acao",
      preco_centavos: petr4Snap.preco_centavos, // 5279
      variacao_dia_pct: null,
      data_hora: petr4Snap.data_hora, // 2026-10-27T18:00:00-03:00
      fonte: petr4Snap.fonte, // brapi
      ao_vivo: false,
    };

    const resultado = montarResultadoCotacao(personaP1, estadoP1, contextoReal, brutaPetr4);

    // Na carteira de P1: posição INV3 tem 10 un a 4209 centavos
    // Conta à mão: 10 * 5279 centavos = 52790 centavos
    expect(resultado.na_carteira).toEqual({
      posicao_id: "INV3",
      quantidade: "10",
      valor_centavos: 52790,
    });

    // Valorização do período: base em 2026-07-30 é 4284 centavos
    // Conta à mão: (5279 - 4284) / 4284 * 100 = 995 / 4284 * 100 = 23.225957...% -> "23.23"
    const rInv = consultarInvestimentos(personaP1, estadoP1, contextoReal, {});
    expect(rInv.ok).toBe(true);
    if (rInv.ok) {
      const posInv3 = rInv.posicoes.find((p) => p.posicao_id === "INV3")!;
      expect(resultado.valorizacao_periodo_pct).toBe(posInv3.valorizacao_periodo_pct);
      expect(resultado.valorizacao_periodo_pct).toBe("23.23");
    }
    expect(resultado.periodo_desde).toBe("2026-07-30");

    // Rótulo começa com "cotação gravada de"
    expect(resultado.rotulo).toMatch(/^cotação gravada de /);
    expect(resultado.rotulo).toBe("cotação gravada de 27/10 18:00 (brapi); não é previsão de preço");

    // Variação do dia calculada pela série:
    // Último: 5279 (2026-10-27); Penúltimo: 5388 (2026-10-26)
    // Conta à mão: (5279 - 5388) / 5388 * 100 = -109 / 5388 * 100 = -2.022999...% -> "-2.02"
    expect(resultado.variacao_dia_pct).toBe("-2.02");

    // Passa no esquema
    expect(() => esquemaResultadoCotacao.parse(resultado)).not.toThrow();
  });

  test("9: VALE3 ao vivo: na_carteira null, valorizacao null, variacao da bruta, rotulo 'cotação ao vivo de ...'", () => {
    const brutaVale: CotacaoBruta = {
      ticker: "VALE3",
      nome: "Vale S.A.",
      tipo: "acao",
      preco_centavos: 6540,
      variacao_dia_pct: "1.23",
      data_hora: "2026-10-30T10:05:00-03:00",
      fonte: "brapi",
      ao_vivo: true,
    };

    const resultado = montarResultadoCotacao(personaP1, estadoP1, contextoReal, brutaVale);

    // VALE3 não está na carteira da persona P1
    expect(resultado.na_carteira).toBeNull();

    // Sem série para VALE3 no contexto -> valorização e período nulos
    expect(resultado.valorizacao_periodo_pct).toBeNull();
    expect(resultado.periodo_desde).toBeNull();

    // Variação do dia vem da cotação bruta
    expect(resultado.variacao_dia_pct).toBe("1.23");

    // Rótulo ao vivo
    expect(resultado.rotulo).toBe("cotação ao vivo de 30/10 10:05 (brapi); não é previsão de preço");
    expect(resultado.rotulo).toMatch(/^cotação ao vivo de /);

    // Passa no esquema
    expect(() => esquemaResultadoCotacao.parse(resultado)).not.toThrow();
  });

  test("10: Todos os resultados passam no esquema", () => {
    const snap = snapshotGravado();
    const petr4Snap = snap.precos.PETR4;
    const resPetr4 = montarResultadoCotacao(personaP1, estadoP1, contextoReal, {
      ticker: "PETR4",
      nome: null,
      tipo: "acao",
      preco_centavos: petr4Snap.preco_centavos,
      variacao_dia_pct: null,
      data_hora: petr4Snap.data_hora,
      fonte: petr4Snap.fonte,
      ao_vivo: false,
    });
    const parsedPetr4 = esquemaResultadoCotacao.parse(resPetr4);
    expect(parsedPetr4).toBeDefined();

    const resVale = montarResultadoCotacao(personaP1, estadoP1, contextoReal, {
      ticker: "VALE3",
      nome: "Vale S.A.",
      tipo: "acao",
      preco_centavos: 6540,
      variacao_dia_pct: "1.23",
      data_hora: "2026-10-30T10:05:00-03:00",
      fonte: "brapi",
      ao_vivo: true,
    });
    const parsedVale = esquemaResultadoCotacao.parse(resVale);
    expect(parsedVale).toBeDefined();
  });
});
