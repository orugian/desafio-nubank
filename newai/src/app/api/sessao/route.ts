import { NextResponse } from "next/server";
import {
  esquemaRequisicaoSessao,
  estadoInicial,
  type RespostaFalha,
  type RespostaSessao,
} from "@/contratos";
import { carregarPersona } from "@/dados";
import { criarDepsPadrao, montarConfig, verificarCodigoAcesso } from "@/conversa/config";

function respostaFalhaSessao(codigo: string, mensagem: string): NextResponse<RespostaFalha> {
  return NextResponse.json({
    status: "falha",
    falha: {
      tipo: "dominio",
      codigo,
      mensagem,
      pode_tentar_novamente: false,
    },
    estado: null,
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respostaFalhaSessao("ENTRADA_INVALIDA", "Corpo da requisição inválido.");
  }

  const parsed = esquemaRequisicaoSessao.safeParse(body);
  if (!parsed.success) {
    return respostaFalhaSessao("ENTRADA_INVALIDA", "Requisição fora do esquema de sessão.");
  }

  if (!verificarCodigoAcesso(parsed.data.codigo_acesso)) {
    return respostaFalhaSessao("CODIGO_ACESSO_INVALIDO", "Código de acesso inválido.");
  }

  const rPersona = carregarPersona(parsed.data.persona_id);
  if (!rPersona.ok) {
    return respostaFalhaSessao(rPersona.erro.codigo, rPersona.erro.mensagem);
  }

  const deps = criarDepsPadrao();
  const mercado = deps.mercado.snapshotGravado();
  const estado = estadoInicial(parsed.data.persona_id, mercado);
  const [visao, instrucoes] = await Promise.all([
    deps.executores.montarVisao(estado),
    deps.instrucoes(),
  ]);
  const config = montarConfig(deps.provedor, instrucoes, mercado);

  const resposta: RespostaSessao = {
    status: "ok",
    estado,
    visao,
    config,
  };
  return NextResponse.json(resposta);
}
