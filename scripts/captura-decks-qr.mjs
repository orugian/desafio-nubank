// Abre os dois decks no slide final (QR) e salva screenshots para conferência.
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..", "..", "apresentacao");
const saida = join(process.env.TEMP ?? ".", "decks-qr");
mkdirSync(saida, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// deck v2 (atual)
await page.goto(pathToFileURL(`${raiz}/v2/deck.html`).href + "#7", { waitUntil: "load" });
await page.waitForTimeout(2200);
await page.screenshot({ path: join(saida, "v2-slide-7.png") });
console.log("v2 slide 7 salvo");

// deck v1
await page.goto(pathToFileURL(`${raiz}/index.html`).href, { waitUntil: "load" });
await page.waitForTimeout(1200);
await page.evaluate(() => window.NewAISlides?.go(6));
await page.waitForTimeout(2200);
await page.screenshot({ path: join(saida, "v1-slide-7.png") });
console.log("v1 slide 7 salvo");

await browser.close();
