import { expect, test, type Locator, type Page } from "@playwright/test";

// Execute com NEXT_PUBLIC_API_EXEMPLOS=1, LLM_PROVEDOR=roteirizado e
// MERCADO_AO_VIVO=0 no processo que inicia o Playwright/webServer. Nunca reutilize
// um servidor existente: a variável NEXT_PUBLIC é incorporada ao bundle Next.
test.use({ trace: "off", screenshot: "off", video: "off" });
test.skip(
  process.env.NEXT_PUBLIC_API_EXEMPLOS !== "1" || process.env.LLM_PROVEDOR !== "roteirizado" || process.env.MERCADO_AO_VIVO !== "0",
  "Teste opt-in: exige NEXT_PUBLIC_API_EXEMPLOS=1, LLM_PROVEDOR=roteirizado e MERCADO_AO_VIVO=0",
);

async function acessivelNoViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  const resultado = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const alvo = document.elementFromPoint(x, y);
    return {
      dentro: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      recebeClique: !!alvo && (alvo === el || el.contains(alvo)),
      alvo: alvo ? `${alvo.tagName}.${alvo.getAttribute("class") ?? ""}` : null,
      centro: { x, y },
    };
  });
  expect(resultado.dentro, `controle fora do viewport: ${await locator.getAttribute("aria-label")} ${JSON.stringify(resultado)}`).toBe(true);
  expect(resultado.recebeClique, `controle encoberto: ${await locator.getAttribute("aria-label")} ${JSON.stringify(resultado)}`).toBe(true);
}

async function semOverflowHorizontal(page: Page) {
  const dimensoes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documento: document.documentElement.scrollWidth,
    corpo: document.body.scrollWidth,
  }));
  expect(dimensoes.documento, JSON.stringify(dimensoes)).toBeLessThanOrEqual(dimensoes.viewport + 1);
  expect(dimensoes.corpo, JSON.stringify(dimensoes)).toBeLessThanOrEqual(dimensoes.viewport + 1);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
  { name: "mobile pequeno", width: 320, height: 568 },
]) {
  test(`${viewport.name}: moldura, navegação, chat, rolagem e reset offline`, async ({ page }) => {
    expect(process.env.NEXT_PUBLIC_API_EXEMPLOS, "Inicie o servidor com o modo exemplos offline").toBe("1");
    expect(process.env.LLM_PROVEDOR).toBe("roteirizado");
    expect(process.env.MERCADO_AO_VIVO).toBe("0");
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Defesa adicional: a UI não pode fazer chamadas API nem sair do localhost.
    const bloqueadas: string[] = [];
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if ((url.hostname !== "localhost" && url.hostname !== "127.0.0.1") || url.pathname.startsWith("/api/")) {
        bloqueadas.push(`${url.origin}${url.pathname}`);
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto("/");
    await page.getByRole("button", { name: /Bia \(fictícia\)/i }).click();
    await expect(page.getByText("R$ 1.800,00", { exact: true })).toBeVisible();
    await semOverflowHorizontal(page);

    const inicio = page.getByRole("button", { name: "Início", exact: true });
    const investimentos = page.getByRole("button", { name: "Investimentos", exact: true });
    const conta = page.getByRole("button", { name: "Conta e extrato", exact: true });
    const abrirChat = page.getByRole("button", { name: "NewAI", exact: true });
    for (const controle of [inicio, investimentos, conta, abrirChat]) await acessivelNoViewport(controle);

    if (viewport.name === "desktop") {
      const cabecalho = page.locator("header").first();
      const quadro = await cabecalho.boundingBox();
      const botao = await abrirChat.boundingBox();
      expect(quadro).not.toBeNull();
      expect(botao).not.toBeNull();
      expect(quadro!.x).toBeGreaterThan(50);
      expect(viewport.width - (quadro!.x + quadro!.width)).toBeGreaterThan(50);
      expect(Math.abs(quadro!.x - (viewport.width - quadro!.x - quadro!.width))).toBeLessThan(3);
      expect(botao!.x + botao!.width).toBeLessThanOrEqual(quadro!.x + quadro!.width + 1);
    }

    await investimentos.click();
    await expect(page.getByRole("heading", { name: "Total investido" })).toBeVisible();
    await semOverflowHorizontal(page);
    await conta.click();
    await expect(page.getByRole("tablist", { name: "Seções da conta" })).toBeVisible();
    await inicio.click();
    await expect(page.getByText("R$ 1.800,00", { exact: true })).toBeVisible();

    const areaRolavel = page.locator(".newai-scroll");
    const antes = await areaRolavel.evaluate((el) => el.scrollTop);
    await areaRolavel.hover();
    await page.mouse.wheel(0, 700);
    await expect.poll(() => areaRolavel.evaluate((el) => el.scrollTop)).toBeGreaterThan(antes);
    for (const controle of [inicio, investimentos, conta, abrirChat]) await acessivelNoViewport(controle);
    await semOverflowHorizontal(page);

    await abrirChat.click();
    const chat = page.getByRole("dialog", { name: /Chat/i });
    await expect(chat).toBeVisible();
    const fechar = chat.getByRole("button", { name: /Fechar chat/i });
    const input = chat.getByPlaceholder("Digite sua mensagem...");
    await acessivelNoViewport(fechar);
    await acessivelNoViewport(input);
    await input.fill("Guarda R$ 500 na caixinha da viagem.");
    const enviar = chat.getByRole("button", { name: /Enviar mensagem/i });
    await acessivelNoViewport(enviar);
    await enviar.click();
    await expect(chat.getByText(/Antes de confirmar/i)).toBeVisible();
    await semOverflowHorizontal(page);
    const novaConversa = chat.getByRole("button", { name: "Nova conversa" });
    await acessivelNoViewport(novaConversa);
    page.once("dialog", (dialog) => void dialog.dismiss());
    await novaConversa.click();
    await expect(chat.getByText(/Antes de confirmar/i)).toBeVisible();
    page.once("dialog", (dialog) => void dialog.accept());
    await novaConversa.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("newai_sessao_v1") ?? "null")?.estado?.versao)).toBe(0);
    await expect(chat.getByText(/Antes de confirmar/i)).toHaveCount(0);
    await expect(chat.getByText(/Olá! Posso simular/i)).toBeVisible();
    await fechar.click();
    await expect(chat).toBeHidden();
    await abrirChat.click();
    await expect(chat).toBeVisible();
    await fechar.click();
    await semOverflowHorizontal(page);
    expect(bloqueadas, "Requisições externas ou /api/ são proibidas neste teste offline").toEqual([]);
  });
}
