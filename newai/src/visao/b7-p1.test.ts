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
import { GET as getPersonas } from "@/app/api/personas/route";
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

  test("3. Cartão de proposta (operacao_pendente) traz rendimento estimado até o próximo recebimento previsto quando o destino rende (O-03, I-08)", async () => {
    const deps = criarDepsPadrao({ provedor: "roteirizado" });
    const snap = {
      ...snapshotGravado(),
      cdi: { taxa_diaria_pct: "0.05", data_ref: "2026-10-29", fonte: "CDI de teste" },
    };
    const estado0 = estadoInicial("p1", snap);

    // 3a. Destino que rende (INV9, 100% CDI) com recebimento previsto R1 em 19/11 → rendimento_estimado de CR-32 (326 centavos, 13 dias úteis)
    const rProp = await deps.executores.ferramentas.propor_movimentacao(
      { valor: "500", destino: "INV9" },
      { estado: estado0, mensagem_id: "m-prop-1" },
    );
    expect(rProp.ok).toBe(true);
    if (!rProp.ok) return;
    const cartao = rProp.cartoes[0];
    expect(cartao?.tipo).toBe("operacao_pendente");
    if (cartao?.tipo !== "operacao_pendente") return;

    expect(cartao.rendimento_estimado).toEqual({
      valor_centavos: 50000,
      cdi_pct: 100,
      ate_data: "2026-11-19",
      dias_uteis: 13,
      taxa_diaria_pct: "0.05",
      cdi_data_ref: "2026-10-29",
      rendimento_bruto_centavos: 326,
      rotulo: "bruto, CDI constante",
      destino: { posicao_id: "INV9", nome: "Caixinha Viagem" },
    });

    // 3b. Destino que não rende (SEP) → rendimento_estimado = null
    const rSep = await deps.executores.ferramentas.propor_movimentacao(
      { valor: "300", destino: "SEP" },
      { estado: estado0, mensagem_id: "m-prop-2" },
    );
    expect(rSep.ok).toBe(true);
    if (rSep.ok && rSep.cartoes[0]?.tipo === "operacao_pendente") {
      expect(rSep.cartoes[0].rendimento_estimado).toBeNull();
    }
  });

  test("4. montarVisao das 3 personas é aceita pelo esquema e bate com o motor (saldoDisponivelHoje, consultarCartao, consultarInvestimentos, extrato e proximos_pagamentos)", async () => {
    const contextoReal = {
      series: {
        cdi: cdiJson,
        fechamentos: {
          PETR4: petr4Json,
          BTC: btcJson,
        },
      },
      calendario: criarCalendario({ datas_cdi: cdiJson.serie.map((x) => x.data) }),
    };
    const snap = snapshotGravado();

    for (const id of ["p1", "p2", "p3"] as const) {
      const rp = carregarPersona(id);
      if (!rp.ok) throw new Error(rp.erro.mensagem);
      const persona = rp.persona;
      const estado = estadoInicial(id, snap);

      const visao = montarVisao(persona, estado, contextoReal);
      esquemaVisaoApp.parse(visao);

      expect(visao.persona).toEqual({ id: persona.id, nome: persona.nome });
      expect(visao.conta.saldo_inicio_hoje_centavos).toBe(persona.conta.saldo_inicio_hoje_centavos);
      expect(visao.conta.saldo_disponivel_hoje_centavos).toBe(saldoDisponivelHoje(persona, estado));
      expect(visao.cartao).toEqual(consultarCartao(persona, estado));

      const inv = consultarInvestimentos(persona, estado, contextoReal, {});
      if (!inv.ok) throw new Error(inv.erro.mensagem);
      expect(visao.posicoes).toEqual(
        inv.posicoes.map((pos) => ({
          id: pos.posicao_id,
          nome: pos.nome,
          categoria: pos.categoria,
          cdi_pct: pos.cdi_pct,
          ticker: pos.ticker,
          quantidade: pos.quantidade,
          valor_atual_centavos: pos.valor_atual_centavos,
          aplicado_centavos: pos.aplicado_centavos,
          resultado_centavos: pos.resultado_centavos,
          rentabilidade_pct: pos.rentabilidade_pct,
          valorizacao_periodo_pct: pos.valorizacao_periodo_pct,
          data_disponibilidade: pos.data_disponibilidade,
          protecao: pos.protecao,
          restricao: pos.restricao,
          estimado: pos.estimado,
          fonte: pos.fonte,
        })),
      );

      const [cenarioAtual] = calcularCenarios(persona, estado, contextoReal);
      expect(visao.proximos_pagamentos.map((p) => [p.evento_id, p.data, p.valor_centavos])).toEqual(
        cenarioAtual!.linhas
          .filter((l) => l.origem === "dados_base" || l.origem === "declaracao")
          .map((l) => [l.evento_id, l.data, l.valor_centavos]),
      );
    }

    // Após confirmar OP1 (500 em INV9), a VisaoApp devolvida por /api/acao traz saldo_disponivel_hoje_centavos = 130000 e INV9 aplicado 50000
    const estadoProp = {
      ...estadoInicial("p1", snap),
      versao: 1,
      operacao_pendente: { id: "OP1", valor_centavos: 50000, destino: "INV9", criada_na_versao: 1 },
      contadores: { D: 0, H: 0, OP: 1 },
    };
    const acao = esquemaRespostaAcao.parse(
      await (
        await postAcao(
          new Request("http://localhost:3101/api/acao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              estado: estadoProp,
              acao: { tipo: "confirmar", operacao_id: "OP1" },
            }),
          }),
        )
      ).json(),
    );
    expect(acao.status).toBe("ok");
    if (acao.status === "ok") {
      expect(acao.visao.conta.saldo_disponivel_hoje_centavos).toBe(130000);
      expect(acao.visao.posicoes.find((p) => p.id === "INV9")?.aplicado_centavos).toBe(50000);
      expect(acao.visao.extrato[0]).toMatchObject({
        id: "OP1",
        simulado: true,
        valor_centavos: 50000,
      });
    }
  });

  test("5. Ponta a ponta com provedor roteirizado pelo HTTP: /api/personas → /api/sessao → /api/turno (separar 500 → cartão CR-02) → /api/turno (guardar 500 → proposta OP1) → /api/acao (confirmar → Home 1.300 e H1 descartada)", async () => {
    const provAnt = process.env.LLM_PROVEDOR;
    const rotAnt = process.env.LLM_ROTEIRO;
    process.env.LLM_PROVEDOR = "roteirizado";
    process.env.LLM_ROTEIRO = "e2e/roteiro-b7-e2e.json";

    try {
      const lista = await (await getPersonas()).json();
      expect(lista.map((p: { id: string }) => p.id)).toEqual(["p1", "p2", "p3"]);

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
      expect(sessao.visao.conta.saldo_disponivel_hoje_centavos).toBe(180000);

      // Turno 1: separar 500 hoje -> cartão de comparação CR-02
      const turno1 = esquemaRespostaTurno.parse(
        await (
          await postTurno(
            new Request("http://localhost:3101/api/turno", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                estado: sessao.estado,
                mensagem: { id: "m-e2e-1", texto: "Posso separar R$ 500 hoje para minha viagem?" },
              }),
            }),
          )
        ).json(),
      );
      expect(turno1.status).toBe("ok");
      if (turno1.status !== "ok") return;
      expect(turno1.estado.versao).toBe(1);
      expect(turno1.cartoes.some((c) => c.tipo === "comparacao")).toBe(true);

      // Turno 2: guardar 500 na caixinha da viagem -> proposta OP1
      const turno2 = esquemaRespostaTurno.parse(
        await (
          await postTurno(
            new Request("http://localhost:3101/api/turno", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                estado: turno1.estado,
                mensagem: { id: "m-e2e-2", texto: "Guarda R$ 500 na caixinha da viagem." },
              }),
            }),
          )
        ).json(),
      );
      expect(turno2.status).toBe("ok");
      if (turno2.status !== "ok") return;
      expect(turno2.estado.versao).toBe(2);
      expect(turno2.estado.operacao_pendente?.id).toBe("OP1");
      const cartaoPend = turno2.cartoes.find((c) => c.tipo === "operacao_pendente");
      expect(cartaoPend?.tipo === "operacao_pendente" ? cartaoPend.rendimento_estimado?.ate_data : "").toBe("2026-11-19");

      // Ação: confirmar OP1 -> saldo disponível na VisaoApp (Home) = 1.300 (130000 centavos) e H1 descartada
      const acao = esquemaRespostaAcao.parse(
        await (
          await postAcao(
            new Request("http://localhost:3101/api/acao", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                estado: turno2.estado,
                acao: { tipo: "confirmar", operacao_id: "OP1" },
              }),
            }),
          )
        ).json(),
      );
      expect(acao.status).toBe("ok");
      if (acao.status !== "ok") return;
      expect(acao.estado.versao).toBe(3);
      expect(acao.estado.hipoteses).toEqual([]);
      expect(acao.visao.conta.saldo_disponivel_hoje_centavos).toBe(130000);
      expect(acao.visao.posicoes.find((p) => p.id === "INV9")?.aplicado_centavos).toBe(50000);
    } finally {
      if (provAnt === undefined) delete process.env.LLM_PROVEDOR;
      else process.env.LLM_PROVEDOR = provAnt;
      if (rotAnt === undefined) delete process.env.LLM_ROTEIRO;
      else process.env.LLM_ROTEIRO = rotAnt;
    }
  });
});
