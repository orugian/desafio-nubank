import { describe, expect, test } from "vitest";
import { esquemaPosicao, type Posicao } from "@/contratos";
import { dataDisponivel } from "@/dominio/investimentos";
import { CONTEXTO } from "@/dominio/caixa/testes/personas";

// Posições fictícias com as regras de liquidez de I-01 (spec §5.4, §11).
const posicao = (p: unknown): Posicao => esquemaPosicao.parse(p);

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
});
