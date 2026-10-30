import { z } from "zod";

/** Versão dos contratos congelada no M0. Mudança só por PEDIDO aprovado. */
export const VERSAO_CONTRATOS = "1.1";

/** Calendário fixo (spec D-02). O relógio do sistema nunca entra no cálculo. */
export const HOJE = "2026-10-30";
export const FIM_JANELA = "2026-11-29";
export const INICIO_HISTORICO = "2026-04-30";
export const FIM_HISTORICO = "2026-10-29";
export const DIAS_HISTORICO = 183;
/** Início das séries de mercado gravadas e da base de valorização de renda variável (independe do histórico da conta). */
export const INICIO_SERIES_MERCADO = "2026-07-30";

/** Feriados de hoje em diante (spec §3). Antes de hoje vale a série de CDI gravada. */
export const FERIADOS = [
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
  "2027-01-01",
] as const;

/** Limites da spec (R-19, D-13, H-02, §6.7). */
export const LIMITES = {
  hipoteses_ativas: 3,
  alteracoes_por_hipotese: 5,
  chamadas_modelo_por_turno: 3,
  ferramentas_por_resposta: 4,
  mensagens_no_contexto: 12,
  itens_historico: 20,
  texto_mensagem_max: 1000,
  timeout_chamada_ms: 15_000,
  timeout_turno_ms: 30_000,
  timeout_mercado_ms: 3_000,
} as const;

/** Premissas de crédito para simulações (spec §1.5). */
export const PREMISSAS_CREDITO = {
  juros_pix_credito_am_pct: "4.99",
  iof_adicional_pct: "0.38",
  iof_diario_pct: "0.0082",
  iof_dias_max: 365,
} as const;

/** Limite máximo de data para simulações de investimento (5 anos, spec §1.5). */
export const LIMITE_SIMULACAO_INVESTIMENTO = "2031-10-30";

// ---------------------------------------------------------------------------
// Primitivos
// ---------------------------------------------------------------------------

/** Verdadeiro se `AAAA-MM-DD` existe no calendário gregoriano. */
export function dataExiste(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const dias = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
  return dia <= dias;
}

/** Data `AAAA-MM-DD` válida no calendário. */
export const esquemaData = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato AAAA-MM-DD")
  .refine(dataExiste, "data inexistente");
export type DataISO = z.infer<typeof esquemaData>;

/** Data e hora ISO com fuso (ex.: `2026-10-28T11:00:00-03:00`). */
export const esquemaDataHora = z.iso.datetime({ offset: true });

/** Centavos inteiros (podem ser negativos em saldos). */
export const esquemaCentavos = z.int();
/** Centavos inteiros ≥ 0. */
export const esquemaCentavosNaoNegativos = z.int().nonnegative();
/** Centavos inteiros > 0 (valor de evento, lançamento, item). */
export const esquemaCentavosPositivos = z.int().positive();

/** Valor digitado: texto `^\d{1,7}(\.\d{1,2})?$`, maior que zero (spec §4.5). */
export const REGEX_VALOR = /^\d{1,7}(\.\d{1,2})?$/;
export const esquemaValorTexto = z
  .string()
  .regex(REGEX_VALOR, "valor deve ser texto com ponto decimal, ex.: \"500\" ou \"12.50\"")
  .refine((v) => /[1-9]/.test(v), "valor deve ser maior que zero");

/** Igual a `valor`, mas aceita zero (suposição do B0 para `alterar_gasto_diario`). */
export const esquemaValorTextoOuZero = z
  .string()
  .regex(REGEX_VALOR, "valor deve ser texto com ponto decimal, ex.: \"15\" ou \"12.50\"");

/** Quantidade de renda variável em texto decimal (ex.: `"10"`, `"0.005"`). */
export const esquemaQuantidade = z.string().regex(/^\d+(\.\d+)?$/);

/** Taxa em texto decimal (ex.: `"0.055131"`). */
export const esquemaTaxaTexto = z.string().regex(/^\d+(\.\d+)?$/);

/** Taxa percentual em texto (ex.: `"4.99"`, `"12.5"`). */
export const esquemaTaxaPctTexto = z.string().regex(/^\d{1,3}(\.\d{1,4})?$/);

/** Percentual em texto com 2 casas (ex.: `"1.01"`, `"-3.20"`). */
export const esquemaPercentualTexto = z.string().regex(/^-?\d+\.\d{2}$/);

/** Percentual do CDI (ex.: 100, 120, 98). */
export const esquemaCdiPct = z.number().positive().max(300);

// ---------------------------------------------------------------------------
// Identificadores (spec §4.5)
// ---------------------------------------------------------------------------

export const esquemaIdPersona = z.string().regex(/^p\d+$/);
/** Compromissos (A, B, R1, E1…), blocos (G1–G5), declarações (D2), hipóteses (H1.1), operações (OP1). */
export const esquemaIdEvento = z.string().regex(/^[A-Z][A-Z0-9]*(\.\d+)?$/);
export const esquemaIdLancamento = z.string().regex(/^L\d{4,}$/);
export const esquemaIdDeclaracao = z.string().regex(/^D\d+$/);
export const esquemaIdHipotese = z.string().regex(/^H\d+$/);
export const esquemaIdAlteracaoHipotese = z.string().regex(/^H\d+\.\d+$/);
export const esquemaIdOperacao = z.string().regex(/^OP\d+$/);
/** Posições: SEP, INV1, INV9… */
export const esquemaIdPosicao = z.string().regex(/^(SEP|INV\d+)$/);
export const esquemaIdParcelamento = z.string().regex(/^PC\d+$/);
/** Fatura: id do compromisso derivado (A, E2) ou `F<AAMM>` do vencimento (F2612). */
export const esquemaIdFatura = z.string().regex(/^[A-Z][A-Z0-9]*$/);
/** Cenário: `atual`, `H<n>` ou `OP<n>` (impacto de proposta). */
export const esquemaIdCenario = z.string().regex(/^(atual|H\d+|OP\d+)$/);

// ---------------------------------------------------------------------------
// Enumerações (spec §4.1, H-03)
// ---------------------------------------------------------------------------

export const TIPOS_EVENTO = ["saida", "entrada"] as const;
export const esquemaTipoEvento = z.enum(TIPOS_EVENTO);
export type TipoEvento = z.infer<typeof esquemaTipoEvento>;

export const MEIOS_SAIDA = ["pix", "debito", "boleto", "debito_automatico", "cartao_credito"] as const;
export const MEIOS_ENTRADA = ["pix", "transferencia", "salario"] as const;
/** Meios que a pessoa pode informar (saída ou entrada). */
export const MEIOS_INFORMADOS = [
  "pix",
  "debito",
  "boleto",
  "debito_automatico",
  "cartao_credito",
  "transferencia",
  "salario",
] as const;
/** Meios derivados pelo sistema. */
export const MEIOS_DERIVADOS = [
  "pix_ou_debito",
  "simulacao",
  "movimentacao_interna",
  "resgate_simulado",
] as const;
export const esquemaMeioInformado = z.enum(MEIOS_INFORMADOS);
export const esquemaMeio = z.enum([...MEIOS_INFORMADOS, ...MEIOS_DERIVADOS]);
export type MeioInformado = z.infer<typeof esquemaMeioInformado>;
export type Meio = z.infer<typeof esquemaMeio>;

/** Verdadeiro se o meio informado é aceito para o tipo (spec §4.1). */
export function meioCombinaComTipo(tipo: TipoEvento, meio: string): boolean {
  const lista: readonly string[] = tipo === "saida" ? MEIOS_SAIDA : MEIOS_ENTRADA;
  return lista.includes(meio);
}

export const CATEGORIAS = [
  "moradia",
  "mercado",
  "restaurante",
  "delivery",
  "transporte",
  "saude",
  "educacao",
  "lazer",
  "assinaturas",
  "contas_casa",
  "compras",
  "receitas",
  "investimentos",
  "fatura",
  "outros",
] as const;
/** Categorias variáveis que formam o gasto diário (R-21, H-03). */
export const CATEGORIAS_VARIAVEIS = [
  "mercado",
  "restaurante",
  "delivery",
  "transporte",
  "lazer",
  "compras",
  "outros",
] as const;
export const esquemaCategoria = z.enum(CATEGORIAS);
export type Categoria = z.infer<typeof esquemaCategoria>;

export const ORIGENS_LINHA = ["dados_base", "estimado", "declaracao", "operacao", "hipotese"] as const;
export const esquemaOrigemLinha = z.enum(ORIGENS_LINHA);
export type OrigemLinha = z.infer<typeof esquemaOrigemLinha>;

export const esquemaProtecao = z
  .discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("integral") }),
    z.object({ tipo: z.literal("parcial"), valor_centavos: esquemaCentavosPositivos }),
  ])
  .nullable();
export type Protecao = z.infer<typeof esquemaProtecao>;
