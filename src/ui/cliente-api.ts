import {
  HOJE,
  estadoInicial,
  textos,
  type CartaoResposta,
  type Config,
  type EstadoSessao,
  type RequisicaoAcao,
  type RequisicaoSessao,
  type RequisicaoTurno,
  type RespostaAcao,
  type RespostaFalha,
  type RespostaSessao,
  type RespostaTurno,
  type ResumoPersona,
  type VisaoApp,
} from "@/contratos";
import exAcaoCr41 from "@/contratos/exemplos/api-acao-confirmar-cr41.json";
import exPersonas from "@/contratos/exemplos/api-personas.json";
import exSessaoP1 from "@/contratos/exemplos/api-sessao-p1.json";
import exTurnoCv01 from "@/contratos/exemplos/api-turno-cv01.json";
import exCartaoComparacaoCr02 from "@/contratos/exemplos/cartao-comparacao-cr02.json";
import exCartaoInvestimentosCr06 from "@/contratos/exemplos/cartao-investimentos-cr06.json";
import exCartaoOQueMudouCr04 from "@/contratos/exemplos/cartao-o-que-mudou-cr04.json";
import exCartaoOperacaoPendenteCr40 from "@/contratos/exemplos/cartao-operacao-pendente-cr40.json";
import exFalhaDominioCr42 from "@/contratos/exemplos/falha-dominio-cr42.json";
import exFalhaF01 from "@/contratos/exemplos/falha-f01.json";
import exVisaoP1 from "@/contratos/exemplos/visao-p1.json";
import exVisaoP2 from "@/contratos/exemplos/visao-p2.json";
import exVisaoP3 from "@/contratos/exemplos/visao-p3.json";

export interface ClienteApi {
  listarPersonas(): Promise<ResumoPersona[]>;
  criarSessao(req: RequisicaoSessao): Promise<RespostaSessao | RespostaFalha>;
  enviarTurno(req: RequisicaoTurno): Promise<RespostaTurno>;
  enviarAcao(req: RequisicaoAcao): Promise<RespostaAcao>;
}

function obterVisaoExemploPorEstado(estado: EstadoSessao): VisaoApp {
  const base =
    estado.persona_id === "p2"
      ? (structuredClone(exVisaoP2.dados) as VisaoApp)
      : estado.persona_id === "p3"
        ? (structuredClone(exVisaoP3.dados) as VisaoApp)
        : (structuredClone(exVisaoP1.dados) as VisaoApp);

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
    posicoes: base.posicoes.map((p) => {
      const somaOp = estado.operacoes
        .filter((op) => op.destino === p.id)
        .reduce((acc, op) => acc + op.valor_centavos, 0);
      if (somaOp === 0) return p;
      return {
        ...p,
        valor_atual_centavos: p.valor_atual_centavos + somaOp,
        aplicado_centavos: p.aplicado_centavos + somaOp,
      };
    }),
    mercado: estado.mercado,
  };
}

export function criarClienteExemplos(): ClienteApi {
  return {
    async listarPersonas(): Promise<ResumoPersona[]> {
      return structuredClone(exPersonas.dados) as ResumoPersona[];
    },

    async criarSessao(req: RequisicaoSessao): Promise<RespostaSessao | RespostaFalha> {
      const base = structuredClone(exSessaoP1.dados) as RespostaSessao;
      const estado = estadoInicial(req.persona_id, base.estado.mercado);
      const visao = obterVisaoExemploPorEstado(estado);
      const config: Config = {
        ...base.config,
        fontes_mercado: base.config.fontes_mercado.map((f) =>
          f.nome === "brapi" ? { ...f, url: "https://brapi.dev/api/quote/PETR4" } : f,
        ),
      };
      return {
        status: "ok",
        estado,
        visao,
        config,
      };
    },

    async enviarTurno(req: RequisicaoTurno): Promise<RespostaTurno> {
      const estadoEntrada = structuredClone(req.estado);
      const txt = req.mensagem.texto.toLowerCase();

      if (txt.includes("falha f-01") || txt.includes("simular timeout")) {
        const f = structuredClone(exFalhaF01.dados) as RespostaFalha;
        return { ...f, estado: estadoEntrada };
      }

      const novaVersao = estadoEntrada.versao + 1;

      if (txt.includes("guarda") || txt.includes("coloca")) {
        const cartaoPend = structuredClone(exCartaoOperacaoPendenteCr40.dados) as CartaoResposta;
        const cartoes: CartaoResposta[] = [cartaoPend];
        const textoAssistente =
          "Antes de confirmar: com essa movimentação simulada, faltariam R$ 200,00 em 15/11. Confirma?";
        const rastro = [
          {
            chamada: 1,
            ferramenta: "propor_movimentacao",
            argumentos: { valor: "500", destino: "INV9" },
            resultado: { ok: true, operacao_id: "OP1", valor_centavos: 50000 },
            duracao_ms: 4,
          },
        ];
        const novoEstado: EstadoSessao = {
          ...estadoEntrada,
          versao: novaVersao,
          operacao_pendente: {
            id: "OP1",
            valor_centavos: 50000,
            destino: "INV9",
            criada_na_versao: novaVersao,
          },
          contadores: { ...estadoEntrada.contadores, OP: estadoEntrada.contadores.OP + 1 },
          conversa: [
            ...estadoEntrada.conversa,
            {
              mensagem_id: req.mensagem.id,
              papel: "usuario",
              texto: req.mensagem.texto,
              versao: novaVersao,
              cartoes: [],
              rastro: [],
            },
            {
              mensagem_id: `${req.mensagem.id}-r`,
              papel: "assistente",
              texto: textoAssistente,
              versao: novaVersao,
              cartoes,
              rastro,
            },
          ],
        };
        return {
          status: "ok",
          estado: novoEstado,
          texto: textoAssistente,
          cartoes,
          avisos: [],
          rastro,
          visao: obterVisaoExemploPorEstado(novoEstado),
        };
      }

      if (txt.includes("na verdade") || txt.includes("150")) {
        const cartaoDiff = structuredClone(exCartaoOQueMudouCr04.dados) as CartaoResposta;
        const cartaoComp = structuredClone(exCartaoComparacaoCr02.dados) as CartaoResposta;
        const cartoes: CartaoResposta[] = [cartaoDiff, cartaoComp];
        const textoAssistente =
          "Atualizei as contas da casa (C) em 15/11 de R$ 200,00 para R$ 150,00. O menor saldo na situação atual sobe para R$ 350,00.";
        const rastro = [
          {
            chamada: 1,
            ferramenta: "registrar_declaracao",
            argumentos: { alteracao: { operacao: "alterar_evento", evento_id: "C", valor: "150" } },
            resultado: { ok: true, declaracao_id: "D1" },
            duracao_ms: 4,
          },
        ];
        const novoEstado: EstadoSessao = {
          ...estadoEntrada,
          versao: novaVersao,
          declaracoes: [
            ...estadoEntrada.declaracoes,
            {
              id: "D1",
              mensagem_id: req.mensagem.id,
              alteracao: { operacao: "alterar_evento", evento_id: "C", valor: "150" },
            },
          ],
          contadores: { ...estadoEntrada.contadores, D: estadoEntrada.contadores.D + 1 },
          conversa: [
            ...estadoEntrada.conversa,
            {
              mensagem_id: req.mensagem.id,
              papel: "usuario",
              texto: req.mensagem.texto,
              versao: novaVersao,
              cartoes: [],
              rastro: [],
            },
            {
              mensagem_id: `${req.mensagem.id}-r`,
              papel: "assistente",
              texto: textoAssistente,
              versao: novaVersao,
              cartoes,
              rastro,
            },
          ],
        };
        return {
          status: "ok",
          estado: novoEstado,
          texto: textoAssistente,
          cartoes,
          avisos: [],
          rastro,
          visao: obterVisaoExemploPorEstado(novoEstado),
        };
      }

      if (txt.includes("investimento") || txt.includes("aplicado") || txt.includes("recursos")) {
        const cartaoInv = structuredClone(exCartaoInvestimentosCr06.dados) as CartaoResposta;
        const cartoes: CartaoResposta[] = [cartaoInv];
        const textoAssistente =
          "Até 15/11, você tem R$ 1.830,00 em investimentos. A Caixinha Reserva (R$ 1.000,00) é protegida.";
        const rastro = [
          {
            chamada: 1,
            ferramenta: "consultar_investimentos",
            argumentos: {},
            resultado: { ok: true, ate_data: "2026-11-15" },
            duracao_ms: 4,
          },
        ];
        const novoEstado: EstadoSessao = {
          ...estadoEntrada,
          versao: novaVersao,
          conversa: [
            ...estadoEntrada.conversa,
            {
              mensagem_id: req.mensagem.id,
              papel: "usuario",
              texto: req.mensagem.texto,
              versao: novaVersao,
              cartoes: [],
              rastro: [],
            },
            {
              mensagem_id: `${req.mensagem.id}-r`,
              papel: "assistente",
              texto: textoAssistente,
              versao: novaVersao,
              cartoes,
              rastro,
            },
          ],
        };
        return {
          status: "ok",
          estado: novoEstado,
          texto: textoAssistente,
          cartoes,
          avisos: [],
          rastro,
          visao: obterVisaoExemploPorEstado(novoEstado),
        };
      }

      const baseCv01 = structuredClone(exTurnoCv01.dados) as Extract<
        RespostaTurno,
        { status: "ok" }
      >;
      const cartoes = baseCv01.cartoes;
      const rastro = baseCv01.rastro;
      const textoAssistente = baseCv01.texto;
      const novoEstado: EstadoSessao = {
        ...estadoEntrada,
        versao: novaVersao,
        hipoteses: baseCv01.estado.hipoteses,
        contadores: { ...estadoEntrada.contadores, H: estadoEntrada.contadores.H + 1 },
        conversa: [
          ...estadoEntrada.conversa,
          {
            mensagem_id: req.mensagem.id,
            papel: "usuario",
            texto: req.mensagem.texto,
            versao: novaVersao,
            cartoes: [],
            rastro: [],
          },
          {
            mensagem_id: `${req.mensagem.id}-r`,
            papel: "assistente",
            texto: textoAssistente,
            versao: novaVersao,
            cartoes,
            rastro,
          },
        ],
      };

      return {
        status: "ok",
        estado: novoEstado,
        texto: textoAssistente,
        cartoes,
        avisos: [],
        rastro,
        visao: obterVisaoExemploPorEstado(novoEstado),
      };
    },

    async enviarAcao(req: RequisicaoAcao): Promise<RespostaAcao> {
      const estadoEntrada = structuredClone(req.estado);
      const { operacao_id, tipo } = req.acao;

      if (estadoEntrada.operacoes.some((op) => op.id === operacao_id)) {
        const f = structuredClone(exFalhaDominioCr42.dados) as RespostaFalha;
        return { ...f, estado: estadoEntrada };
      }

      const pend = estadoEntrada.operacao_pendente;
      if (!pend || pend.id !== operacao_id) {
        return {
          status: "falha",
          falha: {
            tipo: "dominio",
            codigo: "OPERACAO_EXPIRADA",
            mensagem: textos.erros.OPERACAO_EXPIRADA,
            pode_tentar_novamente: false,
          },
          estado: estadoEntrada,
        };
      }

      const novaVersao = estadoEntrada.versao + 1;
      if (tipo === "cancelar") {
        const textoCancel = textos.mensagem_operacao_cancelada(
          pend.valor_centavos,
          "Caixinha Viagem",
        );
        const novoEstado: EstadoSessao = {
          ...estadoEntrada,
          versao: novaVersao,
          operacao_pendente: null,
          conversa: [
            ...estadoEntrada.conversa,
            {
              mensagem_id: `acao-${operacao_id}-cancelar`,
              papel: "sistema",
              texto: textoCancel,
              versao: novaVersao,
              cartoes: [],
              rastro: [],
            },
          ],
        };
        return {
          status: "ok",
          estado: novoEstado,
          texto: textoCancel,
          cartoes: [],
          avisos: [],
          rastro: [],
          visao: obterVisaoExemploPorEstado(novoEstado),
        };
      }

      const baseCr41 = structuredClone(exAcaoCr41.dados) as Extract<
        RespostaAcao,
        { status: "ok" }
      >;
      const descartadas = estadoEntrada.hipoteses.map((h) => h.id);
      const textoConf = textos.mensagem_operacao_simulada(pend.valor_centavos, "Caixinha Viagem");
      const novoEstado: EstadoSessao = {
        ...estadoEntrada,
        versao: novaVersao,
        operacao_pendente: null,
        hipoteses: [],
        operacoes: [
          ...estadoEntrada.operacoes,
          { id: pend.id, valor_centavos: pend.valor_centavos, destino: pend.destino, data: HOJE },
        ],
        conversa: [
          ...estadoEntrada.conversa,
          {
            mensagem_id: `acao-${operacao_id}-confirmar`,
            papel: "sistema",
            texto: textoConf,
            versao: novaVersao,
            cartoes: [],
            rastro: [],
          },
        ],
      };

      const avisos =
        descartadas.length > 0
          ? [
              {
                codigo: "HIPOTESES_DESCARTADAS",
                mensagem: textos.aviso_hipoteses_descartadas(descartadas),
              },
            ]
          : [];

      return {
        status: "ok",
        estado: novoEstado,
        texto: textoConf,
        cartoes: baseCr41.cartoes,
        avisos,
        rastro: [],
        visao: obterVisaoExemploPorEstado(novoEstado),
      };
    },
  };
}

export function criarClienteHttp(): ClienteApi {
  return {
    async listarPersonas(): Promise<ResumoPersona[]> {
      const res = await fetch("/api/personas");
      return res.json();
    },

    async criarSessao(req: RequisicaoSessao): Promise<RespostaSessao | RespostaFalha> {
      const res = await fetch("/api/sessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      return res.json();
    },

    async enviarTurno(req: RequisicaoTurno): Promise<RespostaTurno> {
      const res = await fetch("/api/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      return res.json();
    },

    async enviarAcao(req: RequisicaoAcao): Promise<RespostaAcao> {
      const res = await fetch("/api/acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      return res.json();
    },
  };
}

export function obterClientePadrao(): ClienteApi {
  if (process.env.NEXT_PUBLIC_API_EXEMPLOS === "1") {
    return criarClienteExemplos();
  }
  return criarClienteHttp();
}
