import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { esquemaRespostaSessao, esquemaRespostaTurno } from "@/contratos";
import { POST as postSessao } from "@/app/api/sessao/route";
import { POST as postTurno } from "@/app/api/turno/route";

describe("M1 · Tracer bullet (Bia pergunta 'Posso separar R$ 500 hoje?' em /api/turno)", () => {
  test("Provedor roteirizado repete a chamada gravada no S0 para CV-01 em /api/turno e motor real calcula CR-02 (falta de 20000 em 2026-11-15)", async () => {
    const brutoS0 = JSON.parse(
      readFileSync(join(__dirname, "fixtures", "s0-minimax-cv01.json"), "utf8"),
    );
    const tcS0 = brutoS0.choices[0].message.tool_calls[0];

    const roteiroAntigo = process.env.LLM_ROTEIRO;
    const provedorAntigo = process.env.LLM_PROVEDOR;
    process.env.LLM_PROVEDOR = "roteirizado";
    process.env.LLM_ROTEIRO = "src/conversa/fixtures/roteiro-cv01-s0.json";

    try {
      const reqSessao = new Request("http://localhost:3102/api/sessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: "p1" }),
      });
      const sessao = esquemaRespostaSessao.parse(await (await postSessao(reqSessao)).json());

      const reqTurno = new Request("http://localhost:3102/api/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: sessao.estado,
          mensagem: { id: "m-m1-01", texto: "Posso separar R$ 500 hoje para minha viagem?" },
        }),
      });
      const resTurno = await postTurno(reqTurno);
      const turno = esquemaRespostaTurno.parse(await resTurno.json());

      expect(turno.status).toBe("ok");
      if (turno.status !== "ok") return;

      expect(turno.rastro[0]?.ferramenta).toBe(tcS0.function.name);
      expect(turno.rastro[0]?.argumentos).toEqual(JSON.parse(tcS0.function.arguments));

      const comparacao = turno.cartoes.find((c) => c.tipo === "comparacao");
      expect(comparacao).toBeDefined();
      if (comparacao?.tipo === "comparacao") {
        const h1 = comparacao.cenarios.find((c) => c.cenario_id === "H1");
        expect(h1?.indicadores?.primeira_falta).toEqual({
          data: "2026-11-15",
          valor_descoberto_centavos: 20000,
          saidas_do_dia: ["C"],
        });
        expect(h1?.indicadores?.insuficiencia_centavos).toBe(20000);
        expect(h1?.linhas.find((l) => l.evento_id === "B")?.rotulo).toBe("Saldo zerado");
      }
      expect(turno.texto).toContain("15/11");
      expect(turno.texto).toContain("200");
    } finally {
      if (roteiroAntigo === undefined) delete process.env.LLM_ROTEIRO;
      else process.env.LLM_ROTEIRO = roteiroAntigo;
      if (provedorAntigo === undefined) delete process.env.LLM_PROVEDOR;
      else process.env.LLM_PROVEDOR = provedorAntigo;
    }
  });
});
