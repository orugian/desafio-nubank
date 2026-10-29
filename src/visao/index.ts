// VisaoApp (spec §6.5). Implementação no B7.

import {
  HOJE,
  esquemaVisaoApp,
  textos,
  type Contexto,
  type EstadoSessao,
  type Persona,
  type VisaoApp,
} from "@/contratos";
import { calcularCenarios, saldoDisponivelHoje } from "@/dominio/caixa";
import { consultarCartao } from "@/dominio/cartao";
import { consultarInvestimentos } from "@/dominio/investimentos";

export function montarVisao(persona: Persona, estado: EstadoSessao, contexto: Contexto): VisaoApp {
  const marca = process.env.NEXT_PUBLIC_MARCA === "nubank" ? "nubank" : "neutra";
  const saldoDisponivel = saldoDisponivelHoje(persona, estado);

  const operacoesHoje = estado.operacoes
    .filter((op) => op.data === HOJE)
    .map((op) => {
      const pos = persona.posicoes.find((p) => p.id === op.destino);
      const destino_nome = pos?.nome ?? op.destino;
      return {
        id: op.id,
        valor_centavos: op.valor_centavos,
        destino: op.destino,
        destino_nome,
        descricao: textos.descricao_movimentacao(destino_nome),
      };
    });

  const extratoOperacoes: VisaoApp["extrato"] = [...operacoesHoje]
    .reverse()
    .map((op) => ({
      id: op.id,
      data: HOJE,
      descricao: op.descricao,
      tipo: "saida",
      meio: "movimentacao_interna",
      categoria: "investimentos",
      valor_centavos: op.valor_centavos,
      simulado: true,
    }));

  const extratoHistorico: VisaoApp["extrato"] = persona.historico
    .filter((l) => l.meio !== "cartao_credito")
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
    .map((l) => ({
      id: l.id,
      data: l.data,
      descricao: l.descricao,
      tipo: l.tipo,
      meio: l.meio,
      categoria: l.categoria,
      valor_centavos: l.valor_centavos,
      simulado: false,
    }));

  const [cenarioAtual] = calcularCenarios(persona, estado, contexto);
  const proximosPagamentos: VisaoApp["proximos_pagamentos"] = (cenarioAtual?.linhas ?? [])
    .filter((l) => l.origem === "dados_base" || l.origem === "declaracao")
    .map((l) => ({
      evento_id: l.evento_id,
      data: l.data,
      descricao: l.descricao,
      tipo: l.tipo,
      meio: l.meio,
      valor_centavos: l.valor_centavos,
      previsto: l.previsto,
      estimativa_texto: l.estimativa?.texto ?? null,
      origem: l.origem === "declaracao" ? "declaracao" : "dados_base",
    }));

  const cartao = consultarCartao(persona, estado);
  const rInv = consultarInvestimentos(persona, estado, contexto, {});
  const posicoes: VisaoApp["posicoes"] = rInv.ok
    ? rInv.posicoes.map((pos) => ({
        id: pos.posicao_id,
        nome: pos.nome,
        categoria: pos.categoria,
        cdi_pct: pos.cdi_pct,
        ticker: pos.ticker,
        quantidade: pos.quantidade,
        valor_atual_centavos: pos.valor_atual_centavos,
        aplicado_centavos: pos.aplicado_centavos,
        resultado_centavos: pos.resultado_centavos,
        rentabilidade_pct: pos.rentabilidade_pct,
        valorizacao_periodo_pct: pos.valorizacao_periodo_pct,
        data_disponibilidade: pos.data_disponibilidade,
        protecao: pos.protecao,
        restricao: pos.restricao,
        estimado: pos.estimado,
        fonte: pos.fonte,
      }))
    : [];

  return esquemaVisaoApp.parse({
    marca,
    prototipo: true,
    persona: { id: persona.id, nome: persona.nome },
    conta: {
      saldo_disponivel_hoje_centavos: saldoDisponivel,
      saldo_inicio_hoje_centavos: persona.conta.saldo_inicio_hoje_centavos,
      operacoes_hoje: operacoesHoje,
    },
    extrato: [...extratoOperacoes, ...extratoHistorico],
    proximos_pagamentos: proximosPagamentos,
    cartao,
    posicoes,
    mercado: estado.mercado,
  });
}
