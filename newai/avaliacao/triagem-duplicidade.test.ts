import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { estadoInicial, esquemaCartaoVisao, formatarDiaMes, formatarReais, type Provedor, type RespostaProvedor } from "@/contratos";
import { processarTurno } from "@/conversa";
import { obterSnapshotFallback } from "@/conversa/config";
import { criarExecutores } from "@/conversa/executores";
import { avaliarCasoExecutado, carregarCasosAvaliacao } from "./executar";
import { verificarOraculoB6 } from "./oraculos";

async function rodarCV14(provedor: Provedor) {
  const snapshot = obterSnapshotFallback();
  const entrada = estadoInicial("p3", snapshot);
  const resposta = await processarTurno({
    estado: entrada,
    mensagem: { id: "cv14-triagem", texto: "Inclui também a compra de R$ 480 do supermercado." },
  }, {
    provedor,
    executores: criarExecutores(),
    instrucoes: async () => readFileSync(join(__dirname, "..", "instrucoes.md"), "utf8"),
    mercado: { snapshotGravado: () => snapshot, buscarAoVivo: async () => snapshot },
  });
  return { entrada, resposta };
}

test("CV-14 (PEDIDO 4, opção A): exige a triagem consultar_cartao sem registro; oráculo CR-15a-triagem", () => {
  const caso = carregarCasosAvaliacao("critico").find((c) => c.id === "CV-14")!;
  expect(caso.mensagens).toEqual(["Inclui também a compra de R$ 480 do supermercado."]);
  expect(caso.esperado.oraculo).toBe("CR-15a-triagem");
  expect(caso.esperado.ferramentas).toEqual([{ nome: "consultar_cartao" }]);
  const consulta = { nome: "consultar_cartao", argumentos: {} };
  const textoFinal = "Já existe Supermercado de R$ 480,00 na fatura de 05/11. É outra compra?";
  expect(avaliarCasoExecutado(caso, { ferramentasChamadas: [consulta], textoFinal, oraculoOk: true }).aprovado).toBe(true);

  const semPergunta = avaliarCasoExecutado(caso, {
    ferramentasChamadas: [consulta], textoFinal: "Supermercado de R$ 480,00 na fatura de 05/11.", oraculoOk: true,
  });
  expect(semPergunta.motivos).toContain("Não perguntou se é outra compra, diferente do item da fatura");

  const semConsulta = avaliarCasoExecutado(caso, { ferramentasChamadas: [], textoFinal, oraculoOk: false });
  expect(semConsulta.motivos).toContain("Ferramenta esperada ausente ou com argumentos divergentes: consultar_cartao");
});

test("CR-15a-triagem rejeita registro com dados inventados e aceita erro tipado legítimo", async () => {
  // Erro tipado só é legítimo com dados próprios completos; o roteiro abaixo inventa data e meio.
  const inventado: RespostaProvedor[] = [
    { tipo: "chamadas", chamadas: [{ id: "c1", nome: "consultar_cartao", argumentos: "{}" }] },
    { tipo: "chamadas", chamadas: [{ id: "r1", nome: "registrar_declaracao", argumentos: JSON.stringify({
      alteracao: { operacao: "adicionar_evento", tipo: "saida", descricao: "Supermercado", data: "2026-10-30", valor: "480", meio: "cartao_credito" },
    }) }] },
    { tipo: "texto", texto: "Possível duplicidade: Supermercado R$ 480,00 na fatura de 05/11. É outra compra?" },
  ];
  const { resposta } = await rodarCV14({
    nome: "roteirizado", modelo: "cv14-inventado",
    async gerar() { const r = inventado.shift(); if (!r) throw new Error("roteiro esgotado"); return r; },
  });
  if (resposta.status !== "ok") throw new Error("turno falhou");
  expect(verificarOraculoB6("CR-15a-triagem", resposta, resposta.estado)).toContain(
    "Registro de nova compra sem data e meio informados pela pessoa",
  );
});

test("triagem pública consulta o item existente sem inventar nem registrar uma nova compra", async () => {
  const rede = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede proibida"));
  let chamadas = 0;
  try {
    const { entrada, resposta } = await rodarCV14({
      nome: "roteirizado", modelo: "cv14-fatura-somente-leitura",
      async gerar(mensagens) {
        chamadas += 1;
        if (chamadas === 1) return {
          tipo: "chamadas", chamadas: [{ id: "ler-fatura", nome: "consultar_cartao", argumentos: "{}" }],
        };
        const ultima = mensagens.at(-1);
        if (ultima?.papel !== "ferramenta") throw new Error("resultado de consulta ausente");
        const resultado = JSON.parse(ultima.conteudo);
        const cartao = esquemaCartaoVisao.parse(resultado.cartao);
        const fatura = cartao.fatura_fechada;
        const item = fatura?.itens.find((i) => i.descricao === "Supermercado" && i.valor_centavos === 48000);
        if (!fatura || !item) throw new Error("item existente não encontrado");
        expect(item.data).toBe("2026-10-03");
        return { tipo: "texto", texto: `Encontrei ${item.descricao} de ${formatarReais(item.valor_centavos)} na fatura de ${formatarDiaMes(fatura.vencimento)}. Pode ser o mesmo gasto. É outra compra, diferente desse item? Nada foi acrescentado.` };
      },
    });
    expect(resposta.status).toBe("ok");
    if (resposta.status !== "ok") throw new Error("turno falhou");
    expect(resposta.rastro.map((r) => r.ferramenta)).toEqual(["consultar_cartao"]);
    expect(resposta.cartoes[0]?.tipo).toBe("cartao_credito");
    expect(resposta.texto).toContain("Supermercado de R$ 480,00 na fatura de 05/11");
    const { conversa: _c1, versao: _v1, ...antes } = entrada;
    const { conversa: _c2, versao: _v2, ...depois } = resposta.estado;
    expect(depois).toEqual(antes);
    expect(verificarOraculoB6("CR-15a-triagem", resposta, resposta.estado)).toEqual([]);
    expect(rede).not.toHaveBeenCalled();
  } finally { rede.mockRestore(); }
});

test.each([
  { nome: "sem meio/data", extra: {}, codigo: "ARGUMENTOS_INVALIDOS" },
  { nome: "usando a data do item antigo", extra: { data: "2026-10-03", meio: "cartao_credito" }, codigo: "DATA_ANTES_DE_HOJE" },
])("contrato atual não transforma tentativa $nome em erro de duplicidade", async ({ extra, codigo }) => {
  const roteiro: RespostaProvedor[] = [
    { tipo: "chamadas", chamadas: [{ id: "registro-incompleto", nome: "registrar_declaracao", argumentos: JSON.stringify({
      alteracao: { operacao: "adicionar_evento", tipo: "saida", descricao: "Supermercado", valor: "480", ...extra },
    }) }] },
    { tipo: "texto", texto: "Não registrei a compra. Faltam dados válidos para uma nova compra." },
  ];
  const { entrada, resposta } = await rodarCV14({
    nome: "roteirizado", modelo: "cv14-contrato-estrito",
    async gerar() { const r = roteiro.shift(); if (!r) throw new Error("roteiro esgotado"); return r; },
  });
  expect(resposta.status).toBe("ok");
  if (resposta.status !== "ok") throw new Error("turno falhou");
  expect(resposta.rastro[0]?.resultado).toMatchObject({ ok: false, erro: { codigo } });
  const { conversa: _c1, versao: _v1, ...antes } = entrada;
  const { conversa: _c2, versao: _v2, ...depois } = resposta.estado;
  expect(depois).toEqual(antes);
});
