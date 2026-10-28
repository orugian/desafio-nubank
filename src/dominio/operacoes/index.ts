// Operações simuladas (spec §5.5, §6.1). Implementação no B1c.

import type { z } from "zod";
import { HOJE, erro, textos, validarArgumentos, type Posicao } from "@/contratos";
import { calcularCenarios, paraCentavos, saldoDisponivelHoje } from "@/dominio/caixa";
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

function destinoDaPosicao(posicao: Posicao): PropostaMovimentacao["destino"] {
  return { posicao_id: posicao.id, nome: posicao.nome, rende: posicao.categoria === "caixinha", cdi_pct: posicao.categoria === "caixinha" ? posicao.cdi_pct : null };
}

/** O-03, O-04, O-06: cria a pendente com o impacto na situação atual. `valor` em texto (§4.5). */
export function proporMovimentacao(
  persona: Persona,
  estado: EstadoSessao,
  pedido: { valor: string; destino: string },
  contexto: Contexto,
): ResultadoDominio<{ estado: EstadoSessao } & PropostaMovimentacao> {
  const v = validarArgumentos("propor_movimentacao", pedido);
  if (!v.ok) return v;
  const posicao = persona.posicoes.find((p) => p.id === v.argumentos.destino);
  if (!posicao) return erro("POSICAO_INEXISTENTE", textos.erros.POSICAO_INEXISTENTE, ["destino"]);
  if (posicao.categoria !== "caixinha" && posicao.categoria !== "saldo_separado") return erro("OPERACAO_NAO_PERMITIDA", textos.erros.OPERACAO_NAO_PERMITIDA, ["destino"]);
  const valor_centavos = paraCentavos(v.argumentos.valor);
  const disponivel = saldoDisponivelHoje(persona, estado);
  if (valor_centavos > disponivel) return erro("SALDO_INSUFICIENTE_HOJE", textos.erros.SALDO_INSUFICIENTE_HOJE, ["valor"], { saldo_disponivel_hoje_centavos: disponivel });
  const n = estado.contadores.OP + 1;
  const operacao_pendente = { id: `OP${n}`, valor_centavos, destino: posicao.id, criada_na_versao: estado.versao };
  const novo = { ...estado, operacao_pendente, contadores: { ...estado.contadores, OP: n } };
  // A operação é acrescentada apenas ao cálculo transitório do impacto, não ao estado retornado.
  const [impactoAtual] = calcularCenarios(persona, { ...estado, hipoteses: [], operacoes: [...estado.operacoes, { id: operacao_pendente.id, valor_centavos, destino: posicao.id, data: HOJE }] }, contexto);
  const impacto = { ...impactoAtual, cenario_id: operacao_pendente.id, nome: textos.descricao_movimentacao(posicao.nome) };
  const falta = impacto.indicadores!.primeira_falta;
  return { ok: true, estado: novo, operacao_pendente, destino: destinoDaPosicao(posicao), impacto, alerta: falta ? textos.alerta_falta(falta.valor_descoberto_centavos, falta.data) : null };
}

/** O-05, O-07: executa uma vez e descarta as hipóteses ativas. */
export function confirmarMovimentacao(
  persona: Persona,
  estado: EstadoSessao,
  operacao_id: string,
): ResultadoDominio<{ estado: EstadoSessao } & ConfirmacaoMovimentacao> {
  const v = validarArgumentos("confirmar_movimentacao", { operacao_id });
  if (!v.ok) return v;
  if (estado.operacoes.some((op) => op.id === operacao_id)) return erro("OPERACAO_JA_EXECUTADA", textos.erros.OPERACAO_JA_EXECUTADA, ["operacao_id"]);
  const pendente = estado.operacao_pendente;
  if (!pendente || pendente.id !== operacao_id) return erro("OPERACAO_EXPIRADA", textos.erros.OPERACAO_EXPIRADA, ["operacao_id"]);
  const posicao = persona.posicoes.find((p) => p.id === pendente.destino);
  if (!posicao) return erro("POSICAO_INEXISTENTE", textos.erros.POSICAO_INEXISTENTE, ["destino"]);
  const operacao = { id: pendente.id, valor_centavos: pendente.valor_centavos, destino: pendente.destino, data: HOJE };
  const novo = { ...estado, operacoes: [...estado.operacoes, operacao], hipoteses: [], operacao_pendente: null };
  return { ok: true, estado: novo, operacao, destino: destinoDaPosicao(posicao), hipoteses_descartadas: estado.hipoteses.map((h) => h.id), saldo_disponivel_hoje_centavos: saldoDisponivelHoje(persona, novo) };
}

/** Zera a pendente e não muda mais nada. */
export function cancelarMovimentacao(estado: EstadoSessao, operacao_id: string): ResultadoDominio<{ estado: EstadoSessao }> {
  void estado, operacao_id;
  throw new Error("não implementado");
}
