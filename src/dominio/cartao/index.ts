// Cartão e parcelas (spec §5.3, §6.1). Implementação no B1b.

import type {
  AlocacaoCompra,
  CartaoVisao,
  EstadoSessao,
  Persona,
  ResultadoDominio,
  ResultadoDuplicidade,
} from "@/contratos";

/** C-02, C-03: faturas e valores de cada parcela de uma compra no cartão. */
export function alocarCompra(
  persona: Persona,
  estado: EstadoSessao,
  compra: { data: string; valor_centavos: number; parcelas: number },
): ResultadoDominio<AlocacaoCompra> {
  void persona, estado, compra;
  throw new Error("não implementado");
}

/** C-07: valor igual a item de fatura fechada ou aberta, ou a lançamento de 23/10 a 29/10. */
export function verificarDuplicidade(persona: Persona, gasto: { valor_centavos: number }): ResultadoDuplicidade {
  void persona, gasto;
  throw new Error("não implementado");
}

/** Fatura fechada, aberta e próximas, na situação atual. null para persona sem cartão. */
export function consultarCartao(persona: Persona, estado: EstadoSessao): CartaoVisao | null {
  void persona, estado;
  throw new Error("não implementado");
}
