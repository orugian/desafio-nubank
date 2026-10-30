// Porta do provedor (spec §6.1 `conversa/provedor`).

import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
  esquemaProvedorNome,
  esquemaRoteiro,
  type DefinicaoFerramenta,
  type MensagemProvedor,
  type Provedor,
  type ProvedorNome,
  type RespostaProvedor,
  type Roteiro,
} from "@/contratos";

const URLS_PROVEDOR = {
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
} as const;

export type ConfigProvedor = {
  provedor?: ProvedorNome;
  modelo?: string;
  roteiro?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

function normalizarTexto(s: string): string {
  return s.trim().toLowerCase();
}

function carregarRoteiro(caminho: string): Roteiro {
  const resolvido = isAbsolute(caminho) ? caminho : join(process.cwd(), caminho);
  const bruto = JSON.parse(readFileSync(resolvido, "utf8"));
  return esquemaRoteiro.parse(bruto);
}

function criarProvedorRoteirizado(caminhoRoteiro: string, modeloInformado?: string): Provedor {
  return {
    nome: "roteirizado",
    modelo: modeloInformado ?? `roteiro: ${caminhoRoteiro}`,
    async gerar(mensagens): Promise<RespostaProvedor> {
      let roteiro: Roteiro;
      try {
        roteiro = carregarRoteiro(caminhoRoteiro);
      } catch {
        return { tipo: "falha", falha: "indisponivel" };
      }

      let idxUltimoUsuario = -1;
      for (let i = mensagens.length - 1; i >= 0; i--) {
        if (mensagens[i]?.papel === "usuario") {
          idxUltimoUsuario = i;
          break;
        }
      }
      if (idxUltimoUsuario < 0) {
        return { tipo: "falha", falha: "resposta_invalida" };
      }

      const msgUsuario = mensagens[idxUltimoUsuario]!;
      const alvo = normalizarTexto(msgUsuario.conteudo);
      const turno =
        roteiro.turnos.find((t) => normalizarTexto(t.mensagem) === alvo) ?? roteiro.turnos[0];
      if (!turno) {
        return { tipo: "falha", falha: "resposta_invalida" };
      }

      let passo = 0;
      for (let i = idxUltimoUsuario + 1; i < mensagens.length; i++) {
        if (mensagens[i]?.papel === "assistente") {
          passo += 1;
        }
      }

      const bruto = turno.respostas[passo];
      if (!bruto) {
        return { tipo: "falha", falha: "resposta_invalida" };
      }

      if (bruto.tipo === "texto") {
        if (!bruto.texto.trim()) {
          return { tipo: "falha", falha: "resposta_invalida" };
        }
        return { tipo: "texto", texto: bruto.texto };
      }

      if (bruto.tipo === "falha") {
        return bruto.espera_segundos !== undefined
          ? { tipo: "falha", falha: bruto.falha, espera_segundos: bruto.espera_segundos }
          : { tipo: "falha", falha: bruto.falha };
      }

      return {
        tipo: "chamadas",
        ...(bruto.texto ? { texto: bruto.texto } : {}),
        chamadas: bruto.chamadas.map((c) => ({
          id: c.id,
          nome: c.nome,
          argumentos:
            typeof c.argumentos === "string" ? c.argumentos : JSON.stringify(c.argumentos),
        })),
      };
    },
  };
}

function converterMensagensOpenAI(mensagens: MensagemProvedor[]): Array<Record<string, unknown>> {
  return mensagens.map((m) => {
    if (m.papel === "sistema") {
      return { role: "system", content: m.conteudo };
    }
    if (m.papel === "usuario") {
      return { role: "user", content: m.conteudo };
    }
    if (m.papel === "ferramenta") {
      return { role: "tool", tool_call_id: m.chamada_id, content: m.conteudo };
    }
    if (m.chamadas && m.chamadas.length > 0) {
      return {
        role: "assistant",
        content: m.conteudo || null,
        tool_calls: m.chamadas.map((c) => ({
          id: c.id,
          type: "function",
          function: {
            name: c.nome,
            arguments: c.argumentos,
          },
        })),
      };
    }
    return { role: "assistant", content: m.conteudo };
  });
}

type RespostaOpenAI = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
};

export function criarProvedor(config: ConfigProvedor = {}): Provedor {
  const nomeBruto = config.provedor ?? process.env.LLM_PROVEDOR ?? "roteirizado";
  const parsedNome = esquemaProvedorNome.safeParse(nomeBruto);
  const provedor: ProvedorNome = parsedNome.success ? parsedNome.data : "roteirizado";

  if (provedor === "roteirizado") {
    const caminhoRoteiro =
      config.roteiro ?? process.env.LLM_ROTEIRO ?? "src/contratos/roteiros/cv-01.json";
    return criarProvedorRoteirizado(caminhoRoteiro, config.modelo);
  }

  const url = URLS_PROVEDOR[provedor];
  const modelo =
    config.modelo ??
    (provedor === "nvidia"
      ? process.env.NVIDIA_MODELO || "minimaxai/minimax-m3.1-flash"
      : process.env.OPENROUTER_MODELO || "deepseek/deepseek-v4.1-flash-1017");
  const apiKey =
    config.apiKey ??
    (provedor === "nvidia" ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY) ??
    "";
  const fetchFn = config.fetchImpl ?? fetch;

  return {
    nome: provedor,
    modelo,
    async gerar(
      mensagens: MensagemProvedor[],
      ferramentas: DefinicaoFerramenta[],
      opcoes: { timeout_ms: number },
    ): Promise<RespostaProvedor> {
      if (!apiKey) {
        return { tipo: "falha", falha: "indisponivel" };
      }

      const corpo: Record<string, unknown> = {
        model: modelo,
        temperature: 0,
        max_tokens: 1200,
        stream: false,
        messages: converterMensagensOpenAI(mensagens),
        tools: ferramentas,
        tool_choice: "auto",
      };

      if (modelo === "minimaxai/minimax-m3.1-flash") {
        corpo.chat_template_kwargs = { reasoning_effort: "low" };
      } else if (provedor === "openrouter") {
        corpo.reasoning = { enabled: false };
      }

      let res: Response;
      try {
        res = await fetchFn(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
          signal: AbortSignal.timeout(opcoes.timeout_ms),
        });
      } catch (err) {
        const nomeErro = err instanceof Error ? err.name : "";
        if (nomeErro === "TimeoutError" || nomeErro === "AbortError") {
          return { tipo: "falha", falha: "timeout" };
        }
        return { tipo: "falha", falha: "indisponivel" };
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const segundos = retryAfter !== null ? Number.parseInt(retryAfter, 10) : Number.NaN;
        return Number.isFinite(segundos) && segundos >= 0
          ? { tipo: "falha", falha: "cota", espera_segundos: segundos }
          : { tipo: "falha", falha: "cota" };
      }

      if (!res.ok) {
        return { tipo: "falha", falha: "indisponivel" };
      }

      let body: RespostaOpenAI;
      try {
        body = (await res.json()) as RespostaOpenAI;
      } catch {
        return { tipo: "falha", falha: "resposta_invalida" };
      }

      const choice = body?.choices?.[0];
      const msg = choice?.message;
      if (!choice || !msg || choice.finish_reason === "length") {
        return { tipo: "falha", falha: "resposta_invalida" };
      }

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length > 0) {
        const chamadas = [];
        for (const tc of toolCalls) {
          const id = tc.id ?? "";
          const nome = tc.function?.name ?? "";
          const argumentos = tc.function?.arguments;
          if (!id || !nome || typeof argumentos !== "string") {
            return { tipo: "falha", falha: "resposta_invalida" };
          }
          chamadas.push({ id, nome, argumentos });
        }
        const textoOpcional =
          typeof msg.content === "string" && msg.content.trim().length > 0
            ? msg.content.trim()
            : undefined;
        return {
          tipo: "chamadas",
          chamadas,
          ...(textoOpcional ? { texto: textoOpcional } : {}),
        };
      }

      const texto = typeof msg.content === "string" ? msg.content.trim() : "";
      if (!texto) {
        return { tipo: "falha", falha: "resposta_invalida" };
      }
      return { tipo: "texto", texto };
    },
  };
}
