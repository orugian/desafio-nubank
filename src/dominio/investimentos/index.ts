// Investimentos (spec §5.4, §6.1). Implementação no B3b.

import { HOJE } from "@/contratos";
import type {
  Contexto,
  DataISO,
  EstadoSessao,
  Persona,
  Posicao,
  ResultadoDominio,
  ResultadoInvestimentos,
  ResultadoProjecao,
  SnapshotMercado,
} from "@/contratos";

/** I-03 a I-07, I-10. Sem `ate_data`, usa o default de I-10. */
export function consultarInvestimentos(
  persona: Persona,
  estado: EstadoSessao,
  contexto: Contexto,
  filtro: { ate_data?: DataISO },
): ResultadoDominio<ResultadoInvestimentos> {
  void persona, estado, contexto, filtro;
  throw new Error("não implementado");
}

/** I-08: rendimento bruto com CDI constante; `ate_data` > 29/11 → erro. */
export function projetarRendimento(
  mercado: SnapshotMercado,
  contexto: Contexto,
  pedido: { valor_centavos: number; cdi_pct: number; ate_data: DataISO },
): ResultadoDominio<Omit<ResultadoProjecao, "destino">> {
  void mercado, contexto, pedido;
  throw new Error("não implementado");
}

/** I-01, I-02: primeiro dia com o valor em conta se o pedido for feito hoje. */
export function dataDisponivel(posicao: Posicao, contexto: Contexto): DataISO {
  const liquidez = posicao.liquidez;
  switch (liquidez.regra) {
    case "imediata":
      return HOJE;
    case "d_mais_uteis":
      return contexto.calendario.somarDiasUteis(HOJE, liquidez.dias);
    case "no_vencimento":
      // CR-35: CDB no vencimento, na data.
      return posicao.categoria === "cdb_vencimento" ? posicao.vencimento : HOJE;
  }
}
