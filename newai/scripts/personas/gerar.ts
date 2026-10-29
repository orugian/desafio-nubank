// Gerador determinístico de personas (spec §4.1, §4.2, §11; plano B2).
// Produz `dados/personas/p1.json`, `p2.json` e `p3.json` a partir da spec §11
// e das séries reais gravadas em `dados/mercado/`. Nomes e descrições são
// exclusivamente fictícios e derivados da spec.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import Decimal from "decimal.js";
import {
  DIAS_HISTORICO,
  FIM_HISTORICO,
  INICIO_HISTORICO,
  esquemaPersona,
  esquemaSerieFechamentos,
  type Compromisso,
  type Fatura,
  type Lancamento,
  type Parcelamento,
  type Persona,
  type Posicao,
} from "../../src/contratos";
import btcBruto from "../../dados/mercado/fechamentos-BTC.json";
import petr4Bruto from "../../dados/mercado/fechamentos-PETR4.json";

const petr4 = esquemaSerieFechamentos.parse(petr4Bruto);
const btc = esquemaSerieFechamentos.parse(btcBruto);

function fechamentoNaData(serie: Array<{ data: string; preco_centavos: number }>, data: string): number {
  const ponto = serie.find((s) => s.data === data);
  if (!ponto) throw new Error(`sem fechamento gravado em ${data}`);
  return ponto.preco_centavos;
}

class NumeradorLancamentos {
  private n = 0;
  constructor(private prefixo = "L") {}
  proximo(): string {
    this.n += 1;
    return `${this.prefixo}${String(this.n).padStart(4, "0")}`;
  }
}

function ordenarHistorico(itens: Lancamento[]): Lancamento[] {
  return [...itens].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
}

function calcularSaldo3007(saldoInicioHoje: number, historico: Lancamento[]): number {
  const movimento = historico
    .filter((l) => l.meio !== "cartao_credito")
    .reduce((s, l) => s + (l.tipo === "entrada" ? l.valor_centavos : -l.valor_centavos), 0);
  return saldoInicioHoje - movimento;
}

function construirGastoDiario(totalVariavel: number) {
  const diario = Math.floor((totalVariavel + DIAS_HISTORICO - 1) / DIAS_HISTORICO);
  return {
    valor_centavos: diario,
    base: {
      de: INICIO_HISTORICO,
      ate: FIM_HISTORICO,
      dias: DIAS_HISTORICO,
      total_centavos: totalVariavel,
    },
  };
}

export function gerarP1(): Persona {
  const ids = new NumeradorLancamentos("L1");
  const precoPetr4Compra = fechamentoNaData(petr4.serie, "2026-08-14");
  const custoPetr4 = new Decimal("10").mul(precoPetr4Compra).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  // Compras no cartão por ciclo de fechamento (dia 29):
  // Ciclo F2608 (fecha 29/07, vence 05/08): compras antes de 30/07 fora da janela do histórico, + Celular 2/10 (15.000)
  // Ciclo F2609 (29/07 a 28/08, fecha 29/08, vence 05/09):
  const c09MercadoId = ids.proximo();
  const c09RestId = ids.proximo();
  const c09LazerId = ids.proximo();
  // Ciclo F2610 (29/08 a 28/09, fecha 29/09, vence 05/10):
  const c10MercadoId = ids.proximo();
  const c10TranspId = ids.proximo();
  const c10ComprasId = ids.proximo();
  // Ciclo A (29/09 a 28/10, fecha 29/10, vence 05/11):
  const c11MercadoId = ids.proximo();
  const c11RestId = ids.proximo();

  const faturas: Fatura[] = [
    {
      id: "F2608",
      fechamento: "2026-07-29",
      vencimento: "2026-08-05",
      status: "fechada",
      valor_centavos: 54000,
      itens: [
        { descricao: "Celular", valor_centavos: 15000, parcelamento_id: "PC1", parcela: "2/10" },
        { data: "2026-07-12", descricao: "Supermercado", valor_centavos: 24000 },
        { data: "2026-07-21", descricao: "Farmácia", valor_centavos: 15000 },
      ],
    },
    {
      id: "F2609",
      fechamento: "2026-08-29",
      vencimento: "2026-09-05",
      status: "fechada",
      valor_centavos: 62000,
      itens: [
        { descricao: "Celular", valor_centavos: 15000, parcelamento_id: "PC1", parcela: "3/10" },
        { lancamento_id: c09MercadoId, data: "2026-08-06", descricao: "Mercado Bairro", valor_centavos: 26000 },
        { lancamento_id: c09RestId, data: "2026-08-15", descricao: "Almoço", valor_centavos: 12000 },
        { lancamento_id: c09LazerId, data: "2026-08-22", descricao: "Cinema", valor_centavos: 9000 },
      ],
    },
    {
      id: "F2610",
      fechamento: "2026-09-29",
      vencimento: "2026-10-05",
      status: "fechada",
      valor_centavos: 65000,
      itens: [
        { descricao: "Celular", valor_centavos: 15000, parcelamento_id: "PC1", parcela: "4/10" },
        { lancamento_id: c10MercadoId, data: "2026-09-08", descricao: "Supermercado Central", valor_centavos: 27000 },
        { lancamento_id: c10TranspId, data: "2026-09-16", descricao: "Transporte aplicativo", valor_centavos: 11000 },
        { lancamento_id: c10ComprasId, data: "2026-09-24", descricao: "Livraria", valor_centavos: 12000 },
      ],
    },
    {
      id: "A",
      fechamento: "2026-10-29",
      vencimento: "2026-11-05",
      status: "fechada",
      valor_centavos: 70000,
      itens: [
        { descricao: "Celular", valor_centavos: 15000, parcelamento_id: "PC1", parcela: "5/10" },
        { lancamento_id: c11MercadoId, data: "2026-10-17", descricao: "Mercado", valor_centavos: 32000 },
        { lancamento_id: c11RestId, data: "2026-10-24", descricao: "Restaurante", valor_centavos: 23000 },
      ],
    },
  ];

  const historico = ordenarHistorico([
    // Ciclo 09 no cartão
    { id: c09MercadoId, data: "2026-08-06", descricao: "Mercado Bairro", tipo: "saida", meio: "cartao_credito", categoria: "mercado", valor_centavos: 26000 },
    { id: c09RestId, data: "2026-08-15", descricao: "Almoço", tipo: "saida", meio: "cartao_credito", categoria: "restaurante", valor_centavos: 12000 },
    { id: c09LazerId, data: "2026-08-22", descricao: "Cinema", tipo: "saida", meio: "cartao_credito", categoria: "lazer", valor_centavos: 9000 },
    // Ciclo 10 no cartão
    { id: c10MercadoId, data: "2026-09-08", descricao: "Supermercado Central", tipo: "saida", meio: "cartao_credito", categoria: "mercado", valor_centavos: 27000 },
    { id: c10TranspId, data: "2026-09-16", descricao: "Transporte aplicativo", tipo: "saida", meio: "cartao_credito", categoria: "transporte", valor_centavos: 11000 },
    { id: c10ComprasId, data: "2026-09-24", descricao: "Livraria", tipo: "saida", meio: "cartao_credito", categoria: "compras", valor_centavos: 12000 },
    // Ciclo A no cartão
    { id: c11MercadoId, data: "2026-10-17", descricao: "Mercado", tipo: "saida", meio: "cartao_credito", categoria: "mercado", valor_centavos: 32000 },
    { id: c11RestId, data: "2026-10-24", descricao: "Restaurante", tipo: "saida", meio: "cartao_credito", categoria: "restaurante", valor_centavos: 23000 },

    // Pagamentos das faturas fechadas nos vencimentos
    { id: ids.proximo(), data: "2026-08-05", descricao: "Pagamento fatura cartão", tipo: "saida", meio: "debito", categoria: "fatura", valor_centavos: 54000, fatura_id: "F2608" },
    { id: ids.proximo(), data: "2026-09-05", descricao: "Pagamento fatura cartão", tipo: "saida", meio: "debito", categoria: "fatura", valor_centavos: 62000, fatura_id: "F2609" },
    { id: ids.proximo(), data: "2026-10-05", descricao: "Pagamento fatura cartão", tipo: "saida", meio: "debito", categoria: "fatura", valor_centavos: 65000, fatura_id: "F2610" },

    // Recorrência B: Aluguel 600,00 dia 10
    { id: ids.proximo(), data: "2026-08-10", descricao: "Aluguel", tipo: "saida", meio: "pix", categoria: "moradia", valor_centavos: 60000, recorrencia_id: "B" },
    { id: ids.proximo(), data: "2026-09-10", descricao: "Aluguel", tipo: "saida", meio: "pix", categoria: "moradia", valor_centavos: 60000, recorrencia_id: "B" },
    { id: ids.proximo(), data: "2026-10-10", descricao: "Aluguel", tipo: "saida", meio: "pix", categoria: "moradia", valor_centavos: 60000, recorrencia_id: "B" },

    // Recorrência C: Contas da casa 200,00 dia 15
    { id: ids.proximo(), data: "2026-08-15", descricao: "Contas da casa", tipo: "saida", meio: "debito_automatico", categoria: "contas_casa", valor_centavos: 20000, recorrencia_id: "C" },
    { id: ids.proximo(), data: "2026-09-15", descricao: "Contas da casa", tipo: "saida", meio: "debito_automatico", categoria: "contas_casa", valor_centavos: 20000, recorrencia_id: "C" },
    { id: ids.proximo(), data: "2026-10-15", descricao: "Contas da casa", tipo: "saida", meio: "debito_automatico", categoria: "contas_casa", valor_centavos: 20000, recorrencia_id: "C" },

    // Recorrência R1: Salário 3.000,00 dia 20 (em nov cai 19/11 por feriado 20/11)
    { id: ids.proximo(), data: "2026-08-20", descricao: "Salário", tipo: "entrada", meio: "salario", categoria: "receitas", valor_centavos: 300000, recorrencia_id: "R1" },
    { id: ids.proximo(), data: "2026-09-20", descricao: "Salário", tipo: "entrada", meio: "salario", categoria: "receitas", valor_centavos: 300000, recorrencia_id: "R1" },
    { id: ids.proximo(), data: "2026-10-20", descricao: "Salário", tipo: "entrada", meio: "salario", categoria: "receitas", valor_centavos: 300000, recorrencia_id: "R1" },

    // Compra de PETR4 no histórico (invariante 8)
    { id: ids.proximo(), data: "2026-08-14", descricao: "Compra PETR4 (10 un)", tipo: "saida", meio: "debito", categoria: "investimentos", valor_centavos: custoPetr4, posicao_id: "INV3" },
  ]);

  const saldoHoje = 180000;
  const saldo3007 = calcularSaldo3007(saldoHoje, historico);

  const compromissos: Compromisso[] = [
    {
      id: "B",
      tipo: "saida",
      categoria: "moradia",
      descricao: "Aluguel",
      data: "2026-11-10",
      valor_centavos: 60000,
      meio: "pix",
      origem_dado: "agendamento",
      previsto: false,
      estimativa: null,
      recorrente: true,
    },
    {
      id: "C",
      tipo: "saida",
      categoria: "contas_casa",
      descricao: "Contas da casa",
      data: "2026-11-15",
      valor_centavos: 20000,
      meio: "debito_automatico",
      origem_dado: "debito_automatico",
      previsto: false,
      estimativa: null,
      recorrente: true,
    },
    {
      id: "R1",
      tipo: "entrada",
      categoria: "receitas",
      descricao: "Salário",
      data: "2026-11-19",
      valor_centavos: 300000,
      meio: "salario",
      origem_dado: "recebimento_previsto",
      previsto: true,
      estimativa: null,
      recorrente: true,
    },
  ];

  const parcelamentos: Parcelamento[] = [
    {
      id: "PC1",
      descricao: "Celular",
      valor_total_centavos: 150000,
      parcelas: 10,
      data_compra: "2026-06-20",
      anterior_ao_historico: true,
    },
  ];

  const posicoes: Posicao[] = [
    { id: "SEP", categoria: "saldo_separado", nome: "Saldo separado", aportes: [], liquidez: { regra: "imediata" }, protecao: null },
    {
      id: "INV1",
      categoria: "caixinha",
      nome: "Caixinha Reserva",
      cdi_pct: 100,
      aportes: [
        { data: "2025-11-03", valor_centavos: 60000 },
        { data: "2026-03-02", valor_centavos: 40000 },
      ],
      liquidez: { regra: "imediata" },
      protecao: { tipo: "integral" },
      restricao: "Reserva de emergência: não usar para objetivos",
    },
    { id: "INV9", categoria: "caixinha", nome: "Caixinha Viagem", cdi_pct: 100, aportes: [], liquidez: { regra: "imediata" }, protecao: null },
    {
      id: "INV2",
      categoria: "cdb_vencimento",
      nome: "CDB Banco Fictício",
      cdi_pct: 120,
      vencimento: "2027-03-15",
      aportes: [{ data: "2026-03-16", valor_centavos: 50000 }],
      liquidez: { regra: "no_vencimento" },
      protecao: null,
    },
    {
      id: "INV3",
      categoria: "acao",
      nome: "PETR4",
      ticker: "PETR4",
      compras: [{ data: "2026-08-14", quantidade: "10", preco_centavos: precoPetr4Compra }],
      liquidez: { regra: "d_mais_uteis", dias: 2 },
      protecao: null,
    },
  ];

  return esquemaPersona.parse({
    id: "p1",
    nome: "Bia (fictícia)",
    resumo: "Quer juntar dinheiro para uma viagem.",
    conta: { saldo_30_07_centavos: saldo3007, saldo_inicio_hoje_centavos: saldoHoje },
    historico,
    compromissos,
    gasto_diario: construirGastoDiario(0),
    cartao: {
      dia_fechamento: 29,
      dia_vencimento: 5,
      limite_centavos: 400000,
      parcelamentos,
      faturas,
    },
    posicoes,
  });
}

export function gerarP2(): Persona {
  const ids = new NumeradorLancamentos("L2");
  const precoBtcCompra = fechamentoNaData(btc.serie, "2026-08-10");
  const custoBtc = new Decimal("0.005").mul(precoBtcCompra).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  const luz08Id = ids.proximo();
  const luz09Id = ids.proximo();
  const luz10Id = ids.proximo();

  // Saídas variáveis por Pix/débito em 30/07..29/10 somando exatamente 138.000 centavos (1380,00 / 92 = 15,00 por dia).
  // Inclui delivery em setembro para CV-10.
  const gastosVariaveis: Array<{ data: string; descricao: string; meio: "pix" | "debito"; categoria: Lancamento["categoria"]; valor_centavos: number }> = [
    { data: "2026-08-02", descricao: "Padaria Central", meio: "debito", categoria: "mercado", valor_centavos: 8500 },
    { data: "2026-08-07", descricao: "Delivery Pizza", meio: "pix", categoria: "delivery", valor_centavos: 7200 },
    { data: "2026-08-14", descricao: "Supermercado Sul", meio: "debito", categoria: "mercado", valor_centavos: 19000 },
    { data: "2026-08-21", descricao: "Transporte Urbano", meio: "pix", categoria: "transporte", valor_centavos: 6800 },
    { data: "2026-08-27", descricao: "Restaurante Prato Feito", meio: "debito", categoria: "restaurante", valor_centavos: 7500 },
    { data: "2026-09-04", descricao: "Delivery Hambúrguer", meio: "pix", categoria: "delivery", valor_centavos: 6400 },
    { data: "2026-09-11", descricao: "Supermercado Sul", meio: "debito", categoria: "mercado", valor_centavos: 18500 },
    { data: "2026-09-18", descricao: "Delivery Japonês", meio: "pix", categoria: "delivery", valor_centavos: 9600 },
    { data: "2026-09-25", descricao: "Lazer e Cultura", meio: "debito", categoria: "lazer", valor_centavos: 8500 },
    { data: "2026-10-03", descricao: "Mercado da Esquina", meio: "debito", categoria: "mercado", valor_centavos: 17500 },
    { data: "2026-10-11", descricao: "Delivery Lanches", meio: "pix", categoria: "delivery", valor_centavos: 6500 },
    { data: "2026-10-16", descricao: "Transporte Urbano", meio: "pix", categoria: "transporte", valor_centavos: 7000 },
    { data: "2026-10-20", descricao: "Restaurante Bairro", meio: "debito", categoria: "restaurante", valor_centavos: 8200 },
    { data: "2026-10-26", descricao: "Feira Livre", meio: "pix", categoria: "mercado", valor_centavos: 6800 },
  ];
  const totalVariavel = gastosVariaveis.reduce((s, g) => s + g.valor_centavos, 0);

  const historico = ordenarHistorico([
    // Recorrência E1: Internet 120,00 dia 03
    { id: ids.proximo(), data: "2026-08-03", descricao: "Internet", tipo: "saida", meio: "debito_automatico", categoria: "assinaturas", valor_centavos: 12000, recorrencia_id: "E1" },
    { id: ids.proximo(), data: "2026-09-03", descricao: "Internet", tipo: "saida", meio: "debito_automatico", categoria: "assinaturas", valor_centavos: 12000, recorrencia_id: "E1" },
    { id: ids.proximo(), data: "2026-10-03", descricao: "Internet", tipo: "saida", meio: "debito_automatico", categoria: "assinaturas", valor_centavos: 12000, recorrencia_id: "E1" },

    // Recorrência E2: Aluguel 1.100,00 dia 08
    { id: ids.proximo(), data: "2026-08-08", descricao: "Aluguel", tipo: "saida", meio: "pix", categoria: "moradia", valor_centavos: 110000, recorrencia_id: "E2" },
    { id: ids.proximo(), data: "2026-09-08", descricao: "Aluguel", tipo: "saida", meio: "pix", categoria: "moradia", valor_centavos: 110000, recorrencia_id: "E2" },
    { id: ids.proximo(), data: "2026-10-08", descricao: "Aluguel", tipo: "saida", meio: "pix", categoria: "moradia", valor_centavos: 110000, recorrencia_id: "E2" },

    // Recorrência E4: Conta de luz (165, 180, 195 → média 180)
    { id: luz08Id, data: "2026-08-12", descricao: "Conta de luz", tipo: "saida", meio: "debito_automatico", categoria: "contas_casa", valor_centavos: 16500, recorrencia_id: "E4" },
    { id: luz09Id, data: "2026-09-12", descricao: "Conta de luz", tipo: "saida", meio: "debito_automatico", categoria: "contas_casa", valor_centavos: 18000, recorrencia_id: "E4" },
    { id: luz10Id, data: "2026-10-12", descricao: "Conta de luz", tipo: "saida", meio: "debito_automatico", categoria: "contas_casa", valor_centavos: 19500, recorrencia_id: "E4" },

    // Recebimentos de clientes no histórico
    { id: ids.proximo(), data: "2026-08-15", descricao: "Serviço prestado a cliente", tipo: "entrada", meio: "pix", categoria: "receitas", valor_centavos: 240000 },
    { id: ids.proximo(), data: "2026-09-15", descricao: "Serviço prestado a cliente", tipo: "entrada", meio: "pix", categoria: "receitas", valor_centavos: 230000 },
    { id: ids.proximo(), data: "2026-10-15", descricao: "Serviço prestado a cliente", tipo: "entrada", meio: "pix", categoria: "receitas", valor_centavos: 245000 },

    // Compra de BTC em 10/08/2026 (invariante 8)
    { id: ids.proximo(), data: "2026-08-10", descricao: "Compra Bitcoin (0.005 BTC)", tipo: "saida", meio: "pix", categoria: "investimentos", valor_centavos: custoBtc, posicao_id: "INV5" },

    // Saídas variáveis
    ...gastosVariaveis.map((g) => ({
      id: ids.proximo(),
      data: g.data,
      descricao: g.descricao,
      tipo: "saida" as const,
      meio: g.meio,
      categoria: g.categoria,
      valor_centavos: g.valor_centavos,
    })),
  ]);

  const saldoHoje = 90000;
  const saldo3007 = calcularSaldo3007(saldoHoje, historico);

  const compromissos: Compromisso[] = [
    {
      id: "E1",
      tipo: "saida",
      categoria: "assinaturas",
      descricao: "Internet",
      data: "2026-11-03",
      valor_centavos: 12000,
      meio: "debito_automatico",
      origem_dado: "debito_automatico",
      previsto: false,
      estimativa: null,
      recorrente: true,
    },
    {
      id: "E2",
      tipo: "saida",
      categoria: "moradia",
      descricao: "Aluguel",
      data: "2026-11-08",
      valor_centavos: 110000,
      meio: "pix",
      origem_dado: "agendamento",
      previsto: false,
      estimativa: null,
      recorrente: true,
    },
    {
      id: "E3",
      tipo: "entrada",
      categoria: "receitas",
      descricao: "Cobrança Pix a cliente",
      data: "2026-11-08",
      valor_centavos: 150000,
      meio: "pix",
      origem_dado: "cobranca_emitida",
      previsto: true,
      estimativa: null,
      recorrente: false,
    },
    {
      id: "E4",
      tipo: "saida",
      categoria: "contas_casa",
      descricao: "Conta de luz",
      data: "2026-11-12",
      valor_centavos: 18000,
      meio: "debito_automatico",
      origem_dado: "conta_estimada",
      previsto: false,
      estimativa: {
        metodo: "media_3_ultimas",
        ocorrencias: [
          { lancamento_id: luz08Id, data: "2026-08-12", valor_centavos: 16500 },
          { lancamento_id: luz09Id, data: "2026-09-12", valor_centavos: 18000 },
          { lancamento_id: luz10Id, data: "2026-10-12", valor_centavos: 19500 },
        ],
        texto: "estimado: média de R$ 165,00, R$ 180,00 e R$ 195,00",
      },
      recorrente: true,
    },
    {
      id: "E5",
      tipo: "saida",
      categoria: "educacao",
      descricao: "Curso",
      data: "2026-11-25",
      valor_centavos: 40000,
      meio: "boleto",
      origem_dado: "boleto",
      previsto: false,
      estimativa: null,
      recorrente: false,
    },
  ];

  const posicoes: Posicao[] = [
    { id: "SEP", categoria: "saldo_separado", nome: "Saldo separado", aportes: [], liquidez: { regra: "imediata" }, protecao: null },
    { id: "INV10", categoria: "caixinha", nome: "Caixinha", cdi_pct: 100, aportes: [], liquidez: { regra: "imediata" }, protecao: null },
    {
      id: "INV4",
      categoria: "fundo",
      nome: "Fundo DI Fictício",
      cdi_pct: 98,
      aportes: [{ data: "2026-05-04", valor_centavos: 200000 }],
      liquidez: { regra: "d_mais_uteis", dias: 1 },
      protecao: { tipo: "parcial", valor_centavos: 120000 },
    },
    {
      id: "INV5",
      categoria: "cripto",
      nome: "Bitcoin",
      ticker: "BTC",
      compras: [{ data: "2026-08-10", quantidade: "0.005", preco_centavos: precoBtcCompra }],
      liquidez: { regra: "imediata" },
      protecao: null,
    },
  ];

  return esquemaPersona.parse({
    id: "p2",
    nome: "Caio (fictício)",
    resumo: "Trabalha por conta própria e recebe de clientes por Pix.",
    conta: { saldo_30_07_centavos: saldo3007, saldo_inicio_hoje_centavos: saldoHoje },
    historico,
    compromissos,
    gasto_diario: construirGastoDiario(totalVariavel),
    cartao: null,
    posicoes,
  });
}

export function gerarP3(): Persona {
  const ids = new NumeradorLancamentos("L3");

  // Compras no cartão:
  // PC1 Geladeira: 2.500,00 em 10x comprada em 15/08/2026 (ciclo F2609)
  const idCompraGeladeira = ids.proximo();
  // Outras compras no ciclo F2609 (29/07 a 28/08):
  const c09MercId = ids.proximo();
  const c09CombId = ids.proximo();
  // Ciclo F2610 (29/08 a 28/09):
  const c10MercId = ids.proximo();
  const c10RestId = ids.proximo();
  // Ciclo E2 (29/09 a 28/10, vence 05/11, total 1.250,00):
  const c11SupId = ids.proximo();
  const c11CombId = ids.proximo();
  const c11RestId = ids.proximo();
  // Ciclo F2612 aberta (a partir de 29/10):
  const c12CafeId = ids.proximo();

  const faturas: Fatura[] = [
    {
      id: "F2608",
      fechamento: "2026-07-29",
      vencimento: "2026-08-05",
      status: "fechada",
      valor_centavos: 68000,
      itens: [
        { data: "2026-07-10", descricao: "Supermercado", valor_centavos: 42000 },
        { data: "2026-07-19", descricao: "Combustível", valor_centavos: 26000 },
      ],
    },
    {
      id: "F2609",
      fechamento: "2026-08-29",
      vencimento: "2026-09-05",
      status: "fechada",
      valor_centavos: 91000,
      itens: [
        { lancamento_id: idCompraGeladeira, data: "2026-08-15", descricao: "Geladeira", valor_centavos: 25000, parcelamento_id: "PC1", parcela: "1/10" },
        { lancamento_id: c09MercId, data: "2026-08-05", descricao: "Supermercado", valor_centavos: 41000 },
        { lancamento_id: c09CombId, data: "2026-08-19", descricao: "Combustível", valor_centavos: 25000 },
      ],
    },
    {
      id: "F2610",
      fechamento: "2026-09-29",
      vencimento: "2026-10-05",
      status: "fechada",
      valor_centavos: 89000,
      itens: [
        { descricao: "Geladeira", valor_centavos: 25000, parcelamento_id: "PC1", parcela: "2/10" },
        { lancamento_id: c10MercId, data: "2026-09-06", descricao: "Supermercado", valor_centavos: 44000 },
        { lancamento_id: c10RestId, data: "2026-09-20", descricao: "Restaurante", valor_centavos: 20000 },
      ],
    },
    {
      id: "E2",
      fechamento: "2026-10-29",
      vencimento: "2026-11-05",
      status: "fechada",
      valor_centavos: 125000,
      itens: [
        { lancamento_id: c11SupId, data: "2026-10-03", descricao: "Supermercado", valor_centavos: 48000 },
        { lancamento_id: c11CombId, data: "2026-10-09", descricao: "Combustível", valor_centavos: 32000 },
        { lancamento_id: c11RestId, data: "2026-10-16", descricao: "Restaurante", valor_centavos: 20000 },
        { descricao: "Geladeira", valor_centavos: 25000, parcelamento_id: "PC1", parcela: "3/10" },
      ],
    },
    {
      id: "F2612",
      fechamento: "2026-11-29",
      vencimento: "2026-12-05",
      status: "aberta",
      valor_centavos: 32600,
      itens: [
        { descricao: "Geladeira", valor_centavos: 25000, parcelamento_id: "PC1", parcela: "4/10" },
        { lancamento_id: c12CafeId, data: "2026-10-29", descricao: "Café e padaria", valor_centavos: 7600 },
      ],
    },
  ];

  // Saídas variáveis por Pix/débito em 30/07..29/10 somando exatamente 92.000 centavos (920,00 / 92 = 10,00 por dia).
  const gastosVariaveis: Array<{ data: string; descricao: string; meio: "pix" | "debito"; categoria: Lancamento["categoria"]; valor_centavos: number }> = [
    { data: "2026-08-03", descricao: "Padaria Família", meio: "debito", categoria: "mercado", valor_centavos: 9500 },
    { data: "2026-08-12", descricao: "Transporte Escolar", meio: "pix", categoria: "transporte", valor_centavos: 11000 },
    { data: "2026-08-23", descricao: "Lazer Parque", meio: "debito", categoria: "lazer", valor_centavos: 10500 },
    { data: "2026-09-02", descricao: "Hortifruti", meio: "debito", categoria: "mercado", valor_centavos: 9800 },
    { data: "2026-09-12", descricao: "Transporte Escolar", meio: "pix", categoria: "transporte", valor_centavos: 11000 },
    { data: "2026-09-25", descricao: "Papelaria", meio: "debito", categoria: "compras", valor_centavos: 9200 },
    { data: "2026-10-06", descricao: "Hortifruti", meio: "debito", categoria: "mercado", valor_centavos: 10500 },
    { data: "2026-10-14", descricao: "Transporte Escolar", meio: "pix", categoria: "transporte", valor_centavos: 11000 },
    { data: "2026-10-21", descricao: "Lanche Tarde", meio: "pix", categoria: "restaurante", valor_centavos: 9500 },
  ];
  const totalVariavel = gastosVariaveis.reduce((s, g) => s + g.valor_centavos, 0);

  const historico = ordenarHistorico([
    // Compras no cartão no histórico
    { id: idCompraGeladeira, data: "2026-08-15", descricao: "Geladeira", tipo: "saida", meio: "cartao_credito", categoria: "compras", valor_centavos: 250000, parcelamento_id: "PC1", parcela: "1/10" },
    { id: c09MercId, data: "2026-08-05", descricao: "Supermercado", tipo: "saida", meio: "cartao_credito", categoria: "mercado", valor_centavos: 41000 },
    { id: c09CombId, data: "2026-08-19", descricao: "Combustível", tipo: "saida", meio: "cartao_credito", categoria: "transporte", valor_centavos: 25000 },
    { id: c10MercId, data: "2026-09-06", descricao: "Supermercado", tipo: "saida", meio: "cartao_credito", categoria: "mercado", valor_centavos: 44000 },
    { id: c10RestId, data: "2026-09-20", descricao: "Restaurante", tipo: "saida", meio: "cartao_credito", categoria: "restaurante", valor_centavos: 20000 },
    { id: c11SupId, data: "2026-10-03", descricao: "Supermercado", tipo: "saida", meio: "cartao_credito", categoria: "mercado", valor_centavos: 48000 },
    { id: c11CombId, data: "2026-10-09", descricao: "Combustível", tipo: "saida", meio: "cartao_credito", categoria: "transporte", valor_centavos: 32000 },
    { id: c11RestId, data: "2026-10-16", descricao: "Restaurante", tipo: "saida", meio: "cartao_credito", categoria: "restaurante", valor_centavos: 20000 },
    { id: c12CafeId, data: "2026-10-29", descricao: "Café e padaria", tipo: "saida", meio: "cartao_credito", categoria: "restaurante", valor_centavos: 7600 },

    // Pagamentos das faturas fechadas nos vencimentos
    { id: ids.proximo(), data: "2026-08-05", descricao: "Pagamento fatura cartão", tipo: "saida", meio: "debito", categoria: "fatura", valor_centavos: 68000, fatura_id: "F2608" },
    { id: ids.proximo(), data: "2026-09-05", descricao: "Pagamento fatura cartão", tipo: "saida", meio: "debito", categoria: "fatura", valor_centavos: 91000, fatura_id: "F2609" },
    { id: ids.proximo(), data: "2026-10-05", descricao: "Pagamento fatura cartão", tipo: "saida", meio: "debito", categoria: "fatura", valor_centavos: 89000, fatura_id: "F2610" },

    // Recorrência E1: Mensalidade escolar 900,00 dia 04
    { id: ids.proximo(), data: "2026-08-04", descricao: "Mensalidade escolar", tipo: "saida", meio: "boleto", categoria: "educacao", valor_centavos: 90000, recorrencia_id: "E1" },
    { id: ids.proximo(), data: "2026-09-04", descricao: "Mensalidade escolar", tipo: "saida", meio: "boleto", categoria: "educacao", valor_centavos: 90000, recorrencia_id: "E1" },
    { id: ids.proximo(), data: "2026-10-04", descricao: "Mensalidade escolar", tipo: "saida", meio: "boleto", categoria: "educacao", valor_centavos: 90000, recorrencia_id: "E1" },

    // Recorrência E3: Salário 4.200,00 dia 13
    { id: ids.proximo(), data: "2026-08-13", descricao: "Salário", tipo: "entrada", meio: "salario", categoria: "receitas", valor_centavos: 420000, recorrencia_id: "E3" },
    { id: ids.proximo(), data: "2026-09-13", descricao: "Salário", tipo: "entrada", meio: "salario", categoria: "receitas", valor_centavos: 420000, recorrencia_id: "E3" },
    { id: ids.proximo(), data: "2026-10-13", descricao: "Salário", tipo: "entrada", meio: "salario", categoria: "receitas", valor_centavos: 420000, recorrencia_id: "E3" },

    // Recorrência E4: Financiamento 1.300,00 dia 18
    { id: ids.proximo(), data: "2026-08-18", descricao: "Financiamento", tipo: "saida", meio: "debito_automatico", categoria: "outros", valor_centavos: 130000, recorrencia_id: "E4" },
    { id: ids.proximo(), data: "2026-09-18", descricao: "Financiamento", tipo: "saida", meio: "debito_automatico", categoria: "outros", valor_centavos: 130000, recorrencia_id: "E4" },
    { id: ids.proximo(), data: "2026-10-18", descricao: "Financiamento", tipo: "saida", meio: "debito_automatico", categoria: "outros", valor_centavos: 130000, recorrencia_id: "E4" },

    // Recorrência E5: Condomínio 650,00 dia 28
    { id: ids.proximo(), data: "2026-08-28", descricao: "Condomínio", tipo: "saida", meio: "boleto", categoria: "moradia", valor_centavos: 65000, recorrencia_id: "E5" },
    { id: ids.proximo(), data: "2026-09-28", descricao: "Condomínio", tipo: "saida", meio: "boleto", categoria: "moradia", valor_centavos: 65000, recorrencia_id: "E5" },
    { id: ids.proximo(), data: "2026-10-28", descricao: "Condomínio", tipo: "saida", meio: "boleto", categoria: "moradia", valor_centavos: 65000, recorrencia_id: "E5" },

    // Consulta médica (categoria saude, não variável, em 23/10 valor 67,00 não reservado)
    { id: ids.proximo(), data: "2026-10-23", descricao: "Consulta pediatria", tipo: "saida", meio: "debito", categoria: "saude", valor_centavos: 6700 },

    // Saídas variáveis
    ...gastosVariaveis.map((g) => ({
      id: ids.proximo(),
      data: g.data,
      descricao: g.descricao,
      tipo: "saida" as const,
      meio: g.meio,
      categoria: g.categoria,
      valor_centavos: g.valor_centavos,
    })),
  ]);

  const saldoHoje = 250000;
  const saldo3007 = calcularSaldo3007(saldoHoje, historico);

  const compromissos: Compromisso[] = [
    {
      id: "E1",
      tipo: "saida",
      categoria: "educacao",
      descricao: "Mensalidade escolar",
      data: "2026-11-04",
      valor_centavos: 90000,
      meio: "boleto",
      origem_dado: "boleto",
      previsto: false,
      estimativa: null,
      recorrente: true,
    },
    {
      id: "E3",
      tipo: "entrada",
      categoria: "receitas",
      descricao: "Salário",
      data: "2026-11-13",
      valor_centavos: 420000,
      meio: "salario",
      origem_dado: "recebimento_previsto",
      previsto: true,
      estimativa: null,
      recorrente: true,
    },
    {
      id: "E4",
      tipo: "saida",
      categoria: "outros",
      descricao: "Financiamento",
      data: "2026-11-18",
      valor_centavos: 130000,
      meio: "debito_automatico",
      origem_dado: "debito_automatico",
      previsto: false,
      estimativa: null,
      recorrente: true,
    },
    {
      id: "E5",
      tipo: "saida",
      categoria: "moradia",
      descricao: "Condomínio",
      data: "2026-11-28",
      valor_centavos: 65000,
      meio: "boleto",
      origem_dado: "boleto",
      previsto: false,
      estimativa: null,
      recorrente: true,
    },
  ];

  const parcelamentos: Parcelamento[] = [
    {
      id: "PC1",
      descricao: "Geladeira",
      valor_total_centavos: 250000,
      parcelas: 10,
      data_compra: "2026-08-15",
      anterior_ao_historico: false,
    },
  ];

  const posicoes: Posicao[] = [
    { id: "SEP", categoria: "saldo_separado", nome: "Saldo separado", aportes: [], liquidez: { regra: "imediata" }, protecao: null },
    {
      id: "INV6",
      categoria: "caixinha",
      nome: "Caixinha Reserva de emergência",
      cdi_pct: 100,
      aportes: [
        { data: "2026-01-05", valor_centavos: 150000 },
        { data: "2026-04-06", valor_centavos: 150000 },
      ],
      liquidez: { regra: "imediata" },
      protecao: { tipo: "integral" },
    },
    {
      id: "INV7",
      categoria: "cdb_liquidez_diaria",
      nome: "CDB liquidez diária",
      cdi_pct: 110,
      aportes: [{ data: "2026-06-10", valor_centavos: 150000 }],
      liquidez: { regra: "d_mais_uteis", dias: 0 },
      protecao: null,
    },
  ];

  return esquemaPersona.parse({
    id: "p3",
    nome: "Duda (fictícia)",
    resumo: "Tem filhos na escola, financiamento e compras parceladas no cartão.",
    conta: { saldo_30_07_centavos: saldo3007, saldo_inicio_hoje_centavos: saldoHoje },
    historico,
    compromissos,
    gasto_diario: construirGastoDiario(totalVariavel),
    cartao: {
      dia_fechamento: 29,
      dia_vencimento: 5,
      limite_centavos: 600000,
      parcelamentos,
      faturas,
    },
    posicoes,
  });
}

export function gerarTodasPersonas(): Record<"p1" | "p2" | "p3", Persona> {
  return {
    p1: gerarP1(),
    p2: gerarP2(),
    p3: gerarP3(),
  };
}

export function gravarPersonas(pasta = join(process.cwd(), "dados", "personas")): void {
  const todas = gerarTodasPersonas();
  for (const [id, persona] of Object.entries(todas)) {
    const caminho = join(pasta, `${id}.json`);
    writeFileSync(caminho, `${JSON.stringify(persona, null, 2)}\n`, "utf8");
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("gerar.ts")) {
  gravarPersonas();
}
