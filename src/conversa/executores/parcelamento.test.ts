import { describe, expect, test } from "vitest";
import {
  esquemaCartaoResposta,
  estadoInicial,
  type CartaoResposta,
  type DepsConversa,
  type Provedor,
  type RespostaProvedor,
} from "@/contratos";
import { processarTurno } from "@/conversa";
import { criarDepsPadrao } from "@/conversa/config";
import { criarExecutores } from "@/conversa/executores";
import { carregarPersona } from "@/dados";
import { simularParcelamento } from "@/dominio/credito/parcelamento";
import { snapshotGravado } from "@/mercado";
import exParcelamento from "@/contratos/exemplos/cartao-simulacao-parcelamento.json";

const MENSAGEM_MOTO =
  "Quero comprar uma moto no valor de R$25.000,00, a loja me deixa parcelar até 48x com juros mensal. Fazendo uma simulação, qual o cenário menos prejudicial financeiramente para adquirir a moto?";

function provedorSequencial(respostas: RespostaProvedor[]): Provedor {
  let idx = 0;
  return {
    nome: "roteirizado",
    modelo: "teste-parcelamento",
    async gerar() {
      const r = respostas[idx++];
      if (!r) throw new Error("Sem mais respostas no provedor de teste");
      return r;
    },
  };
}

function montarDeps(respostas: RespostaProvedor[], aoBuscar?: () => void): DepsConversa {
  const deps = criarDepsPadrao({ provedor: "roteirizado" });
  return {
    ...deps,
    mercado: {
      ...deps.mercado,
      buscarAoVivo: async () => {
        aoBuscar?.();
        return snapshotGravado();
      },
    },
    provedor: provedorSequencial(respostas),
  };
}

describe("executores simular_parcelamento e calcular_valores", () => {
  const executores = criarExecutores();
  const estadoP1 = estadoInicial("p1", snapshotGravado());

  test("simular_parcelamento devolve cartão válido, igual ao exemplo e com valores formatados", async () => {
    const r = await executores.ferramentas.simular_parcelamento(
      { valor: "25000", parcelas_max: 48 },
      { estado: estadoP1, mensagem_id: "m1" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estado).toBe(estadoP1);
    expect(r.cartoes).toHaveLength(1);
    const cartao = r.cartoes[0]!;
    expect(cartao.tipo).toBe("simulacao_parcelamento");
    expect(esquemaCartaoResposta.safeParse(cartao).success).toBe(true);
    expect(cartao).toEqual(exParcelamento.dados);

    const vf = r.resultado.valores_formatados as Record<string, string>;
    expect(vf.valor_centavos).toBe("R$ 25.000,00");
    expect(vf.a_vista_centavos).toBe("R$ 25.000,00");
    expect(vf["opcoes[5].parcela_centavos"]).toMatch(/^R\$ \d/);
    expect(r.resultado.menor_custo).toBe("a_vista");

    // Os números do cartão são os do domínio chamado diretamente.
    const rP = carregarPersona("p1");
    if (!rP.ok) throw new Error(rP.erro.mensagem);
    const direto = simularParcelamento(rP.persona, estadoP1, { valor_centavos: 2_500_000, parcelas_max: 48 });
    if (!direto.ok) throw new Error(direto.erro.mensagem);
    const c = cartao as Extract<CartaoResposta, { tipo: "simulacao_parcelamento" }>;
    expect(c.resultado.opcoes).toEqual(direto.opcoes);
  });

  test("simular_parcelamento funciona para P2 (sem cartão de crédito)", async () => {
    const r = await executores.ferramentas.simular_parcelamento(
      { valor: "1899.90", opcoes_parcelas: [10, 12], juros_am_pct: "0" },
      { estado: estadoInicial("p2", snapshotGravado()), mensagem_id: "m2" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.resultado.valores_formatados as Record<string, string>).valor_centavos).toBe("R$ 1.899,90");
  });

  test("simular_parcelamento com taxa anual (juros_aa_pct: \"18\") converte para taxa mensal 1.3888", async () => {
    const r = await executores.ferramentas.simular_parcelamento(
      { valor: "60000", parcelas_max: 60, juros_aa_pct: "18" },
      { estado: estadoP1, mensagem_id: "m-anual" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resultado.juros_am_pct).toBe("1.3888");
  });

  test.each([
    [{ valor: "25000", parcelas_max: 100 }, "ARGUMENTOS_INVALIDOS", "parcelas_max"],
    [{ valor: "25000", opcoes_parcelas: [12, 12] }, "ARGUMENTOS_INVALIDOS", "opcoes_parcelas"],
    [{ valor: "25000", juros_am_pct: "31" }, "ARGUMENTOS_INVALIDOS", "juros_am_pct"],
    [{ valor: "25000", entrada: "25000" }, "ARGUMENTOS_INVALIDOS", "entrada"],
    [{ valor: "25.000,00" }, "VALOR_INVALIDO", "valor"],
  ])("argumentos inválidos %j → erro tipado %s", async (args, codigo, campo) => {
    const r = await executores.ferramentas.simular_parcelamento(args, { estado: estadoP1, mensagem_id: "m3" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro.codigo).toBe(codigo);
    expect(r.erro.campos).toContain(campo);
  });

  test("calcular_valores devolve resultado, centavos formatados e nenhum cartão", async () => {
    const r = await executores.ferramentas.calcular_valores(
      { expressao: "120+85.5+230" },
      { estado: estadoP1, mensagem_id: "m4" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cartoes).toEqual([]);
    expect(r.estado).toBe(estadoP1);
    expect(r.resultado.resultado).toBe("435.50");
    expect(r.resultado.resultado_centavos).toBe(43550);
    expect((r.resultado.valores_formatados as Record<string, string>).resultado_centavos).toBe("R$ 435,50");
  });

  test("calcular_valores com divisão por zero e com texto → ARGUMENTOS_INVALIDOS", async () => {
    for (const expressao of ["10/0", "dez mais dois"]) {
      const r = await executores.ferramentas.calcular_valores({ expressao }, { estado: estadoP1, mensagem_id: "m5" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
    }
  });

  test("turno completo da moto: busca o mercado antes, devolve o cartão e não muda o estado de negócio", async () => {
    let buscas = 0;
    const res = await processarTurno(
      { estado: estadoP1, mensagem: { id: "msg-moto", texto: MENSAGEM_MOTO } },
      montarDeps(
        [
          {
            tipo: "chamadas",
            chamadas: [
              {
                id: "c-moto-1",
                nome: "simular_parcelamento",
                argumentos: JSON.stringify({ valor: "25000", parcelas_max: 48 }),
              },
            ],
          },
          { tipo: "texto", texto: "Veja o cartão com os valores calculados pelo motor." },
        ],
        () => buscas++,
      ),
    );
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(buscas).toBe(1);
    const cartao = res.cartoes.find((c) => c.tipo === "simulacao_parcelamento");
    expect(cartao).toEqual(exParcelamento.dados);
    expect(res.rastro[0]?.ferramenta).toBe("simular_parcelamento");
    expect(res.estado.declaracoes).toEqual(estadoP1.declaracoes);
    expect(res.estado.hipoteses).toEqual(estadoP1.hipoteses);
    expect(res.estado.operacoes).toEqual(estadoP1.operacoes);
  });
});
