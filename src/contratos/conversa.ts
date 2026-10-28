import { z } from "zod";
import type { DataISO } from "./comum";
import type { EntradaComparacao, OQueMudou, ResultadoCenario } from "./cenario";
import type { ErroDominio, ResultadoDominio } from "./erros";
import type { EstadoSessao } from "./estado";
import type { DefinicaoFerramenta, NomeFerramenta } from "./ferramentas";
import type { AvisoTurno } from "./http";
import type { SeriesMercado, SnapshotMercado } from "./mercado";
import type { Persona } from "./persona";
import type { CartaoResposta, VisaoApp } from "./visao";

// ---------------------------------------------------------------------------
// Contexto injetado no domínio (spec §6.1)
// ---------------------------------------------------------------------------

/** Calendário (spec §3): de hoje em diante, seg–sex sem feriados; antes de hoje, dias da série de CDI. */
export interface Calendario {
  ehDiaUtil(data: DataISO): boolean;
  /** n = 0: o próprio dia se útil, senão o próximo útil (D+0). n > 0: n úteis depois do D+0. */
  somarDiasUteis(data: DataISO, n: number): DataISO;
  /** Dias úteis d com `de` ≤ d < `ate` (I-03, I-08). */
  diasUteisEntre(de: DataISO, ate: DataISO): number;
}

export type Contexto = { series: SeriesMercado; calendario: Calendario };

// ---------------------------------------------------------------------------
// Porta do provedor (spec §6.1 `conversa/provedor`)
// ---------------------------------------------------------------------------

export const esquemaChamadaFerramenta = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  /** JSON em texto, como vem do provedor (pode ser inválido: F-04 ou erro ao modelo). */
  argumentos: z.string(),
});
export type ChamadaFerramenta = z.infer<typeof esquemaChamadaFerramenta>;

export const esquemaMensagemProvedor = z.discriminatedUnion("papel", [
  z.object({ papel: z.literal("sistema"), conteudo: z.string() }),
  z.object({ papel: z.literal("usuario"), conteudo: z.string() }),
  z.object({
    papel: z.literal("assistente"),
    conteudo: z.string(),
    chamadas: z.array(esquemaChamadaFerramenta).optional(),
  }),
  z.object({ papel: z.literal("ferramenta"), chamada_id: z.string().min(1), conteudo: z.string() }),
]);
export type MensagemProvedor = z.infer<typeof esquemaMensagemProvedor>;

export const FALHAS_PROVEDOR = ["timeout", "cota", "indisponivel", "resposta_invalida"] as const;

export const esquemaRespostaProvedor = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("texto"), texto: z.string() }),
  z.object({ tipo: z.literal("chamadas"), chamadas: z.array(esquemaChamadaFerramenta).min(1), texto: z.string().optional() }),
  z.object({
    tipo: z.literal("falha"),
    falha: z.enum(FALHAS_PROVEDOR),
    espera_segundos: z.int().nonnegative().optional(),
  }),
]);
export type RespostaProvedor = z.infer<typeof esquemaRespostaProvedor>;

export interface Provedor {
  nome: "nvidia" | "openrouter" | "roteirizado";
  modelo: string;
  gerar(
    mensagens: MensagemProvedor[],
    ferramentas: DefinicaoFerramenta[],
    opcoes: { timeout_ms: number },
  ): Promise<RespostaProvedor>;
}

/**
 * Roteiro do provedor dublê (`LLM_PROVEDOR=roteirizado`, arquivo em `LLM_ROTEIRO`).
 * Cada turno casa pela mensagem do usuário (texto exato, sem diferença de
 * maiúsculas e espaços nas pontas). Dentro do turno, a k-ésima chamada a
 * `gerar` devolve `respostas[k]`. Em chamadas, `argumentos` pode ser objeto
 * (o provedor converte em texto JSON) ou texto JSON já pronto.
 */
export const esquemaRoteiro = z.object({
  descricao: z.string().min(1),
  turnos: z
    .array(
      z.object({
        mensagem: z.string().min(1),
        respostas: z
          .array(
            z.discriminatedUnion("tipo", [
              z.object({ tipo: z.literal("texto"), texto: z.string() }),
              z.object({
                tipo: z.literal("chamadas"),
                chamadas: z
                  .array(
                    z.object({
                      id: z.string().min(1),
                      nome: z.string().min(1),
                      argumentos: z.union([z.string(), z.record(z.string(), z.unknown())]),
                    }),
                  )
                  .min(1),
                texto: z.string().optional(),
              }),
              z.object({
                tipo: z.literal("falha"),
                falha: z.enum(FALHAS_PROVEDOR),
                espera_segundos: z.int().nonnegative().optional(),
              }),
            ]),
          )
          .min(1),
      }),
    )
    .min(1),
});
export type Roteiro = z.infer<typeof esquemaRoteiro>;

// ---------------------------------------------------------------------------
// Dependências de processarTurno / processarAcao (spec §6.1 `conversa`)
// ---------------------------------------------------------------------------

/** Contexto de cada execução. O executor carrega a persona por `estado.persona_id`. */
export type ContextoExecucao = { estado: EstadoSessao; mensagem_id: string | null };

/**
 * Resultado de executor de ferramenta. `resultado` volta ao modelo como
 * `{ ok: true, ...resultado }`; `cartoes` e `avisos` vão para a resposta.
 * Erro volta ao modelo e nada é aplicado.
 */
export type ResultadoExecucao =
  | {
      ok: true;
      estado: EstadoSessao;
      resultado: Record<string, unknown>;
      cartoes: CartaoResposta[];
      avisos: AvisoTurno[];
    }
  | { ok: false; erro: ErroDominio };

export type Executor = (argumentos: unknown, ctx: ContextoExecucao) => Promise<ResultadoExecucao>;

export interface Executores {
  ferramentas: Record<NomeFerramenta, Executor>;
  validarEstado(estado: EstadoSessao): Promise<ResultadoDominio>;
  montarVisao(estado: EstadoSessao): Promise<VisaoApp>;
  /** Diferenças entre o estado de entrada e o de saída do turno (R-24). */
  compararCenarios(antes: EstadoSessao, depois: EstadoSessao): Promise<OQueMudou>;
}

export interface FonteMercado {
  snapshotGravado(): SnapshotMercado;
  buscarAoVivo(opcoes: { timeout_ms: number }): Promise<SnapshotMercado>;
}

export interface DepsConversa {
  provedor: Provedor;
  executores: Executores;
  mercado: FonteMercado;
  /** Lê `instrucoes.md` a cada turno. */
  instrucoes: () => Promise<string>;
}

/** Assinaturas puras do domínio usadas pelos executores (implementação em `src/dominio`). */
export type CompararCenarios = (antes: EntradaComparacao, depois: EntradaComparacao) => OQueMudou;
export type CalcularCenarios = (persona: Persona, estado: EstadoSessao, contexto: Contexto) => ResultadoCenario[];
