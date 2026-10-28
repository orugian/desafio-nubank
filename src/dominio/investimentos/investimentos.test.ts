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
import { criarCalendario, diaDaSemana, somarDias } from "@/dominio/calendario";
import { CONTEXTO, MERCADO_TESTE, P1, reaisDaSpec } from "@/dominio/caixa/testes/personas";

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
});

