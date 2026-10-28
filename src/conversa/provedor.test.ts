import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { definicoesFerramentas } from "@/contratos";
import { criarProvedor } from "./provedor";

describe("B4 · Passo 8 · Adaptador do provedor (OpenAI e roteirizado)", () => {
  test("8a. Provedor nvidia escolhe URL, chave e modelo e converte tool_calls da resposta gravada no S0 (CV-01)", async () => {
    const brutoCv01 = JSON.parse(
      readFileSync(join(__dirname, "fixtures", "s0-minimax-cv01.json"), "utf8"),
    );

    let urlChamada = "";
    let initChamado: RequestInit | undefined;
    const fetchDuble: typeof fetch = async (input, init) => {
      urlChamada = String(input);
      initChamado = init;
      return new Response(JSON.stringify(brutoCv01), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const provedor = criarProvedor({
      provedor: "nvidia",
      modelo: "minimaxai/minimax-m3.1-flash",
      apiKey: "chave-ficticia-teste",
      fetchImpl: fetchDuble,
    });

    const resp = await provedor.gerar(
      [
        { papel: "sistema", conteudo: "Instruções" },
        { papel: "usuario", conteudo: "Posso separar R$ 500 hoje para minha viagem?" },
      ],
      definicoesFerramentas(),
      { timeout_ms: 15000 },
    );

    expect(urlChamada).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    const headers = initChamado?.headers as Record<string, string>;
    expect(headers.Authorization).toContain("chave-ficticia-teste");

    const corpo = JSON.parse(String(initChamado?.body));
    expect(corpo.model).toBe("minimaxai/minimax-m3.1-flash");
    expect(corpo.tools.length).toBeGreaterThan(0);

    expect(resp).toEqual({
      tipo: "chamadas",
      chamadas: [
        {
          id: "call-22257aab-41c5-4d44-8f42-322df89b74dd",
          nome: "criar_hipotese",
          argumentos:
            '{"nome":"Separar R$ 500 para viagem","a_partir_de":"atual","alteracoes":[{"operacao":"separar","valor":"500.00","data":"2026-10-30"}]}',
        },
      ],
    });
  });

  test("8b. Provedor openrouter converte resposta de texto gravada no S0 (CV-11) e mensagens de ferramenta", async () => {
    const brutoCv11 = JSON.parse(
      readFileSync(join(__dirname, "fixtures", "s0-minimax-cv11.json"), "utf8"),
    );

    let urlChamada = "";
    let corpoEnviado: Record<string, unknown> = {};
    const fetchDuble: typeof fetch = async (input, init) => {
      urlChamada = String(input);
      corpoEnviado = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(brutoCv11), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const provedor = criarProvedor({
      provedor: "openrouter",
      modelo: "deepseek/deepseek-v4.1-flash-1017",
      apiKey: "chave-or-teste",
      fetchImpl: fetchDuble,
    });

    const resp = await provedor.gerar(
      [
        { papel: "sistema", conteudo: "Instruções" },
        { papel: "usuario", conteudo: "Posso separar R$ 500?" },
        {
          papel: "assistente",
          conteudo: "",
          chamadas: [{ id: "c1", nome: "criar_hipotese", argumentos: "{}" }],
        },
        { papel: "ferramenta", chamada_id: "c1", conteudo: '{"ok":true}' },
      ],
      definicoesFerramentas(),
      { timeout_ms: 15000 },
    );

    expect(urlChamada).toBe("https://openrouter.ai/api/v1/chat/completions");
    const msgs = corpoEnviado.messages as Array<Record<string, unknown>>;
    expect(msgs[2]?.role).toBe("assistant");
    expect(msgs[3]).toEqual({ role: "tool", tool_call_id: "c1", content: '{"ok":true}' });
    expect(resp.tipo).toBe("texto");
    if (resp.tipo === "texto") {
      expect(resp.texto).toContain("Qual será o meio de pagamento");
    }
  });

  test("8c. Provedor roteirizado lê LLM_ROTEIRO (cv-01.json) e devolve chamadas e texto na ordem", async () => {
    const provedor = criarProvedor({
      provedor: "roteirizado",
      roteiro: "src/contratos/roteiros/cv-01.json",
    });

    const r1 = await provedor.gerar(
      [{ papel: "usuario", conteudo: "  posso separar r$ 500 hoje para minha viagem? " }],
      definicoesFerramentas(),
      { timeout_ms: 15000 },
    );
    expect(r1.tipo).toBe("chamadas");

    const r2 = await provedor.gerar(
      [
        { papel: "usuario", conteudo: "Posso separar R$ 500 hoje para minha viagem?" },
        {
          papel: "assistente",
          conteudo: "",
          chamadas: [{ id: "call_cv01_1", nome: "criar_hipotese", argumentos: "{}" }],
        },
        { papel: "ferramenta", chamada_id: "call_cv01_1", conteudo: '{"ok":true}' },
      ],
      definicoesFerramentas(),
      { timeout_ms: 15000 },
    );
    expect(r2.tipo).toBe("texto");
  });
});
