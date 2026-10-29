import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  definicoesFerramentas,
  erro,
  esquemaCartaoResposta,
  esquemaRoteiro,
  estadoInicial,
  textos,
  type CartaoResposta,
  type Contexto,
  type DepsConversa,
  type Provedor,
  type RespostaProvedor,
} from "@/contratos";
import { processarTurno } from "@/conversa";
import { criarDepsPadrao } from "@/conversa/config";
import { criarExecutores } from "@/conversa/executores";
import { criarProvedor } from "@/conversa/provedor";
import { carregarPersona } from "@/dados";
import { criarCalendario } from "@/dominio/calendario";
import { simularPixCredito } from "@/dominio/credito";
import { estimarImpostoRenda } from "@/dominio/impostos";
import { compararInvestimento } from "@/dominio/investimentos/comparativo";
import { montarResultadoCotacao } from "@/dominio/investimentos/cotacao";
import { simularInvestimento } from "@/dominio/investimentos/simulacao";
import { buscarCotacao, snapshotGravado } from "@/mercado";
import cdiJson from "../../../dados/mercado/cdi.json";
import btcJson from "../../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../../dados/mercado/fechamentos-PETR4.json";
import exCotacao from "@/contratos/exemplos/cartao-cotacao.json";
import exComparativo from "@/contratos/exemplos/cartao-comparativo-investimento.json";
import exSimulacao from "@/contratos/exemplos/cartao-simulacao-investimento.json";
import exPixCredito from "@/contratos/exemplos/cartao-pix-credito.json";
import exImpostoRenda from "@/contratos/exemplos/cartao-imposto-renda.json";

const contextoPadrao: Contexto = {
  series: {
    cdi: cdiJson,
    fechamentos: {
      PETR4: petr4Json,
      BTC: btcJson,
    },
  },
  calendario: criarCalendario({ datas_cdi: cdiJson.serie.map((x) => x.data) }),
};

function provedorSequencial(respostas: RespostaProvedor[]): Provedor {
  let idx = 0;
  return {
    nome: "roteirizado",
    modelo: "teste-investimentos",
    async gerar() {
      const r = respostas[idx++];
      if (!r) throw new Error("Sem mais respostas no provedor de teste");
      return r;
    },
  };
}

function montarDeps(respostas: RespostaProvedor[], executoresCustom?: ReturnType<typeof criarExecutores>): DepsConversa {
  const deps = criarDepsPadrao({ provedor: "roteirizado" });
  return {
    ...deps,
    executores: executoresCustom ?? deps.executores,
    mercado: {
      ...deps.mercado,
      buscarAoVivo: async () => snapshotGravado(),
    },
    provedor: provedorSequencial(respostas),
  };
}

describe("T6 · Integração dos novos domínios nos executores e conversa", () => {
  // 1. Cada uma das 5 ferramentas pelo turno completo
  test("1. Cada uma das 5 ferramentas pelo turno completo produz cartão válido, rastro formatado e estado de negócio inalterado", async () => {
    const estadoP1 = estadoInicial("p1", snapshotGravado());

    // 1a. consultar_cotacao
    const resCotacao = await processarTurno(
      {
        estado: estadoP1,
        mensagem: { id: "msg-cot", texto: "Quanto está a PETR4 agora?" },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-cot-1",
              nome: "consultar_cotacao",
              argumentos: JSON.stringify({ ticker: "PETR4" }),
            },
          ],
        },
        { tipo: "texto", texto: "Veja o cartão com os valores calculados pelo motor." },
      ]),
    );

    expect(resCotacao.status).toBe("ok");
    if (resCotacao.status === "ok") {
      const cartao = resCotacao.cartoes.find((c) => c.tipo === "cotacao");
      expect(cartao).toBeDefined();
      expect(esquemaCartaoResposta.safeParse(cartao).success).toBe(true);

      const rastro = resCotacao.rastro[0]!;
      expect(rastro.ferramenta).toBe("consultar_cotacao");
      expect((rastro.resultado as { ok: boolean }).ok).toBe(true);
      const vf = (rastro.resultado as Record<string, unknown>).valores_formatados as Record<string, string>;
      expect(vf).toBeDefined();
      expect(Object.keys(vf).some((k) => k.endsWith("_centavos"))).toBe(true);

      expect(resCotacao.estado.declaracoes).toEqual(estadoP1.declaracoes);
      expect(resCotacao.estado.hipoteses).toEqual(estadoP1.hipoteses);
      expect(resCotacao.estado.operacoes).toEqual(estadoP1.operacoes);
      expect(resCotacao.estado.operacao_pendente).toEqual(estadoP1.operacao_pendente);
      expect(resCotacao.estado.versao).toBe(estadoP1.versao + 1);

      expect(cartao).toEqual(exCotacao.dados);
    }

    // 1b. comparar_investimento
    const resComparativo = await processarTurno(
      {
        estado: estadoP1,
        mensagem: { id: "msg-comp", texto: "Quanto eu teria ganho se tivesse colocado no CDI o que investi em PETR4?" },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-comp-1",
              nome: "comparar_investimento",
              argumentos: JSON.stringify({ posicao_id: "INV3" }),
            },
          ],
        },
        { tipo: "texto", texto: "Veja o cartão com os valores calculados pelo motor." },
      ]),
    );

    expect(resComparativo.status).toBe("ok");
    if (resComparativo.status === "ok") {
      const cartao = resComparativo.cartoes.find((c) => c.tipo === "comparativo_investimento");
      expect(cartao).toBeDefined();
      expect(esquemaCartaoResposta.safeParse(cartao).success).toBe(true);

      const rastro = resComparativo.rastro[0]!;
      expect(rastro.ferramenta).toBe("comparar_investimento");
      expect((rastro.resultado as { ok: boolean }).ok).toBe(true);
      const vf = (rastro.resultado as Record<string, unknown>).valores_formatados as Record<string, string>;
      expect(vf).toBeDefined();
      expect(Object.keys(vf).some((k) => k.endsWith("_centavos"))).toBe(true);

      expect(resComparativo.estado.declaracoes).toEqual(estadoP1.declaracoes);
      expect(resComparativo.estado.hipoteses).toEqual(estadoP1.hipoteses);
      expect(resComparativo.estado.operacoes).toEqual(estadoP1.operacoes);
      expect(resComparativo.estado.operacao_pendente).toEqual(estadoP1.operacao_pendente);
      expect(resComparativo.estado.versao).toBe(estadoP1.versao + 1);

      expect(cartao).toEqual(exComparativo.dados);
    }

    // 1c. simular_investimento
    const resSimulacao = await processarTurno(
      {
        estado: estadoP1,
        mensagem: { id: "msg-sim", texto: "Quanto renderiam R$ 1.000 em 12 meses a 100% do CDI?" },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-sim-1",
              nome: "simular_investimento",
              argumentos: JSON.stringify({
                valor: "1000",
                indexador: "cdi",
                cdi_pct: 100,
                prazo_meses: 12,
              }),
            },
          ],
        },
        { tipo: "texto", texto: "Veja o cartão com os valores calculados pelo motor." },
      ]),
    );

    expect(resSimulacao.status).toBe("ok");
    if (resSimulacao.status === "ok") {
      const cartao = resSimulacao.cartoes.find((c) => c.tipo === "simulacao_investimento");
      expect(cartao).toBeDefined();
      expect(esquemaCartaoResposta.safeParse(cartao).success).toBe(true);

      const rastro = resSimulacao.rastro[0]!;
      expect(rastro.ferramenta).toBe("simular_investimento");
      expect((rastro.resultado as { ok: boolean }).ok).toBe(true);
      const vf = (rastro.resultado as Record<string, unknown>).valores_formatados as Record<string, string>;
      expect(vf).toBeDefined();
      expect(Object.keys(vf).some((k) => k.endsWith("_centavos"))).toBe(true);

      expect(resSimulacao.estado.declaracoes).toEqual(estadoP1.declaracoes);
      expect(resSimulacao.estado.hipoteses).toEqual(estadoP1.hipoteses);
      expect(resSimulacao.estado.operacoes).toEqual(estadoP1.operacoes);
      expect(resSimulacao.estado.operacao_pendente).toEqual(estadoP1.operacao_pendente);
      expect(resSimulacao.estado.versao).toBe(estadoP1.versao + 1);

      expect(cartao).toEqual(exSimulacao.dados);
    }

    // 1d. simular_pix_credito
    const resPix = await processarTurno(
      {
        estado: estadoP1,
        mensagem: { id: "msg-pix", texto: "E se eu fizer um Pix de R$ 2.500 hoje sem ter saldo, parcelado em 3x?" },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-pix-1",
              nome: "simular_pix_credito",
              argumentos: JSON.stringify({
                valor: "2500",
                parcelas: 3,
              }),
            },
          ],
        },
        { tipo: "texto", texto: "Veja o cartão com os valores calculados pelo motor." },
      ]),
    );

    expect(resPix.status).toBe("ok");
    if (resPix.status === "ok") {
      const cartao = resPix.cartoes.find((c) => c.tipo === "pix_credito");
      expect(cartao).toBeDefined();
      expect(esquemaCartaoResposta.safeParse(cartao).success).toBe(true);

      const rastro = resPix.rastro[0]!;
      expect(rastro.ferramenta).toBe("simular_pix_credito");
      expect((rastro.resultado as { ok: boolean }).ok).toBe(true);
      const vf = (rastro.resultado as Record<string, unknown>).valores_formatados as Record<string, string>;
      expect(vf).toBeDefined();
      expect(Object.keys(vf).some((k) => k.endsWith("_centavos"))).toBe(true);

      expect(resPix.estado.declaracoes).toEqual(estadoP1.declaracoes);
      expect(resPix.estado.hipoteses).toEqual(estadoP1.hipoteses);
      expect(resPix.estado.operacoes).toEqual(estadoP1.operacoes);
      expect(resPix.estado.operacao_pendente).toEqual(estadoP1.operacao_pendente);
      expect(resPix.estado.versao).toBe(estadoP1.versao + 1);

      expect(cartao).toEqual(exPixCredito.dados);
    }

    // 1e. estimar_imposto_renda
    const resIr = await processarTurno(
      {
        estado: estadoP1,
        mensagem: { id: "msg-ir", texto: "Quanto vou pagar de imposto de renda?" },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-ir-1",
              nome: "estimar_imposto_renda",
              argumentos: JSON.stringify({ escopo: "tudo" }),
            },
          ],
        },
        { tipo: "texto", texto: "Veja o cartão com os valores calculados pelo motor." },
      ]),
    );

    expect(resIr.status).toBe("ok");
    if (resIr.status === "ok") {
      const cartao = resIr.cartoes.find((c) => c.tipo === "imposto_renda");
      expect(cartao).toBeDefined();
      expect(esquemaCartaoResposta.safeParse(cartao).success).toBe(true);

      const rastro = resIr.rastro[0]!;
      expect(rastro.ferramenta).toBe("estimar_imposto_renda");
      expect((rastro.resultado as { ok: boolean }).ok).toBe(true);
      const vf = (rastro.resultado as Record<string, unknown>).valores_formatados as Record<string, string>;
      expect(vf).toBeDefined();
      expect(Object.keys(vf).some((k) => k.endsWith("_centavos"))).toBe(true);

      expect(resIr.estado.declaracoes).toEqual(estadoP1.declaracoes);
      expect(resIr.estado.hipoteses).toEqual(estadoP1.hipoteses);
      expect(resIr.estado.operacoes).toEqual(estadoP1.operacoes);
      expect(resIr.estado.operacao_pendente).toEqual(estadoP1.operacao_pendente);
      expect(resIr.estado.versao).toBe(estadoP1.versao + 1);

      expect(cartao).toEqual(exImpostoRenda.dados);
    }
  });

  // 2. Os números do cartão são idênticos aos da chamada direta do domínio
  test("2. Os números do cartão são idênticos aos da chamada direta do domínio", async () => {
    const estadoP1 = estadoInicial("p1", snapshotGravado());
    const rPersona = carregarPersona("p1");
    if (!rPersona.ok) throw new Error(rPersona.erro.mensagem);
    const persona = rPersona.persona;

    // 2a. cotação
    const rCotacaoDireta = await buscarCotacao("PETR4", { timeout_ms: 5000, ativo: false }, estadoP1.mercado);
    if (!rCotacaoDireta.ok) throw new Error(rCotacaoDireta.erro.mensagem);
    const cotacaoEsperada = montarResultadoCotacao(persona, estadoP1, contextoPadrao, rCotacaoDireta.cotacao);

    const resCot = await processarTurno(
      { estado: estadoP1, mensagem: { id: "m-cot-dir", texto: "Quanto está a PETR4 agora?" } },
      montarDeps([
        { tipo: "chamadas", chamadas: [{ id: "c1", nome: "consultar_cotacao", argumentos: JSON.stringify({ ticker: "PETR4" }) }] },
        { tipo: "texto", texto: "ok" },
      ]),
    );
    if (resCot.status === "ok") {
      const cartao = resCot.cartoes.find((c): c is Extract<CartaoResposta, { tipo: "cotacao" }> => c.tipo === "cotacao");
      expect(cartao?.resultado.preco_centavos).toBe(cotacaoEsperada.preco_centavos);
      expect(cartao?.resultado.valorizacao_periodo_pct).toBe(cotacaoEsperada.valorizacao_periodo_pct);
      expect(cartao?.resultado.na_carteira?.valor_centavos).toBe(cotacaoEsperada.na_carteira?.valor_centavos);
    }

    // 2b. comparativo
    const rCompDireto = compararInvestimento(persona, estadoP1, contextoPadrao, { posicao_id: "INV3" });
    if (!rCompDireto.ok) throw new Error(rCompDireto.erro.mensagem);

    const resComp = await processarTurno(
      { estado: estadoP1, mensagem: { id: "m-comp-dir", texto: "Quanto eu teria ganho se tivesse colocado no CDI o que investi em PETR4?" } },
      montarDeps([
        { tipo: "chamadas", chamadas: [{ id: "c2", nome: "comparar_investimento", argumentos: JSON.stringify({ posicao_id: "INV3" }) }] },
        { tipo: "texto", texto: "ok" },
      ]),
    );
    if (resComp.status === "ok") {
      const cartao = resComp.cartoes.find((c): c is Extract<CartaoResposta, { tipo: "comparativo_investimento" }> => c.tipo === "comparativo_investimento");
      expect(cartao?.resultado.real.valor_centavos).toBe(rCompDireto.real.valor_centavos);
      expect(cartao?.resultado.alternativas[0]?.valor_centavos).toBe(rCompDireto.alternativas[0]?.valor_centavos);
    }

    // 2c. simulação
    const rSimDireto = simularInvestimento(estadoP1.mercado, contextoPadrao, {
      valor_centavos: 100000,
      indexador: "cdi",
      cdi_pct: 100,
      prazo_meses: 12,
    });
    if (!rSimDireto.ok) throw new Error(rSimDireto.erro.mensagem);

    const resSim = await processarTurno(
      { estado: estadoP1, mensagem: { id: "m-sim-dir", texto: "Quanto renderiam R$ 1.000 em 12 meses a 100% do CDI?" } },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c3",
              nome: "simular_investimento",
              argumentos: JSON.stringify({ valor: "1000", indexador: "cdi", cdi_pct: 100, prazo_meses: 12 }),
            },
          ],
        },
        { tipo: "texto", texto: "ok" },
      ]),
    );
    if (resSim.status === "ok") {
      const cartao = resSim.cartoes.find((c): c is Extract<CartaoResposta, { tipo: "simulacao_investimento" }> => c.tipo === "simulacao_investimento");
      expect(cartao?.resultado.rendimento_liquido_centavos).toBe(rSimDireto.rendimento_liquido_centavos);
      expect(cartao?.resultado.valor_final_liquido_centavos).toBe(rSimDireto.valor_final_liquido_centavos);
    }

    // 2d. pix no crédito
    const rPixDireto = simularPixCredito(persona, estadoP1, { valor_centavos: 250000, parcelas: 3 });
    if (!rPixDireto.ok) throw new Error(rPixDireto.erro.mensagem);

    const resPix = await processarTurno(
      { estado: estadoP1, mensagem: { id: "m-pix-dir", texto: "E se eu fizer um Pix de R$ 2.500 hoje sem ter saldo, parcelado em 3x?" } },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c4",
              nome: "simular_pix_credito",
              argumentos: JSON.stringify({ valor: "2500", parcelas: 3 }),
            },
          ],
        },
        { tipo: "texto", texto: "ok" },
      ]),
    );
    if (resPix.status === "ok") {
      const cartao = resPix.cartoes.find((c): c is Extract<CartaoResposta, { tipo: "pix_credito" }> => c.tipo === "pix_credito");
      expect(cartao?.resultado.total_pago_centavos).toBe(rPixDireto.total_pago_centavos);
      expect(cartao?.resultado.parcela_centavos).toBe(rPixDireto.parcela_centavos);
      expect(cartao?.resultado.custo_total_centavos).toBe(rPixDireto.custo_total_centavos);
    }

    // 2e. imposto de renda
    const rIrDireto = estimarImpostoRenda(persona, estadoP1, contextoPadrao, { escopo: "tudo" });
    if (!rIrDireto.ok) throw new Error(rIrDireto.erro.mensagem);

    const resIr = await processarTurno(
      { estado: estadoP1, mensagem: { id: "m-ir-dir", texto: "Quanto vou pagar de imposto de renda?" } },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c5",
              nome: "estimar_imposto_renda",
              argumentos: JSON.stringify({ escopo: "tudo" }),
            },
          ],
        },
        { tipo: "texto", texto: "ok" },
      ]),
    );
    if (resIr.status === "ok") {
      const cartao = resIr.cartoes.find((c): c is Extract<CartaoResposta, { tipo: "imposto_renda" }> => c.tipo === "imposto_renda");
      expect(cartao?.resultado.investimentos?.total_ir_estimado_centavos).toBe(rIrDireto.investimentos?.total_ir_estimado_centavos);
      expect(cartao?.resultado.irpf?.imposto_devido_centavos).toBe(rIrDireto.irpf?.imposto_devido_centavos);
    }
  });

  // 3. consultar_cotacao com buscarCotacao falso devolvendo erro → o turno segue ok e o rastro traz { ok: false, erro: { codigo: "COTACAO_INDISPONIVEL" } }
  test("3. consultar_cotacao com erro devolvido pelo buscarCotacao injetado", async () => {
    const estadoP1 = estadoInicial("p1", snapshotGravado());
    const executoresErro = criarExecutores({
      buscarCotacao: async () => erro("COTACAO_INDISPONIVEL", textos.erros.COTACAO_INDISPONIVEL, ["ticker"]),
    });

    const res = await processarTurno(
      {
        estado: estadoP1,
        mensagem: { id: "m-cot-err", texto: "Quanto está a XYZW4 agora?" },
      },
      montarDeps(
        [
          {
            tipo: "chamadas",
            chamadas: [
              {
                id: "c-err",
                nome: "consultar_cotacao",
                argumentos: JSON.stringify({ ticker: "XYZW4" }),
              },
            ],
          },
          { tipo: "texto", texto: "Não consegui obter a cotação desse ativo agora." },
        ],
        executoresErro,
      ),
    );

    expect(res.status).toBe("ok");
    if (res.status === "ok") {
      expect(res.rastro[0]?.resultado).toMatchObject({
        ok: false,
        erro: { codigo: "COTACAO_INDISPONIVEL" },
      });
    }
  });

  // 4. simular_pix_credito em P2 → rastro com OPERACAO_NAO_PERMITIDA
  test("4. simular_pix_credito em P2 sem cartão retorna OPERACAO_NAO_PERMITIDA", async () => {
    const estadoP2 = estadoInicial("p2", snapshotGravado());
    const res = await processarTurno(
      {
        estado: estadoP2,
        mensagem: { id: "m-pix-p2", texto: "E se eu fizer um Pix de R$ 500 no crédito?" },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-pix-p2",
              nome: "simular_pix_credito",
              argumentos: JSON.stringify({ valor: "500", parcelas: 1 }),
            },
          ],
        },
        { tipo: "texto", texto: "Você não possui cartão de crédito cadastrado." },
      ]),
    );

    expect(res.status).toBe("ok");
    if (res.status === "ok") {
      expect(res.rastro[0]?.resultado).toMatchObject({
        ok: false,
        erro: { codigo: "OPERACAO_NAO_PERMITIDA" },
      });
    }
  });

  // 5. definicoesFerramentas() contém as 5 novas
  test("5. definicoesFerramentas() contém as 5 novas ferramentas", () => {
    const defs = definicoesFerramentas({ incluir_p1: true });
    const nomes = defs.map((d) => d.function.name);
    expect(nomes).toContain("consultar_cotacao");
    expect(nomes).toContain("comparar_investimento");
    expect(nomes).toContain("simular_investimento");
    expect(nomes).toContain("simular_pix_credito");
    expect(nomes).toContain("estimar_imposto_renda");
  });

  // 6. O roteiro investimentos.json passa em esquemaRoteiro e cada turno dele produz o cartão esperado
  test("6. O roteiro investimentos.json passa em esquemaRoteiro e produz o cartão esperado em cada turno", async () => {
    const caminhoRoteiro = join(process.cwd(), "src/contratos/roteiros/investimentos.json");
    const conteudoBruto = JSON.parse(readFileSync(caminhoRoteiro, "utf8"));
    const roteiro = esquemaRoteiro.parse(conteudoBruto);

    expect(roteiro.descricao).toBe("Tweaks de investimentos: cotação, comparativo, simulação, Pix no crédito e IR (P1)");
    expect(roteiro.turnos.length).toBe(5);

    const tiposEsperados = [
      "cotacao",
      "comparativo_investimento",
      "simulacao_investimento",
      "pix_credito",
      "imposto_renda",
    ] as const;

    for (let i = 0; i < roteiro.turnos.length; i++) {
      const turno = roteiro.turnos[i]!;
      const tipoEsperado = tiposEsperados[i]!;

      const provedor = criarProvedor({
        provedor: "roteirizado",
        roteiro: caminhoRoteiro,
      });

      const depsPadrao = criarDepsPadrao({ provedor: "roteirizado" });
      const deps: DepsConversa = {
        ...depsPadrao,
        provedor,
        mercado: {
          ...depsPadrao.mercado,
          buscarAoVivo: async () => snapshotGravado(),
        },
      };

      const estadoP1 = estadoInicial("p1", snapshotGravado());
      const res = await processarTurno(
        {
          estado: estadoP1,
          mensagem: { id: `m-rot-${i}`, texto: turno.mensagem },
        },
        deps,
      );

      expect(res.status).toBe("ok");
      if (res.status === "ok") {
        const cartao = res.cartoes.find((c) => c.tipo === tipoEsperado);
        expect(cartao).toBeDefined();
        expect(cartao?.tipo).toBe(tipoEsperado);
      }
    }
  });

  // 7. instrucoes.md contém IN-17 a IN-21, IN-16 e o exemplo de recusa
  test("7. instrucoes.md contém regras IN-17 a IN-21, IN-16 e recusa de recomendação", () => {
    const texto = readFileSync(join(process.cwd(), "instrucoes.md"), "utf8");
    expect(texto).toContain("IN-16");
    expect(texto).toContain("IN-17");
    expect(texto).toContain("IN-18");
    expect(texto).toContain("IN-19");
    expect(texto).toContain("IN-20");
    expect(texto).toContain("IN-21");
    expect(texto).toContain("Não posso recomendar onde investir");
  });
});
