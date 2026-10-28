// Conversa (spec §6.1, §6.7, §8, §10).

import {
  LIMITES,
  definicoesFerramentas,
  ehNomeFerramenta,
  type AvisoTurno,
  type CartaoResposta,
  type DepsConversa,
  type EstadoSessao,
  type ItemRastro,
  type MensagemProvedor,
  type RequisicaoAcao,
  type RequisicaoTurno,
  type RespostaAcao,
  type RespostaTurno,
} from "@/contratos";

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

    if (resp.tipo === "texto") {
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
          throw new Error(`Ferramenta desconhecida: ${tc.nome}`);
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
