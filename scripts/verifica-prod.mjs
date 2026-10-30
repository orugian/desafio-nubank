// Smoke visual da produção pelo fluxo da banca: escolher persona, abrir a Nina,
// mandar uma mensagem e ver a resposta. Usa o Chromium do @playwright/test.
//   node scripts/verifica-prod.mjs [url] [pasta-de-saida]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2] ?? "https://desafio-nubank.vercel.app";
const saida = process.argv[3] ?? "verificacao-prod";
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "pt-BR",
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));
page.on("console", (m) => m.type() === "error" && erros.push(m.text()));

const foto = async (nome) => {
  await page.screenshot({ path: join(saida, `${nome}.png`) });
  console.log("foto:", nome);
};

await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Bia/ }).first().waitFor({ timeout: 60_000 });
await foto("1-personas");

await page.getByRole("button", { name: /Bia/ }).first().click();
await page.getByRole("heading", { name: /Olá, Bia/ }).waitFor({ timeout: 60_000 });
await foto("2-home");

await page.getByRole("button", { name: /Abrir chat com a Nina/ }).click();
const campo = page.getByRole("textbox", { name: "Mensagem" });
await campo.waitFor({ timeout: 30_000 });
await foto("3-chat");

await campo.fill("Quanto eu tenho disponível hoje na conta?");
const [resposta] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/turno") && r.request().method() === "POST", { timeout: 120_000 }),
  page.getByRole("button", { name: "Enviar mensagem" }).click(),
]);
const corpo = await resposta.json();
console.log("turno HTTP:", resposta.status(), "| status:", corpo.status, "| rastro:", (corpo.rastro ?? []).map((r) => r.ferramenta).join(","));
await page.getByRole("textbox", { name: "Mensagem" }).waitFor({ timeout: 120_000 });
await page.waitForTimeout(2500);
await foto("4-resposta");

console.log("erros de console:", erros.length ? erros.join(" | ") : "nenhum");
await browser.close();
