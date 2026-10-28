// Histórico (spec §5.2, §6.1). Implementação no B2.

import type { FiltroHistorico, Persona, ResultadoDominio, ResultadoHistorico } from "@/contratos";

/** H-02 a H-04: filtros, agrupamento e até 20 itens mais recentes. */
export function consultarHistorico(persona: Persona, filtro: FiltroHistorico): ResultadoDominio<ResultadoHistorico> {
  void persona, filtro;
  throw new Error("não implementado");
}
