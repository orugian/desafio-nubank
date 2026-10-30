import {
  HOJE,
  LIMITES,
  NOMES_FERRAMENTAS,
  formatarReais,
  erro,
  textos,
  validarArgumentos,
  type AvisoTurno,
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
import { consultarCartao } from "@/dominio/cartao";
import { consultarHistorico } from "@/dominio/historico";
import { consultarInvestimentos, projetarRendimento } from "@/dominio/investimentos";
import { cancelarMovimentacao, confirmarMovimentacao, proporMovimentacao } from "@/dominio/operacoes";
import { montarVisao as montarVisaoDominio } from "@/visao";
import { buscarCotacao } from "@/mercado";
import { montarResultadoCotacao } from "@/dominio/investimentos/cotacao";
import { compararInvestimento } from "@/dominio/investimentos/comparativo";
import { simularInvestimento } from "@/dominio/investimentos/simulacao";
import { simularPixCredito } from "@/dominio/credito";
import { simularParcelamento } from "@/dominio/credito/parcelamento";
import { calcularExpressao } from "@/dominio/calculo";
import { estimarImpostoRenda } from "@/dominio/impostos";
import cdiJson from "../../../dados/mercado/cdi.json";
import btcJson from "../../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../../dados/mercado/fechamentos-PETR4.json";
import exComparacaoCr02 from "@/contratos/exemplos/cartao-comparacao-cr02.json";
import exRascunhoAtendimento from "@/contratos/exemplos/cartao-rascunho-atendimento.json";

const contextoPadrao: Contexto = {
  series: {
    cdi: cdiJson,
    fechamentos: {
      PETR4: petr4Json,
      BTC: btcJson,
    },
  },
  calendario: criarCalendario({ datas_cdi: cdiJson.serie.map((x) => x.data) }),
};

function calcularCenariosEstado(estado: EstadoSessao): ResultadoCenario[] {
  const rPersona = carregarPersona(estado.persona_id);
  if (rPersona.ok) {
    return calcularCenarios(rPersona.persona, estado, contextoPadrao);
  }
  const ex = exComparacaoCr02.dados as Extract<CartaoResposta, { tipo: "comparacao" }>;
  return ex.cenarios;
}

/** IN-04: strings monetárias geradas pelo código, por caminho do resultado.
 * Não altera números/cenários/cartões nem filtra a resposta do modelo (não é G-01).
 */
function valoresFormatados(valor: unknown, caminho = "", saida: Record<string, string> = {}): Record<string, string> {
  if (Array.isArray(valor)) {
    valor.forEach((item, i) => valoresFormatados(item, `${caminho}[${i}]`, saida));
  } else if (valor !== null && typeof valor === "object") {
    for (const [chave, item] of Object.entries(valor)) {
      const proximo = caminho ? `${caminho}.${chave}` : chave;
      if (chave.endsWith("_centavos") && typeof item === "number" && Number.isSafeInteger(item)) {
        saida[proximo] = formatarReais(item);
      } else {
        valoresFormatados(item, proximo, saida);
      }
    }
  }
  return saida;
}

export function criarExecutores(opcoes: { buscarCotacao?: typeof buscarCotacao } = {}): Executores {
  const buscarCotacaoInj = opcoes.buscarCotacao ?? buscarCotacao;
  const executores: Executores = {
    ferramentas: {
      async consultar_historico(args, ctx) {
        const v = validarArgumentos("consultar_historico", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;
        const r = consultarHistorico(rPersona.persona, v.argumentos);
        if (!r.ok) return r;
        const { ok: _, ...resultado } = r;
        void _;
        const cartao: CartaoResposta = { tipo: "historico", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async consultar_cartao(args, ctx) {
        const v = validarArgumentos("consultar_cartao", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;
        const cartaoVisao = consultarCartao(rPersona.persona, ctx.estado);
        if (!cartaoVisao) {
          return erro("OPERACAO_NAO_PERMITIDA", textos.erros.OPERACAO_NAO_PERMITIDA, ["cartao"]);
        }
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
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;
        const r = consultarInvestimentos(rPersona.persona, ctx.estado, contextoPadrao, {
          ate_data: v.argumentos.ate_data,
        });
        if (!r.ok) return r;
        const { ok: _, ...resultado } = r;
        void _;
        const cartao: CartaoResposta = { tipo: "investimentos", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async projetar_rendimento(args, ctx) {
        const v = validarArgumentos("projetar_rendimento", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        let cdiPct = v.argumentos.cdi_pct;
        let destinoInfo: { posicao_id: string; nome: string } | null = null;
        if (v.argumentos.destino !== undefined) {
          const pos = rPersona.persona.posicoes.find((p) => p.id === v.argumentos.destino);
          if (!pos) return erro("POSICAO_INEXISTENTE", textos.erros.POSICAO_INEXISTENTE, ["destino"]);
          if (!("cdi_pct" in pos)) {
            return erro("OPERACAO_NAO_PERMITIDA", textos.erros.OPERACAO_NAO_PERMITIDA, ["destino"]);
          }
          cdiPct = pos.cdi_pct;
          destinoInfo = { posicao_id: pos.id, nome: pos.nome };
        }
        if (cdiPct === undefined) {
          return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["cdi_pct"]);
        }

        const r = projetarRendimento(ctx.estado.mercado, contextoPadrao, {
          valor_centavos: paraCentavos(v.argumentos.valor),
          cdi_pct: cdiPct,
          ate_data: v.argumentos.ate_data,
        });
        if (!r.ok) return r;
        const { ok: _, ...semOk } = r;
        void _;
        const resultado = { ...semOk, destino: destinoInfo };
        const cartao: CartaoResposta = { tipo: "rendimento", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
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
            cenarios,
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
            cenarios, // O modelo precisa de linhas, faturas afetadas, avisos e ordem relevante.
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
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const r = proporMovimentacao(rPersona.persona, ctx.estado, v.argumentos, contextoPadrao);
        if (!r.ok) return r;

        let rendimento_estimado: Extract<CartaoResposta, { tipo: "operacao_pendente" }>["rendimento_estimado"] = null;
        if (r.destino.rende && r.destino.cdi_pct !== null) {
          const proxRecebimento = r.impacto.linhas.find(
            (l) => l.tipo === "entrada" && l.previsto && l.data >= HOJE,
          );
          if (proxRecebimento) {
            const rProj = projetarRendimento(ctx.estado.mercado, contextoPadrao, {
              valor_centavos: r.operacao_pendente.valor_centavos,
              cdi_pct: r.destino.cdi_pct,
              ate_data: proxRecebimento.data,
            });
            if (rProj.ok) {
              const { ok: _, ...semOk } = rProj;
              void _;
              rendimento_estimado = {
                ...semOk,
                destino: { posicao_id: r.destino.posicao_id, nome: r.destino.nome },
              };
            }
          }
        }

        const cartao: CartaoResposta = {
          tipo: "operacao_pendente",
          operacao_id: r.operacao_pendente.id,
          valor_centavos: r.operacao_pendente.valor_centavos,
          destino: r.destino,
          alerta: r.alerta,
          impacto: r.impacto,
          rendimento_estimado,
        };

        return {
          ok: true,
          estado: r.estado,
          resultado: {
            operacao_id: r.operacao_pendente.id,
            valor_centavos: r.operacao_pendente.valor_centavos,
            destino: r.destino,
            alerta: r.alerta,
            indicadores: r.impacto.indicadores,
            rendimento_estimado,
          },
          cartoes: [cartao],
          avisos: [],
        };
      },

      async confirmar_movimentacao(args, ctx) {
        const v = validarArgumentos("confirmar_movimentacao", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const pendente = ctx.estado.operacao_pendente;
        // O-03: a proposta recém-criada deve voltar à pessoa antes de executar.
        // A versão só avança ao fim do turno; a ação explícita da UI não é modelo.
        if (ctx.mensagem_id !== null && pendente?.id === v.argumentos.operacao_id &&
            pendente.criada_na_versao === ctx.estado.versao) {
          return erro("OPERACAO_NAO_PERMITIDA", "Aguarde uma confirmação humana em um novo turno ou pelo botão Confirmar.", ["operacao_id"]);
        }
        const r = confirmarMovimentacao(rPersona.persona, ctx.estado, v.argumentos.operacao_id);
        if (!r.ok) return r;

        const mensagem = textos.mensagem_operacao_simulada(r.operacao.valor_centavos, r.destino.nome);
        const cartaoConcluida: CartaoResposta = {
          tipo: "operacao_concluida",
          operacao_id: r.operacao.id,
          valor_centavos: r.operacao.valor_centavos,
          destino: r.destino,
          mensagem,
          hipoteses_descartadas: r.hipoteses_descartadas,
          saldo_disponivel_hoje_centavos: r.saldo_disponivel_hoje_centavos,
        };

        const cenarios = calcularCenarios(rPersona.persona, r.estado, contextoPadrao);
        const avisos =
          r.hipoteses_descartadas.length > 0
            ? [
                {
                  codigo: "HIPOTESES_DESCARTADAS",
                  mensagem: textos.aviso_hipoteses_descartadas(r.hipoteses_descartadas),
                },
              ]
            : [];

        return {
          ok: true,
          estado: r.estado,
          resultado: {
            operacao_id: r.operacao.id,
            mensagem,
            hipoteses_descartadas: r.hipoteses_descartadas,
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
        const r = cancelarMovimentacao(ctx.estado, operacao_id);
        if (!r.ok) return r;

        const rPersona = carregarPersona(ctx.estado.persona_id);
        const pos = rPersona.ok ? rPersona.persona.posicoes.find((p) => p.id === pend?.destino) : undefined;
        const nomeDestino = pos?.nome ?? pend?.destino ?? "";
        const mensagem = textos.mensagem_operacao_cancelada(pend?.valor_centavos ?? 0, nomeDestino);
        return {
          ok: true,
          estado: r.estado,
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

      async consultar_cotacao(args, ctx) {
        const v = validarArgumentos("consultar_cotacao", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const r = await buscarCotacaoInj(
          v.argumentos.ticker,
          { timeout_ms: LIMITES.timeout_mercado_ms },
          ctx.estado.mercado,
        );
        if (!r.ok) return r;

        const resultado = montarResultadoCotacao(
          rPersona.persona,
          ctx.estado,
          contextoPadrao,
          r.cotacao,
        );
        // F-07 é emitido uma única vez por processarTurno; o cartão já rotula "gravada".
        const avisos: AvisoTurno[] = [];
        const cartao: CartaoResposta = { tipo: "cotacao", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos,
        };
      },

      async comparar_investimento(args, ctx) {
        const v = validarArgumentos("comparar_investimento", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const r = compararInvestimento(rPersona.persona, ctx.estado, contextoPadrao, v.argumentos);
        if (!r.ok) return r;

        const { ok: _, ...resultado } = r;
        void _;
        const cartao: CartaoResposta = { tipo: "comparativo_investimento", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async simular_investimento(args, ctx) {
        const v = validarArgumentos("simular_investimento", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const valor_centavos = paraCentavos(v.argumentos.valor);
        const { valor: _valor, ...restoArgs } = v.argumentos;
        void _valor;
        const r = simularInvestimento(ctx.estado.mercado, contextoPadrao, {
          ...restoArgs,
          valor_centavos,
        });
        if (!r.ok) return r;

        const { ok: _, ...resultado } = r;
        void _;
        const cartao: CartaoResposta = { tipo: "simulacao_investimento", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async simular_pix_credito(args, ctx) {
        const v = validarArgumentos("simular_pix_credito", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const valor_centavos = paraCentavos(v.argumentos.valor);
        const r = simularPixCredito(rPersona.persona, ctx.estado, {
          valor_centavos,
          parcelas: v.argumentos.parcelas,
          juros_am_pct: v.argumentos.juros_am_pct,
        });
        if (!r.ok) return r;

        const { ok: _, ...resultado } = r;
        void _;
        const cartao: CartaoResposta = { tipo: "pix_credito", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async estimar_imposto_renda(args, ctx) {
        const v = validarArgumentos("estimar_imposto_renda", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const rendimento_mensal_centavos =
          v.argumentos.rendimento_mensal !== undefined
            ? paraCentavos(v.argumentos.rendimento_mensal)
            : undefined;

        const r = estimarImpostoRenda(rPersona.persona, ctx.estado, contextoPadrao, {
          escopo: v.argumentos.escopo,
          rendimento_mensal_centavos,
        });
        if (!r.ok) return r;

        const { ok: _, ...resultado } = r;
        void _;
        const cartao: CartaoResposta = { tipo: "imposto_renda", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async simular_parcelamento(args, ctx) {
        const v = validarArgumentos("simular_parcelamento", args);
        if (!v.ok) return v;
        const rPersona = carregarPersona(ctx.estado.persona_id);
        if (!rPersona.ok) return rPersona;

        const r = simularParcelamento(rPersona.persona, ctx.estado, {
          valor_centavos: paraCentavos(v.argumentos.valor),
          entrada_centavos: v.argumentos.entrada !== undefined ? paraCentavos(v.argumentos.entrada) : undefined,
          parcelas_max: v.argumentos.parcelas_max,
          opcoes_parcelas: v.argumentos.opcoes_parcelas,
          juros_am_pct: v.argumentos.juros_am_pct,
          desconto_a_vista_pct: v.argumentos.desconto_a_vista_pct,
        });
        if (!r.ok) return r;

        const { ok: _, ...resultado } = r;
        void _;
        const cartao: CartaoResposta = { tipo: "simulacao_parcelamento", resultado };
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [cartao],
          avisos: [],
        };
      },

      async calcular_valores(args, ctx) {
        const v = validarArgumentos("calcular_valores", args);
        if (!v.ok) return v;
        const r = calcularExpressao(v.argumentos.expressao);
        if (!r.ok) return r;
        const { ok: _, ...resultado } = r;
        void _;
        return {
          ok: true,
          estado: ctx.estado,
          resultado: resultado as unknown as Record<string, unknown>,
          cartoes: [],
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

    async montarVisao(estado: EstadoSessao): Promise<VisaoApp> {
      const rPersona = carregarPersona(estado.persona_id);
      if (!rPersona.ok) {
        const p1 = carregarPersona("p1");
        if (!p1.ok) throw new Error(p1.erro.mensagem);
        return montarVisaoDominio(p1.persona, estado, contextoPadrao);
      }
      return montarVisaoDominio(rPersona.persona, estado, contextoPadrao);
    },

    async compararCenarios(antes: EstadoSessao, depois: EstadoSessao): Promise<OQueMudou> {
      const cenariosAntes = calcularCenariosEstado(antes);
      const cenariosDepois = calcularCenariosEstado(depois);
      return compararCenariosDominio(
        { estado: antes, cenarios: cenariosAntes },
        { estado: depois, cenarios: cenariosDepois },
      );
    },
  };
  for (const nome of NOMES_FERRAMENTAS) {
    const executar = executores.ferramentas[nome];
    executores.ferramentas[nome] = async (argumentos, contexto) => {
      const r = await executar(argumentos, contexto);
      if (!r.ok) return r;
      return { ...r, resultado: { ...r.resultado, valores_formatados: valoresFormatados(r.resultado) } };
    };
  }
  return executores;
}
