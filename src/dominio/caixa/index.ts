// Motor de caixa (spec §5.1, §6.1). Implementação no B1.

import type {
  Alteracao,
  Contexto,
  EntradaComparacao,
  EstadoSessao,
  OQueMudou,
  Origem,
  Persona,
  ResultadoCenario,
  ResultadoDominio,
} from "@/contratos";

/** Situação atual primeiro, depois as hipóteses ativas na ordem do estado. */
export function calcularCenarios(persona: Persona, estado: EstadoSessao, contexto: Contexto): ResultadoCenario[] {
  void persona, estado, contexto;
  throw new Error("não implementado");
}

/** Declaração altera a situação atual (R-04, R-20). Não muda `versao`. */
export function registrarDeclaracao(
  persona: Persona,
  estado: EstadoSessao,
  alteracao: Alteracao,
  origem: Origem,
): ResultadoDominio<{ estado: EstadoSessao; declaracao_id: string }> {
  void persona, estado, alteracao, origem;
  throw new Error("não implementado");
}

/** Hipótese sobre a situação atual ou sobre outra hipótese, com cópia renumerada (§4.5). */
export function criarHipotese(
  persona: Persona,
  estado: EstadoSessao,
  entrada: { nome: string; a_partir_de: string; alteracoes: Alteracao[] },
  origem: Origem,
): ResultadoDominio<{ estado: EstadoSessao; hipotese_id: string }> {
  void persona, estado, entrada, origem;
  throw new Error("não implementado");
}

/** Remove declaração (`D<n>`) ou hipótese (`H<n>`); o id não é reutilizado. */
export function desfazer(
  persona: Persona,
  estado: EstadoSessao,
  alvo_id: string,
): ResultadoDominio<{ estado: EstadoSessao; removido: string }> {
  void persona, estado, alvo_id;
  throw new Error("não implementado");
}

/** R-24: alterações do turno e diferenças de indicadores por cenário. */
export function compararCenarios(antes: EntradaComparacao, depois: EntradaComparacao): OQueMudou {
  void antes, depois;
  throw new Error("não implementado");
}

/** Revalida o estado por replay (D-15); falha → ESTADO_INVALIDO (CR-19). */
export function validarEstado(persona: Persona, estado: EstadoSessao, contexto: Contexto): ResultadoDominio {
  void persona, estado, contexto;
  throw new Error("não implementado");
}
