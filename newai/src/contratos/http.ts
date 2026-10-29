import { z } from "zod";
import { LIMITES, esquemaDataHora, esquemaIdOperacao, esquemaIdPersona } from "./comum";
import { esquemaEstadoSessao, esquemaItemRastro } from "./estado";
import { esquemaResumoPersona } from "./persona";
import { esquemaCartaoResposta, esquemaVisaoApp } from "./visao";

// ---------------------------------------------------------------------------
// Falhas (spec §8 e §6.7). F-07 não é falha: vai em `avisos` de resposta ok.
// ---------------------------------------------------------------------------

export const TIPOS_FALHA = ["F-01", "F-02", "F-03", "F-04", "F-05", "F-06", "dominio"] as const;
export const esquemaTipoFalha = z.enum(TIPOS_FALHA);
export type TipoFalha = z.infer<typeof esquemaTipoFalha>;

/**
 * Códigos técnicos por tipo. `dominio` usa os códigos da spec §6.6 e, nas rotas,
 * `ENTRADA_INVALIDA`, `DADOS_PESSOAIS_RECUSADOS` (D-20) e `CODIGO_ACESSO_INVALIDO`.
 * O campo aceita qualquer código em maiúsculas para não travar a outra sessão.
 */
export const CODIGOS_FALHA_TECNICA = {
  "F-01": "TIMEOUT",
  "F-02": "COTA",
  "F-03": "INDISPONIVEL",
  "F-04": "RESPOSTA_INVALIDA",
  "F-05": "LIMITE_CHAMADAS",
  "F-06": "ESTADO_INVALIDO",
} as const;
export const CODIGOS_FALHA_ROTA = ["ENTRADA_INVALIDA", "DADOS_PESSOAIS_RECUSADOS", "CODIGO_ACESSO_INVALIDO"] as const;

export const esquemaFalha = z.object({
  tipo: esquemaTipoFalha,
  codigo: z.string().regex(/^[A-Z0-9_]+$/),
  /** Mensagem do servidor (`textos.falhas`); nunca corpo bruto do provedor. */
  mensagem: z.string().min(1),
  pode_tentar_novamente: z.boolean(),
  /** F-02: espera informada pelo provedor, quando houver. */
  espera_segundos: z.int().nonnegative().optional(),
});
export type Falha = z.infer<typeof esquemaFalha>;

/** Falha em qualquer rota: devolve o estado de entrada (ou null se não havia). */
export const esquemaRespostaFalha = z.object({
  status: z.literal("falha"),
  falha: esquemaFalha,
  estado: esquemaEstadoSessao.nullable(),
});
export type RespostaFalha = z.infer<typeof esquemaRespostaFalha>;

/** Aviso de resposta ok. Ex.: `F-07` (mercado ao vivo indisponível), `HIPOTESES_DESCARTADAS`. */
export const esquemaAvisoTurno = z.object({
  codigo: z.string().regex(/^[A-Z0-9_-]+$/),
  mensagem: z.string().min(1),
});
export type AvisoTurno = z.infer<typeof esquemaAvisoTurno>;

// ---------------------------------------------------------------------------
// Config exibida em "Como funciona" (REQ-17)
// ---------------------------------------------------------------------------

export const PROVEDORES = ["nvidia", "openrouter", "roteirizado"] as const;
export const esquemaProvedorNome = z.enum(PROVEDORES);
export type ProvedorNome = z.infer<typeof esquemaProvedorNome>;

export const esquemaConfig = z.object({
  versao_contratos: z.string().min(1),
  provedor: esquemaProvedorNome,
  modelo: z.string().min(1),
  /** Texto atual de `instrucoes.md`. */
  instrucoes: z.string(),
  ferramentas: z.array(z.object({ nome: z.string().min(1), descricao: z.string().min(1) })),
  regras_fixas: z.array(z.string().min(1)),
  fontes_mercado: z.array(
    z.object({ nome: z.string().min(1), url: z.string().min(1), uso: z.string().min(1), obtido_em: esquemaDataHora.nullable() }),
  ),
  modo: z.enum(["local", "publico"]),
});
export type Config = z.infer<typeof esquemaConfig>;

// ---------------------------------------------------------------------------
// Rotas (spec §6.7)
// ---------------------------------------------------------------------------

const codigoAcesso = z.string().max(100).optional();

/** GET /api/personas */
export const esquemaRespostaPersonas = z.array(esquemaResumoPersona);

/** POST /api/sessao */
export const esquemaRequisicaoSessao = z.object({ codigo_acesso: codigoAcesso, persona_id: esquemaIdPersona });
export type RequisicaoSessao = z.infer<typeof esquemaRequisicaoSessao>;
export const esquemaRespostaSessao = z.object({
  status: z.literal("ok"),
  estado: esquemaEstadoSessao.refine((e) => e.versao === 0, "sessão nova começa na versão 0"),
  visao: esquemaVisaoApp,
  config: esquemaConfig,
});
export type RespostaSessao = z.infer<typeof esquemaRespostaSessao>;

/** POST /api/turno */
export const esquemaRequisicaoTurno = z.object({
  codigo_acesso: codigoAcesso,
  estado: esquemaEstadoSessao,
  mensagem: z.object({ id: z.string().min(1).max(100), texto: z.string().min(1).max(LIMITES.texto_mensagem_max) }),
  /** P2 (REQ-24). Ex.: "home", "conta", "cartao", "investimentos". */
  tela_atual: z.string().regex(/^[a-z_]{1,30}$/).optional(),
});
export type RequisicaoTurno = z.infer<typeof esquemaRequisicaoTurno>;

/** Sucesso de turno e de ação. */
export const esquemaRespostaOk = z.object({
  status: z.literal("ok"),
  estado: esquemaEstadoSessao,
  texto: z.string(),
  cartoes: z.array(esquemaCartaoResposta),
  avisos: z.array(esquemaAvisoTurno),
  rastro: z.array(esquemaItemRastro),
  visao: esquemaVisaoApp,
});
export type RespostaOk = z.infer<typeof esquemaRespostaOk>;

export const esquemaRespostaTurno = z.discriminatedUnion("status", [esquemaRespostaOk, esquemaRespostaFalha]);
export type RespostaTurno = z.infer<typeof esquemaRespostaTurno>;

/** POST /api/acao: igual a turno, sem chamar o modelo; o texto é mensagem de sistema de `textos`. */
export const esquemaRequisicaoAcao = z.object({
  codigo_acesso: codigoAcesso,
  estado: esquemaEstadoSessao,
  acao: z.object({ tipo: z.enum(["confirmar", "cancelar"]), operacao_id: esquemaIdOperacao }),
});
export type RequisicaoAcao = z.infer<typeof esquemaRequisicaoAcao>;
export const esquemaRespostaAcao = esquemaRespostaTurno;
export type RespostaAcao = RespostaTurno;
