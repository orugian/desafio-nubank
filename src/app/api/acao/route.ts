import { NextResponse } from "next/server";
import {
  esquemaEstadoSessao,
  esquemaRequisicaoAcao,
  type EstadoSessao,
  type RespostaFalha,
} from "@/contratos";
import { processarAcao } from "@/conversa";
import { criarDepsPadrao, verificarCodigoAcesso } from "@/conversa/config";

function extrairEstadoSeValido(body: unknown): EstadoSessao | null {
  if (typeof body !== "object" || body === null || !("estado" in body)) return null;
  const r = esquemaEstadoSessao.safeParse((body as { estado: unknown }).estado);
  return r.success ? r.data : null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const falha: RespostaFalha = {
      status: "falha",
      falha: {
        tipo: "dominio",
        codigo: "ENTRADA_INVALIDA",
        mensagem: "Corpo da requisição inválido.",
        pode_tentar_novamente: false,
      },
      estado: null,
    };
    return NextResponse.json(falha);
  }

  const parsed = esquemaRequisicaoAcao.safeParse(body);
  if (!parsed.success) {
    const falha: RespostaFalha = {
      status: "falha",
      falha: {
        tipo: "dominio",
        codigo: "ENTRADA_INVALIDA",
        mensagem: "Requisição fora do esquema de ação.",
        pode_tentar_novamente: false,
      },
      estado: extrairEstadoSeValido(body),
    };
    return NextResponse.json(falha);
  }

  if (!verificarCodigoAcesso(parsed.data.codigo_acesso)) {
    const falha: RespostaFalha = {
      status: "falha",
      falha: {
        tipo: "dominio",
        codigo: "CODIGO_ACESSO_INVALIDO",
        mensagem: "Código de acesso inválido.",
        pode_tentar_novamente: false,
      },
      estado: parsed.data.estado,
    };
    return NextResponse.json(falha);
  }

  const deps = criarDepsPadrao();
  const res = await processarAcao(parsed.data, deps);
  return NextResponse.json(res);
}
