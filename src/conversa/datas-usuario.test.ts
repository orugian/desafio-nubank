import { describe, expect, test } from "vitest";
import {
  estadoInicial,
  type DepsConversa,
  type Provedor,
  type RespostaProvedor,
} from "@/contratos";
import { processarTurno } from "@/conversa";
import { criarDepsPadrao } from "@/conversa/config";
import { snapshotGravado } from "@/mercado";
import { mencionaData } from "./datas-usuario";

function provedorSequencial(respostas: RespostaProvedor[]): Provedor {
  let idx = 0;
  return {
    nome: "roteirizado",
    modelo: "teste-datas-usuario",
    async gerar() {
      const r = respostas[idx++];
      if (!r) throw new Error("Sem mais respostas no provedor de teste");
      return r;
    },
  };
}

function montarDeps(respostas: RespostaProvedor[]): DepsConversa {
  const deps = criarDepsPadrao({ provedor: "roteirizado" });
  return {
    ...deps,
    mercado: {
      ...deps.mercado,
      buscarAoVivo: async () => snapshotGravado(),
    },
    provedor: provedorSequencial(respostas),
  };
}

describe("mencionaData", () => {
  test.each([
    "até 15/11",
    "no dia 6",
    "até o salário",
    "em novembro",
    "2026-11-20",
  ])("retorna true para menção de data '%s'", (texto) => {
    expect(mencionaData(texto)).toBe(true);
  });

  test.each([
    "Tenho dinheiro aplicado. Posso contar com ele?",
    "Posso usar minha reserva para o conserto?",
  ])("retorna false quando não há menção de data '%s'", (texto) => {
    expect(mencionaData(texto)).toBe(false);
  });
});

describe("integração consultar_investimentos com ate_data inventada", () => {
  const estadoP1 = estadoInicial("p1", snapshotGravado());

  test("remove ate_data quando usuário não menciona data ('Tenho dinheiro aplicado. Posso contar com ele?')", async () => {
    const res = await processarTurno(
      {
        estado: estadoP1,
        mensagem: {
          id: "msg-p1-sem-data",
          texto: "Tenho dinheiro aplicado. Posso contar com ele?",
        },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-inv-1",
              nome: "consultar_investimentos",
              argumentos: JSON.stringify({ ate_data: "2026-11-05" }),
            },
          ],
        },
        {
          tipo: "texto",
          texto: "Você possui investimentos aplicados que podem ser resgatados.",
        },
      ]),
    );

    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;

    expect(res.rastro).toHaveLength(1);
    const rastro0 = res.rastro[0]!;
    expect(rastro0.ferramenta).toBe("consultar_investimentos");
    expect(rastro0.argumentos).not.toHaveProperty("ate_data");
    expect(rastro0.argumentos).toEqual({});

    const resultado = rastro0.resultado as Record<string, unknown>;
    expect(resultado.ok).toBe(true);
    expect(resultado.ate_data_origem).not.toBe("informada");
  });

  test("mantém ate_data quando usuário menciona data ('Posso contar com ele até 15/11?')", async () => {
    const res = await processarTurno(
      {
        estado: estadoP1,
        mensagem: {
          id: "msg-p1-com-data",
          texto: "Posso contar com ele até 15/11?",
        },
      },
      montarDeps([
        {
          tipo: "chamadas",
          chamadas: [
            {
              id: "c-inv-2",
              nome: "consultar_investimentos",
              argumentos: JSON.stringify({ ate_data: "2026-11-15" }),
            },
          ],
        },
        {
          tipo: "texto",
          texto: "Até 15/11 seus investimentos têm disponibilidade para resgate.",
        },
      ]),
    );

    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;

    expect(res.rastro).toHaveLength(1);
    const rastro0 = res.rastro[0]!;
    expect(rastro0.ferramenta).toBe("consultar_investimentos");
    expect(rastro0.argumentos).toEqual({ ate_data: "2026-11-15" });

    const resultado = rastro0.resultado as Record<string, unknown>;
    expect(resultado.ok).toBe(true);
    expect(resultado.ate_data_origem).toBe("informada");
  });
});
