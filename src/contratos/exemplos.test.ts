import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { esquemas, esquemaRoteiro, type NomeEsquema } from "@/contratos";

// B0 · comportamento 1: cada exemplo JSON é aceito pelo seu esquema;
// exemplo inválido conhecido é rejeitado.

const PASTA = join(__dirname, "exemplos");

type Envelope = { exemplo: true; esquema: NomeEsquema; descricao: string; dados: unknown };

function lerEnvelopes(pasta: string): Array<{ arquivo: string; env: Envelope }> {
  return readdirSync(pasta)
    .filter((f) => f.endsWith(".json"))
    .map((arquivo) => ({ arquivo, env: JSON.parse(readFileSync(join(pasta, arquivo), "utf8")) as Envelope }));
}

const validos = lerEnvelopes(PASTA);
const invalidos = lerEnvelopes(join(PASTA, "invalidos"));

function problemas(nome: NomeEsquema, dados: unknown): string {
  const r = esquemas[nome].safeParse(dados);
  return r.success ? "" : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
}

describe("exemplos do contrato", () => {
  test.each(validos.map((v) => [v.arquivo, v.env] as const))("%s é aceito pelo seu esquema", (_arquivo, env) => {
    expect(env.exemplo).toBe(true);
    expect(Object.keys(esquemas)).toContain(env.esquema);
    expect(problemas(env.esquema, env.dados)).toBe("");
  });

  test.each(invalidos.map((v) => [v.arquivo, v.env] as const))("inválido %s é rejeitado", (_arquivo, env) => {
    expect(esquemas[env.esquema].safeParse(env.dados).success).toBe(false);
  });

  test("há VisaoApp das 3 personas, com P2 sem cartão", () => {
    const visoes = validos.filter((v) => v.env.esquema === "VisaoApp").map((v) => v.env.dados as { persona: { id: string }; cartao: unknown });
    expect(visoes.map((v) => v.persona.id).sort()).toEqual(["p1", "p2", "p3"]);
    expect(visoes.find((v) => v.persona.id === "p2")?.cartao).toBeNull();
  });

  test("há um exemplo de cada tipo de cartão de resposta", () => {
    const tipos = validos
      .filter((v) => v.env.esquema === "CartaoResposta")
      .map((v) => (v.env.dados as { tipo: string }).tipo);
    expect(new Set(tipos)).toEqual(
      new Set([
        "comparacao",
        "o_que_mudou",
        "historico",
        "cartao_credito",
        "investimentos",
        "rendimento",
        "operacao_pendente",
        "operacao_concluida",
        "aviso_valor",
        "rascunho_atendimento",
        "erro",
        "cotacao",
        "comparativo_investimento",
        "simulacao_investimento",
        "pix_credito",
        "imposto_renda",
        "simulacao_parcelamento",
      ]),
    );
  });

  test("há respostas de /api/personas, /api/sessao com config, /api/turno e /api/acao", () => {
    const por = (n: NomeEsquema) => validos.filter((v) => v.env.esquema === n).map((v) => v.env.dados as Record<string, unknown>);
    expect(por("RespostaPersonas")).toHaveLength(1);
    expect(por("RespostaSessao")[0]?.config).toBeDefined();
    expect(por("RespostaTurno").some((d) => d.status === "ok")).toBe(true);
    expect(por("RespostaAcao").some((d) => d.status === "ok")).toBe(true);
  });

  test("há uma falha de cada tipo F-01 a F-06, uma de domínio e F-07 como aviso de resposta ok", () => {
    const tipos = validos
      .filter((v) => v.env.esquema === "RespostaFalha")
      .map((v) => (v.env.dados as { falha: { tipo: string } }).falha.tipo);
    expect(new Set(tipos)).toEqual(new Set(["F-01", "F-02", "F-03", "F-04", "F-05", "F-06", "dominio"]));
    const f06 = validos.find((v) => (v.env.dados as { falha?: { tipo: string } }).falha?.tipo === "F-06");
    expect((f06?.env.dados as { falha: { codigo: string } }).falha.codigo).toBe("ESTADO_INVALIDO");
    const comF07 = validos.filter(
      (v) =>
        v.env.esquema === "RespostaTurno" &&
        (v.env.dados as { status: string; avisos?: Array<{ codigo: string }> }).avisos?.some((a) => a.codigo === "F-07"),
    );
    expect(comF07).toHaveLength(1);
    expect((comF07[0].env.dados as { status: string }).status).toBe("ok");
  });

  test("o roteiro de exemplo de CV-01 é aceito pelo esquema de roteiro", () => {
    const roteiro = JSON.parse(readFileSync(join(__dirname, "roteiros", "cv-01.json"), "utf8"));
    expect(esquemaRoteiro.safeParse(roteiro).success).toBe(true);
  });
});
