import { describe, expect, test } from "vitest";
import {
  esquemaRespostaAcao,
  esquemaRespostaSessao,
  esquemaRespostaTurno,
  esquemaVisaoApp,
  estadoInicial,
  type MensagemProvedor,
  type Provedor,
  type RespostaProvedor,
} from "@/contratos";
import { POST as postSessao } from "@/app/api/sessao/route";
import { POST as postTurno } from "@/app/api/turno/route";
import { POST as postAcao } from "@/app/api/acao/route";
import { criarDepsPadrao } from "@/conversa/config";
import { processarTurno } from "@/conversa";
import { carregarPersona } from "@/dados";
import { calcularCenarios, saldoDisponivelHoje } from "@/dominio/caixa";
import { criarCalendario } from "@/dominio/calendario";
import { consultarCartao } from "@/dominio/cartao";
import { consultarInvestimentos } from "@/dominio/investimentos";
import { snapshotGravado } from "@/mercado";
import { montarVisao } from "@/visao";
import cdiJson from "../../dados/mercado/cdi.json";
import btcJson from "../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../dados/mercado/fechamentos-PETR4.json";

function provedorSequencial(respostas: RespostaProvedor[], capturadas?: MensagemProvedor[][]): Provedor {
  let idx = 0;
  return {
    nome: "roteirizado",
    modelo: "roteiro-b7",
    async gerar(mensagens) {
      capturadas?.push(mensagens);
      const r = respostas[idx];
      idx += 1;
      if (!r) throw new Error("Sem mais respostas no provedor de teste");
      return r;
    },
  };
}

describe("B7 parte 1 · executores reais e montarVisao", () => {
  test("1. Executores reais substituem os dublês: histórico real, cartão real (e erro em P2 sem cartão) e CV-01 roteirizado produz CR-02 pelo HTTP", async () => {
    const deps = criarDepsPadrao({ provedor: "roteirizado" });

    // 1a. consultar_historico usa consultarHistorico real (não exemplo fixo de 24040 centavos)
    const estadoP2 = estadoInicial("p2", snapshotGravado());
    const resHist = await processarTurno(
      {
        estado: estadoP2,
        mensagem: { id: "m-b7-hist", texto: "Quanto gastei com delivery em setembro?" },
      },
      {
        ...deps,
        provedor: provedorSequencial([
          {
            tipo: "chamadas",
            chamadas: [
              {
                id: "c-hist-1",
                nome: "consultar_historico",
                argumentos: JSON.stringify({
                  de: "2026-09-01",
                  ate: "2026-09-30",
                  tipo: "saida",
                  categoria: "delivery",
                }),
              },
            ],
          },
          { tipo: "texto", texto: "Em setembro você teve 2 gastos de delivery, totalizando R$ 160,00." },
        ]),
      },
    );
    expect(resHist.status).toBe("ok");
    if (resHist.status !== "ok") return;
    const cartaoHist = resHist.cartoes.find((c) => c.tipo === "historico");
    expect(cartaoHist?.tipo === "historico" ? cartaoHist.resultado.total_saidas_centavos : -1).toBe(16000);
    expect(cartaoHist?.tipo === "historico" ? cartaoHist.resultado.quantidade : -1).toBe(2);

    // 1b. consultar_cartao usa consultarCartao real: em P1 devolve fatura A (70000); em P2 sem cartão devolve erro OPERACAO_NAO_PERMITIDA
    const estadoP1 = estadoInicial("p1", snapshotGravado());
    const resCartaoP1 = await deps.executores.ferramentas.consultar_cartao({}, { estado: estadoP1, mensagem_id: "m1" });
    expect(resCartaoP1.ok).toBe(true);
    if (resCartaoP1.ok) {
      const c = resCartaoP1.cartoes[0];
      expect(c?.tipo === "cartao_credito" ? c.cartao.fatura_fechada?.fatura_id : "").toBe("A");
    }
    const resCartaoP2 = await deps.executores.ferramentas.consultar_cartao({}, { estado: estadoP2, mensagem_id: "m2" });
    expect(resCartaoP2.ok ? "ok" : resCartaoP2.erro.codigo).toBe("OPERACAO_NAO_PERMITIDA");

    // 1c. CV-01 roteirizado produz CR-02 pelo HTTP (/api/sessao → /api/turno)
    const provAnt = process.env.LLM_PROVEDOR;
    const rotAnt = process.env.LLM_ROTEIRO;
    process.env.LLM_PROVEDOR = "roteirizado";
    process.env.LLM_ROTEIRO = "src/conversa/fixtures/roteiro-cv01-s0.json";
    try {
      const sessao = esquemaRespostaSessao.parse(
        await (
          await postSessao(
            new Request("http://localhost:3101/api/sessao", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ persona_id: "p1" }),
            }),
          )
        ).json(),
      );
      const turno = esquemaRespostaTurno.parse(
        await (
          await postTurno(
            new Request("http://localhost:3101/api/turno", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                estado: sessao.estado,
                mensagem: { id: "m-b7-cv01", texto: "Posso separar R$ 500 hoje para minha viagem?" },
              }),
            }),
          )
        ).json(),
      );
      expect(turno.status).toBe("ok");
      if (turno.status === "ok") {
        const comp = turno.cartoes.find((c) => c.tipo === "comparacao");
        const h1 = comp?.tipo === "comparacao" ? comp.cenarios.find((c) => c.cenario_id === "H1") : undefined;
        expect(h1?.indicadores?.primeira_falta).toEqual({
          data: "2026-11-15",
          valor_descoberto_centavos: 20000,
          saidas_do_dia: ["C"],
        });
      }
    } finally {
      if (provAnt === undefined) delete process.env.LLM_PROVEDOR;
      else process.env.LLM_PROVEDOR = provAnt;
      if (rotAnt === undefined) delete process.env.LLM_ROTEIRO;
      else process.env.LLM_ROTEIRO = rotAnt;
    }
  });

  test("2. Default de ate_data (I-10): CV-05 roteirizado sem ate_data chega à classificação de CR-06 (ate_data 15/11, saldo_minimo)", async () => {
    const deps = criarDepsPadrao({ provedor: "roteirizado" });
    const estado0 = estadoInicial("p1", snapshotGravado());

    const res = await processarTurno(
      {
        estado: estado0,
        mensagem: { id: "m-b7-cv05", texto: "Tenho dinheiro aplicado. Posso contar com ele?" },
      },
      {
        ...deps,
        provedor: provedorSequencial([
          {
            tipo: "chamadas",
            chamadas: [
              {
                id: "c-cv05-1",
                nome: "consultar_investimentos",
                argumentos: JSON.stringify({}),
              },
            ],
          },
          {
            tipo: "texto",
            texto:
              "Até 15/11, a Caixinha Reserva (INV1) é reserva de emergência protegida, o CDB (INV2) vence só em 15/03/2027 e não é resgatável até a data, e PETR4 (INV3) é resgatável em 04/11.",
          },
        ]),
      },
    );

    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    const cartaoInv = res.cartoes.find((c) => c.tipo === "investimentos");
    expect(cartaoInv).toBeDefined();
    if (cartaoInv?.tipo !== "investimentos") return;

    expect(cartaoInv.resultado.ate_data).toBe("2026-11-15");
    expect(cartaoInv.resultado.ate_data_origem).toBe("saldo_minimo");
    expect(cartaoInv.resultado.posicoes.map((p) => [p.posicao_id, p.classificacao, p.data_disponibilidade])).toEqual([
      ["SEP", "resgatavel_ate_data", "2026-10-30"],
      ["INV1", "protegida", "2026-10-30"],
      ["INV9", "resgatavel_ate_data", "2026-10-30"],
      ["INV2", "nao_resgatavel_ate_data", "2027-03-15"],
      ["INV3", "resgatavel_ate_data", "2026-11-04"],
    ]);
  });
});
