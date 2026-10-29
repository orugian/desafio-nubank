import { z } from "zod";
import {
  esquemaCdiPct,
  esquemaData,
  esquemaIdOperacao,
  esquemaIdPosicao,
  esquemaValorTexto,
} from "./comum";
import { esquemaAlteracao } from "./estado";
import { esquemaFiltroHistorico } from "./consultas";
import { descricoesCampos, descricoesFerramentas } from "./descricoes";
import type { CodigoErro, ErroDominio } from "./erros";

// Ferramentas do modelo (spec §6.2). Resultado de cada uma:
// `{ ok: true, ... }` ou `{ ok: false, erro: { codigo, mensagem, campos } }`.

export const NOMES_FERRAMENTAS = [
  "consultar_historico",
  "consultar_cartao",
  "consultar_investimentos",
  "projetar_rendimento",
  "registrar_declaracao",
  "criar_hipotese",
  "desfazer",
  "propor_movimentacao",
  "confirmar_movimentacao",
  "cancelar_movimentacao",
  "exibir_comparacao",
  "preparar_resumo_atendimento",
] as const;
export type NomeFerramenta = (typeof NOMES_FERRAMENTAS)[number];

/** Ferramentas P1 (podem ficar fora da lista enviada ao modelo enquanto não implementadas). */
export const FERRAMENTAS_P1: readonly NomeFerramenta[] = ["preparar_resumo_atendimento"];

const valor = esquemaValorTexto.describe(descricoesCampos.valor);
const destino = esquemaIdPosicao.describe(descricoesCampos.destino);
const ateData = esquemaData.describe(descricoesCampos.ate_data);
const operacaoId = esquemaIdOperacao.describe(descricoesCampos.operacao_id);

export const esquemasArgumentos = {
  consultar_historico: esquemaFiltroHistorico,
  consultar_cartao: z.object({}),
  consultar_investimentos: z.object({ ate_data: ateData.optional() }),
  projetar_rendimento: z
    .object({
      valor,
      destino: destino.optional(),
      cdi_pct: esquemaCdiPct.optional().describe("Percentual do CDI, quando não houver destino (ex.: 100)."),
      ate_data: ateData,
    })
    .refine((v) => (v.destino === undefined) !== (v.cdi_pct === undefined), {
      message: "informe destino ou cdi_pct (um dos dois)",
      path: ["destino"],
    }),
  registrar_declaracao: z.object({ alteracao: esquemaAlteracao }),
  criar_hipotese: z.object({
    nome: z.string().min(1).max(40).describe("Nome curto do cenário, ex.: \"Separar R$ 500 hoje\"."),
    a_partir_de: z.union([z.literal("atual"), z.string().regex(/^H\d+$/)]).describe(descricoesCampos.a_partir_de),
    alteracoes: z.array(esquemaAlteracao).min(1).max(5),
  }),
  desfazer: z.object({ alvo_id: z.string().regex(/^(D|H)\d+$/).describe(descricoesCampos.alvo_id) }),
  propor_movimentacao: z.object({ valor, destino }),
  confirmar_movimentacao: z.object({ operacao_id: operacaoId }),
  cancelar_movimentacao: z.object({ operacao_id: operacaoId }),
  exibir_comparacao: z.object({}),
  preparar_resumo_atendimento: z.object({
    motivo: z.string().min(1).max(200).describe("Motivo do contato com o atendimento, em uma frase."),
  }),
} satisfies Record<NomeFerramenta, z.ZodType>;

export type ArgumentosFerramenta<N extends NomeFerramenta> = z.infer<(typeof esquemasArgumentos)[N]>;

/** Esquema com os argumentos de exemplo de todas as ferramentas (usado pelos exemplos). */
export const esquemaArgumentosFerramentas = z.object(
  Object.fromEntries(NOMES_FERRAMENTAS.map((n) => [n, esquemasArgumentos[n]])) as {
    [N in NomeFerramenta]: (typeof esquemasArgumentos)[N];
  },
);

export function ehNomeFerramenta(nome: string): nome is NomeFerramenta {
  return (NOMES_FERRAMENTAS as readonly string[]).includes(nome);
}

const CAMPOS_DE_VALOR = new Set(["valor", "valor_por_dia"]);

/**
 * Valida argumentos de ferramenta pelo esquema (G-03), antes de qualquer efeito.
 * Erro só em campos de valor → VALOR_INVALIDO (CR-17b); demais → ARGUMENTOS_INVALIDOS.
 */
export function validarArgumentos<N extends NomeFerramenta>(
  nome: N,
  argumentos: unknown,
): { ok: true; argumentos: ArgumentosFerramenta<N> } | { ok: false; erro: ErroDominio } {
  const esquema = esquemasArgumentos[nome] as unknown as z.ZodType<ArgumentosFerramenta<N>>;
  const r = esquema.safeParse(argumentos ?? {});
  if (r.success) return { ok: true, argumentos: r.data };
  return { ok: false, erro: erroDeValidacao(r.error) };
}

/** Converte erro do zod no erro de domínio correspondente. */
export function erroDeValidacao(e: z.ZodError): ErroDominio {
  const campos = [...new Set(e.issues.map((i) => i.path.join(".")).filter((c) => c.length > 0))];
  const soValor =
    e.issues.length > 0 && e.issues.every((i) => CAMPOS_DE_VALOR.has(String(i.path[i.path.length - 1])));
  const codigo: CodigoErro = soValor ? "VALOR_INVALIDO" : "ARGUMENTOS_INVALIDOS";
  const mensagem = e.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
  return { codigo, mensagem, campos };
}

/** Definição no formato de ferramentas compatível com OpenAI (`tools`). */
export type DefinicaoFerramenta = {
  type: "function";
  function: { name: NomeFerramenta; description: string; parameters: Record<string, unknown> };
};

export function esquemaJsonFerramenta(nome: NomeFerramenta): Record<string, unknown> {
  const json = z.toJSONSchema(esquemasArgumentos[nome], { io: "input", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  return json;
}

/** Lista enviada ao provedor. Por padrão omite as ferramentas P1. */
export function definicoesFerramentas(opcoes: { incluir_p1?: boolean } = {}): DefinicaoFerramenta[] {
  return NOMES_FERRAMENTAS.filter((n) => opcoes.incluir_p1 || !FERRAMENTAS_P1.includes(n)).map((nome) => ({
    type: "function",
    function: { name: nome, description: descricoesFerramentas[nome], parameters: esquemaJsonFerramenta(nome) },
  }));
}
