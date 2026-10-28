// Porta do provedor (spec §6.1 `conversa/provedor`). Stub do B0; a Sessão 2
// implementa no B4: `LLM_PROVEDOR` = nvidia | openrouter | roteirizado
// (roteirizado lê o arquivo de `LLM_ROTEIRO`, esquema `esquemaRoteiro`).

import type { Provedor, ProvedorNome } from "@/contratos";

export function criarProvedor(config: { provedor: ProvedorNome; modelo?: string; roteiro?: string }): Provedor {
  void config;
  throw new Error("não implementado");
}
