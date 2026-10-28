// Mercado (spec §4.3, D-23, §6.1). snapshotGravado no B3b; buscarAoVivo no B3c (P1).

import type { SnapshotMercado } from "@/contratos";

/** Valores gravados em `dados/mercado/`, com `ao_vivo: false` e a data. */
export function snapshotGravado(): SnapshotMercado {
  throw new Error("não implementado");
}

/** Tenta o ao vivo uma vez; em timeout ou erro devolve o gravado com `tentou_ao_vivo: true` (F-07). */
export async function buscarAoVivo(opcoes: { timeout_ms: number }): Promise<SnapshotMercado> {
  void opcoes;
  throw new Error("não implementado");
}
