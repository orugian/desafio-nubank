import { z } from "zod";

/** Erros de domínio (spec §6.6). */
export const CODIGOS_ERRO = [
  "ARGUMENTOS_INVALIDOS",
  "VALOR_INVALIDO",
  "DATA_ANTES_DE_HOJE",
  "DATA_FORA_DA_JANELA",
  "DATA_FORA_DO_HISTORICO",
  "EVENTO_INEXISTENTE",
  "POSICAO_INEXISTENTE",
  "OPERACAO_NAO_PERMITIDA",
  "POSSIVEL_DUPLICIDADE",
  "LIMITE_HIPOTESES",
  "LIMITE_ALTERACOES",
  "HIPOTESE_INEXISTENTE",
  "ALTERACAO_INEXISTENTE",
  "SALDO_INSUFICIENTE_HOJE",
  "OPERACAO_EXPIRADA",
  "OPERACAO_JA_EXECUTADA",
  "DISPONIVEL_FORA_DA_JANELA",
  "ESTADO_INVALIDO",
  "MENSAGEM_JA_PROCESSADA",
] as const;
export const esquemaCodigoErro = z.enum(CODIGOS_ERRO);
export type CodigoErro = z.infer<typeof esquemaCodigoErro>;

/**
 * Erro devolvido por função de domínio e por ferramenta (spec §6.2).
 * `campos`: nomes dos argumentos com problema. `detalhes`: dados citados
 * (ex.: item duplicado em POSSIVEL_DUPLICIDADE, data em DISPONIVEL_FORA_DA_JANELA).
 */
export const esquemaErroDominio = z.object({
  codigo: esquemaCodigoErro,
  mensagem: z.string().min(1),
  campos: z.array(z.string()),
  detalhes: z.record(z.string(), z.unknown()).optional(),
});
export type ErroDominio = z.infer<typeof esquemaErroDominio>;

/** Resultado de função de domínio: nunca lança exceção para erro de negócio. */
export type ResultadoDominio<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; erro: ErroDominio };

export function erro(
  codigo: CodigoErro,
  mensagem: string,
  campos: string[] = [],
  detalhes?: Record<string, unknown>,
): { ok: false; erro: ErroDominio } {
  return { ok: false, erro: detalhes ? { codigo, mensagem, campos, detalhes } : { codigo, mensagem, campos } };
}
