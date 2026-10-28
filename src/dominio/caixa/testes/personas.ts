// Personas de teste escritas a partir da spec §11 (dados fictícios). Usadas
// pelos testes do domínio (B1, B1b, B1c). Só os campos que o caixa usa; o
// histórico completo vem no B2.

import {
  esquemaPersona,
  estadoInicial,
  type Contexto,
  type EstadoSessao,
  type Persona,
  type SnapshotMercado,
} from "@/contratos";
import { criarCalendario } from "@/dominio/calendario";

const base92 = (diario: number) => ({
  valor_centavos: diario,
  base: { de: "2026-07-30", ate: "2026-10-29", dias: 92, total_centavos: diario * 92 },
});

const compromisso = (
  id: string,
  tipo: "saida" | "entrada",
  categoria: Persona["compromissos"][number]["categoria"],
  descricao: string,
  data: string,
  reais: number,
  meio: Persona["compromissos"][number]["meio"],
  origem_dado: Persona["compromissos"][number]["origem_dado"],
  extra: Partial<Persona["compromissos"][number]> = {},
): Persona["compromissos"][number] => ({
  id,
  tipo,
  categoria,
  descricao,
  data,
  valor_centavos: reais * 100,
  meio,
  origem_dado,
  previsto: false,
  estimativa: null,
  recorrente: true,
  ...extra,
});

/** §11.1 P1 — Bia. */
export const P1: Persona = esquemaPersona.parse({
  id: "p1",
  nome: "Bia (fictícia)",
  resumo: "Quer juntar dinheiro para uma viagem.",
  conta: { saldo_30_07_centavos: 180000, saldo_inicio_hoje_centavos: 180000 },
  historico: [],
  compromissos: [
    compromisso("B", "saida", "moradia", "Aluguel", "2026-11-10", 600, "pix", "agendamento"),
    compromisso("C", "saida", "contas_casa", "Contas da casa", "2026-11-15", 200, "debito_automatico", "debito_automatico"),
    compromisso("R1", "entrada", "receitas", "Salário", "2026-11-19", 3000, "salario", "recebimento_previsto", { previsto: true }),
  ],
  gasto_diario: base92(0),
  cartao: {
    dia_fechamento: 29,
    dia_vencimento: 5,
    limite_centavos: 400000,
    parcelamentos: [
      { id: "PC1", descricao: "Celular", valor_total_centavos: 150000, parcelas: 10, data_compra: "2026-06-20", anterior_ao_historico: true },
    ],
    faturas: [
      {
        id: "A",
        fechamento: "2026-10-29",
        vencimento: "2026-11-05",
        status: "fechada",
        valor_centavos: 70000,
        itens: [
          { descricao: "Celular", valor_centavos: 15000, parcelamento_id: "PC1", parcela: "5/10" },
          { data: "2026-10-17", descricao: "Mercado", valor_centavos: 32000 },
          { data: "2026-10-24", descricao: "Restaurante", valor_centavos: 23000 },
        ],
      },
    ],
  },
  posicoes: [
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
  ],
});

/** §11.2 P2 — Caio. Gasto diário 15,00; sem cartão. */
export const P2: Persona = esquemaPersona.parse({
  id: "p2",
  nome: "Caio (fictício)",
  resumo: "Trabalha por conta própria e recebe de clientes por Pix.",
  conta: { saldo_30_07_centavos: 90000, saldo_inicio_hoje_centavos: 90000 },
  historico: [],
  compromissos: [
    compromisso("E1", "saida", "assinaturas", "Internet", "2026-11-03", 120, "debito_automatico", "debito_automatico"),
    compromisso("E2", "saida", "moradia", "Aluguel", "2026-11-08", 1100, "pix", "agendamento"),
    compromisso("E3", "entrada", "receitas", "Cobrança Pix a cliente", "2026-11-08", 1500, "pix", "cobranca_emitida", {
      previsto: true,
      recorrente: false,
    }),
    compromisso("E4", "saida", "contas_casa", "Conta de luz", "2026-11-12", 180, "debito_automatico", "conta_estimada", {
      estimativa: {
        metodo: "media_3_ultimas",
        ocorrencias: [
          { lancamento_id: "L0201", data: "2026-08-12", valor_centavos: 16500 },
          { lancamento_id: "L0202", data: "2026-09-12", valor_centavos: 18000 },
          { lancamento_id: "L0203", data: "2026-10-12", valor_centavos: 19500 },
        ],
        texto: "estimado: média de R$ 165,00, R$ 180,00 e R$ 195,00",
      },
    }),
    compromisso("E5", "saida", "educacao", "Curso", "2026-11-25", 400, "boleto", "boleto", { recorrente: false }),
  ],
  gasto_diario: base92(1500),
  cartao: null,
  posicoes: [
    { id: "SEP", categoria: "saldo_separado", nome: "Saldo separado", aportes: [], liquidez: { regra: "imediata" }, protecao: null },
    { id: "INV10", categoria: "caixinha", nome: "Caixinha", cdi_pct: 100, aportes: [], liquidez: { regra: "imediata" }, protecao: null },
  ],
});

/** §11.3 P3 — Duda. Gasto diário 10,00; fatura fechada E2 de 1.250. */
export const P3: Persona = esquemaPersona.parse({
  id: "p3",
  nome: "Duda (fictícia)",
  resumo: "Tem filhos na escola, financiamento e compras parceladas no cartão.",
  conta: { saldo_30_07_centavos: 250000, saldo_inicio_hoje_centavos: 250000 },
  historico: [],
  compromissos: [
    compromisso("E1", "saida", "educacao", "Mensalidade escolar", "2026-11-04", 900, "boleto", "boleto"),
    compromisso("E3", "entrada", "receitas", "Salário", "2026-11-13", 4200, "salario", "recebimento_previsto", { previsto: true }),
    compromisso("E4", "saida", "outros", "Financiamento", "2026-11-18", 1300, "debito_automatico", "debito_automatico"),
    compromisso("E5", "saida", "moradia", "Condomínio", "2026-11-28", 650, "boleto", "boleto"),
  ],
  gasto_diario: base92(1000),
  cartao: {
    dia_fechamento: 29,
    dia_vencimento: 5,
    limite_centavos: 600000,
    parcelamentos: [
      { id: "PC1", descricao: "Geladeira", valor_total_centavos: 250000, parcelas: 10, data_compra: "2026-08-15", anterior_ao_historico: false },
    ],
    faturas: [
      {
        id: "E2",
        fechamento: "2026-10-29",
        vencimento: "2026-11-05",
        status: "fechada",
        valor_centavos: 125000,
        itens: [
          { data: "2026-10-03", descricao: "Supermercado", valor_centavos: 48000 },
          { data: "2026-10-09", descricao: "Combustível", valor_centavos: 32000 },
          { data: "2026-10-16", descricao: "Restaurante", valor_centavos: 20000 },
          { descricao: "Geladeira", valor_centavos: 25000, parcelamento_id: "PC1", parcela: "3/10" },
        ],
      },
    ],
  },
  posicoes: [
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
  ],
});

export const MERCADO_TESTE: SnapshotMercado = {
  ao_vivo: false,
  obtido_em: "2026-10-28T11:00:00-03:00",
  tentou_ao_vivo: false,
  cdi: { taxa_diaria_pct: "0.05", data_ref: "2026-10-29", fonte: "CDI de teste" },
  precos: {},
};

export const CONTEXTO: Contexto = {
  series: {
    cdi: {
      fonte: "CDI de teste",
      url: "https://exemplo.invalid/cdi",
      obtido_em: "2026-10-28T11:00:00-03:00",
      serie: [{ data: "2026-10-29", taxa_diaria_pct: "0.05" }],
    },
    fechamentos: {},
  },
  calendario: criarCalendario(),
};

export function estadoNovo(persona: Persona): EstadoSessao {
  return estadoInicial(persona.id, MERCADO_TESTE);
}

const SEM_ORIGEM = { mensagem_id: null };
export const origem = (mensagem_id: string | null = null) => (mensagem_id ? { mensagem_id } : SEM_ORIGEM);

/**
 * Converte o texto da spec em pares [id, centavos], literal:
 * "H1.1 1.300 · A 600 · B 0 (Saldo zerado) · C −200" → [["H1.1",130000],["A",60000],["B",0],["C",-20000]].
 */
export function saldosDaSpec(texto: string): Array<[string, number]> {
  return texto.split("·").map((parte) => {
    const m = /^\s*([A-Z][A-Z0-9.]*)\s+([−-]?)([\d.]+)(,(\d{2}))?/.exec(parte);
    if (!m) throw new Error(`trecho inválido: ${parte}`);
    const reais = m[3].replace(/\./g, "");
    const centavos = Number(`${reais}${m[5] ?? "00"}`);
    return [m[1], m[2] ? -centavos : centavos];
  });
}

/** "1.300" → 130000; "−200" → -20000. */
export function reaisDaSpec(texto: string): number {
  return saldosDaSpec(`X ${texto}`)[0][1];
}
