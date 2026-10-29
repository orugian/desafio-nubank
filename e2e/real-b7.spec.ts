import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { esquemaRespostaTurno, type RespostaTurno } from "../src/contratos";

// Não dispara rede real na suíte padrão: B7_REAL=1 exige ativação explícita.
test.skip(process.env.B7_REAL !== "1", "B7 real exige autorização e B7_REAL=1");
test.use({ trace: "off", screenshot: "off", video: "off" });

async function mensagem(page: Page, texto: string, idCaso: string): Promise<Extract<RespostaTurno, { status: "ok" }>> {
  const dialogo = page.getByRole("dialog", { name: "Chat NewAI" });
  await dialogo.getByPlaceholder("Digite sua mensagem...").fill(texto);
  const respostaHttp = page.waitForResponse((r) => r.url().endsWith("/api/turno") && r.request().method() === "POST", { timeout: 45000 });
  await dialogo.getByRole("button", { name: "Enviar mensagem" }).click();
  const resposta = esquemaRespostaTurno.parse(await (await respostaHttp).json());
  // Somente o código público de falha é exibido: nunca corpo bruto do provedor.
  if (resposta.status !== "ok") throw new Error(`${idCaso}: ${resposta.falha.tipo}/${resposta.falha.codigo}`);
  return resposta;
}

test("B7 · 6: CV-01, CV-07 e CV-28 no app local com NVIDIA real", async ({ page }) => {
  test.setTimeout(180000);
  const evidencias: Array<Record<string, unknown>> = [];
  const salvar = () => {
    mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
    writeFileSync(join(process.cwd(), "test-results", "b7-real.json"), JSON.stringify({
      modelo: "minimaxai/minimax-m3.1-flash", casos: evidencias,
    }, null, 2) + "\n", "utf8");
  };
  try {
    await page.goto("/");
    const sessaoInicialHttp = page.waitForResponse((r) => r.url().endsWith("/api/sessao") && r.request().method() === "POST");
    await page.getByRole("button", { name: /Bia \(fictícia\)/i }).click();
    const sessaoInicial = await (await sessaoInicialHttp).json();
    expect(sessaoInicial.config.provedor).toBe("nvidia");
    expect(sessaoInicial.config.modelo).toBe("minimaxai/minimax-m3.1-flash");
    await expect(page.getByText("R$ 1.800,00", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /NewAI/i }).click();

    const cv01 = await mensagem(page, "Posso separar R$ 500 hoje para minha viagem?", "CV-01");
    const comp = cv01.cartoes.find((c) => c.tipo === "comparacao");
    const h1 = comp?.tipo === "comparacao" ? comp.cenarios.find((c) => c.cenario_id === "H1") : undefined;
    evidencias.push({ caso: "CV-01", texto: cv01.texto, ferramentas: cv01.rastro.map((r) => r.ferramenta),
      indicadores: h1?.indicadores, versao: cv01.estado.versao });
    expect(h1?.indicadores?.primeira_falta).toEqual({ data: "2026-11-15", valor_descoberto_centavos: 20000, saidas_do_dia: ["C"] });
    expect(h1?.indicadores?.saldo_final_centavos).toBe(280000);
    expect(cv01.texto).toContain("15/11");
    expect(cv01.texto).toContain("200");

    // CV-07/CV-28 partem de sessão nova conforme CR-48.
    await page.getByRole("button", { name: "Fechar chat" }).click();
    const resetHttp = page.waitForResponse((r) => r.url().endsWith("/api/sessao") && r.request().method() === "POST");
    await page.getByRole("button", { name: /Recomeçar/i }).click();
    const novaSessao = await (await resetHttp).json();
    expect(novaSessao.estado.versao).toBe(0);
    // O saldo anterior já era 1.800: esperar só pelo texto não aguarda o reset.
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("newai_sessao_v1") ?? "null")?.estado?.versao,
    )).toBe(0);
    await expect(page.getByText("R$ 1.800,00", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /NewAI/i }).click();
    const cv07 = await mensagem(page, "Guarda R$ 500 na caixinha da viagem.", "CV-07");
    const pendente = cv07.cartoes.find((c) => c.tipo === "operacao_pendente");
    evidencias.push({ caso: "CV-07", texto: cv07.texto, ferramentas: cv07.rastro.map((r) => r.ferramenta),
      pendente: cv07.estado.operacao_pendente, operacoes: cv07.estado.operacoes,
      saldo: cv07.visao.conta.saldo_disponivel_hoje_centavos });
    expect(cv07.estado.versao).toBe(1);
    expect(cv07.estado.operacao_pendente).toMatchObject({ id: "OP1", destino: "INV9", valor_centavos: 50000 });
    expect(cv07.estado.operacoes).toEqual([]);
    expect(pendente?.tipo === "operacao_pendente" ? pendente.impacto.indicadores?.insuficiencia_centavos : undefined).toBe(20000);
    expect(cv07.texto).toContain("15/11");
    expect(cv07.texto).toContain("200");

    const confirma = await mensagem(page, "sim", "CV-28 confirmação");
    evidencias.push({ caso: "CV-28-confirmacao", texto: confirma.texto,
      ferramentas: confirma.rastro.map((r) => r.ferramenta), operacoes: confirma.estado.operacoes,
      saldo: confirma.visao.conta.saldo_disponivel_hoje_centavos, versao: confirma.estado.versao });
    expect(confirma.estado.versao).toBe(2);
    expect(confirma.estado.operacoes).toEqual([{ id: "OP1", valor_centavos: 50000, destino: "INV9", data: "2026-10-30" }]);
    expect(confirma.visao.conta.saldo_disponivel_hoje_centavos).toBe(130000);
    expect(confirma.texto.toLowerCase()).toContain("simulad");

    const repete = await mensagem(page, "sim", "CV-28 repetição");
    evidencias.push({ caso: "CV-28-repeticao", texto: repete.texto,
      rastro: repete.rastro.map((r) => ({ ferramenta: r.ferramenta, resultado: r.resultado })),
      operacoes: repete.estado.operacoes, saldo: repete.visao.conta.saldo_disponivel_hoje_centavos, versao: repete.estado.versao });
    expect(repete.estado.versao).toBe(3);
    expect(repete.estado.operacoes).toEqual(confirma.estado.operacoes);
    expect(repete.visao.conta.saldo_disponivel_hoje_centavos).toBe(130000);
    expect(repete.rastro.some((r) => r.ferramenta === "confirmar_movimentacao" &&
      (r.resultado as { erro?: { codigo?: string } }).erro?.codigo === "OPERACAO_JA_EXECUTADA")).toBe(true);
    await page.getByRole("button", { name: "Fechar chat" }).click();
    await expect(page.getByText("R$ 1.300,00", { exact: true })).toBeVisible();
  } finally {
    salvar();
  }
});
