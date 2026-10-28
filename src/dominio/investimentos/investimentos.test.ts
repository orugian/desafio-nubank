import { describe, expect, test } from "vitest";
import {
  esquemaPersona,
  esquemaPosicao,
  esquemaResultadoInvestimentos,
  estadoInicial,
  type Contexto,
  type Persona,
  type Posicao,
} from "@/contratos";
import { consultarInvestimentos, dataDisponivel } from "@/dominio/investimentos";
import { criarHipotese } from "@/dominio/caixa";
import { criarCalendario, diaDaSemana, somarDias } from "@/dominio/calendario";
import { CONTEXTO, MERCADO_TESTE, P1, P2, P3, origem, reaisDaSpec } from "@/dominio/caixa/testes/personas";

// Posições fictícias com as regras de liquidez de I-01 (spec §5.4, §11).
const posicao = (p: unknown): Posicao => esquemaPosicao.parse(p);

/**
 * Série CDI de teste da spec §11.4: 0,05% ao dia em todo dia útil de outubro,
 * com 12/10/2026 ausente (feriado na série gravada).
 */
function contextoCdiTeste(ultimaDataGravada = "2026-10-29"): Contexto {
  const serie: Array<{ data: string; taxa_diaria_pct: string }> = [];
  for (let d = "2026-10-01"; d <= ultimaDataGravada; d = somarDias(d, 1)) {
    const dow = diaDaSemana(d);
    if (dow === 0 || dow === 6 || d === "2026-10-12") continue;
    serie.push({ data: d, taxa_diaria_pct: "0.05" });
  }
  return {
    series: {
      cdi: {
        fonte: "CDI de teste (spec §11.4)",
        url: "https://exemplo.invalid/cdi",
        obtido_em: "2026-10-28T11:00:00-03:00",
        serie,
      },
      fechamentos: {},
    },
    calendario: criarCalendario({ datas_cdi: serie.map((item) => item.data) }),
  };
}

function personaComPosicoes(base: Persona, posicoes: Posicao[]): Persona {
  return esquemaPersona.parse({ ...base, posicoes });
}

const CONTEXTO_VALOR_FIXO: Contexto = {
  series: {
    cdi: {
      fonte: "CDI de teste (spec §11.4)",
      url: "https://exemplo.invalid/cdi",
      obtido_em: "2026-10-28T11:00:00-03:00",
      serie: [{ data: "2026-10-29", taxa_diaria_pct: "0" }],
    },
    fechamentos: {
      PETR4: {
        fonte: "brapi",
        url: "https://exemplo.invalid/petr4",
        obtido_em: "2026-10-28T13:45:39-03:00",
        ticker: "PETR4",
        serie: [{ data: "2026-07-30", preco_centavos: reaisDaSpec("28,00") }],
      },
      BTC: {
        fonte: "CoinGecko",
        url: "https://exemplo.invalid/btc",
        obtido_em: "2026-10-28T12:39:48-03:00",
        ticker: "BTC",
        serie: [{ data: "2026-07-30", preco_centavos: reaisDaSpec("340.000") }],
      },
    },
  },
  calendario: criarCalendario(),
};

const MERCADO_VALORES_TESTE = {
  ...MERCADO_TESTE,
  precos: {
    PETR4: { preco_centavos: reaisDaSpec("33,00"), data_hora: "2026-10-27T18:00:00-03:00", fonte: "brapi" },
    BTC: { preco_centavos: reaisDaSpec("380.000"), data_hora: "2026-10-27T21:00:00-03:00", fonte: "CoinGecko" },
  },
};

const P1_FIXA = personaComPosicoes(P1, [
  ...P1.posicoes,
  posicao({
    id: "INV2",
    categoria: "cdb_vencimento",
    nome: "CDB Banco Fictício",
    cdi_pct: 120,
    vencimento: "2027-03-15",
    aportes: [{ data: "2026-03-16", valor_centavos: reaisDaSpec("500") }],
    liquidez: { regra: "no_vencimento" },
    protecao: null,
  }),
  posicao({
    id: "INV3",
    categoria: "acao",
    nome: "PETR4",
    ticker: "PETR4",
    compras: [{ data: "2026-08-14", quantidade: "10", preco_centavos: reaisDaSpec("30,00") }],
    liquidez: { regra: "d_mais_uteis", dias: 2 },
    protecao: null,
  }),
]);

const P2_FIXA = personaComPosicoes(P2, [
  ...P2.posicoes,
  posicao({
    id: "INV4",
    categoria: "fundo",
    nome: "Fundo DI Fictício",
    cdi_pct: 98,
    aportes: [{ data: "2026-05-04", valor_centavos: reaisDaSpec("2.100") }],
    liquidez: { regra: "d_mais_uteis", dias: 1 },
    protecao: { tipo: "parcial", valor_centavos: reaisDaSpec("1.200") },
  }),
  posicao({
    id: "INV5",
    categoria: "cripto",
    nome: "Bitcoin",
    ticker: "BTC",
    compras: [{ data: "2026-08-10", quantidade: "0.005", preco_centavos: reaisDaSpec("350.000") }],
    liquidez: { regra: "imediata" },
    protecao: null,
  }),
]);

const P3_FIXA = personaComPosicoes(P3, [
  ...P3.posicoes,
  posicao({
    id: "INV7",
    categoria: "cdb_liquidez_diaria",
    nome: "CDB liquidez diária",
    cdi_pct: 110,
    aportes: [{ data: "2026-06-10", valor_centavos: reaisDaSpec("1.550") }],
    liquidez: { regra: "d_mais_uteis", dias: 0 },
    protecao: null,
  }),
]);

describe("B3b · investimentos", () => {
  test("CR-35: data de disponibilidade por regra, pedido hoje (30/10)", () => {
    const casos: Array<[Posicao, string]> = [
      [posicao({ id: "INV9", categoria: "caixinha", nome: "Caixinha Viagem", cdi_pct: 100, aportes: [], liquidez: { regra: "imediata" }, protecao: null }), "2026-10-30"],
      [posicao({ id: "SEP", categoria: "saldo_separado", nome: "Saldo separado", aportes: [], liquidez: { regra: "imediata" }, protecao: null }), "2026-10-30"],
      [posicao({ id: "INV5", categoria: "cripto", nome: "Bitcoin", ticker: "BTC", compras: [{ data: "2026-08-10", quantidade: "0.005", preco_centavos: 35000000 }], liquidez: { regra: "imediata" }, protecao: null }), "2026-10-30"],
      [posicao({ id: "INV7", categoria: "cdb_liquidez_diaria", nome: "CDB liquidez diária", cdi_pct: 110, aportes: [{ data: "2026-06-10", valor_centavos: 150000 }], liquidez: { regra: "d_mais_uteis", dias: 0 }, protecao: null }), "2026-10-30"],
      [posicao({ id: "INV4", categoria: "fundo", nome: "Fundo DI Fictício", cdi_pct: 98, aportes: [{ data: "2026-05-04", valor_centavos: 200000 }], liquidez: { regra: "d_mais_uteis", dias: 1 }, protecao: { tipo: "parcial", valor_centavos: 120000 } }), "2026-11-03"],
      [posicao({ id: "INV3", categoria: "acao", nome: "PETR4", ticker: "PETR4", compras: [{ data: "2026-08-14", quantidade: "10", preco_centavos: 3000 }], liquidez: { regra: "d_mais_uteis", dias: 2 }, protecao: null }), "2026-11-04"],
      [posicao({ id: "INV2", categoria: "cdb_vencimento", nome: "CDB Banco Fictício", cdi_pct: 120, vencimento: "2027-03-15", aportes: [{ data: "2026-03-16", valor_centavos: 50000 }], liquidez: { regra: "no_vencimento" }, protecao: null }), "2027-03-15"],
    ];
    expect(casos.map(([p]) => [p.id, dataDisponivel(p, CONTEXTO)])).toEqual(casos.map(([p, data]) => [p.id, data]));
  });

  test("CR-30 e CR-31: renda fixa CDI com 20 dias úteis (12/10 ausente) e dia sem taxa usa última conhecida", () => {
    const posicoes = [
      posicao({
        id: "INV1",
        categoria: "caixinha",
        nome: "Caixinha 100% CDI",
        cdi_pct: 100,
        aportes: [{ data: "2026-10-01", valor_centavos: reaisDaSpec("1.000") }],
        liquidez: { regra: "imediata" },
        protecao: null,
      }),
      posicao({
        id: "INV2",
        categoria: "cdb_liquidez_diaria",
        nome: "CDB 120% CDI",
        cdi_pct: 120,
        aportes: [{ data: "2026-10-01", valor_centavos: reaisDaSpec("1.000") }],
        liquidez: { regra: "d_mais_uteis", dias: 0 },
        protecao: null,
      }),
    ];
    const persona = personaComPosicoes(P1, posicoes);

    // Série gravada até 27/10: 28/10 e 29/10 são dias úteis antes de hoje sem taxa gravada → usa última (27/10) e informa cdi_data_ref = 2026-10-27.
    const ctxComAtraso = contextoCdiTeste("2026-10-27");
    expect(ctxComAtraso.calendario.diasUteisEntre("2026-10-01", "2026-10-30")).toBe(20);
    const r = consultarInvestimentos(persona, estadoInicial(persona.id, MERCADO_TESTE), ctxComAtraso, { ate_data: "2026-11-15" });
    if (!r.ok) throw new Error(r.erro.mensagem);
    esquemaResultadoInvestimentos.parse(r);

    expect(r.cdi_data_ref).toBe("2026-10-27");
    expect(r.rotulo_rentabilidade).toBe("bruto, antes de IR, IOF e custos; não anualizado");

    const [cr30, cr31] = r.posicoes;
    expect({
      aplicado: cr30.aplicado_centavos,
      valor: cr30.valor_atual_centavos,
      resultado: cr30.resultado_centavos,
      rentabilidade: cr30.rentabilidade_pct,
    }).toEqual({
      aplicado: reaisDaSpec("1.000"),
      valor: reaisDaSpec("1.010,05"),
      resultado: reaisDaSpec("10,05"),
      rentabilidade: "1.01",
    });

    expect({
      aplicado: cr31.aplicado_centavos,
      valor: cr31.valor_atual_centavos,
      resultado: cr31.resultado_centavos,
      rentabilidade: cr31.rentabilidade_pct,
    }).toEqual({
      aplicado: reaisDaSpec("1.000"),
      valor: reaisDaSpec("1.012,07"),
      resultado: reaisDaSpec("12,07"),
      rentabilidade: "1.21",
    });
  });

  test("CR-33 e CR-34: renda variável (ação e cripto), valorização no período e rótulo de estimativa", () => {
    const posicoes = [
      posicao({
        id: "INV3",
        categoria: "acao",
        nome: "PETR4",
        ticker: "PETR4",
        compras: [{ data: "2026-08-14", quantidade: "10", preco_centavos: reaisDaSpec("30,00") }],
        liquidez: { regra: "d_mais_uteis", dias: 2 },
        protecao: null,
      }),
      posicao({
        id: "INV5",
        categoria: "cripto",
        nome: "Bitcoin",
        ticker: "BTC",
        compras: [{ data: "2026-08-10", quantidade: "0.005", preco_centavos: reaisDaSpec("350.000") }],
        liquidez: { regra: "imediata" },
        protecao: null,
      }),
    ];
    const persona = personaComPosicoes(P1, posicoes);
    const mercado = {
      ...MERCADO_TESTE,
      precos: {
        PETR4: { preco_centavos: reaisDaSpec("33,00"), data_hora: "2026-10-27T18:00:00-03:00", fonte: "brapi" },
        BTC: { preco_centavos: reaisDaSpec("380.000"), data_hora: "2026-10-27T21:00:00-03:00", fonte: "CoinGecko" },
      },
    };
    const ctx: Contexto = {
      ...CONTEXTO,
      series: {
        ...CONTEXTO.series,
        fechamentos: {
          PETR4: {
            fonte: "brapi",
            url: "https://exemplo.invalid/petr4",
            obtido_em: "2026-10-28T13:45:39-03:00",
            ticker: "PETR4",
            serie: [{ data: "2026-07-30", preco_centavos: reaisDaSpec("28,00") }],
          },
          BTC: {
            fonte: "CoinGecko",
            url: "https://exemplo.invalid/btc",
            obtido_em: "2026-10-28T12:39:48-03:00",
            ticker: "BTC",
            serie: [{ data: "2026-07-30", preco_centavos: reaisDaSpec("340.000") }],
          },
        },
      },
    };

    const r = consultarInvestimentos(persona, estadoInicial(persona.id, mercado), ctx, { ate_data: "2026-11-15" });
    if (!r.ok) throw new Error(r.erro.mensagem);
    esquemaResultadoInvestimentos.parse(r);

    const [cr33, cr34] = r.posicoes;
    expect({
      ticker: cr33.ticker,
      quantidade: cr33.quantidade,
      aplicado: cr33.aplicado_centavos,
      valor: cr33.valor_atual_centavos,
      resultado: cr33.resultado_centavos,
      rentabilidade: cr33.rentabilidade_pct,
      valorizacao: cr33.valorizacao_periodo_pct,
      estimado: cr33.estimado,
      rotulo: cr33.rotulo_estimativa,
    }).toEqual({
      ticker: "PETR4",
      quantidade: "10",
      aplicado: reaisDaSpec("300,00"),
      valor: reaisDaSpec("330,00"),
      resultado: reaisDaSpec("30,00"),
      rentabilidade: "10.00",
      valorizacao: "17.86",
      estimado: true,
      rotulo: "estimado com cotação de 27/10 18:00 (brapi)",
    });

    expect({
      ticker: cr34.ticker,
      quantidade: cr34.quantidade,
      aplicado: cr34.aplicado_centavos,
      valor: cr34.valor_atual_centavos,
      resultado: cr34.resultado_centavos,
      rentabilidade: cr34.rentabilidade_pct,
      valorizacao: cr34.valorizacao_periodo_pct,
      estimado: cr34.estimado,
      rotulo: cr34.rotulo_estimativa,
    }).toEqual({
      ticker: "BTC",
      quantidade: "0.005",
      aplicado: reaisDaSpec("1.750,00"),
      valor: reaisDaSpec("1.900,00"),
      resultado: reaisDaSpec("150,00"),
      rentabilidade: "8.57",
      valorizacao: "11.76",
      estimado: true,
      rotulo: "estimado com cotação de 27/10 21:00 (CoinGecko)",
    });
  });

  test("CR-06, CR-07, CR-16 e I-10: classificação, proteção parcial (INV4), totais e default de ate_data", () => {
    // CR-06: P1 em sessão nova sem ate_data usa default de I-10 (saldo_minimo = 15/11).
    const r06 = consultarInvestimentos(P1_FIXA, estadoInicial(P1_FIXA.id, MERCADO_VALORES_TESTE), CONTEXTO_VALOR_FIXO, {});
    if (!r06.ok) throw new Error(r06.erro.mensagem);
    esquemaResultadoInvestimentos.parse(r06);
    expect(r06.ate_data).toBe("2026-11-15");
    expect(r06.ate_data_origem).toBe("saldo_minimo");
    expect(
      r06.posicoes.map((p) => [p.posicao_id, p.classificacao, p.data_disponibilidade, p.protegido_centavos, p.nao_resgatavel_centavos, p.resgatavel_centavos]),
    ).toEqual([
      ["SEP", "resgatavel_ate_data", "2026-10-30", 0, 0, 0],
      ["INV1", "protegida", "2026-10-30", reaisDaSpec("1.000"), 0, 0],
      ["INV9", "resgatavel_ate_data", "2026-10-30", 0, 0, 0],
      ["INV2", "nao_resgatavel_ate_data", "2027-03-15", 0, reaisDaSpec("500"), 0],
      ["INV3", "resgatavel_ate_data", "2026-11-04", 0, 0, reaisDaSpec("330")],
    ]);
    expect(r06.totais).toEqual({
      valor_total_centavos: reaisDaSpec("1.830"),
      protegido_centavos: reaisDaSpec("1.000"),
      nao_resgatavel_centavos: reaisDaSpec("500"),
      resgatavel_centavos: reaisDaSpec("330"),
    });

    // I-10 com falta ativa: usa falta_mais_proxima entre os cenários ativos.
    const h = criarHipotese(
      P1_FIXA,
      estadoInicial(P1_FIXA.id, MERCADO_VALORES_TESTE),
      { nome: "Gasto cedo", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "1900", data: "2026-11-01" }] },
      origem(),
    );
    if (!h.ok) throw new Error(h.erro.mensagem);
    const rFalta = consultarInvestimentos(P1_FIXA, h.estado, CONTEXTO_VALOR_FIXO, {});
    if (!rFalta.ok) throw new Error(rFalta.erro.mensagem);
    expect(rFalta.ate_data).toBe("2026-11-01");
    expect(rFalta.ate_data_origem).toBe("falta_mais_proxima");

    // CR-07: P2 até 08/11 (também default de I-10 por falta em 08/11), INV4 proteção parcial 1.200 sobre 2.100 → resgatável 900.
    const r07 = consultarInvestimentos(P2_FIXA, estadoInicial(P2_FIXA.id, MERCADO_VALORES_TESTE), CONTEXTO_VALOR_FIXO, {});
    if (!r07.ok) throw new Error(r07.erro.mensagem);
    expect(r07.ate_data).toBe("2026-11-08");
    expect(r07.ate_data_origem).toBe("falta_mais_proxima");
    expect(
      r07.posicoes.map((p) => [p.posicao_id, p.classificacao, p.data_disponibilidade, p.protegido_centavos, p.nao_resgatavel_centavos, p.resgatavel_centavos]),
    ).toEqual([
      ["SEP", "resgatavel_ate_data", "2026-10-30", 0, 0, 0],
      ["INV10", "resgatavel_ate_data", "2026-10-30", 0, 0, 0],
      ["INV4", "resgatavel_ate_data", "2026-11-03", reaisDaSpec("1.200"), 0, reaisDaSpec("900")],
      ["INV5", "resgatavel_ate_data", "2026-10-30", 0, 0, reaisDaSpec("1.900")],
    ]);
    expect(r07.totais).toEqual({
      valor_total_centavos: reaisDaSpec("4.000"),
      protegido_centavos: reaisDaSpec("1.200"),
      nao_resgatavel_centavos: 0,
      resgatavel_centavos: reaisDaSpec("2.800"),
    });

    // CR-16: P3 até 06/11 (informada).
    const r16 = consultarInvestimentos(P3_FIXA, estadoInicial(P3_FIXA.id, MERCADO_VALORES_TESTE), CONTEXTO_VALOR_FIXO, { ate_data: "2026-11-06" });
    if (!r16.ok) throw new Error(r16.erro.mensagem);
    expect(r16.ate_data).toBe("2026-11-06");
    expect(r16.ate_data_origem).toBe("informada");
    expect(
      r16.posicoes.map((p) => [p.posicao_id, p.classificacao, p.data_disponibilidade, p.protegido_centavos, p.resgatavel_centavos]),
    ).toEqual([
      ["SEP", "resgatavel_ate_data", "2026-10-30", 0, 0],
      ["INV6", "protegida", "2026-10-30", reaisDaSpec("3.000"), 0],
      ["INV7", "resgatavel_ate_data", "2026-10-30", 0, reaisDaSpec("1.550")],
    ]);
    expect(r16.totais).toEqual({
      valor_total_centavos: reaisDaSpec("4.550"),
      protegido_centavos: reaisDaSpec("3.000"),
      nao_resgatavel_centavos: 0,
      resgatavel_centavos: reaisDaSpec("1.550"),
    });
  });
});

