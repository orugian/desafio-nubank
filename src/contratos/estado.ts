import { z } from "zod";
import {
  esquemaCentavosPositivos,
  esquemaData,
  esquemaDataHora,
  esquemaIdAlteracaoHipotese,
  esquemaIdDeclaracao,
  esquemaIdEvento,
  esquemaIdHipotese,
  esquemaIdOperacao,
  esquemaIdPersona,
  esquemaIdPosicao,
  esquemaMeioInformado,
  esquemaTipoEvento,
  esquemaValorTexto,
  esquemaValorTextoOuZero,
  meioCombinaComTipo,
} from "./comum";
import { esquemaSnapshotMercado } from "./mercado";
import { descricoesCampos as d } from "./descricoes";

// ---------------------------------------------------------------------------
// Alterações (spec §4.5). O esquema aceita todas as operações; a camada de
// domínio recusa as que não valem no lugar (ex.: `separar` como declaração →
// OPERACAO_NAO_PERMITIDA, CR-17e). Datas fora da janela são erro de domínio
// (DATA_ANTES_DE_HOJE, DATA_FORA_DA_JANELA), não de esquema.
// ---------------------------------------------------------------------------

export const esquemaAdicionarEvento = z
  .object({
    operacao: z.literal("adicionar_evento"),
    tipo: esquemaTipoEvento,
    descricao: z.string().min(1).max(60),
    data: esquemaData.describe(d.data),
    valor: esquemaValorTexto.describe(d.valor),
    meio: esquemaMeioInformado.describe(d.meio),
    /** 1–12, só com `cartao_credito`. */
    parcelas: z.int().min(1).max(12).optional().describe(d.parcelas),
    /** A pessoa confirmou que não é o mesmo gasto de um item já existente (C-07). */
    confirmar_nao_duplicado: z.boolean().optional().describe(d.confirmar_nao_duplicado),
  })
  .superRefine((v, ctx) => {
    if (!meioCombinaComTipo(v.tipo, v.meio)) {
      ctx.addIssue({ code: "custom", path: ["meio"], message: `meio ${v.meio} não vale para ${v.tipo}` });
    }
    if (v.parcelas !== undefined && v.meio !== "cartao_credito") {
      ctx.addIssue({ code: "custom", path: ["parcelas"], message: "parcelas só com cartao_credito" });
    }
  });

export const esquemaAlterarEvento = z
  .object({
    operacao: z.literal("alterar_evento"),
    evento_id: esquemaIdEvento.describe(d.evento_id),
    data: esquemaData.optional().describe(d.data),
    valor: esquemaValorTexto.optional().describe(d.valor),
  })
  .refine((v) => v.data !== undefined || v.valor !== undefined, {
    message: "informe data e/ou valor",
    path: ["data"],
  });

export const esquemaRemoverEvento = z.object({
  operacao: z.literal("remover_evento"),
  evento_id: esquemaIdEvento.describe(d.evento_id),
});

export const esquemaSeparar = z.object({
  operacao: z.literal("separar"),
  valor: esquemaValorTexto.describe(d.valor),
  /** Padrão: hoje. */
  data: esquemaData.optional().describe("Data AAAA-MM-DD; padrão: hoje (2026-10-30)."),
});

export const esquemaDefinirOrdemNoDia = z.object({
  operacao: z.literal("definir_ordem_no_dia"),
  data: esquemaData.describe(d.data),
  ordem: z.literal("entradas_primeiro"),
});

export const esquemaAlterarGastoDiario = z.object({
  operacao: z.literal("alterar_gasto_diario"),
  valor_por_dia: esquemaValorTextoOuZero.describe(d.valor_por_dia),
});

/** P1. */
export const esquemaResgatar = z.object({
  operacao: z.literal("resgatar"),
  posicao_id: esquemaIdPosicao.describe(d.destino),
  valor: esquemaValorTexto.optional().describe(d.valor),
});

export const esquemaAlteracao = z.discriminatedUnion("operacao", [
  esquemaAdicionarEvento,
  esquemaAlterarEvento,
  esquemaRemoverEvento,
  esquemaSeparar,
  esquemaDefinirOrdemNoDia,
  esquemaAlterarGastoDiario,
  esquemaResgatar,
]);
export type Alteracao = z.infer<typeof esquemaAlteracao>;
export type OperacaoAlteracao = Alteracao["operacao"];

/** Operações aceitas em cada camada (spec §4.5). */
export const OPERACOES_EM_DECLARACAO: readonly OperacaoAlteracao[] = [
  "adicionar_evento",
  "alterar_evento",
  "remover_evento",
  "definir_ordem_no_dia",
  "alterar_gasto_diario",
];
export const OPERACOES_EM_HIPOTESE: readonly OperacaoAlteracao[] = [
  "adicionar_evento",
  "alterar_evento",
  "remover_evento",
  "separar",
  "definir_ordem_no_dia",
  "alterar_gasto_diario",
  "resgatar",
];

/** Origem de uma alteração: a mensagem que a pediu. */
export const esquemaOrigem = z.object({ mensagem_id: z.string().min(1).nullable() });
export type Origem = z.infer<typeof esquemaOrigem>;

// ---------------------------------------------------------------------------
// Estado da sessão (spec §4.4). Nunca guarda resultados de cálculo.
// ---------------------------------------------------------------------------

export const esquemaDeclaracao = z.object({
  id: esquemaIdDeclaracao,
  mensagem_id: z.string().min(1).nullable(),
  alteracao: esquemaAlteracao,
});
export type Declaracao = z.infer<typeof esquemaDeclaracao>;

export const esquemaAlteracaoHipotese = z.object({
  /** `H<n>.<k>`; cópia de outra hipótese é renumerada. */
  id: esquemaIdAlteracaoHipotese,
  /** Id original quando copiada (ex.: `"H1.1"`), senão null. */
  copiado_de: esquemaIdAlteracaoHipotese.nullable(),
  alteracao: esquemaAlteracao,
});
export type AlteracaoHipotese = z.infer<typeof esquemaAlteracaoHipotese>;

export const esquemaHipotese = z.object({
  id: esquemaIdHipotese,
  nome: z.string().min(1).max(40),
  a_partir_de: z.union([z.literal("atual"), esquemaIdHipotese]),
  mensagem_id: z.string().min(1).nullable(),
  alteracoes: z.array(esquemaAlteracaoHipotese).min(1),
});
export type Hipotese = z.infer<typeof esquemaHipotese>;

export const esquemaOperacaoExecutada = z.object({
  id: esquemaIdOperacao,
  valor_centavos: esquemaCentavosPositivos,
  destino: esquemaIdPosicao,
  data: esquemaData,
});
export type OperacaoExecutada = z.infer<typeof esquemaOperacaoExecutada>;

export const esquemaOperacaoPendente = z.object({
  id: esquemaIdOperacao,
  valor_centavos: esquemaCentavosPositivos,
  destino: esquemaIdPosicao,
  criada_na_versao: z.int().nonnegative(),
});
export type OperacaoPendente = z.infer<typeof esquemaOperacaoPendente>;

/** Item do rastro: ferramenta chamada no turno, com argumentos e resultado. */
export const esquemaItemRastro = z.object({
  /** 1 a 3 (D-13). */
  chamada: z.int().min(1).max(3),
  /** Nome pedido pelo modelo (pode ser desconhecido: F-04). */
  ferramenta: z.string().min(1),
  argumentos: z.unknown(),
  /** `{ ok: true, ... }` ou `{ ok: false, erro }`, como devolvido ao modelo. */
  resultado: z.unknown(),
  duracao_ms: z.int().nonnegative().optional(),
});
export type ItemRastro = z.infer<typeof esquemaItemRastro>;

export const esquemaContadores = z.object({
  D: z.int().nonnegative(),
  H: z.int().nonnegative(),
  OP: z.int().nonnegative(),
});

// Mensagens da conversa guardam os cartões exibidos; o esquema dos cartões fica
// em `cartoes.ts`, que depende deste arquivo. Para evitar ciclo, a mensagem
// aceita qualquer cartão com `tipo` e a validação fina acontece em `cartoes.ts`.
export const esquemaMensagemConversa = z.object({
  mensagem_id: z.string().min(1),
  papel: z.enum(["usuario", "assistente", "sistema"]),
  texto: z.string(),
  versao: z.int().nonnegative(),
  cartoes: z.array(z.looseObject({ tipo: z.string() })),
  rastro: z.array(esquemaItemRastro),
  criada_em: esquemaDataHora.optional(),
});
export type MensagemConversa = z.infer<typeof esquemaMensagemConversa>;

export const esquemaEstadoSessao = z.object({
  versao: z.int().nonnegative(),
  persona_id: esquemaIdPersona,
  mercado: esquemaSnapshotMercado,
  conversa: z.array(esquemaMensagemConversa),
  declaracoes: z.array(esquemaDeclaracao),
  operacoes: z.array(esquemaOperacaoExecutada),
  operacao_pendente: esquemaOperacaoPendente.nullable(),
  hipoteses: z.array(esquemaHipotese),
  contadores: esquemaContadores,
});
export type EstadoSessao = z.infer<typeof esquemaEstadoSessao>;

/** Estado da versão 0 de uma sessão nova (POST /api/sessao). */
export function estadoInicial(persona_id: string, mercado: EstadoSessao["mercado"]): EstadoSessao {
  return {
    versao: 0,
    persona_id,
    mercado,
    conversa: [],
    declaracoes: [],
    operacoes: [],
    operacao_pendente: null,
    hipoteses: [],
    contadores: { D: 0, H: 0, OP: 0 },
  };
}
