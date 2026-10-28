// Cartão e parcelas (spec §5.3, §6.1). Implementação no B1b.

import { dataExiste, erro, textos } from "@/contratos";
import { somarDias } from "@/dominio/calendario";
import type {
  AlocacaoCompra,
  CartaoVisao,
  EstadoSessao,
  Persona,
  ResultadoDominio,
  ResultadoDuplicidade,
} from "@/contratos";

// Aritmética pura sobre ISO; fevereiro limita o fechamento ao último dia.
function deslocarMes(mes: string, n: number): string {
  const [ano, numero] = mes.split("-").map(Number);
  const absoluto = ano * 12 + numero - 1 + n;
  return `${Math.floor(absoluto / 12).toString().padStart(4, "0")}-${(absoluto % 12 + 1).toString().padStart(2, "0")}`;
}

function dataNoMes(mes: string, dia: number): string {
  const ultimo = Number(somarDias(`${deslocarMes(mes, 1)}-01`, -1).slice(8));
  return `${mes}-${Math.min(dia, ultimo).toString().padStart(2, "0")}`;
}

/** C-02, C-03: faturas e valores de cada parcela de uma compra no cartão. */
export function alocarCompra(
  persona: Persona,
  estado: EstadoSessao,
  compra: { data: string; valor_centavos: number; parcelas: number },
): ResultadoDominio<AlocacaoCompra> {
  void estado;
  if (!persona.cartao) return erro("OPERACAO_NAO_PERMITIDA", textos.erros.OPERACAO_NAO_PERMITIDA, ["meio"]);
  if (!dataExiste(compra.data) || !Number.isInteger(compra.parcelas) || compra.parcelas < 1 || compra.parcelas > 12) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["data", "parcelas"]);
  }
  if (!Number.isSafeInteger(compra.valor_centavos) || compra.valor_centavos <= 0) {
    return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["valor_centavos"]);
  }
  const { dia_fechamento, dia_vencimento } = persona.cartao;
  const mes = compra.data.slice(0, 7);
  const fechamento = dataNoMes(mes, dia_fechamento);
  const fechaEm = compra.data < fechamento ? mes : deslocarMes(mes, 1);
  const valor = Math.floor(compra.valor_centavos / compra.parcelas);
  if (valor === 0) return erro("VALOR_INVALIDO", "Cada parcela deve ter pelo menos um centavo.", ["valor_centavos", "parcelas"]);
  const parcelas: AlocacaoCompra["parcelas"] = [];
  for (let k = 0; k < compra.parcelas; k++) {
    const venceEm = deslocarMes(fechaEm, k + 1);
    const vencimento = dataNoMes(venceEm, dia_vencimento);
    const fatura = persona.cartao.faturas.find((f) => f.vencimento === vencimento);
    if (fatura?.status === "fechada") return erro("OPERACAO_NAO_PERMITIDA", textos.erros.OPERACAO_NAO_PERMITIDA, ["data"]);
    parcelas.push({ numero: k + 1, fatura_id: fatura?.id ?? `F${venceEm.slice(2).replace("-", "")}`, fechamento: dataNoMes(deslocarMes(fechaEm, k), dia_fechamento), vencimento, valor_centavos: valor + (k === 0 ? compra.valor_centavos % compra.parcelas : 0) });
  }
  return { ok: true, parcelas };
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
