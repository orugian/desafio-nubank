import { expect, test } from "@playwright/test";
import { textos } from "../src/contratos/textos";

test("B7 · 5: persona → chat → separar → cartão; guardar → confirmar → Home com 1.300", async ({ page }) => {
  await page.goto("/");

  // Escolher persona P1 (Bia)
  const botaoBia = page.getByRole("button", { name: /Bia \(fictícia\)/i });
  await expect(botaoBia).toBeVisible();
  await botaoBia.click();

  await expect(page.getByText(textos.faixa_prototipo)).toBeVisible();
  await expect(page.getByText("R$ 1.800,00")).toBeVisible();

  // Abrir chat NewAI
  await page.getByRole("button", { name: /NewAI/i }).click();
  const dialogo = page.getByRole("dialog", { name: /Chat/i });
  await expect(dialogo).toBeVisible();

  // Separar 500 hoje -> cartão de comparação CR-02
  const input = dialogo.getByPlaceholder("Digite sua mensagem...");
  await input.fill("Posso separar R$ 500 hoje para minha viagem?");
  await dialogo.getByRole("button", { name: /Enviar mensagem/i }).click();

  await expect(dialogo.getByRole("heading", { name: "Seu planejamento" })).toBeVisible();
  await expect(dialogo.getByText(/^Primeira falta de R\$ 200,00 em 15\/11/)).toBeVisible();
  await dialogo.getByText("Explicação da Nina", { exact: true }).click();
  await expect(dialogo.getByText(/Se você separar R\$ 500 hoje/i)).toBeVisible();
  await dialogo.getByText("Entender os valores", { exact: true }).click();
  await expect(dialogo.getByText(textos.legenda_margem)).toBeVisible();

  // Guardar 500 na caixinha da viagem -> proposta com botão Confirmar
  await input.fill("Guarda R$ 500 na caixinha da viagem.");
  await dialogo.getByRole("button", { name: /Enviar mensagem/i }).click();

  const btnConfirmar = dialogo.getByRole("button", { name: textos.acoes.confirmar });
  await expect(btnConfirmar).toBeVisible();
  await btnConfirmar.click();

  await expect(btnConfirmar).toBeDisabled();
  await expect(dialogo.getByText(textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"))).toBeVisible();

  // Fechar chat -> Home com R$ 1.300,00
  await dialogo.getByRole("button", { name: /Fechar chat/i }).click();
  await expect(page.getByText("R$ 1.300,00")).toBeVisible();
});
