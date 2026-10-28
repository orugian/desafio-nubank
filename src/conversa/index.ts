// Conversa (spec §6.1, §6.7). Stub do B0 com a assinatura do contrato; a
// Sessão 2 implementa no B4 (diretório da S2, exceto `executores/`, que passa à S1 no B7).

import type { DepsConversa, RequisicaoAcao, RequisicaoTurno, RespostaAcao, RespostaTurno } from "@/contratos";

export async function processarTurno(req: RequisicaoTurno, deps: DepsConversa): Promise<RespostaTurno> {
  void req, deps;
  throw new Error("não implementado");
}

export async function processarAcao(req: RequisicaoAcao, deps: DepsConversa): Promise<RespostaAcao> {
  void req, deps;
  throw new Error("não implementado");
}
