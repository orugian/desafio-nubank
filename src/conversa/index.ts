// Conversa (spec §6.1, §6.7, §8, §10).

import {
  CODIGOS_FALHA_TECNICA,
  FIM_JANELA,
  HOJE,
  LIMITES,
  definicoesFerramentas,
  ehNomeFerramenta,
  textos,
  type AvisoTurno,
  type CartaoResposta,
  type Contexto,
  type DepsConversa,
  type EstadoSessao,
  type ItemRastro,
  type MensagemProvedor,
  type RequisicaoAcao,
  type RequisicaoTurno,
  type RespostaAcao,
  type RespostaFalha,
  type RespostaTurno,
  type TipoFalha,
} from "@/contratos";
import { carregarPersona } from "@/dados";
import { criarCalendario } from "@/dominio/calendario";
import { calcularCenarios } from "@/dominio/caixa";
import cdiJson from "../../dados/mercado/cdi.json";
import btcJson from "../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../dados/mercado/fechamentos-PETR4.json";

const contextoDominio: Contexto = {
  series: {
    cdi: cdiJson,
    fechamentos: {
      PETR4: petr4Json,
      BTC: btcJson,
    },
  },
  calendario: criarCalendario({ datas_cdi: cdiJson.serie.map((x) => x.data) }),
};

const REGEX_CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/;
const REGEX_CARTAO = /\b(?:\d{4}[ -]?){3}\d{4}\b/;
const REGEX_EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]{2,}\b/;
const REGEX_TELEFONE = /(?:\+?55\s*)?(?:\(\d{2}\)\s*|\b\d{2}\s+)9?\d{4}[-.\s]?\d{4}\b/;

export function contemDadosPessoais(texto: string): boolean {
  return (
    REGEX_CPF.test(texto) ||
    REGEX_CARTAO.test(texto) ||
    REGEX_EMAIL.test(texto) ||
    REGEX_TELEFONE.test(texto)
  );
}

export function montarContextoDeterministico(
  estado: EstadoSessao,
  tela_atual?: string,
): Record<string, unknown> {
  const rPersona = carregarPersona(estado.persona_id);
  if (!rPersona.ok) {
    return {
      hoje: HOJE,
      janela: { de: HOJE, ate: FIM_JANELA },
      persona_id: estado.persona_id,
      declaracoes: estado.declaracoes,
      hipoteses: estado.hipoteses,
      operacoes: estado.operacoes,
      operacao_pendente: estado.operacao_pendente,
      ...(tela_atual ? { tela_atual } : {}),
    };
  }

  const persona = rPersona.persona;
  const cenarios = calcularCenarios(persona, estado, contextoDominio);
  const cenarioAtual = cenarios[0];
  const gastoHoje = estado.operacoes
    .filter((op) => op.data === HOJE)
    .reduce((acc, op) => acc + op.valor_centavos, 0);

  return {
    hoje: HOJE,
    janela: { de: HOJE, ate: FIM_JANELA },
    ...(tela_atual ? { tela_atual } : {}),
    persona: { id: persona.id, nome: persona.nome },
    conta: {
      saldo_inicio_hoje_centavos: persona.conta.saldo_inicio_hoje_centavos,
      saldo_disponivel_hoje_centavos: persona.conta.saldo_inicio_hoje_centavos - gastoHoje,
    },
    gasto_diario_centavos: persona.gasto_diario.valor_centavos,
    compromissos: (cenarioAtual?.linhas ?? []).map((l) => ({
      id: l.evento_id,
      evento_id: l.evento_id,
      data: l.data,
      descricao: l.descricao,
      tipo: l.tipo,
      meio: l.meio,
      valor_centavos: l.valor_centavos,
      origem: l.origem,
      previsto: l.previsto,
      estimativa: l.estimativa,
    })),
    posicoes: persona.posicoes.map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      cdi_pct: "cdi_pct" in p ? p.cdi_pct : null,
      liquidez: p.liquidez,
      protecao: p.protecao,
    })),
    declaracoes: estado.declaracoes,
    hipoteses: estado.hipoteses,
    operacoes: estado.operacoes,
    operacao_pendente: estado.operacao_pendente,
    cenarios: cenarios.map((c) => ({
      cenario_id: c.cenario_id,
      nome: c.nome,
      status: c.status,
      indicadores: c.indicadores,
      datas_ordem_relevante: c.datas_ordem_relevante,
      avisos: c.avisos,
    })),
  };
}

function respostaFalhaTecnica(
  tipo: Exclude<TipoFalha, "dominio">,
  estado: EstadoSessao,
  opcoes?: { espera_segundos?: number; provedor?: string; pode_tentar_novamente?: boolean },
): RespostaFalha {
  const codigo = CODIGOS_FALHA_TECNICA[tipo];
  const mensagem =
    tipo === "F-02"
      ? `${textos.falhas["F-02"]} ${textos.falha_f02_espera(opcoes?.espera_segundos, opcoes?.provedor ?? "")}`
      : textos.falhas[tipo];
  return {
    status: "falha",
    falha: {
      tipo,
      codigo,
      mensagem,
      pode_tentar_novamente: opcoes?.pode_tentar_novamente ?? tipo !== "F-06",
      ...(opcoes?.espera_segundos !== undefined
        ? { espera_segundos: opcoes.espera_segundos }
        : {}),
    },
    estado,
  };
}

function mesclarCartoes(atuais: CartaoResposta[], novos: CartaoResposta[]): CartaoResposta[] {
  const resultado = [...atuais];
  for (const novo of novos) {
    if (novo.tipo === "comparacao") {
      const idx = resultado.findIndex((c) => c.tipo === "comparacao");
      if (idx >= 0) {
        resultado[idx] = novo;
        continue;
      }
    }
    resultado.push(novo);
  }
  return resultado;
}

const FERRAMENTAS_DE_MERCADO = new Set([
  "consultar_investimentos",
  "projetar_rendimento",
  "propor_movimentacao",
]);

export async function processarTurno(
  req: RequisicaoTurno,
  deps: DepsConversa,
): Promise<RespostaTurno> {
  const estadoEntrada = structuredClone(req.estado);

  if (contemDadosPessoais(req.mensagem.texto)) {
    return {
      status: "falha",
      falha: {
        tipo: "dominio",
        codigo: "DADOS_PESSOAIS_RECUSADOS",
        mensagem:
          "Não envie CPF, número de cartão, e-mail ou telefone. Este é um protótipo com dados fictícios.",
        pode_tentar_novamente: false,
      },
      estado: estadoEntrada,
    };
  }

  const validacaoEstado = await deps.executores.validarEstado(estadoEntrada);
  if (!validacaoEstado.ok) {
    return respostaFalhaTecnica("F-06", estadoEntrada, { pode_tentar_novamente: false });
  }

  if (estadoEntrada.conversa.some((m) => m.mensagem_id === req.mensagem.id)) {
    return {
      status: "falha",
      falha: {
        tipo: "dominio",
        codigo: "MENSAGEM_JA_PROCESSADA",
        mensagem: textos.erros.MENSAGEM_JA_PROCESSADA,
        pode_tentar_novamente: false,
      },
      estado: estadoEntrada,
    };
  }

  let estadoTrabalho = structuredClone(req.estado);

  const textoInstrucoes = await deps.instrucoes();
  const contextoDet = montarContextoDeterministico(estadoTrabalho, req.tela_atual);
  const conteudoSistema = `${textoInstrucoes}\n\nContexto determinístico da persona:\n${JSON.stringify(contextoDet)}`;

  const historicoConversa = estadoEntrada.conversa.slice(-LIMITES.mensagens_no_contexto);

  const mensagens: MensagemProvedor[] = [
    { papel: "sistema", conteudo: conteudoSistema },
    ...historicoConversa.map(
      (m): MensagemProvedor => ({
        papel: m.papel === "usuario" ? "usuario" : "assistente",
        conteudo: m.texto,
      }),
    ),
    { papel: "usuario", conteudo: req.mensagem.texto },
  ];

  const ferramentas = definicoesFerramentas();
  const rastro: ItemRastro[] = [];
  let cartoes: CartaoResposta[] = [];
  const avisos: AvisoTurno[] = [];

  for (let chamada = 1; chamada <= LIMITES.chamadas_modelo_por_turno; chamada++) {
    const resp = await deps.provedor.gerar(mensagens, ferramentas, {
      timeout_ms: LIMITES.timeout_chamada_ms,
    });

    if (resp.tipo === "falha") {
      if (resp.falha === "timeout") {
        return respostaFalhaTecnica("F-01", estadoEntrada);
      }
      if (resp.falha === "cota") {
        return respostaFalhaTecnica("F-02", estadoEntrada, {
          espera_segundos: resp.espera_segundos,
          provedor: deps.provedor.nome,
        });
      }
      if (resp.falha === "indisponivel") {
        return respostaFalhaTecnica("F-03", estadoEntrada);
      }
      return respostaFalhaTecnica("F-04", estadoEntrada);
    }

    if (resp.tipo === "texto") {
      if (!resp.texto.trim()) {
        return respostaFalhaTecnica("F-04", estadoEntrada);
      }
      const mudouDeclaracoes =
        estadoTrabalho.declaracoes.length !== estadoEntrada.declaracoes.length;
      if (mudouDeclaracoes && !cartoes.some((c) => c.tipo === "o_que_mudou")) {
        const diff = await deps.executores.compararCenarios(estadoEntrada, estadoTrabalho);
        if (diff.alteracoes.length > 0) {
          cartoes = [{ tipo: "o_que_mudou", ...diff }, ...cartoes];
        }
      }

      const novaVersao = estadoEntrada.versao + 1;
      const estadoFinal: EstadoSessao = {
        ...estadoTrabalho,
        versao: novaVersao,
        conversa: [
          ...estadoTrabalho.conversa,
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
            texto: resp.texto,
            versao: novaVersao,
            cartoes,
            rastro,
          },
        ],
      };

      const visao = await deps.executores.montarVisao(estadoFinal);
      return {
        status: "ok",
        estado: estadoFinal,
        texto: resp.texto,
        cartoes,
        avisos,
        rastro,
        visao,
      };
    }

    if (resp.tipo === "chamadas") {
      if (chamada === LIMITES.chamadas_modelo_por_turno) {
        return respostaFalhaTecnica("F-05", estadoEntrada);
      }

      mensagens.push({
        papel: "assistente",
        conteudo: resp.texto ?? "",
        chamadas: resp.chamadas,
      });

      for (const tc of resp.chamadas.slice(0, LIMITES.ferramentas_por_resposta)) {
        if (!ehNomeFerramenta(tc.nome)) {
          return respostaFalhaTecnica("F-04", estadoEntrada);
        }

        if (FERRAMENTAS_DE_MERCADO.has(tc.nome) && !estadoTrabalho.mercado.tentou_ao_vivo) {
          const snap = await deps.mercado.buscarAoVivo({
            timeout_ms: LIMITES.timeout_mercado_ms,
          });
          estadoTrabalho = { ...estadoTrabalho, mercado: snap };
          if (!snap.ao_vivo && snap.tentou_ao_vivo) {
            const primeiroPreco = Object.values(snap.precos)[0];
            const dataHoraRef = primeiroPreco?.data_hora ?? snap.obtido_em;
            avisos.push({
              codigo: "F-07",
              mensagem: textos.aviso_f07(dataHoraRef),
            });
          }
        }

        const inicio = Date.now();
        let argsParsed: unknown = {};
        try {
          argsParsed = tc.argumentos.trim() ? JSON.parse(tc.argumentos) : {};
        } catch {
          argsParsed = tc.argumentos;
        }

        const exec = deps.executores.ferramentas[tc.nome];
        const rExec = await exec(argsParsed, {
          estado: estadoTrabalho,
          mensagem_id: req.mensagem.id,
        });
        const duracao_ms = Math.max(0, Date.now() - inicio);

        if (rExec.ok) {
          estadoTrabalho = rExec.estado;
          cartoes = mesclarCartoes(cartoes, rExec.cartoes);
          avisos.push(...rExec.avisos);
          const payload = { ok: true, ...rExec.resultado };
          rastro.push({
            chamada,
            ferramenta: tc.nome,
            argumentos: argsParsed,
            resultado: payload,
            duracao_ms,
          });
          mensagens.push({
            papel: "ferramenta",
            chamada_id: tc.id,
            conteudo: JSON.stringify(payload),
          });
        } else {
          if (rExec.erro.codigo === "POSSIVEL_DUPLICIDADE") {
            cartoes = mesclarCartoes(cartoes, [
              { tipo: "erro", codigo: rExec.erro.codigo, mensagem: rExec.erro.mensagem },
            ]);
          }
          const payload = { ok: false, erro: rExec.erro };
          rastro.push({
            chamada,
            ferramenta: tc.nome,
            argumentos: argsParsed,
            resultado: payload,
            duracao_ms,
          });
          mensagens.push({
            papel: "ferramenta",
            chamada_id: tc.id,
            conteudo: JSON.stringify(payload),
          });
        }
      }
    }
  }

  return respostaFalhaTecnica("F-05", estadoEntrada);
}

export async function processarAcao(
  req: RequisicaoAcao,
  deps: DepsConversa,
): Promise<RespostaAcao> {
  const estadoEntrada = structuredClone(req.estado);

  const validacaoEstado = await deps.executores.validarEstado(estadoEntrada);
  if (!validacaoEstado.ok) {
    return respostaFalhaTecnica("F-06", estadoEntrada, { pode_tentar_novamente: false });
  }

  const nomeFerramenta =
    req.acao.tipo === "confirmar" ? "confirmar_movimentacao" : "cancelar_movimentacao";
  const exec = deps.executores.ferramentas[nomeFerramenta];
  const rExec = await exec(
    { operacao_id: req.acao.operacao_id },
    { estado: structuredClone(estadoEntrada), mensagem_id: null },
  );

  if (!rExec.ok) {
    return {
      status: "falha",
      falha: {
        tipo: "dominio",
        codigo: rExec.erro.codigo,
        mensagem: rExec.erro.mensagem,
        pode_tentar_novamente: false,
      },
      estado: estadoEntrada,
    };
  }

  const novaVersao = estadoEntrada.versao + 1;
  const texto =
    typeof rExec.resultado.mensagem === "string"
      ? rExec.resultado.mensagem
      : req.acao.tipo === "confirmar"
        ? "Movimentação simulada confirmada."
        : "Proposta cancelada.";

  const estadoFinal: EstadoSessao = {
    ...rExec.estado,
    versao: novaVersao,
    conversa: [
      ...rExec.estado.conversa,
      {
        mensagem_id: `acao-${req.acao.operacao_id}-${req.acao.tipo}`,
        papel: "sistema",
        texto,
        versao: novaVersao,
        cartoes: [],
        rastro: [],
      },
    ],
  };

  const visao = await deps.executores.montarVisao(estadoFinal);
  return {
    status: "ok",
    estado: estadoFinal,
    texto,
    cartoes: rExec.cartoes,
    avisos: rExec.avisos,
    rastro: [],
    visao,
  };
}
