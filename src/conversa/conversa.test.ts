import { describe, expect, test } from "vitest";
import {
  esquemaRespostaTurno,
  estadoInicial,
  type DepsConversa,
  type MensagemProvedor,
  type Provedor,
  type RespostaProvedor,
  type SnapshotMercado,
} from "@/contratos";
import { processarTurno } from "@/conversa";
import { criarExecutores } from "@/conversa/executores";

const snapshotTeste: SnapshotMercado = {
  ao_vivo: false,
  obtido_em: "2026-10-28T11:00:00-03:00",
  tentou_ao_vivo: false,
  cdi: { taxa_diaria_pct: "0.05", data_ref: "2026-10-29", fonte: "CDI de teste (spec §11.4)" },
  precos: {
    ITUB4: { preco_centavos: 3300, data_hora: "2026-10-27T18:00:00-03:00", fonte: "brapi" },
    BTC: { preco_centavos: 38000000, data_hora: "2026-10-27T21:00:00-03:00", fonte: "CoinGecko" },
  },
};

function provedorSequencial(respostas: RespostaProvedor[], capturadas?: MensagemProvedor[][]): Provedor {
  let idx = 0;
  return {
    nome: "roteirizado",
    modelo: "roteiro-teste",
    async gerar(mensagens) {
      capturadas?.push(mensagens);
      const r = respostas[idx];
      idx += 1;
      if (!r) throw new Error("Sem mais respostas no provedor de teste");
      return r;
    },
  };
}

function depsBase(provedor: Provedor): DepsConversa {
  return {
    provedor,
    executores: criarExecutores(),
    mercado: {
      snapshotGravado: () => snapshotTeste,
      buscarAoVivo: async () => snapshotTeste,
    },
    instrucoes: async () => "Instruções de teste",
  };
}

describe("B4 · Conversa", () => {
  test("1. Mensagem → provedor pede criar_hipotese → executor → provedor responde texto → status: ok, cartão de comparação, versão + 1", async () => {
    const estado0 = estadoInicial("p1", snapshotTeste);
    const provedor = provedorSequencial([
      {
        tipo: "chamadas",
        chamadas: [
          {
            id: "call_cv01_1",
            nome: "criar_hipotese",
            argumentos: JSON.stringify({
              nome: "Separar R$ 500 hoje",
              a_partir_de: "atual",
              alteracoes: [{ operacao: "separar", valor: "500", data: "2026-10-30" }],
            }),
          },
        ],
      },
      {
        tipo: "texto",
        texto:
          "Se você separar R$ 500 hoje, o saldo zera em 10/11, no aluguel, e faltam R$ 200,00 em 15/11, no débito das contas da casa.",
      },
    ]);

    const res = await processarTurno(
      {
        estado: estado0,
        mensagem: { id: "m-0001", texto: "Posso separar R$ 500 hoje para minha viagem?" },
      },
      depsBase(provedor),
    );

    const validado = esquemaRespostaTurno.parse(res);
    expect(validado.status).toBe("ok");
    if (validado.status !== "ok") return;

    expect(validado.estado.versao).toBe(1);
    expect(validado.estado.hipoteses).toHaveLength(1);
    expect(validado.estado.hipoteses[0]?.id).toBe("H1");
    expect(validado.rastro).toHaveLength(1);
    expect(validado.rastro[0]?.ferramenta).toBe("criar_hipotese");

    const comparacao = validado.cartoes.find((c) => c.tipo === "comparacao");
    expect(comparacao).toBeDefined();
    if (comparacao?.tipo === "comparacao") {
      expect(comparacao.cenarios.map((c) => c.cenario_id)).toEqual(["atual", "H1"]);
      expect(comparacao.cenarios[1]?.indicadores?.primeira_falta).toEqual({
        data: "2026-11-15",
        valor_descoberto_centavos: 20000,
        saidas_do_dia: ["C"],
      });
    }
  });

  test("2. Argumento inválido → erro devolvido ao modelo, nada aplicado; segunda chamada corrige e anexa o_que_mudou", async () => {
    const estado0 = estadoInicial("p1", snapshotTeste);
    const capturadas: MensagemProvedor[][] = [];
    const provedor = provedorSequencial(
      [
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "call_1",
              nome: "registrar_declaracao",
              argumentos: JSON.stringify({
                alteracao: { operacao: "alterar_evento", evento_id: "C", valor: "R$ 150" },
              }),
            },
          ],
        },
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "call_2",
              nome: "registrar_declaracao",
              argumentos: JSON.stringify({
                alteracao: { operacao: "alterar_evento", evento_id: "C", valor: "150" },
              }),
            },
          ],
        },
        {
          tipo: "texto",
          texto: "Atualizei as contas da casa (C) em 15/11 para R$ 150,00.",
        },
      ],
      capturadas,
    );

    const res = await processarTurno(
      {
        estado: estado0,
        mensagem: { id: "m-0002", texto: "Na verdade as contas da casa do dia 15 são R$ 150." },
      },
      depsBase(provedor),
    );

    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;

    const msgFerramenta1 = capturadas[1]?.find(
      (m) => m.papel === "ferramenta" && m.chamada_id === "call_1",
    );
    expect(msgFerramenta1).toBeDefined();
    if (msgFerramenta1?.papel === "ferramenta") {
      const payload = JSON.parse(msgFerramenta1.conteudo);
      expect(payload.ok).toBe(false);
      expect(payload.erro.codigo).toBe("VALOR_INVALIDO");
    }

    expect(res.estado.declaracoes).toHaveLength(1);
    expect(res.estado.declaracoes[0]?.id).toBe("D1");
    expect(res.rastro).toHaveLength(2);
    expect(res.cartoes.some((c) => c.tipo === "o_que_mudou")).toBe(true);
    expect(res.cartoes.some((c) => c.tipo === "comparacao")).toBe(true);
  });

  test("3. Terceira chamada ainda pedindo ferramenta → F-05 com o estado de entrada", async () => {
    const estado0 = estadoInicial("p1", snapshotTeste);
    const chamadaSeparar: RespostaProvedor = {
      tipo: "chamadas",
      chamadas: [
        {
          id: "call_loop",
          nome: "criar_hipotese",
          argumentos: JSON.stringify({
            nome: "Separar R$ 500 hoje",
            a_partir_de: "atual",
            alteracoes: [{ operacao: "separar", valor: "500", data: "2026-10-30" }],
          }),
        },
      ],
    };
    const provedor = provedorSequencial([chamadaSeparar, chamadaSeparar, chamadaSeparar]);

    const res = await processarTurno(
      {
        estado: estado0,
        mensagem: { id: "m-0003", texto: "Posso separar R$ 500?" },
      },
      depsBase(provedor),
    );

    const validado = esquemaRespostaTurno.parse(res);
    expect(validado).toEqual({
      status: "falha",
      falha: {
        tipo: "F-05",
        codigo: "LIMITE_CHAMADAS",
        mensagem: "Não consegui concluir esta etapa.",
        pode_tentar_novamente: true,
      },
      estado: estado0,
    });
  });
});
