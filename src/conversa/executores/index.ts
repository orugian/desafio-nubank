import {
  HOJE,
  erro,
  textos,
  validarArgumentos,
  type CartaoResposta,
  type Contexto,
  type EstadoSessao,
  type Executores,
  type OQueMudou,
  type ResultadoCenario,
  type VisaoApp,
} from "@/contratos";
import { carregarPersona } from "@/dados";
import { criarCalendario } from "@/dominio/calendario";
import {
  calcularCenarios,
  compararCenarios as compararCenariosDominio,
  criarHipotese,
  desfazer,
  paraCentavos,
  registrarDeclaracao,
  validarEstado as validarEstadoDominio,
} from "@/dominio/caixa";
import cdiJson from "../../../dados/mercado/cdi.json";
import btcJson from "../../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../../dados/mercado/fechamentos-PETR4.json";
import exCartaoCreditoP3 from "@/contratos/exemplos/cartao-cartao-credito-p3.json";
import exComparacaoCr02 from "@/contratos/exemplos/cartao-comparacao-cr02.json";
import exHistorico from "@/contratos/exemplos/cartao-historico.json";
import exInvestimentosCr06 from "@/contratos/exemplos/cartao-investimentos-cr06.json";
import exOperacaoConcluidaCr41 from "@/contratos/exemplos/cartao-operacao-concluida-cr41.json";
import exOperacaoPendenteCr40 from "@/contratos/exemplos/cartao-operacao-pendente-cr40.json";
import exRascunhoAtendimento from "@/contratos/exemplos/cartao-rascunho-atendimento.json";
import exRendimentoCr32 from "@/contratos/exemplos/cartao-rendimento-cr32.json";
import exVisaoP1 from "@/contratos/exemplos/visao-p1.json";
import exVisaoP2 from "@/contratos/exemplos/visao-p2.json";
import exVisaoP3 from "@/contratos/exemplos/visao-p3.json";

const contextoPadrao: Contexto = {
  series: {
    cdi: cdiJson,
    fechamentos: {
      PETR4: petr4Json,
      BTC: btcJson,
    },
  },
  calendario: criarCalendario(cdiJson),
};

function obterVisaoExemplo(estado: EstadoSessao): VisaoApp {
  const base =
    estado.persona_id === "p2"
      ? (exVisaoP2.dados as VisaoApp)
      : estado.persona_id === "p3"
        ? (exVisaoP3.dados as VisaoApp)
        : (exVisaoP1.dados as VisaoApp);

  const gastoHoje = estado.operacoes
    .filter((op) => op.data === HOJE)
    .reduce((acc, op) => acc + op.valor_centavos, 0);

  return {
    ...base,
    conta: {
      ...base.conta,
      saldo_disponivel_hoje_centavos: base.conta.saldo_inicio_hoje_centavos - gastoHoje,
      operacoes_hoje: estado.operacoes
        .filter((op) => op.data === HOJE)
        .map((op) => {
          const pos = base.posicoes.find((p) => p.id === op.destino);
          const destino_nome = pos?.nome ?? op.destino;
          return {
            id: op.id,
            valor_centavos: op.valor_centavos,
            destino: op.destino,
            destino_nome,
            descricao: textos.descricao_movimentacao(destino_nome),
          };
        }),
    },
    mercado: estado.mercado,
  };
}

function calcularCenariosEstado(estado: EstadoSessao): ResultadoCenario[] {
  const rPersona = carregarPersona(estado.persona_id);
  if (rPersona.ok) {
    return calcularCenarios(rPersona.persona, estado, contextoPadrao);
  }
  const ex = exComparacaoCr02.dados as Extract<CartaoResposta, { tipo: "comparacao" }>;
  return ex.cenarios;
}

export function criarExecutores(): Executores {
  return {
    ferramentas: {
      async consultar_historico(args, ctx) {
        const v = validarArgumentos("consultar_historico", args);
        if (!v.ok) return v;
        const cartao = structuredClone(exHistorico.dados) as Extract<
          CartaoResposta,
          { tipo: "historico" }
        >;
        return {
          ok: true,
          estado: ctx.estado,
          resultado: cartao.resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async consultar_cartao(args, ctx) {
        const v = validarArgumentos("consultar_cartao", args);
        if (!v.ok) return v;
        const visao = obterVisaoExemplo(ctx.estado);
        const cartaoVisao =
          visao.cartao ??
          (exCartaoCreditoP3.dados as Extract<CartaoResposta, { tipo: "cartao_credito" }>).cartao;
        const cartao: CartaoResposta = { tipo: "cartao_credito", cartao: cartaoVisao };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: { cartao: cartaoVisao },
          cartoes: [cartao],
          avisos: [],
        };
      },

      async consultar_investimentos(args, ctx) {
        const v = validarArgumentos("consultar_investimentos", args);
        if (!v.ok) return v;
        const cartao = structuredClone(exInvestimentosCr06.dados) as Extract<
          CartaoResposta,
          { tipo: "investimentos" }
        >;
        if (v.argumentos.ate_data) {
          cartao.resultado.ate_data = v.argumentos.ate_data;
          cartao.resultado.ate_data_origem = "informada";
        }
        cartao.resultado.mercado = ctx.estado.mercado;
        return {
          ok: true,
          estado: ctx.estado,
          resultado: cartao.resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async projetar_rendimento(args, ctx) {
        const v = validarArgumentos("projetar_rendimento", args);
        if (!v.ok) return v;
        if (v.argumentos.ate_data < HOJE) {
          return erro("DATA_ANTES_DE_HOJE", textos.erros.DATA_ANTES_DE_HOJE, ["ate_data"]);
        }
        if (v.argumentos.ate_data > "2026-11-29") {
          return erro("DATA_FORA_DA_JANELA", textos.erros.DATA_FORA_DA_JANELA, ["ate_data"]);
        }
        const cartao = structuredClone(exRendimentoCr32.dados) as Extract<
          CartaoResposta,
          { tipo: "rendimento" }
        >;
        cartao.resultado.valor_centavos = paraCentavos(v.argumentos.valor);
        cartao.resultado.ate_data = v.argumentos.ate_data;
        return {
          ok: true,
          estado: ctx.estado,
          resultado: cartao.resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async registrar_declaracao(args, ctx) {
        const v = validarArgumentos("registrar_declaracao", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const r = registrarDeclaracao(rPersona.persona, ctx.estado, v.argumentos.alteracao, {
          mensagem_id: ctx.mensagem_id,
        });
        if (!r.ok) return r;

        const novoEstado: EstadoSessao = { ...r.estado, operacao_pendente: null };
        const cenarios = calcularCenarios(rPersona.persona, novoEstado, contextoPadrao);
        const atual = cenarios[0]!;
        return {
          ok: true,
          estado: novoEstado,
          resultado: {
            declaracao_id: r.declaracao_id,
            indicadores: atual.indicadores,
          },
          cartoes: [{ tipo: "comparacao", cenarios }],
          avisos: [],
        };
      },

      async criar_hipotese(args, ctx) {
        const v = validarArgumentos("criar_hipotese", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const r = criarHipotese(rPersona.persona, ctx.estado, v.argumentos, {
          mensagem_id: ctx.mensagem_id,
        });
        if (!r.ok) return r;

        const cenarios = calcularCenarios(rPersona.persona, r.estado, contextoPadrao);
        const criado = cenarios.find((c) => c.cenario_id === r.hipotese_id) ?? cenarios.at(-1)!;
        return {
          ok: true,
          estado: r.estado,
          resultado: {
            hipotese_id: r.hipotese_id,
            indicadores: criado.indicadores,
          },
          cartoes: [{ tipo: "comparacao", cenarios }],
          avisos: [],
        };
      },

      async desfazer(args, ctx) {
        const v = validarArgumentos("desfazer", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const r = desfazer(rPersona.persona, ctx.estado, v.argumentos.alvo_id);
        if (!r.ok) return r;

        const cenarios = calcularCenarios(rPersona.persona, r.estado, contextoPadrao);
        return {
          ok: true,
          estado: r.estado,
          resultado: { removido: r.removido, cenarios: cenarios.map((c) => c.cenario_id) },
          cartoes: [{ tipo: "comparacao", cenarios }],
          avisos: [],
        };
      },

      async propor_movimentacao(args, ctx) {
        const v = validarArgumentos("propor_movimentacao", args);
        if (!v.ok) return v;
        const valor_centavos = paraCentavos(v.argumentos.valor);
        const visao = obterVisaoExemplo(ctx.estado);
        if (valor_centavos > visao.conta.saldo_disponivel_hoje_centavos) {
          return erro("SALDO_INSUFICIENTE_HOJE", textos.erros.SALDO_INSUFICIENTE_HOJE, ["valor"]);
        }
        const pos = visao.posicoes.find((p) => p.id === v.argumentos.destino);
        if (!pos) {
          return erro("POSICAO_INEXISTENTE", textos.erros.POSICAO_INEXISTENTE, ["destino"]);
        }

        const n = ctx.estado.contadores.OP + 1;
        const operacao_id = `OP${n}`;
        const novoEstado: EstadoSessao = {
          ...ctx.estado,
          operacao_pendente: {
            id: operacao_id,
            valor_centavos,
            destino: v.argumentos.destino,
            criada_na_versao: ctx.estado.versao + 1,
          },
          contadores: { ...ctx.estado.contadores, OP: n },
        };

        const modeloCartao = structuredClone(exOperacaoPendenteCr40.dados) as Extract<
          CartaoResposta,
          { tipo: "operacao_pendente" }
        >;
        const cartao: CartaoResposta = {
          ...modeloCartao,
          operacao_id,
          valor_centavos,
          destino: {
            posicao_id: pos.id,
            nome: pos.nome,
            rende: pos.cdi_pct !== null,
            cdi_pct: pos.cdi_pct,
          },
        };

        return {
          ok: true,
          estado: novoEstado,
          resultado: {
            operacao_id,
            valor_centavos,
            destino: cartao.destino,
            alerta: cartao.alerta,
            indicadores: cartao.impacto.indicadores,
          },
          cartoes: [cartao],
          avisos: [],
        };
      },

      async confirmar_movimentacao(args, ctx) {
        const v = validarArgumentos("confirmar_movimentacao", args);
        if (!v.ok) return v;
        const { operacao_id } = v.argumentos;
        if (ctx.estado.operacoes.some((op) => op.id === operacao_id)) {
          return erro("OPERACAO_JA_EXECUTADA", textos.erros.OPERACAO_JA_EXECUTADA, ["operacao_id"]);
        }
        const pend = ctx.estado.operacao_pendente;
        if (!pend || pend.id !== operacao_id) {
          return erro("OPERACAO_EXPIRADA", textos.erros.OPERACAO_EXPIRADA, ["operacao_id"]);
        }

        const visaoAntes = obterVisaoExemplo(ctx.estado);
        const pos = visaoAntes.posicoes.find((p) => p.id === pend.destino);
        const nomeDestino = pos?.nome ?? "Caixinha Viagem";
        const hipoteses_descartadas = ctx.estado.hipoteses.map((h) => h.id);

        const novoEstado: EstadoSessao = {
          ...ctx.estado,
          operacao_pendente: null,
          hipoteses: [],
          operacoes: [
            ...ctx.estado.operacoes,
            { id: pend.id, valor_centavos: pend.valor_centavos, destino: pend.destino, data: HOJE },
          ],
        };

        const visaoDepois = obterVisaoExemplo(novoEstado);
        const modeloConcluida = structuredClone(exOperacaoConcluidaCr41.dados) as Extract<
          CartaoResposta,
          { tipo: "operacao_concluida" }
        >;
        const cartaoConcluida: CartaoResposta = {
          ...modeloConcluida,
          operacao_id: pend.id,
          valor_centavos: pend.valor_centavos,
          destino: {
            posicao_id: pend.destino,
            nome: nomeDestino,
            rende: (pos?.cdi_pct ?? 100) !== null,
            cdi_pct: pos?.cdi_pct ?? 100,
          },
          mensagem: textos.mensagem_operacao_simulada(pend.valor_centavos, nomeDestino),
          hipoteses_descartadas,
          saldo_disponivel_hoje_centavos: visaoDepois.conta.saldo_disponivel_hoje_centavos,
        };

        const cenarios = calcularCenariosEstado(novoEstado);
        const avisos =
          hipoteses_descartadas.length > 0
            ? [
                {
                  codigo: "HIPOTESES_DESCARTADAS",
                  mensagem: textos.aviso_hipoteses_descartadas(hipoteses_descartadas),
                },
              ]
            : [];

        return {
          ok: true,
          estado: novoEstado,
          resultado: {
            operacao_id: pend.id,
            mensagem: cartaoConcluida.mensagem,
            hipoteses_descartadas,
          },
          cartoes: [cartaoConcluida, { tipo: "comparacao", cenarios }],
          avisos,
        };
      },

      async cancelar_movimentacao(args, ctx) {
        const v = validarArgumentos("cancelar_movimentacao", args);
        if (!v.ok) return v;
        const { operacao_id } = v.argumentos;
        if (ctx.estado.operacoes.some((op) => op.id === operacao_id)) {
          return erro("OPERACAO_JA_EXECUTADA", textos.erros.OPERACAO_JA_EXECUTADA, ["operacao_id"]);
        }
        const pend = ctx.estado.operacao_pendente;
        if (!pend || pend.id !== operacao_id) {
          return erro("OPERACAO_EXPIRADA", textos.erros.OPERACAO_EXPIRADA, ["operacao_id"]);
        }
        const visao = obterVisaoExemplo(ctx.estado);
        const pos = visao.posicoes.find((p) => p.id === pend.destino);
        const nomeDestino = pos?.nome ?? pend.destino;
        const mensagem = textos.mensagem_operacao_cancelada(pend.valor_centavos, nomeDestino);
        const novoEstado: EstadoSessao = { ...ctx.estado, operacao_pendente: null };
        return {
          ok: true,
          estado: novoEstado,
          resultado: { operacao_id, cancelada: true, mensagem },
          cartoes: [],
          avisos: [],
        };
      },

      async exibir_comparacao(args, ctx) {
        const v = validarArgumentos("exibir_comparacao", args);
        if (!v.ok) return v;
        const cenarios = calcularCenariosEstado(ctx.estado);
        return {
          ok: true,
          estado: ctx.estado,
          resultado: { cenarios: cenarios.map((c) => c.cenario_id) },
          cartoes: [{ tipo: "comparacao", cenarios }],
          avisos: [],
        };
      },

      async preparar_resumo_atendimento(args, ctx) {
        const v = validarArgumentos("preparar_resumo_atendimento", args);
        if (!v.ok) return v;
        const modelo = structuredClone(exRascunhoAtendimento.dados) as Extract<
          CartaoResposta,
          { tipo: "rascunho_atendimento" }
        >;
        const cartao: CartaoResposta = {
          ...modelo,
          motivo: v.argumentos.motivo,
        };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: { motivo: cartao.motivo, texto: cartao.texto, enviado: false },
          cartoes: [cartao],
          avisos: [],
        };
      },
    },

    async validarEstado(estado: EstadoSessao) {
      const rPersona = carregarPersona(estado.persona_id);
      if (!rPersona.ok) {
        return erro("ESTADO_INVALIDO", textos.erros.ESTADO_INVALIDO, ["persona_id"]);
      }
      return validarEstadoDominio(rPersona.persona, estado, contextoPadrao);
    },

    async montarVisao(estado: EstadoSessao) {
      return obterVisaoExemplo(estado);
    },

    async compararCenarios(antes: EstadoSessao, depois: EstadoSessao): Promise<OQueMudou> {
      const rPersona = carregarPersona(depois.persona_id);
      const cenariosAntes = calcularCenariosEstado(antes);
      const cenariosDepois = calcularCenariosEstado(depois);
      const eventosBase = rPersona.ok
        ? Object.fromEntries([
            ...rPersona.persona.compromissos.map((c) => [
              c.id,
              { descricao: c.descricao, data: c.data, valor_centavos: c.valor_centavos },
            ]),
            ...(rPersona.persona.cartao?.faturas.map((f) => [
              f.id,
              { descricao: "Fatura do cartão", data: f.vencimento, valor_centavos: f.valor_centavos },
            ]) ?? []),
          ])
        : {};
      return compararCenariosDominio(
        { estado: antes, cenarios: cenariosAntes, eventos_base: eventosBase },
        { estado: depois, cenarios: cenariosDepois, eventos_base: eventosBase },
      );
    },
  };
}
