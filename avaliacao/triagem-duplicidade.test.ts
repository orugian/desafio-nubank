import { expect, test } from "vitest";
import { avaliarCasoExecutado, carregarCasosAvaliacao } from "./executar";

test("CV-14 admite leitura preparatória da fatura sem dispensar registro e oráculo tipado", () => {
  const caso = carregarCasosAvaliacao("critico").find((c) => c.id === "CV-14")!;
  expect(caso.mensagens).toEqual(["Inclui também a compra de R$ 480 do supermercado."]);
  const consulta = { nome: "consultar_cartao", argumentos: {} };
  const registro = { nome: "registrar_declaracao", argumentos: {} };
  const textoFinal = "Possível duplicidade: Supermercado R$ 480,00 na fatura de 05/11. É outra compra?";
  const comErroTipado = avaliarCasoExecutado(caso, {
    ferramentasChamadas: [consulta, registro], textoFinal, oraculoOk: true,
  });
  expect(comErroTipado.aprovado).toBe(true);

  const soTriagem = avaliarCasoExecutado(caso, {
    ferramentasChamadas: [consulta], textoFinal, oraculoOk: false,
  });
  expect(soTriagem.aprovado).toBe(false);
  expect(soTriagem.motivos).toContain("Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao");
  expect(soTriagem.motivos).toContain("Oráculo CR-15a não atendido");
});
