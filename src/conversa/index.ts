// Conversa (spec §6.1, §6.7, §8, §10).

import {
  CODIGOS_FALHA_TECNICA,
  LIMITES,
  definicoesFerramentas,
  ehNomeFerramenta,
  textos,
  type AvisoTurno,
  type CartaoResposta,
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

export async function processarTurno(
  req: RequisicaoTurno,
  deps: DepsConversa,
): Promise<RespostaTurno> {
  const estadoEntrada = structuredClone(req.estado);

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
  const historicoConversa = estadoEntrada.conversa.slice(-LIMITES.mensagens_no_contexto);

  const mensagens: MensagemProvedor[] = [
    { papel: "sistema", conteudo: textoInstrucoes },
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

      for (const tc of resp.chamadas) {
        const inicio = Date.now();
        let argsParsed: unknown = {};
        try {
          argsParsed = tc.argumentos.trim() ? JSON.parse(tc.argumentos) : {};
        } catch {
          argsParsed = tc.argumentos;
        }

        if (!ehNomeFerramenta(tc.nome)) {
          return respostaFalhaTecnica("F-04", estadoEntrada);
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

  throw new Error("não implementado");
}

export async function processarAcao(
  req: RequisicaoAcao,
  deps: DepsConversa,
): Promise<RespostaAcao> {
  void req, deps;
  throw new Error("não implementado");
}
