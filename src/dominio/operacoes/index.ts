// Operações simuladas (spec §5.5, §6.1). Implementação no B1c.

import type { z } from "zod";
import type {
  Contexto,
  EstadoSessao,
  Persona,
  ResultadoDominio,
  esquemaConfirmacaoMovimentacao,
  esquemaPropostaMovimentacao,
} from "@/contratos";

export type PropostaMovimentacao = z.infer<typeof esquemaPropostaMovimentacao>;
export type ConfirmacaoMovimentacao = z.infer<typeof esquemaConfirmacaoMovimentacao>;

/** O-03, O-04, O-06: cria a pendente com o impacto na situação atual. `valor` em texto (§4.5). */
export function proporMovimentacao(
  persona: Persona,
  estado: EstadoSessao,
  pedido: { valor: string; destino: string },
  contexto: Contexto,
): ResultadoDominio<{ estado: EstadoSessao } & PropostaMovimentacao> {
  void persona, estado, pedido, contexto;
  throw new Error("não implementado");
}

/** O-05, O-07: executa uma vez e descarta as hipóteses ativas. */
export function confirmarMovimentacao(
  persona: Persona,
  estado: EstadoSessao,
  operacao_id: string,
): ResultadoDominio<{ estado: EstadoSessao } & ConfirmacaoMovimentacao> {
  void persona, estado, operacao_id;
  throw new Error("não implementado");
}

/** Zera a pendente e não muda mais nada. */
export function cancelarMovimentacao(estado: EstadoSessao, operacao_id: string): ResultadoDominio<{ estado: EstadoSessao }> {
  void estado, operacao_id;
  throw new Error("não implementado");
}
