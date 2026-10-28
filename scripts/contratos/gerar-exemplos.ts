// Gera os exemplos JSON de src/contratos/exemplos/ a partir dos números da
// spec §11, escritos à mão aqui. Rodar: npx tsx scripts/contratos/gerar-exemplos.ts
// Investimentos usam os dados de teste da spec (CDI 0,05% ao dia; CR-06, CR-07,
// CR-16, CR-32 a CR-34). Todos os dados são fictícios.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  NOMES_FERRAMENTAS,
  VERSAO_CONTRATOS,
  descricoesFerramentas,
  estadoInicial,
  textos,
  type CartaoResposta,
  type CartaoVisao,
  type EstadoSessao,
  type LinhaCenario,
  type NomeEsquema,
  type ResultadoCenario,
  type SnapshotMercado,
  type VisaoApp,
} from "../../src/contratos";

const RAIZ = join(__dirname, "..", "..", "src", "contratos");
const PASTA = join(RAIZ, "exemplos");
const PASTA_INV = join(PASTA, "invalidos");
const PASTA_ROT = join(RAIZ, "roteiros");

function gravar(pasta: string, arquivo: string, esquema: NomeEsquema, descricao: string, dados: unknown) {
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, arquivo), JSON.stringify({ exemplo: true, esquema, descricao, dados }, null, 2) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// Mercado (dados de teste da spec §11.4)
// ---------------------------------------------------------------------------

const FONTE_CDI = "CDI de teste (spec §11.4)";
const snapshot: SnapshotMercado = {
  ao_vivo: false,
  obtido_em: "2026-10-28T11:00:00-03:00",
  tentou_ao_vivo: false,
  cdi: { taxa_diaria_pct: "0.05", data_ref: "2026-10-29", fonte: FONTE_CDI },
  precos: {
    ITUB4: { preco_centavos: 3300, data_hora: "2026-10-27T18:00:00-03:00", fonte: "brapi" },
    BTC: { preco_centavos: 38000000, data_hora: "2026-10-27T21:00:00-03:00", fonte: "CoinGecko" },
  },
};

// ---------------------------------------------------------------------------
// Cenários de P1 (CR-01, CR-02, CR-04)
// ---------------------------------------------------------------------------

type L = Omit<LinhaCenario, "rotulo" | "estimativa" | "original" | "previsto"> &
  Partial<Pick<LinhaCenario, "estimativa" | "original" | "previsto">>;
function linha(l: L): LinhaCenario {
  const rotulo =
    l.saldo_apos_centavos === 0
      ? textos.rotulos.saldo_zerado
      : l.saldo_apos_centavos < 0
        ? textos.rotulos.saldo_insuficiente(-l.saldo_apos_centavos)
        : null;
  return { estimativa: null, original: null, previsto: false, ...l, rotulo };
}

const A = (saldo: number) =>
  linha({ data: "2026-11-05", evento_id: "A", descricao: "Fatura do cartão", tipo: "saida", meio: "debito", origem: "dados_base", valor_centavos: 70000, saldo_apos_centavos: saldo });
const B = (saldo: number) =>
  linha({ data: "2026-11-10", evento_id: "B", descricao: "Aluguel", tipo: "saida", meio: "pix", origem: "dados_base", valor_centavos: 60000, saldo_apos_centavos: saldo });
const C = (saldo: number) =>
  linha({ data: "2026-11-15", evento_id: "C", descricao: "Contas da casa", tipo: "saida", meio: "debito_automatico", origem: "dados_base", valor_centavos: 20000, saldo_apos_centavos: saldo });
const C150 = (saldo: number) =>
  linha({ data: "2026-11-15", evento_id: "C", descricao: "Contas da casa", tipo: "saida", meio: "debito_automatico", origem: "declaracao", valor_centavos: 15000, saldo_apos_centavos: saldo, original: { data: "2026-11-15", valor_centavos: 20000 } });
const R1 = (saldo: number) =>
  linha({ data: "2026-11-19", evento_id: "R1", descricao: "Salário", tipo: "entrada", meio: "salario", origem: "dados_base", previsto: true, valor_centavos: 300000, saldo_apos_centavos: saldo });
const H11 = (saldo: number) =>
  linha({ data: "2026-10-30", evento_id: "H1.1", descricao: "Separar R$ 500,00", tipo: "saida", meio: "simulacao", origem: "hipotese", valor_centavos: 50000, saldo_apos_centavos: saldo });
const OP1 = (saldo: number) =>
  linha({ data: "2026-10-30", evento_id: "OP1", descricao: textos.descricao_movimentacao("Caixinha Viagem"), tipo: "saida", meio: "movimentacao_interna", origem: "operacao", valor_centavos: 50000, saldo_apos_centavos: saldo });

const faltaC = (valor: number) => ({ data: "2026-11-15", valor_descoberto_centavos: valor, saidas_do_dia: ["C"] });

/** CR-01. */
const cr01: ResultadoCenario = {
  cenario_id: "atual",
  nome: textos.rotulos.situacao_atual,
  status: "calculado",
  linhas: [A(110000), B(50000), C(30000), R1(330000)],
  indicadores: {
    saldo_inicial_centavos: 180000,
    saldo_minimo_centavos: 30000,
    data_saldo_minimo: "2026-11-15",
    primeira_falta: null,
    insuficiencia_centavos: 0,
    margem_hoje_centavos: 30000,
    saldo_final_centavos: 330000,
    sem_recebimentos: { insuficiencia_centavos: 0, primeira_falta: null, saldo_final_centavos: 30000 },
  },
  faturas_afetadas: [],
  datas_ordem_relevante: [],
  avisos: [],
};

/** Indicadores de CR-02 (também CR-40 e CR-41). */
const indicadoresCr02 = {
  saldo_inicial_centavos: 180000,
  saldo_minimo_centavos: -20000,
  data_saldo_minimo: "2026-11-15",
  primeira_falta: faltaC(20000),
  insuficiencia_centavos: 20000,
  margem_hoje_centavos: 0,
  saldo_final_centavos: 280000,
  sem_recebimentos: { insuficiencia_centavos: 20000, primeira_falta: faltaC(20000), saldo_final_centavos: -20000 },
};

/** CR-02. */
const cr02: ResultadoCenario = {
  cenario_id: "H1",
  nome: "Separar R$ 500 hoje",
  status: "calculado",
  linhas: [H11(130000), A(60000), B(0), C(-20000), R1(280000)],
  indicadores: indicadoresCr02,
  faturas_afetadas: [],
  datas_ordem_relevante: [],
  avisos: ["saldo_final_positivo_com_falta"],
};

/** CR-04 atual. */
const cr04Atual: ResultadoCenario = {
  ...cr01,
  linhas: [A(110000), B(50000), C150(35000), R1(335000)],
  indicadores: {
    saldo_inicial_centavos: 180000,
    saldo_minimo_centavos: 35000,
    data_saldo_minimo: "2026-11-15",
    primeira_falta: null,
    insuficiencia_centavos: 0,
    margem_hoje_centavos: 35000,
    saldo_final_centavos: 335000,
    sem_recebimentos: { insuficiencia_centavos: 0, primeira_falta: null, saldo_final_centavos: 35000 },
  },
};

/** CR-04 H1. */
const cr04H1: ResultadoCenario = {
  ...cr02,
  linhas: [H11(130000), A(60000), B(0), C150(-15000), R1(285000)],
  indicadores: {
    saldo_inicial_centavos: 180000,
    saldo_minimo_centavos: -15000,
    data_saldo_minimo: "2026-11-15",
    primeira_falta: faltaC(15000),
    insuficiencia_centavos: 15000,
    margem_hoje_centavos: 0,
    saldo_final_centavos: 285000,
    sem_recebimentos: { insuficiencia_centavos: 15000, primeira_falta: faltaC(15000), saldo_final_centavos: -15000 },
  },
};

/** CR-40: impacto da proposta OP1 (números de CR-02). */
const impactoOp1: ResultadoCenario = {
  cenario_id: "OP1",
  nome: "Com a movimentação proposta",
  status: "calculado",
  linhas: [OP1(130000), A(60000), B(0), C(-20000), R1(280000)],
  indicadores: indicadoresCr02,
  faturas_afetadas: [],
  datas_ordem_relevante: [],
  avisos: ["saldo_final_positivo_com_falta"],
};

/** CR-41: situação atual depois de executar OP1. */
const cr41Atual: ResultadoCenario = { ...impactoOp1, cenario_id: "atual", nome: textos.rotulos.situacao_atual };

// ---------------------------------------------------------------------------
// Cartões de crédito (P1 e P3)
// ---------------------------------------------------------------------------

type ItemV = CartaoVisao["fatura_aberta"]["itens"][number];
const item = (descricao: string, valor: number, extra: Partial<ItemV> = {}): ItemV => ({
  lancamento_id: null,
  data: null,
  parcelamento_id: null,
  parcela: null,
  origem: "dados_base",
  descricao,
  valor_centavos: valor,
  ...extra,
});
const soma = (itens: ItemV[]) => itens.reduce((s, i) => s + i.valor_centavos, 0);
function fatura(fatura_id: string, fechamento: string, vencimento: string, status: "fechada" | "aberta" | "futura", itens: ItemV[]) {
  return { fatura_id, fechamento, vencimento, status, valor_centavos: soma(itens), itens };
}

const proximasDatas: Array<[string, string, string]> = [
  ["F2701", "2026-12-29", "2027-01-05"],
  ["F2702", "2027-01-29", "2027-02-05"],
  ["F2703", "2027-02-28", "2027-03-05"],
  ["F2704", "2027-03-29", "2027-04-05"],
  ["F2705", "2027-04-29", "2027-05-05"],
  ["F2706", "2027-05-29", "2027-06-05"],
];

const cartaoP1: CartaoVisao = {
  limite_centavos: 400000,
  dia_fechamento: 29,
  dia_vencimento: 5,
  fatura_fechada: fatura("A", "2026-10-29", "2026-11-05", "fechada", [
    item("Celular", 15000, { lancamento_id: "L0123", parcelamento_id: "PC1", parcela: "5/10" }),
    item("Mercado", 32000, { lancamento_id: "L0131", data: "2026-10-17" }),
    item("Restaurante", 23000, { lancamento_id: "L0140", data: "2026-10-24" }),
  ]),
  fatura_aberta: fatura("F2612", "2026-11-29", "2026-12-05", "aberta", [
    item("Celular", 15000, { parcelamento_id: "PC1", parcela: "6/10" }),
    item("Padaria", 4590, { lancamento_id: "L0150", data: "2026-10-29" }),
  ]),
  proximas: proximasDatas
    .slice(0, 4)
    .map(([id, fech, venc], k) => fatura(id, fech, venc, "futura", [item("Celular", 15000, { parcelamento_id: "PC1", parcela: `${7 + k}/10` })])),
};

const cartaoP3: CartaoVisao = {
  limite_centavos: 600000,
  dia_fechamento: 29,
  dia_vencimento: 5,
  fatura_fechada: fatura("E2", "2026-10-29", "2026-11-05", "fechada", [
    item("Supermercado", 48000, { lancamento_id: "L0311", data: "2026-10-03" }),
    item("Combustível", 32000, { lancamento_id: "L0318", data: "2026-10-09" }),
    item("Restaurante", 20000, { lancamento_id: "L0326", data: "2026-10-16" }),
    item("Geladeira", 25000, { lancamento_id: "L0330", parcelamento_id: "PC1", parcela: "3/10" }),
  ]),
  fatura_aberta: fatura("F2612", "2026-11-29", "2026-12-05", "aberta", [
    item("Geladeira", 25000, { parcelamento_id: "PC1", parcela: "4/10" }),
    item("Farmácia", 3790, { lancamento_id: "L0352", data: "2026-10-29" }),
  ]),
  proximas: proximasDatas.map(([id, fech, venc], k) =>
    fatura(id, fech, venc, "futura", [item("Geladeira", 25000, { parcelamento_id: "PC1", parcela: `${5 + k}/10` })]),
  ),
};

// ---------------------------------------------------------------------------
// Posições (valores de teste de CR-06, CR-07, CR-16, CR-33, CR-34)
// ---------------------------------------------------------------------------

type PosV = VisaoApp["posicoes"][number];
const pos = (p: Partial<PosV> & Pick<PosV, "id" | "nome" | "categoria">): PosV => ({
  cdi_pct: null,
  ticker: null,
  quantidade: null,
  valor_atual_centavos: 0,
  aplicado_centavos: 0,
  resultado_centavos: 0,
  rentabilidade_pct: "0.00",
  valorizacao_periodo_pct: null,
  data_disponibilidade: "2026-10-30",
  protecao: null,
  restricao: null,
  estimado: false,
  fonte: FONTE_CDI,
  ...p,
});

const SEP = pos({ id: "SEP", nome: "Saldo separado", categoria: "saldo_separado", fonte: "sem rendimento" });
const RESTRICAO_RESERVA = "Reserva de emergência: não usar para objetivos";

const posicoesP1: PosV[] = [
  SEP,
  pos({ id: "INV1", nome: "Caixinha Reserva", categoria: "caixinha", cdi_pct: 100, valor_atual_centavos: 100000, aplicado_centavos: 100000, protecao: { tipo: "integral" }, restricao: RESTRICAO_RESERVA }),
  pos({ id: "INV9", nome: "Caixinha Viagem", categoria: "caixinha", cdi_pct: 100 }),
  pos({ id: "INV2", nome: "CDB Banco Fictício", categoria: "cdb_vencimento", cdi_pct: 120, valor_atual_centavos: 50000, aplicado_centavos: 50000, data_disponibilidade: "2027-03-15" }),
  pos({ id: "INV3", nome: "ITUB4", categoria: "acao", ticker: "ITUB4", quantidade: "10", valor_atual_centavos: 33000, aplicado_centavos: 30000, resultado_centavos: 3000, rentabilidade_pct: "10.00", valorizacao_periodo_pct: "17.86", data_disponibilidade: "2026-11-04", estimado: true, fonte: "brapi (valor de teste)" }),
];
const posicoesP2: PosV[] = [
  SEP,
  pos({ id: "INV10", nome: "Caixinha", categoria: "caixinha", cdi_pct: 100 }),
  pos({ id: "INV4", nome: "Fundo DI Fictício", categoria: "fundo", cdi_pct: 98, valor_atual_centavos: 210000, aplicado_centavos: 200000, resultado_centavos: 10000, rentabilidade_pct: "5.00", data_disponibilidade: "2026-11-03", protecao: { tipo: "parcial", valor_centavos: 120000 } }),
  pos({ id: "INV5", nome: "Bitcoin", categoria: "cripto", ticker: "BTC", quantidade: "0.005", valor_atual_centavos: 190000, aplicado_centavos: 175000, resultado_centavos: 15000, rentabilidade_pct: "8.57", valorizacao_periodo_pct: "11.76", estimado: true, fonte: "CoinGecko (valor de teste)" }),
];
const posicoesP3: PosV[] = [
  SEP,
  pos({ id: "INV6", nome: "Caixinha Reserva de emergência", categoria: "caixinha", cdi_pct: 100, valor_atual_centavos: 300000, aplicado_centavos: 300000, protecao: { tipo: "integral" }, restricao: RESTRICAO_RESERVA }),
  pos({ id: "INV7", nome: "CDB liquidez diária", categoria: "cdb_liquidez_diaria", cdi_pct: 110, valor_atual_centavos: 155000, aplicado_centavos: 150000, resultado_centavos: 5000, rentabilidade_pct: "3.33" }),
];

// ---------------------------------------------------------------------------
// VisaoApp
// ---------------------------------------------------------------------------

type Ext = VisaoApp["extrato"][number];
const ext = (id: string, data: string, descricao: string, tipo: Ext["tipo"], meio: Ext["meio"], categoria: Ext["categoria"], valor: number, simulado = false): Ext => ({
  id, data, descricao, tipo, meio, categoria, valor_centavos: valor, simulado,
});
type Prox = VisaoApp["proximos_pagamentos"][number];
const prox = (evento_id: string, data: string, descricao: string, tipo: Prox["tipo"], meio: Prox["meio"], valor: number, extra: Partial<Prox> = {}): Prox => ({
  evento_id, data, descricao, tipo, meio, valor_centavos: valor, previsto: false, estimativa_texto: null, origem: "dados_base", ...extra,
});

const extratoP1: Ext[] = [
  ext("L0201", "2026-10-19", "Salário", "entrada", "salario", "receitas", 300000),
  ext("L0198", "2026-10-15", "Contas da casa", "saida", "debito_automatico", "contas_casa", 20000),
  ext("L0190", "2026-10-10", "Aluguel", "saida", "pix", "moradia", 60000),
  ext("L0185", "2026-10-05", "Pagamento da fatura", "saida", "debito", "fatura", 64000),
];

const visaoP1: VisaoApp = {
  marca: "neutra",
  prototipo: true,
  persona: { id: "p1", nome: "Bia (fictícia)" },
  conta: { saldo_disponivel_hoje_centavos: 180000, saldo_inicio_hoje_centavos: 180000, operacoes_hoje: [] },
  extrato: extratoP1,
  proximos_pagamentos: [
    prox("A", "2026-11-05", "Fatura do cartão", "saida", "debito", 70000),
    prox("B", "2026-11-10", "Aluguel", "saida", "pix", 60000),
    prox("C", "2026-11-15", "Contas da casa", "saida", "debito_automatico", 20000),
    prox("R1", "2026-11-19", "Salário", "entrada", "salario", 300000, { previsto: true }),
  ],
  cartao: cartaoP1,
  posicoes: posicoesP1,
  mercado: snapshot,
};

const visaoP2: VisaoApp = {
  marca: "neutra",
  prototipo: true,
  persona: { id: "p2", nome: "Caio (fictício)" },
  conta: { saldo_disponivel_hoje_centavos: 90000, saldo_inicio_hoje_centavos: 90000, operacoes_hoje: [] },
  extrato: [
    ext("L0288", "2026-10-29", "Delivery", "saida", "pix", "delivery", 3870),
    ext("L0285", "2026-10-28", "Mercado", "saida", "debito", "mercado", 6215),
    ext("L0279", "2026-10-26", "Recebimento de cliente", "entrada", "pix", "receitas", 95000),
    ext("L0271", "2026-10-22", "Transporte", "saida", "pix", "transporte", 2240),
  ],
  proximos_pagamentos: [
    prox("E1", "2026-11-03", "Internet", "saida", "debito_automatico", 12000),
    prox("E2", "2026-11-08", "Aluguel", "saida", "pix", 110000),
    prox("E3", "2026-11-08", "Cobrança Pix a cliente", "entrada", "pix", 150000, { previsto: true }),
    prox("E4", "2026-11-12", "Conta de luz", "saida", "debito_automatico", 18000, {
      estimativa_texto: textos.rotulos.estimado_media([16500, 18000, 19500]),
    }),
    prox("E5", "2026-11-25", "Curso", "saida", "boleto", 40000),
  ],
  cartao: null,
  posicoes: posicoesP2,
  mercado: snapshot,
};

const visaoP3: VisaoApp = {
  marca: "neutra",
  prototipo: true,
  persona: { id: "p3", nome: "Duda (fictícia)" },
  conta: { saldo_disponivel_hoje_centavos: 250000, saldo_inicio_hoje_centavos: 250000, operacoes_hoje: [] },
  extrato: [
    ext("L0349", "2026-10-28", "Padaria", "saida", "debito", "mercado", 1860),
    ext("L0344", "2026-10-26", "Transporte", "saida", "pix", "transporte", 1250),
    ext("L0337", "2026-10-18", "Financiamento", "saida", "debito_automatico", "outros", 130000),
    ext("L0334", "2026-10-13", "Salário", "entrada", "salario", "receitas", 420000),
  ],
  proximos_pagamentos: [
    prox("E1", "2026-11-04", "Mensalidade escolar", "saida", "boleto", 90000),
    prox("E2", "2026-11-05", "Fatura do cartão", "saida", "debito", 125000),
    prox("E3", "2026-11-13", "Salário", "entrada", "salario", 420000, { previsto: true }),
    prox("E4", "2026-11-18", "Financiamento", "saida", "debito_automatico", 130000),
    prox("E5", "2026-11-28", "Condomínio", "saida", "boleto", 65000),
  ],
  cartao: cartaoP3,
  posicoes: posicoesP3,
  mercado: snapshot,
};

// P1 depois de executar OP1 (CR-41).
const visaoP1PosOp1: VisaoApp = {
  ...visaoP1,
  conta: {
    saldo_disponivel_hoje_centavos: 130000,
    saldo_inicio_hoje_centavos: 180000,
    operacoes_hoje: [
      { id: "OP1", valor_centavos: 50000, destino: "INV9", destino_nome: "Caixinha Viagem", descricao: textos.descricao_movimentacao("Caixinha Viagem") },
    ],
  },
  extrato: [ext("OP1", "2026-10-30", textos.descricao_movimentacao("Caixinha Viagem"), "saida", "movimentacao_interna", "investimentos", 50000, true), ...extratoP1],
  posicoes: posicoesP1.map((p) => (p.id === "INV9" ? { ...p, valor_atual_centavos: 50000, aplicado_centavos: 50000 } : p)),
};

// ---------------------------------------------------------------------------
// Cartões de resposta
// ---------------------------------------------------------------------------

const destinoInv9 = { posicao_id: "INV9", nome: "Caixinha Viagem", rende: true, cdi_pct: 100 };

/** CR-32. */
const projecaoCr32 = {
  valor_centavos: 50000,
  cdi_pct: 100,
  ate_data: "2026-11-19",
  dias_uteis: 13,
  taxa_diaria_pct: "0.05",
  cdi_data_ref: "2026-10-29",
  rendimento_bruto_centavos: 326,
  rotulo: textos.rotulos.projecao,
  destino: { posicao_id: "INV9", nome: "Caixinha Viagem" },
};

const avaliada = (p: PosV, classificacao: "protegida" | "nao_resgatavel_ate_data" | "resgatavel_ate_data") => {
  const protegidoParcial = p.protecao?.tipo === "parcial" ? Math.min(p.protecao.valor_centavos, p.valor_atual_centavos) : 0;
  return {
    posicao_id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    cdi_pct: p.cdi_pct,
    ticker: p.ticker,
    quantidade: p.quantidade,
    aplicado_centavos: p.aplicado_centavos,
    valor_atual_centavos: p.valor_atual_centavos,
    resultado_centavos: p.resultado_centavos,
    rentabilidade_pct: p.rentabilidade_pct,
    valorizacao_periodo_pct: p.valorizacao_periodo_pct,
    data_disponibilidade: p.data_disponibilidade,
    classificacao,
    protegido_centavos: classificacao === "protegida" ? p.valor_atual_centavos : protegidoParcial,
    nao_resgatavel_centavos: classificacao === "nao_resgatavel_ate_data" ? p.valor_atual_centavos : 0,
    resgatavel_centavos: classificacao === "resgatavel_ate_data" ? p.valor_atual_centavos - protegidoParcial : 0,
    protecao: p.protecao,
    restricao: p.restricao,
    estimado: p.estimado,
    rotulo_estimativa:
      p.ticker && snapshot.precos[p.ticker]
        ? textos.rotulos.estimado_com_cotacao(snapshot.precos[p.ticker].data_hora, snapshot.precos[p.ticker].fonte)
        : null,
    fonte: p.fonte,
  };
};

/** CR-06: P1 até 15/11 (default de I-10 em sessão nova). */
const investimentosCr06 = {
  ate_data: "2026-11-15",
  ate_data_origem: "saldo_minimo" as const,
  posicoes: [
    avaliada(posicoesP1[0], "resgatavel_ate_data"),
    avaliada(posicoesP1[1], "protegida"),
    avaliada(posicoesP1[2], "resgatavel_ate_data"),
    avaliada(posicoesP1[3], "nao_resgatavel_ate_data"),
    avaliada(posicoesP1[4], "resgatavel_ate_data"),
  ],
  totais: { valor_total_centavos: 183000, protegido_centavos: 100000, nao_resgatavel_centavos: 50000, resgatavel_centavos: 33000 },
  rotulo_rentabilidade: textos.rotulos.rentabilidade,
  cdi_data_ref: "2026-10-29",
  mercado: snapshot,
};

const cartaoComparacaoCr02: CartaoResposta = { tipo: "comparacao", cenarios: [cr01, cr02] };

const cartaoOQueMudouCr04: CartaoResposta = {
  tipo: "o_que_mudou",
  alteracoes: [{ tipo: "declaracao_registrada", id: "D1", descricao: "Contas da casa (C) em 15/11: R$ 200,00 → R$ 150,00" }],
  cenarios: [
    {
      cenario_id: "atual",
      nome: textos.rotulos.situacao_atual,
      situacao: "alterado",
      diferencas: [
        { indicador: "saldo_minimo_centavos", antes: 30000, depois: 35000 },
        { indicador: "margem_hoje_centavos", antes: 30000, depois: 35000 },
        { indicador: "saldo_final_centavos", antes: 330000, depois: 335000 },
        { indicador: "sem_recebimentos_saldo_final_centavos", antes: 30000, depois: 35000 },
      ],
    },
    {
      cenario_id: "H1",
      nome: "Separar R$ 500 hoje",
      situacao: "alterado",
      diferencas: [
        { indicador: "saldo_minimo_centavos", antes: -20000, depois: -15000 },
        { indicador: "primeira_falta_valor_centavos", antes: 20000, depois: 15000 },
        { indicador: "insuficiencia_centavos", antes: 20000, depois: 15000 },
        { indicador: "saldo_final_centavos", antes: 280000, depois: 285000 },
        { indicador: "sem_recebimentos_insuficiencia_centavos", antes: 20000, depois: 15000 },
        { indicador: "sem_recebimentos_saldo_final_centavos", antes: -20000, depois: -15000 },
      ],
    },
  ],
};

type Lanc = { id: string; data: string; descricao: string; tipo: "saida"; meio: "pix" | "debito"; categoria: "delivery"; valor_centavos: number; recorrencia_id: null };
const deliv = (id: string, data: string, descricao: string, meio: "pix" | "debito", v: number): Lanc => ({
  id, data, descricao, tipo: "saida", meio, categoria: "delivery", valor_centavos: v, recorrencia_id: null,
});
const itensDelivery = [
  deliv("L0262", "2026-09-26", "Delivery pizzaria", "pix", 7290),
  deliv("L0255", "2026-09-19", "Delivery japonês", "debito", 8450),
  deliv("L0248", "2026-09-12", "Delivery lanche", "pix", 4380),
  deliv("L0241", "2026-09-05", "Delivery marmita", "pix", 3920),
];

const cartoes: Array<[string, string, CartaoResposta]> = [
  ["cartao-comparacao-cr02.json", "CV-01: situação atual (CR-01) e H1 separar 500 hoje (CR-02)", cartaoComparacaoCr02],
  ["cartao-o-que-mudou-cr04.json", "CV-03 após CV-01: D1 contas da casa = 150 (CR-04), diferenças por cenário", cartaoOQueMudouCr04],
  [
    "cartao-historico.json",
    "CV-10 (P2): delivery em setembro; valores fictícios ilustrativos",
    {
      tipo: "historico",
      resultado: {
        filtro: { de: "2026-09-01", ate: "2026-09-30", tipo: "saida", categoria: "delivery" },
        de: "2026-09-01",
        ate: "2026-09-30",
        quantidade: 4,
        total_saidas_centavos: itensDelivery.reduce((s, i) => s + i.valor_centavos, 0),
        total_entradas_centavos: 0,
        grupos: [],
        itens: itensDelivery,
      },
    },
  ],
  ["cartao-cartao-credito-p3.json", "consultar_cartao de P3: fatura fechada E2 de 05/11 (1.250), aberta e próximas", { tipo: "cartao_credito", cartao: cartaoP3 }],
  ["cartao-investimentos-cr06.json", "CV-05 (P1, sessão nova): investimentos até 15/11 (CR-06)", { tipo: "investimentos", resultado: investimentosCr06 }],
  ["cartao-rendimento-cr32.json", "CV-26: 500 na Caixinha Viagem a 100% do CDI até 19/11 (CR-32)", { tipo: "rendimento", resultado: projecaoCr32 }],
  [
    "cartao-operacao-pendente-cr40.json",
    "CV-07: proposta de guardar 500 na Caixinha Viagem (CR-40)",
    {
      tipo: "operacao_pendente",
      operacao_id: "OP1",
      valor_centavos: 50000,
      destino: destinoInv9,
      alerta: textos.alerta_falta(20000, "2026-11-15"),
      impacto: impactoOp1,
      rendimento_estimado: projecaoCr32,
    },
  ],
  [
    "cartao-operacao-concluida-cr41.json",
    "Confirmação de OP1 com H1 e H2 ativas (CR-41)",
    {
      tipo: "operacao_concluida",
      operacao_id: "OP1",
      valor_centavos: 50000,
      destino: destinoInv9,
      mensagem: textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"),
      hipoteses_descartadas: ["H1", "H2"],
      saldo_disponivel_hoje_centavos: 130000,
    },
  ],
  [
    "cartao-aviso-valor.json",
    "P1 (G-01): valor do texto que não veio de cálculo do turno",
    { tipo: "aviso_valor", valores_centavos: [45000], mensagem: "O valor R$ 450,00 citado no texto não veio do cálculo. Confira a tabela." },
  ],
  [
    "cartao-rascunho-atendimento.json",
    "P1: rascunho para atendimento humano, não enviado",
    {
      tipo: "rascunho_atendimento",
      motivo: "Compras não reconhecidas no cartão",
      texto: "Cliente relata compras que não reconhece no cartão. Pede orientação pelos canais oficiais. (Rascunho do protótipo, dados fictícios.)",
      enviado: false,
    },
  ],
  [
    "cartao-erro-cr15a.json",
    "CV-14 (P3): possível duplicidade com Supermercado 480,00 da fatura de 05/11 (CR-15a)",
    { tipo: "erro", codigo: "POSSIVEL_DUPLICIDADE", mensagem: "Já existe Supermercado R$ 480,00 na fatura de 05/11. Se for outra compra, confirme." },
  ],
];

// ---------------------------------------------------------------------------
// Estados e respostas HTTP
// ---------------------------------------------------------------------------

const MSG_CV01 = "Posso separar R$ 500 hoje para minha viagem?";
const ARGS_CV01 = {
  nome: "Separar R$ 500 hoje",
  a_partir_de: "atual",
  alteracoes: [{ operacao: "separar", valor: "500", data: "2026-10-30" }],
};
const TEXTO_CV01 =
  "Se você separar R$ 500 hoje, o saldo zera em 10/11, no aluguel, e faltam R$ 200,00 em 15/11, no débito das contas da casa. O salário previsto de 19/11 só chega depois. Sem separar, o menor saldo fica em R$ 300,00, em 15/11.";

const v0P1: EstadoSessao = estadoInicial("p1", snapshot);

const hipH1 = {
  id: "H1",
  nome: "Separar R$ 500 hoje",
  a_partir_de: "atual" as const,
  mensagem_id: "m-0001",
  alteracoes: [{ id: "H1.1", copiado_de: null, alteracao: { operacao: "separar" as const, valor: "500", data: "2026-10-30" } }],
};
const hipH2 = {
  id: "H2",
  nome: "Salário no dia 9",
  a_partir_de: "H1" as const,
  mensagem_id: "m-0002",
  alteracoes: [
    { id: "H2.1", copiado_de: "H1.1", alteracao: { operacao: "separar" as const, valor: "500", data: "2026-10-30" } },
    { id: "H2.2", copiado_de: null, alteracao: { operacao: "alterar_evento" as const, evento_id: "R1", data: "2026-11-09" } },
  ],
};

const msg = (mensagem_id: string, papel: "usuario" | "assistente" | "sistema", texto: string, versao: number, cartoesMsg: CartaoResposta[] = [], rastro: EstadoSessao["conversa"][number]["rastro"] = []) => ({
  mensagem_id, papel, texto, versao, cartoes: cartoesMsg, rastro,
});

const rastroCv01 = [
  { chamada: 1, ferramenta: "criar_hipotese", argumentos: ARGS_CV01, resultado: { ok: true, hipotese_id: "H1", indicadores: indicadoresCr02 }, duracao_ms: 4 },
];

const v1P1: EstadoSessao = {
  ...v0P1,
  versao: 1,
  conversa: [
    msg("m-0001", "usuario", MSG_CV01, 1),
    msg("m-0001-r", "assistente", TEXTO_CV01, 1, [cartaoComparacaoCr02], rastroCv01),
  ],
  hipoteses: [hipH1],
  contadores: { D: 0, H: 1, OP: 0 },
};

// v3: H1, H2 ativas e OP1 pendente (antes de confirmar).
const v3P1: EstadoSessao = {
  ...v1P1,
  versao: 3,
  conversa: [
    ...v1P1.conversa,
    msg("m-0002", "usuario", "E se o salário cair no dia 9?", 2),
    msg("m-0002-r", "assistente", "Com o salário em 09/11, a falta some e o menor saldo fica em R$ 600,00, em 05/11. Isso depende do salário chegar.", 2),
    msg("m-0003", "usuario", "Guarda R$ 500 na caixinha da viagem.", 3),
    msg("m-0003-r", "assistente", "Antes de confirmar: com essa movimentação simulada, faltariam R$ 200,00 em 15/11. Confirma?", 3),
  ],
  hipoteses: [hipH1, hipH2],
  operacao_pendente: { id: "OP1", valor_centavos: 50000, destino: "INV9", criada_na_versao: 3 },
  contadores: { D: 0, H: 2, OP: 1 },
};

// v4: OP1 executada; hipóteses descartadas (O-05).
const v4P1: EstadoSessao = {
  ...v3P1,
  versao: 4,
  conversa: [...v3P1.conversa, msg("acao-OP1-confirmar", "sistema", textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"), 4)],
  hipoteses: [],
  operacao_pendente: null,
  operacoes: [{ id: "OP1", valor_centavos: 50000, destino: "INV9", data: "2026-10-30" }],
};

const config = {
  versao_contratos: VERSAO_CONTRATOS,
  provedor: "roteirizado" as const,
  modelo: "roteiro: src/contratos/roteiros/cv-01.json",
  instrucoes: "(texto atual de instrucoes.md)",
  ferramentas: NOMES_FERRAMENTAS.map((nome) => ({ nome, descricao: descricoesFerramentas[nome] })),
  regras_fixas: [...textos.regras_fixas],
  fontes_mercado: [
    { nome: "BCB SGS 12", url: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados", uso: "CDI diário", obtido_em: "2026-10-28T11:00:00-03:00" },
    { nome: "brapi", url: "https://brapi.dev/api/quote/ITUB4", uso: "fechamentos de ação", obtido_em: "2026-10-28T11:00:00-03:00" },
    { nome: "CoinGecko", url: "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart", uso: "bitcoin em reais", obtido_em: "2026-10-28T11:00:00-03:00" },
  ],
  modo: "local" as const,
};

const respostaTurnoCv01 = {
  status: "ok",
  estado: v1P1,
  texto: TEXTO_CV01,
  cartoes: [cartaoComparacaoCr02],
  avisos: [],
  rastro: rastroCv01,
  visao: visaoP1,
};

const cartaoConcluida = cartoes.find((c) => c[0] === "cartao-operacao-concluida-cr41.json")![2];
const respostaAcaoCr41 = {
  status: "ok",
  estado: v4P1,
  texto: textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"),
  cartoes: [cartaoConcluida, { tipo: "comparacao", cenarios: [cr41Atual] }],
  avisos: [{ codigo: "HIPOTESES_DESCARTADAS", mensagem: textos.aviso_hipoteses_descartadas(["H1", "H2"]) }],
  rastro: [],
  visao: visaoP1PosOp1,
};

// CV-05 com mercado ao vivo indisponível: F-07 como aviso.
const v1P1Mercado: EstadoSessao = {
  ...v0P1,
  versao: 1,
  mercado: { ...snapshot, tentou_ao_vivo: true },
  conversa: [
    msg("m-0101", "usuario", "Tenho dinheiro aplicado. Posso contar com ele?", 1),
    msg("m-0101-r", "assistente", "Até 15/11, você tem R$ 1.830,00 em investimentos. A Caixinha Reserva (R$ 1.000,00) é reserva protegida. O CDB (R$ 500,00) só fica disponível no vencimento, em 15/03/2027. As ações (R$ 330,00, estimado com cotação de 27/10) ficam disponíveis em 04/11. Valores brutos.", 1),
  ],
};
const respostaTurnoF07 = {
  status: "ok",
  estado: v1P1Mercado,
  texto: v1P1Mercado.conversa[1].texto,
  cartoes: [{ tipo: "investimentos", resultado: { ...investimentosCr06, mercado: v1P1Mercado.mercado } }],
  avisos: [{ codigo: "F-07", mensagem: textos.aviso_f07(snapshot.precos.ITUB4.data_hora) }],
  rastro: [
    { chamada: 1, ferramenta: "consultar_investimentos", argumentos: {}, resultado: { ok: true, ate_data: "2026-11-15", totais: investimentosCr06.totais }, duracao_ms: 3012 },
  ],
  visao: visaoP1,
};

const falha = (tipo: string, codigo: string, mensagem: string, pode: boolean, estado: EstadoSessao | null, extra: Record<string, unknown> = {}) => ({
  status: "falha",
  falha: { tipo, codigo, mensagem, pode_tentar_novamente: pode, ...extra },
  estado,
});

// CR-19: estado adulterado (declaração com data 29/10) → F-06.
const v1Adulterado: EstadoSessao = {
  ...v0P1,
  versao: 1,
  declaracoes: [
    { id: "D1", mensagem_id: "m-0001", alteracao: { operacao: "adicionar_evento", tipo: "saida", descricao: "Compra", data: "2026-10-29", valor: "50", meio: "pix" } },
  ],
  contadores: { D: 1, H: 0, OP: 0 },
};

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------

gravar(PASTA, "visao-p1.json", "VisaoApp", "P1 Bia, sessão nova (saldo 1.800; investimentos com valores de teste de CR-06)", visaoP1);
gravar(PASTA, "visao-p2.json", "VisaoApp", "P2 Caio, sessão nova, sem cartão (saldo 900; investimentos de CR-07)", visaoP2);
gravar(PASTA, "visao-p3.json", "VisaoApp", "P3 Duda, sessão nova (saldo 2.500; fatura E2 1.250; investimentos de CR-16)", visaoP3);
for (const [arquivo, descricao, dados] of cartoes) gravar(PASTA, arquivo, "CartaoResposta", descricao, dados);

gravar(PASTA, "api-personas.json", "RespostaPersonas", "GET /api/personas", [
  { id: "p1", nome: "Bia (fictícia)", resumo: "Quer juntar dinheiro para uma viagem." },
  { id: "p2", nome: "Caio (fictício)", resumo: "Trabalha por conta própria e recebe de clientes por Pix." },
  { id: "p3", nome: "Duda (fictícia)", resumo: "Tem filhos na escola, financiamento e compras parceladas no cartão." },
]);
gravar(PASTA, "api-sessao-requisicao.json", "RequisicaoSessao", "POST /api/sessao: entrada", { persona_id: "p1" });
gravar(PASTA, "api-sessao-p1.json", "RespostaSessao", "POST /api/sessao com P1: estado versão 0, visão e config", { status: "ok", estado: v0P1, visao: visaoP1, config });
gravar(PASTA, "api-turno-requisicao-cv01.json", "RequisicaoTurno", "POST /api/turno: entrada de CV-01", { estado: v0P1, mensagem: { id: "m-0001", texto: MSG_CV01 } });
gravar(PASTA, "api-turno-cv01.json", "RespostaTurno", "POST /api/turno, CV-01 → CR-02 (versão 0 → 1)", respostaTurnoCv01);
gravar(PASTA, "api-acao-requisicao-cr41.json", "RequisicaoAcao", "POST /api/acao: confirmar OP1 com H1 e H2 ativas", { estado: v3P1, acao: { tipo: "confirmar", operacao_id: "OP1" } });
gravar(PASTA, "api-acao-confirmar-cr41.json", "RespostaAcao", "POST /api/acao confirmar OP1 → CR-41 (versão 3 → 4)", respostaAcaoCr41);
gravar(PASTA, "aviso-f07-turno-cv05.json", "RespostaTurno", "CV-05 com mercado ao vivo sem resposta em 3 s: F-07 em avisos, status ok", respostaTurnoF07);

gravar(PASTA, "falha-f01.json", "RespostaFalha", "F-01: modelo não respondeu em 15 s", falha("F-01", "TIMEOUT", textos.falhas["F-01"], true, v0P1));
gravar(PASTA, "falha-f02.json", "RespostaFalha", "F-02: HTTP 429 com espera informada", falha("F-02", "COTA", `${textos.falhas["F-02"]} ${textos.falha_f02_espera(60, "nvidia")}`, true, v0P1, { espera_segundos: 60 }));
gravar(PASTA, "falha-f03.json", "RespostaFalha", "F-03: 5xx, chave inválida ou rede", falha("F-03", "INDISPONIVEL", textos.falhas["F-03"], true, v0P1));
gravar(PASTA, "falha-f04.json", "RespostaFalha", "F-04: resposta vazia ou ferramenta desconhecida", falha("F-04", "RESPOSTA_INVALIDA", textos.falhas["F-04"], true, v0P1));
gravar(PASTA, "falha-f05.json", "RespostaFalha", "F-05: terceira chamada ainda pede ferramenta", falha("F-05", "LIMITE_CHAMADAS", textos.falhas["F-05"], true, v0P1));
gravar(PASTA, "falha-f06.json", "RespostaFalha", "F-06: estado adulterado com declaração em 29/10 (CR-19)", falha("F-06", "ESTADO_INVALIDO", textos.falhas["F-06"], false, v1Adulterado));
gravar(PASTA, "falha-dominio-cr42.json", "RespostaFalha", "Domínio: confirmar OP1 já executada (CR-42); estado de entrada", falha("dominio", "OPERACAO_JA_EXECUTADA", textos.erros.OPERACAO_JA_EXECUTADA, false, v4P1));

gravar(PASTA, "argumentos-ferramentas.json", "ArgumentosFerramentas", "Argumentos de exemplo de cada uma das 12 ferramentas", {
  consultar_historico: { de: "2026-09-01", ate: "2026-09-30", tipo: "saida", categoria: "delivery" },
  consultar_cartao: {},
  consultar_investimentos: { ate_data: "2026-11-15" },
  projetar_rendimento: { valor: "500", destino: "INV9", ate_data: "2026-11-19" },
  registrar_declaracao: { alteracao: { operacao: "alterar_evento", evento_id: "C", valor: "150" } },
  criar_hipotese: ARGS_CV01,
  desfazer: { alvo_id: "H1" },
  propor_movimentacao: { valor: "500", destino: "INV9" },
  confirmar_movimentacao: { operacao_id: "OP1" },
  cancelar_movimentacao: { operacao_id: "OP1" },
  exibir_comparacao: {},
  preparar_resumo_atendimento: { motivo: "Compras não reconhecidas no cartão" },
});

// Inválidos conhecidos (devem ser rejeitados).
gravar(PASTA_INV, "visao-centavos-fracionados.json", "VisaoApp", "saldo com centavos fracionados", {
  ...visaoP1,
  conta: { ...visaoP1.conta, saldo_disponivel_hoje_centavos: 1800.5 },
});
gravar(PASTA_INV, "turno-ok-sem-estado.json", "RespostaTurno", "resposta ok sem estado", { ...respostaTurnoCv01, estado: undefined });
gravar(PASTA_INV, "cartao-tipo-desconhecido.json", "CartaoResposta", "tipo de cartão fora do contrato", { tipo: "grafico", pontos: [] });
gravar(PASTA_INV, "cenario-inconsistente-com-indicadores.json", "ResultadoCenario", "inconsistente não tem indicadores (R-14)", { ...cr02, status: "inconsistente" });
gravar(PASTA_INV, "sessao-versao-1.json", "RespostaSessao", "sessão nova precisa começar na versão 0", { status: "ok", estado: v1P1, visao: visaoP1, config });

// Roteiro do provedor dublê para CV-01 (sem envelope: é lido por LLM_ROTEIRO).
mkdirSync(PASTA_ROT, { recursive: true });
writeFileSync(
  join(PASTA_ROT, "cv-01.json"),
  JSON.stringify(
    {
      descricao: "CV-01 (P1): pergunta se pode separar R$ 500 hoje; o modelo chama criar_hipotese e depois responde.",
      turnos: [
        {
          mensagem: MSG_CV01,
          respostas: [
            { tipo: "chamadas", chamadas: [{ id: "call_cv01_1", nome: "criar_hipotese", argumentos: ARGS_CV01 }] },
            { tipo: "texto", texto: TEXTO_CV01 },
          ],
        },
      ],
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log("exemplos gravados em", PASTA);
