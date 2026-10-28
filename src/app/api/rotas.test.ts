import { describe, expect, test } from "vitest";
import {
  esquemaRespostaAcao,
  esquemaRespostaFalha,
  esquemaRespostaPersonas,
  esquemaRespostaSessao,
  esquemaRespostaTurno,
} from "@/contratos";
import { GET as getPersonas } from "./personas/route";
import { POST as postSessao } from "./sessao/route";
import { POST as postTurno } from "./turno/route";
import { POST as postAcao } from "./acao/route";

describe("B4 · Passo 9 · Rotas HTTP (/api/personas, /api/sessao, /api/turno, /api/acao)", () => {
  test("9a. GET /api/personas devolve lista válida pelo esquema", async () => {
    const res = await getPersonas();
    const json = await res.json();
    const validado = esquemaRespostaPersonas.parse(json);
    expect(validado.some((p) => p.id === "p1")).toBe(true);
  });

  test("9b. POST /api/sessao devolve estado versão 0, visao e config, e rejeita entrada inválida", async () => {
    const reqOk = new Request("http://localhost:3102/api/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_id: "p1" }),
    });
    const resOk = await postSessao(reqOk);
    const jsonOk = await resOk.json();
    const sessao = esquemaRespostaSessao.parse(jsonOk);
    expect(sessao.estado.versao).toBe(0);
    expect(sessao.config.ferramentas.length).toBeGreaterThanOrEqual(11);
    expect(sessao.config.instrucoes).toContain("IN-01");

    const reqInv = new Request("http://localhost:3102/api/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_id: "invalida" }),
    });
    const resInv = await postSessao(reqInv);
    const jsonInv = await resInv.json();
    const falha = esquemaRespostaFalha.parse(jsonInv);
    expect(falha.falha.codigo).toBe("ENTRADA_INVALIDA");
  });

  test("9c. POST /api/turno valida entrada pelo esquema e executa CV-01 com provedor roteirizado", async () => {
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
        mensagem: { id: "m-0001", texto: "Posso separar R$ 500 hoje para minha viagem?" },
      }),
    });
    const resTurno = await postTurno(reqTurno);
    const turno = esquemaRespostaTurno.parse(await resTurno.json());
    expect(turno.status).toBe("ok");
    if (turno.status === "ok") {
      expect(turno.estado.versao).toBe(1);
    }

    const reqTurnoInv = new Request("http://localhost:3102/api/turno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: sessao.estado, mensagem: { id: "", texto: "" } }),
    });
    const falhaTurno = esquemaRespostaFalha.parse(await (await postTurno(reqTurnoInv)).json());
    expect(falhaTurno.falha.codigo).toBe("ENTRADA_INVALIDA");
  });

  test("9d. POST /api/acao valida entrada pelo esquema", async () => {
    const reqAcaoInv = new Request("http://localhost:3102/api/acao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: { tipo: "invalido" } }),
    });
    const resInv = await postAcao(reqAcaoInv);
    const falha = esquemaRespostaFalha.parse(await resInv.json());
    expect(falha.falha.codigo).toBe("ENTRADA_INVALIDA");
    expect(esquemaRespostaAcao.safeParse(falha).success).toBe(true);
  });
});
