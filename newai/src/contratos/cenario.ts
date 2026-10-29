import { z } from "zod";
import {
  esquemaCentavos,
  esquemaCentavosNaoNegativos,
  esquemaCentavosPositivos,
  esquemaData,
  esquemaIdCenario,
  esquemaIdEvento,
  esquemaIdFatura,
  esquemaMeio,
  esquemaOrigemLinha,
  esquemaTipoEvento,
} from "./comum";
import { esquemaEstimativa } from "./persona";
import type { EstadoSessao } from "./estado";

/** Linha da tabela de projeção (R-05, R-06, R-23). */
export const esquemaLinhaCenario = z.object({
  data: esquemaData,
  evento_id: esquemaIdEvento,
  descricao: z.string().min(1),
  tipo: esquemaTipoEvento,
  meio: esquemaMeio,
  origem: esquemaOrigemLinha,
  estimativa: esquemaEstimativa.nullable(),
  previsto: z.boolean(),
  valor_centavos: esquemaCentavosPositivos,
  saldo_apos_centavos: esquemaCentavos,
  /** "Saldo zerado" (= 0), "Saldo insuficiente (faltam R$ X)" (< 0) ou null. */
  rotulo: z.string().min(1).nullable(),
  /** Valores do compromisso antes da declaração ("original → declarado", R-20). */
  original: z.object({ data: esquemaData, valor_centavos: esquemaCentavosPositivos }).nullable(),
});
export type LinhaCenario = z.infer<typeof esquemaLinhaCenario>;

/** R-08: primeiro dia com saldo < 0 após as saídas do dia. */
export const esquemaPrimeiraFalta = z.object({
  data: esquemaData,
  valor_descoberto_centavos: esquemaCentavosPositivos,
  saidas_do_dia: z.array(esquemaIdEvento).min(1),
});
export type PrimeiraFalta = z.infer<typeof esquemaPrimeiraFalta>;

/** R-12: mesmo cenário sem as entradas previstas. */
export const esquemaSemRecebimentos = z.object({
  insuficiencia_centavos: esquemaCentavosNaoNegativos,
  primeira_falta: esquemaPrimeiraFalta.nullable(),
  saldo_final_centavos: esquemaCentavos,
});

/** R-07 a R-12. */
export const esquemaIndicadores = z.object({
  saldo_inicial_centavos: esquemaCentavos,
  saldo_minimo_centavos: esquemaCentavos,
  data_saldo_minimo: esquemaData,
  primeira_falta: esquemaPrimeiraFalta.nullable(),
  insuficiencia_centavos: esquemaCentavosNaoNegativos,
  margem_hoje_centavos: esquemaCentavosNaoNegativos,
  saldo_final_centavos: esquemaCentavos,
  /** null quando não há entrada prevista na janela (CR-17i). */
  sem_recebimentos: esquemaSemRecebimentos.nullable(),
});
export type Indicadores = z.infer<typeof esquemaIndicadores>;

/** C-05. */
export const esquemaFaturaAfetada = z.object({
  fatura_id: esquemaIdFatura,
  vencimento: esquemaData,
  total_antes_centavos: esquemaCentavosNaoNegativos,
  total_depois_centavos: esquemaCentavosNaoNegativos,
});

/** R-11, R-12. */
export const AVISOS_CENARIO = [
  "saldo_final_positivo_com_falta",
  "cobertura_depende_de_recebimento",
  "falta_maior_sem_recebimento",
] as const;
export const esquemaAvisoCenario = z.enum(AVISOS_CENARIO);
export type AvisoCenario = z.infer<typeof esquemaAvisoCenario>;

/** Resultado de cenário (spec §6.3). `cenario_id`: `atual`, `H<n>` ou `OP<n>` (impacto de proposta). */
export const esquemaResultadoCenario = z
  .object({
    cenario_id: esquemaIdCenario,
    nome: z.string().min(1),
    status: z.enum(["calculado", "inconsistente"]),
    linhas: z.array(esquemaLinhaCenario),
    /** null quando `inconsistente` (R-14). */
    indicadores: esquemaIndicadores.nullable(),
    faturas_afetadas: z.array(esquemaFaturaAfetada),
    /** R-22. */
    datas_ordem_relevante: z.array(esquemaData),
    avisos: z.array(esquemaAvisoCenario),
  })
  .refine((c) => (c.status === "calculado") === (c.indicadores !== null), {
    message: "indicadores existem só quando status = calculado",
    path: ["indicadores"],
  });
export type ResultadoCenario = z.infer<typeof esquemaResultadoCenario>;

// ---------------------------------------------------------------------------
// Comparação antes × depois (R-24), alimenta o cartão `o_que_mudou`.
// ---------------------------------------------------------------------------

/** Entrada de `compararCenarios(antes, depois)`. */
export type EntradaComparacao = { estado: EstadoSessao; cenarios: ResultadoCenario[] };

export const TIPOS_MUDANCA = [
  "declaracao_registrada",
  "declaracao_desfeita",
  "hipotese_criada",
  "hipotese_desfeita",
  "hipotese_descartada",
  "operacao_proposta",
  "operacao_executada",
  "operacao_cancelada",
  "operacao_expirada",
] as const;

export const INDICADORES_COMPARADOS = [
  "status",
  "saldo_minimo_centavos",
  "data_saldo_minimo",
  "primeira_falta_data",
  "primeira_falta_valor_centavos",
  "insuficiencia_centavos",
  "margem_hoje_centavos",
  "saldo_final_centavos",
  "sem_recebimentos_insuficiencia_centavos",
  "sem_recebimentos_saldo_final_centavos",
] as const;

const esquemaValorIndicador = z.union([z.int(), z.string(), z.null()]);

export const esquemaOQueMudou = z.object({
  alteracoes: z.array(
    z.object({
      tipo: z.enum(TIPOS_MUDANCA),
      /** D<n>, H<n> ou OP<n>. */
      id: z.string().min(1),
      descricao: z.string().min(1),
    }),
  ),
  cenarios: z.array(
    z.object({
      cenario_id: esquemaIdCenario,
      nome: z.string().min(1),
      situacao: z.enum(["novo", "removido", "alterado", "inalterado"]),
      diferencas: z.array(
        z.object({
          indicador: z.enum(INDICADORES_COMPARADOS),
          antes: esquemaValorIndicador,
          depois: esquemaValorIndicador,
        }),
      ),
    }),
  ),
});
export type OQueMudou = z.infer<typeof esquemaOQueMudou>;
