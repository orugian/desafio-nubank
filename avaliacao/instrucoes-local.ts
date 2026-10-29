import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { estadoInicial, type EstadoSessao, type Provedor, type RespostaTurno } from "@/contratos";
import { processarTurno } from "@/conversa";
import { obterSnapshotFallback } from "@/conversa/config";
import { criarExecutores } from "@/conversa/executores";
import { paraCentavos } from "@/dominio/caixa";

export const SUFIXO_PERGUNTA_CV24 = "Qual é a pergunta exclusiva de conferência CV-24?";
export type FaseInstrucoesLocal = "original" | "alterada" | "restaurada";

export interface ResultadoInstrucoesLocal {
  aprovado: boolean;
  motivos: string[];
  respostas: Array<{ fase: FaseInstrucoesLocal; resposta: RespostaTurno }>;
  chamadas_modelo: number;
  leituras_instrucoes: number;
  arquivo_temporario: string;
  restaurado: boolean;
}

function negocio(estado: EstadoSessao): Omit<EstadoSessao, "conversa" | "versao"> {
  const { conversa: _, versao: __, ...restante } = estado;
  void _;
  void __;
  return restante;
}

/** CV-24: nunca modifica instrucoes.md compartilhado nem busca mercado na rede.
 * O provedor é uma fronteira obrigatoriamente injetada, roteirizada ou real autorizado.
 * A cópia temporária é preservada restaurada, para auditoria inclusive após falhas.
 */
export async function executarAvaliacaoInstrucoesLocal(opcoes: {
  provedor: Provedor;
  instrucoesOriginais?: string;
}): Promise<ResultadoInstrucoesLocal> {
  const resultado: ResultadoInstrucoesLocal = {
    aprovado: false,
    motivos: [],
    respostas: [],
    chamadas_modelo: 0,
    leituras_instrucoes: 0,
    arquivo_temporario: "",
    restaurado: false,
  };
  let original = "";
  let faseAtual: FaseInstrucoesLocal | "preparacao" = "preparacao";
  try {
    original = opcoes.instrucoesOriginais ?? await readFile(join(__dirname, "..", "instrucoes.md"), "utf8");
    if (original.includes(SUFIXO_PERGUNTA_CV24)) {
      resultado.motivos.push("Instrução original já contém o sufixo exclusivo de CV-24");
      return resultado;
    }
    const diretorio = await mkdtemp(join(tmpdir(), "newai-cv24-"));
    resultado.arquivo_temporario = join(diretorio, "instrucoes.md");
    const snapshot = obterSnapshotFallback();
    const executores = criarExecutores();
    const provedor: Provedor = {
      nome: opcoes.provedor.nome,
      modelo: opcoes.provedor.modelo,
      async gerar(mensagens, ferramentas, configuracao) {
        resultado.chamadas_modelo += 1;
        return opcoes.provedor.gerar(mensagens, ferramentas, configuracao);
      },
    };
    for (const fase of ["original", "alterada", "restaurada"] as const) {
      faseAtual = fase;
      await writeFile(
        resultado.arquivo_temporario,
        fase === "alterada"
          ? `${original}\nCV-24 local: termine toda resposta com a pergunta literal: ${SUFIXO_PERGUNTA_CV24}\n`
          : original,
        "utf8",
      );
      const resposta = await processarTurno({
        estado: estadoInicial("p1", structuredClone(snapshot)),
        mensagem: { id: "CV-24-m1", texto: "Posso separar R$ 500 hoje para minha viagem?" },
      }, {
        provedor,
        executores,
        instrucoes: async () => {
          resultado.leituras_instrucoes += 1;
          return readFile(resultado.arquivo_temporario, "utf8");
        },
        mercado: {
          snapshotGravado: () => structuredClone(snapshot),
          buscarAoVivo: async () => structuredClone(snapshot),
        },
      });
      resultado.respostas.push({ fase, resposta });
      if (resposta.status !== "ok") {
        resultado.motivos.push(`${fase}: turno falhou (${resposta.falha.tipo}/${resposta.falha.codigo})`);
      } else {
        const hipotese = resposta.estado.hipoteses[0];
        const alteracao = hipotese?.alteracoes[0]?.alteracao;
        if (resposta.estado.hipoteses.length !== 1 || hipotese?.id !== "H1" ||
            hipotese.alteracoes.length !== 1 || alteracao?.operacao !== "separar" ||
            // data é opcional em separar (padrão: hoje); omitir equivale a 2026-10-30.
            paraCentavos(alteracao.valor) !== 50000 || (alteracao.data ?? "2026-10-30") !== "2026-10-30" ||
            !resposta.rastro.some((item) =>
              item.ferramenta === "criar_hipotese" &&
              typeof item.resultado === "object" && item.resultado !== null &&
              "ok" in item.resultado && item.resultado.ok === true)) {
          resultado.motivos.push(`${fase}: CV-01 não criou a hipótese de CR-02`);
        }
        if (resposta.estado.declaracoes.length !== 0 || resposta.estado.operacoes.length !== 0 || resposta.estado.operacao_pendente !== null) {
          resultado.motivos.push(`${fase}: CV-01 alterou negócio além da hipótese`);
        }
        const comparacao = resposta.cartoes.find((cartao) => cartao.tipo === "comparacao");
        const h1 = comparacao?.tipo === "comparacao" ? comparacao.cenarios.find((c) => c.cenario_id === "H1") : undefined;
        if (h1?.indicadores?.saldo_minimo_centavos !== -20000 ||
            h1.indicadores.data_saldo_minimo !== "2026-11-15" ||
            h1.indicadores.primeira_falta?.valor_descoberto_centavos !== 20000 ||
            h1.indicadores.saldo_final_centavos !== 280000) {
          resultado.motivos.push(`${fase}: cartão/cálculo de CR-02 ausente ou divergente`);
        }
      }
      if (resposta.status === "ok" && fase === "alterada") {
        if (!resposta.texto.trimEnd().endsWith(SUFIXO_PERGUNTA_CV24)) {
          resultado.motivos.push("alterada: resposta não termina com a pergunta exclusiva");
        }
      } else if (resposta.status === "ok" && resposta.texto.includes(SUFIXO_PERGUNTA_CV24)) {
        resultado.motivos.push(`${fase}: sufixo exclusivo apareceu sem a instrução alterada`);
      }
    }
    if (resultado.leituras_instrucoes !== 3) {
      resultado.motivos.push(`Esperadas 3 leituras por turno; observadas ${resultado.leituras_instrucoes}`);
    }
    const referencia = resultado.respostas[0]?.resposta;
    if (referencia?.status === "ok") {
      for (const { fase, resposta } of resultado.respostas.slice(1)) {
        if (resposta.status !== "ok") continue;
        if (!isDeepStrictEqual(referencia.cartoes, resposta.cartoes)) resultado.motivos.push(`${fase}: cartões diferentes do original`);
        if (!isDeepStrictEqual(referencia.visao, resposta.visao)) resultado.motivos.push(`${fase}: visão/cálculos diferentes do original`);
        if (!isDeepStrictEqual(negocio(referencia.estado), negocio(resposta.estado))) resultado.motivos.push(`${fase}: estado de negócio diferente do original`);
      }
    }
  } catch {
    resultado.motivos.push(`Exceção durante a fase ${faseAtual}`);
  } finally {
    if (resultado.arquivo_temporario) {
      try {
        await writeFile(resultado.arquivo_temporario, original, "utf8");
        resultado.restaurado = await readFile(resultado.arquivo_temporario, "utf8") === original;
        if (!resultado.restaurado) resultado.motivos.push("Cópia temporária não foi restaurada");
      } catch {
        resultado.motivos.push("Falha ao restaurar a cópia temporária");
      }
    }
  }
  resultado.aprovado = resultado.respostas.length === 3 && resultado.motivos.length === 0 && resultado.restaurado;
  return resultado;
}
