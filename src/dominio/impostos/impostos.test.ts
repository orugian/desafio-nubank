import { describe, expect, test } from "vitest";
import {
  esquemaPersona,
  esquemaResultadoImpostoRenda,
  esquemaSerieCdi,
  esquemaSerieFechamentos,
  estadoInicial,
  type Contexto,
} from "@/contratos";
import { carregarPersona } from "@/dados";
import { criarCalendario } from "@/dominio/calendario";
import { avaliarRendaFixaCdi, indiceTaxasCdi } from "@/dominio/investimentos";
import { snapshotGravado } from "@/mercado";
import {
  aliquotaIofPct,
  aliquotaIrRendaFixaPct,
  estimarImpostoRenda,
  impostoTabelaMensal,
  reducaoMensal,
} from "./index";

import cdiJson from "../../../dados/mercado/cdi.json";
import btcJson from "../../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../../dados/mercado/fechamentos-PETR4.json";

const cdi = esquemaSerieCdi.parse(cdiJson);
const petr4 = esquemaSerieFechamentos.parse(petr4Json);
const btc = esquemaSerieFechamentos.parse(btcJson);

const contextoReal: Contexto = {
  series: {
    cdi,
    fechamentos: {
      PETR4: petr4,
      BTC: btc,
    },
  },
  calendario: criarCalendario({ datas_cdi: cdi.serie.map((x) => x.data) }),
};

describe("Tarefa T3 — estimativa de imposto de renda (domínio)", () => {
  // 1. Alíquotas regressivas de IR e IOF
  test("1. aliquotaIrRendaFixaPct e aliquotaIofPct", () => {
    // IR Renda Fixa:
    // <=180 -> 22.50
    // 181-360 -> 20.00
    // 361-720 -> 17.50
    // >720 -> 15.00
    expect(aliquotaIrRendaFixaPct(180)).toBe("22.50");
    expect(aliquotaIrRendaFixaPct(181)).toBe("20.00");
    expect(aliquotaIrRendaFixaPct(360)).toBe("20.00");
    expect(aliquotaIrRendaFixaPct(361)).toBe("17.50");
    expect(aliquotaIrRendaFixaPct(720)).toBe("17.50");
    expect(aliquotaIrRendaFixaPct(721)).toBe("15.00");

    // IOF regressivo:
    // dia 0 -> 96.00
    // dia 1 -> 96.00
    // dia 2 -> 93.00
    // dia 10 -> 66.00
    // dia 29 -> 3.00
    // dia 30 -> 0.00
    expect(aliquotaIofPct(0)).toBe("96.00");
    expect(aliquotaIofPct(1)).toBe("96.00");
    expect(aliquotaIofPct(2)).toBe("93.00");
    expect(aliquotaIofPct(10)).toBe("66.00");
    expect(aliquotaIofPct(29)).toBe("3.00");
    expect(aliquotaIofPct(30)).toBe("0.00");
  });

  // 2. Tabela mensal e redução mensal
  test("2. tabela mensal e reducaoMensal", () => {
    // base <= 242880 -> 0
    expect(impostoTabelaMensal(242880)).toBe(0);

    // base 300000 (R$ 3.000): 300000 * 0.15 - 39416 = 45000 - 39416 = 5584
    expect(impostoTabelaMensal(300000)).toBe(5584);

    // reducaoMensal(500000, X) = X (rendimento <= 500000 zera o imposto)
    expect(reducaoMensal(500000, 5584)).toBe(5584);
    expect(reducaoMensal(500000, 10000)).toBe(10000);

    // reducaoMensal(600000, 57429):
    // 97862 - 0.133145 * 600000 = 97862 - 79887 = 17975
    expect(reducaoMensal(600000, 57429)).toBe(17975);

    // reducaoMensal(735000, 100) = 0 (rendimento >= 735000 sem redução)
    expect(reducaoMensal(735000, 100)).toBe(0);
  });

  // 3. IRPF informado R$ 8.000
  test("3. IRPF informado R$ 8.000 (P1 real)", () => {
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");
    const estado = estadoInicial("p1", snapshotGravado());

    const res = estimarImpostoRenda(rP1.persona, estado, contextoReal, {
      rendimento_mensal_centavos: 800000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("estimarImpostoRenda falhou");

    // Mensal:
    // M = 800000
    // base = 800000 - 60720 = 739280
    // imposto tabela: 739280 * 0.275 - 90873 = 203302 - 90873 = 112429
    // redução: M >= 735000 -> 0
    // imposto: 112429
    expect(res.irpf?.mensal.base_centavos).toBe(739280);
    expect(res.irpf?.mensal.imposto_tabela_centavos).toBe(112429);
    expect(res.irpf?.mensal.reducao_centavos).toBe(0);
    expect(res.irpf?.mensal.imposto_centavos).toBe(112429);

    // Anual:
    // R = 12 * 800000 = 9600000
    // desconto simplificado: min(20% * 9600000, 1764000) = min(1920000, 1764000) = 1764000
    // base: 9600000 - 1764000 = 7836000
    // imposto tabela: 7836000 * 0.275 - 1090466 = 2154900 - 1090466 = 1064434
    // redução: R >= 8820000 -> 0
    // devido: 1064434
    // retido: 12 * 112429 = 1349148
    // a_restituir: 1349148 - 1064434 = 284714
    // a_pagar: 0
    expect(res.irpf?.rendimento_anual_centavos).toBe(9600000);
    expect(res.irpf?.desconto_simplificado_centavos).toBe(1764000);
    expect(res.irpf?.base_calculo_centavos).toBe(7836000);
    expect(res.irpf?.imposto_tabela_centavos).toBe(1064434);
    expect(res.irpf?.reducao_centavos).toBe(0);
    expect(res.irpf?.imposto_devido_centavos).toBe(1064434);
    expect(res.irpf?.retido_ou_recolhido_anual_centavos).toBe(1349148);
    expect(res.irpf?.a_restituir_centavos).toBe(284714);
    expect(res.irpf?.a_pagar_centavos).toBe(0);

    const { ok: _, ...semOk } = res;
    expect(() => esquemaResultadoImpostoRenda.parse(semOk)).not.toThrow();
  });

  // 4. IRPF informado R$ 6.000
  test("4. IRPF informado R$ 6.000", () => {
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");
    const estado = estadoInicial("p1", snapshotGravado());

    const res = estimarImpostoRenda(rP1.persona, estado, contextoReal, {
      rendimento_mensal_centavos: 600000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("estimarImpostoRenda falhou");

    // Mensal:
    // M = 600000
    // base = 600000 - 60720 = 539280
    // imposto tabela: 539280 * 0.275 - 90873 = 148302 - 90873 = 57429
    // redução: 97862 - 0.133145 * 600000 = 97862 - 79887 = 17975
    // imposto: 57429 - 17975 = 39454
    expect(res.irpf?.mensal.imposto_tabela_centavos).toBe(57429);
    expect(res.irpf?.mensal.reducao_centavos).toBe(17975);
    expect(res.irpf?.mensal.imposto_centavos).toBe(39454);

    // Anual:
    // R = 12 * 600000 = 7200000
    // desconto simplificado: min(20% * 7200000, 1764000) = min(1440000, 1764000) = 1440000
    // base: 7200000 - 1440000 = 5760000
    // imposto tabela: 5760000 * 0.275 - 1090466 = 1584000 - 1090466 = 493534
    // redução: 842973 - 0.095575 * 7200000 = 842973 - 688140 = 154833
    // devido: 493534 - 154833 = 338701
    // retido: 12 * 39454 = 473448
    // a_restituir: 473448 - 338701 = 134747
    expect(res.irpf?.rendimento_anual_centavos).toBe(7200000);
    expect(res.irpf?.desconto_simplificado_centavos).toBe(1440000);
    expect(res.irpf?.base_calculo_centavos).toBe(5760000);
    expect(res.irpf?.imposto_tabela_centavos).toBe(493534);
    expect(res.irpf?.reducao_centavos).toBe(154833);
    expect(res.irpf?.imposto_devido_centavos).toBe(338701);
    expect(res.irpf?.retido_ou_recolhido_anual_centavos).toBe(473448);
    expect(res.irpf?.a_restituir_centavos).toBe(134747);

    const { ok: _, ...semOk } = res;
    expect(() => esquemaResultadoImpostoRenda.parse(semOk)).not.toThrow();
  });

  // 5. IRPF pelo histórico (P1, P2, P3)
  test("5. IRPF pelo histórico: P1, P2 e P3", () => {
    // P1: Salário R$ 3.000 em 3 meses (agosto, setembro, outubro)
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");
    const { renda: _1, ...p1SemRenda } = rP1.persona;
    const res1 = estimarImpostoRenda(p1SemRenda, estadoInicial("p1", snapshotGravado()), contextoReal, {
      escopo: "irpf",
    });
    expect(res1.ok).toBe(true);
    if (!res1.ok) throw new Error("res1");
    expect(res1.irpf?.origem).toBe("historico");
    expect(res1.irpf?.tipo_renda).toBe("salario");
    expect(res1.irpf?.rendimento_mensal_centavos).toBe(300000);
    expect(res1.irpf?.meses_base).toBe(3);
    // 300000 - 60720 = 239280 <= 242880 (isento) -> imposto 0
    expect(res1.irpf?.imposto_devido_centavos).toBe(0);
    expect(res1.irpf?.mensal.imposto_centavos).toBe(0);

    // P2: Autônomo com 3 receitas por Pix: 240000, 230000, 245000 -> média round((240000+230000+245000)/3) = 238333
    const rP2 = carregarPersona("p2");
    expect(rP2.ok).toBe(true);
    if (!rP2.ok) throw new Error("p2");
    const { renda: _2, ...p2SemRenda } = rP2.persona;
    const res2 = estimarImpostoRenda(p2SemRenda, estadoInicial("p2", snapshotGravado()), contextoReal, {
      escopo: "irpf",
    });
    expect(res2.ok).toBe(true);
    if (!res2.ok) throw new Error("res2");
    expect(res2.irpf?.origem).toBe("historico");
    expect(res2.irpf?.tipo_renda).toBe("autonomo");
    expect(res2.irpf?.rendimento_mensal_centavos).toBe(238333);
    expect(res2.irpf?.meses_base).toBe(3);
    expect(res2.irpf?.forma_mensal).toBe("carnê-leão (DARF mensal) sobre recebimentos de pessoa física");

    // P3: Salário R$ 4.200 em 3 meses (420000)
    // M = 420000 <= 500000 -> redução zera mensal; R = 5040000 <= 6000000 -> redução zera anual
    const rP3 = carregarPersona("p3");
    expect(rP3.ok).toBe(true);
    if (!rP3.ok) throw new Error("p3");
    const { renda: _3, ...p3SemRenda } = rP3.persona;
    const res3 = estimarImpostoRenda(p3SemRenda, estadoInicial("p3", snapshotGravado()), contextoReal, {
      escopo: "irpf",
    });
    expect(res3.ok).toBe(true);
    if (!res3.ok) throw new Error("res3");
    expect(res3.irpf?.rendimento_mensal_centavos).toBe(420000);
    expect(res3.irpf?.imposto_devido_centavos).toBe(0);
    expect(res3.irpf?.mensal.imposto_centavos).toBe(0);
  });

  // T8 · IRPF pelo cadastro (P1, P2, P3)
  test("IRPF pelo cadastro", () => {
    // P1:
    // renda bruta do cadastro: 340000, clt -> tipo "salario", origem "cadastro", meses_base: 0
    // mensal base 340000−60720=279280 → 7,5% faixa: 279280×0,075−18216=2730 (arredonde meio para cima) → renda ≤ 500000 → redução = imposto → imposto mensal 0
    // anual R 4080000, desconto 816000, base 3264000 → 3264000×0,075−218592=26208 → R ≤ 6000000 → redução total → devido 0
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");
    const res1 = estimarImpostoRenda(rP1.persona, estadoInicial("p1", snapshotGravado()), contextoReal, {
      escopo: "irpf",
    });
    expect(res1.ok).toBe(true);
    if (!res1.ok) throw new Error("res1");
    expect(res1.irpf?.origem).toBe("cadastro");
    expect(res1.irpf?.tipo_renda).toBe("salario");
    expect(res1.irpf?.rendimento_mensal_centavos).toBe(340000);
    expect(res1.irpf?.meses_base).toBe(0);
    expect(res1.irpf?.mensal.base_centavos).toBe(279280);
    expect(res1.irpf?.mensal.imposto_tabela_centavos).toBe(2730);
    expect(res1.irpf?.mensal.reducao_centavos).toBe(2730);
    expect(res1.irpf?.mensal.imposto_centavos).toBe(0);
    expect(res1.irpf?.rendimento_anual_centavos).toBe(4080000);
    expect(res1.irpf?.desconto_simplificado_centavos).toBe(816000);
    expect(res1.irpf?.base_calculo_centavos).toBe(3264000);
    expect(res1.irpf?.imposto_tabela_centavos).toBe(26208);
    expect(res1.irpf?.reducao_centavos).toBe(26208);
    expect(res1.irpf?.imposto_devido_centavos).toBe(0);
    expect(res1.irpf?.premissas).toContain("renda bruta do cadastro da persona");
    const { ok: _o1, ...semOk1 } = res1;
    expect(() => esquemaResultadoImpostoRenda.parse(semOk1)).not.toThrow();

    // P3:
    // renda bruta: 500000, clt -> "salario", origem "cadastro", meses_base: 0
    // mensal base 439280 → 439280×0,225−67549=31289 → redução (rendimento 500000 ≤ 500000) = imposto → 0
    // anual R 6000000, desconto 1200000, base 4800000 → 4800000×0,225−810585=269415 → R ≤ 6000000 → zera → devido 0
    const rP3 = carregarPersona("p3");
    expect(rP3.ok).toBe(true);
    if (!rP3.ok) throw new Error("p3");
    const res3 = estimarImpostoRenda(rP3.persona, estadoInicial("p3", snapshotGravado()), contextoReal, {
      escopo: "irpf",
    });
    expect(res3.ok).toBe(true);
    if (!res3.ok) throw new Error("res3");
    expect(res3.irpf?.origem).toBe("cadastro");
    expect(res3.irpf?.tipo_renda).toBe("salario");
    expect(res3.irpf?.rendimento_mensal_centavos).toBe(500000);
    expect(res3.irpf?.meses_base).toBe(0);
    expect(res3.irpf?.mensal.base_centavos).toBe(439280);
    expect(res3.irpf?.mensal.imposto_tabela_centavos).toBe(31289);
    expect(res3.irpf?.mensal.reducao_centavos).toBe(31289);
    expect(res3.irpf?.mensal.imposto_centavos).toBe(0);
    expect(res3.irpf?.rendimento_anual_centavos).toBe(6000000);
    expect(res3.irpf?.desconto_simplificado_centavos).toBe(1200000);
    expect(res3.irpf?.base_calculo_centavos).toBe(4800000);
    expect(res3.irpf?.imposto_tabela_centavos).toBe(269415);
    expect(res3.irpf?.reducao_centavos).toBe(269415);
    expect(res3.irpf?.imposto_devido_centavos).toBe(0);
    expect(res3.irpf?.premissas).toContain("renda bruta do cadastro da persona");
    const { ok: _o3, ...semOk3 } = res3;
    expect(() => esquemaResultadoImpostoRenda.parse(semOk3)).not.toThrow();

    // P2:
    // renda bruta: 238333, autonomo -> tipo "autonomo", origem "cadastro", meses_base: 0
    // mensal base 177613 → isento → 0
    const rP2 = carregarPersona("p2");
    expect(rP2.ok).toBe(true);
    if (!rP2.ok) throw new Error("p2");
    const res2 = estimarImpostoRenda(rP2.persona, estadoInicial("p2", snapshotGravado()), contextoReal, {
      escopo: "irpf",
    });
    expect(res2.ok).toBe(true);
    if (!res2.ok) throw new Error("res2");
    expect(res2.irpf?.origem).toBe("cadastro");
    expect(res2.irpf?.tipo_renda).toBe("autonomo");
    expect(res2.irpf?.rendimento_mensal_centavos).toBe(238333);
    expect(res2.irpf?.meses_base).toBe(0);
    expect(res2.irpf?.mensal.base_centavos).toBe(177613);
    expect(res2.irpf?.mensal.imposto_tabela_centavos).toBe(0);
    expect(res2.irpf?.mensal.reducao_centavos).toBe(0);
    expect(res2.irpf?.mensal.imposto_centavos).toBe(0);
    expect(res2.irpf?.imposto_devido_centavos).toBe(0);
    expect(res2.irpf?.premissas).toContain("renda bruta do cadastro da persona");
    const { ok: _o2, ...semOk2 } = res2;
    expect(() => esquemaResultadoImpostoRenda.parse(semOk2)).not.toThrow();
  });

  // 6. Investimentos P1 (persona real)
  test("6. Investimentos P1 (persona real)", () => {
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");
    const estadoP1 = estadoInicial("p1", snapshotGravado());

    const res = estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { escopo: "investimentos" });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("res");
    expect(res.irpf).toBeNull();

    const itens = res.investimentos?.itens ?? [];
    // Posições na ordem: SEP, INV1, INV9, INV2, INV3
    expect(itens.map((i) => i.posicao_id)).toEqual(["SEP", "INV1", "INV9", "INV2", "INV3"]);

    // SEP: sem_rendimento
    expect(itens[0].regime).toBe("sem_rendimento");
    expect(itens[0].base_centavos).toBe(0);
    expect(itens[0].ir_estimado_centavos).toBe(0);
    expect(itens[0].aliquota_pct).toBe("0.00");
    expect(itens[0].isento).toBe(false);
    expect(itens[0].motivo).toBe("não rende");
    expect(itens[0].data_referencia).toBe("2026-10-30");
    expect(itens[0].data_pagamento).toBeNull();
    expect(itens[0].forma).toBe("não se aplica");

    // INV1: caixinha com 2 aportes
    // Aporte 1: 2025-11-03 -> 361 dias corridos (17,5%)
    // Aporte 2: 2026-03-02 -> 242 dias corridos (20%)
    const { taxaNoDia } = indiceTaxasCdi(contextoReal);
    const ap1 = { data: "2025-11-03" as const, valor_centavos: 60000 };
    const ap2 = { data: "2026-03-02" as const, valor_centavos: 40000 };
    const av1 = avaliarRendaFixaCdi([ap1], 100, contextoReal, taxaNoDia);
    const rend1 = av1.valorAtual - ap1.valor_centavos;
    const ir1 = Math.round(rend1 * 0.175);
    const av2 = avaliarRendaFixaCdi([ap2], 100, contextoReal, taxaNoDia);
    const rend2 = av2.valorAtual - ap2.valor_centavos;
    const ir2 = Math.round(rend2 * 0.2);

    expect(itens[1].regime).toBe("renda_fixa_resgate");
    expect(itens[1].base_centavos).toBe(rend1 + rend2);
    expect(itens[1].ir_estimado_centavos).toBe(ir1 + ir2);
    expect(itens[1].isento).toBe(false);
    expect(itens[1].motivo).toBeNull();
    expect(itens[1].data_referencia).toBe("2026-10-30");
    expect(itens[1].data_pagamento).toBeNull();
    expect(itens[1].forma).toBe("retido na fonte pelo banco no resgate");

    // INV9: sem aportes -> base 0, IR 0
    expect(itens[2].regime).toBe("renda_fixa_resgate");
    expect(itens[2].base_centavos).toBe(0);
    expect(itens[2].ir_estimado_centavos).toBe(0);
    expect(itens[2].aliquota_pct).toBe("0.00");

    // INV2: cdb_vencimento -> renda_fixa_vencimento, data_referencia 2027-03-15, 364 dias (17,5%)
    expect(itens[3].regime).toBe("renda_fixa_vencimento");
    expect(itens[3].data_referencia).toBe("2027-03-15");
    expect(itens[3].aliquota_pct).toBe("17.50");
    expect(itens[3].base_centavos).toBeGreaterThan(0);
    expect(itens[3].ir_estimado_centavos).toBeGreaterThan(0);
    expect(itens[3].forma).toBe("retido na fonte no vencimento");

    // INV3: acao isento (venda < R$ 20.000) com ganho > 0 e IR 0
    expect(itens[4].regime).toBe("acao");
    expect(itens[4].isento).toBe(true);
    expect(itens[4].motivo).toBe("vendas no mês até R$ 20.000,00 são isentas");
    expect(itens[4].base_centavos).toBeGreaterThan(0);
    expect(itens[4].ir_estimado_centavos).toBe(0);
    expect(itens[4].aliquota_pct).toBe("0.00");
  });

  // 7. P2: INV4 fundo come-cotas e INV5 cripto isento
  test("7. P2: INV4 fundo come-cotas e INV5 cripto isento", () => {
    const rP2 = carregarPersona("p2");
    expect(rP2.ok).toBe(true);
    if (!rP2.ok) throw new Error("p2");
    const estadoP2 = estadoInicial("p2", snapshotGravado());

    const res = estimarImpostoRenda(rP2.persona, estadoP2, contextoReal, { escopo: "investimentos" });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("res");

    // INV4: fundo -> come_cotas, data_pagamento 2026-11-30, aporte anterior a 29/05 -> base = V(30/11) - V(29/05) > 0
    const inv4 = res.investimentos?.itens.find((i) => i.posicao_id === "INV4")!;
    expect(inv4).toBeDefined();
    expect(inv4.regime).toBe("come_cotas");
    expect(inv4.data_referencia).toBe("2026-11-30");
    expect(inv4.data_pagamento).toBe("2026-11-30");
    expect(inv4.forma).toBe("come-cotas: descontado automaticamente em cotas");
    expect(inv4.base_centavos).toBeGreaterThan(0);
    const irEsperado = Math.round(inv4.base_centavos * 0.15);
    expect(inv4.ir_estimado_centavos).toBe(irEsperado);
    expect(inv4.aliquota_pct).toBe("15.00");

    // INV5: cripto isento (alienação < R$ 35.000)
    const inv5 = res.investimentos?.itens.find((i) => i.posicao_id === "INV5")!;
    expect(inv5).toBeDefined();
    expect(inv5.regime).toBe("cripto");
    expect(inv5.isento).toBe(true);
    expect(inv5.motivo).toBe("alienações no mês até R$ 35.000,00 são isentas");
    expect(inv5.ir_estimado_centavos).toBe(0);
  });

  // 8. Operação executada conta como aporte
  test("8. Operação executada conta como aporte", () => {
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");

    const estadoComOp = {
      ...estadoInicial("p1", snapshotGravado()),
      operacoes: [
        { id: "OP1" as const, valor_centavos: 50000, destino: "INV9" as const, data: "2026-10-30" as const },
      ],
      contadores: { D: 0, H: 0, OP: 1 },
    };

    const res = estimarImpostoRenda(rP1.persona, estadoComOp, contextoReal, { escopo: "investimentos" });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("res");

    const inv9 = res.investimentos?.itens.find((i) => i.posicao_id === "INV9")!;
    expect(inv9).toBeDefined();
    // Aporte de hoje não rendeu
    expect(inv9.base_centavos).toBe(0);
    expect(inv9.ir_estimado_centavos).toBe(0);
  });

  // 9. Escopos e erros
  test("9. Escopos e erros", () => {
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");
    const estadoP1 = estadoInicial("p1", snapshotGravado());

    // Escopo "investimentos" -> irpf null
    const rInv = estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { escopo: "investimentos" });
    expect(rInv.ok).toBe(true);
    if (rInv.ok) {
      expect(rInv.investimentos).not.toBeNull();
      expect(rInv.irpf).toBeNull();
    }

    // Escopo "irpf" -> investimentos null
    const rIrpf = estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { escopo: "irpf" });
    expect(rIrpf.ok).toBe(true);
    if (rIrpf.ok) {
      expect(rIrpf.investimentos).toBeNull();
      expect(rIrpf.irpf).not.toBeNull();
    }

    // rendimento 0 -> VALOR_INVALIDO
    const rZero = estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { rendimento_mensal_centavos: 0 });
    expect(rZero.ok).toBe(false);
    if (!rZero.ok) {
      expect(rZero.erro.codigo).toBe("VALOR_INVALIDO");
      expect(rZero.erro.campos).toEqual(["rendimento_mensal"]);
    }

    // Persona sem receitas no histórico + escopo "irpf" sem renda informada -> ARGUMENTOS_INVALIDOS
    // Sem histórico de receitas e sem renda no cadastro: não há base para o IRPF.
    const { renda: _rendaP1, ...p1SemRenda } = rP1.persona;
    void _rendaP1;
    const pSemReceitas = esquemaPersona.parse({
      ...p1SemRenda,
      historico: [],
    });
    const rSemRenda = estimarImpostoRenda(pSemReceitas, estadoP1, contextoReal, { escopo: "irpf" });
    expect(rSemRenda.ok).toBe(false);
    if (!rSemRenda.ok) {
      expect(rSemRenda.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
      expect(rSemRenda.erro.campos).toEqual(["rendimento_mensal"]);
    }
  });

  // 10. Todo resultado ok passa em esquemaResultadoImpostoRenda.parse
  test("10. Todo resultado ok passa em esquemaResultadoImpostoRenda.parse", () => {
    const rP1 = carregarPersona("p1");
    expect(rP1.ok).toBe(true);
    if (!rP1.ok) throw new Error("p1");
    const estadoP1 = estadoInicial("p1", snapshotGravado());

    const chamadas = [
      estimarImpostoRenda(rP1.persona, estadoP1, contextoReal),
      estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { escopo: "investimentos" }),
      estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { escopo: "irpf" }),
      estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { rendimento_mensal_centavos: 800000 }),
      estimarImpostoRenda(rP1.persona, estadoP1, contextoReal, { rendimento_mensal_centavos: 600000 }),
    ];

    for (const res of chamadas) {
      expect(res.ok).toBe(true);
      if (res.ok) {
        const { ok: _, ...semOk } = res;
        expect(() => esquemaResultadoImpostoRenda.parse(semOk)).not.toThrow();
      }
    }
  });
});
