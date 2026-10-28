// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { textos } from "@/contratos";
import { criarClienteExemplos } from "./cliente-api";
import { AppNewAI } from "./AppNewAI";

describe("B5 · Frontend NewAI", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test("1. Escolher persona mostra a Home com o saldo disponível da VisaoApp e a faixa de protótipo", async () => {
    const user = userEvent.setup();
    const cliente = criarClienteExemplos();
    render(<AppNewAI cliente={cliente} />);

    const botaoBia = await screen.findByRole("button", { name: /Bia \(fictícia\)/i });
    await user.click(botaoBia);

    expect(await screen.findByText(textos.faixa_prototipo)).toBeInTheDocument();
    expect(screen.getByText(/Olá, Bia \(fictícia\)/i)).toBeInTheDocument();
    expect(screen.getByText("Saldo em conta")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.800,00")).toBeInTheDocument();
  });

  test("2. Com marca neutra, logotipo e nome 'Nubank' não aparecem na tela", async () => {
    const user = userEvent.setup();
    const cliente = criarClienteExemplos();
    const { container } = render(<AppNewAI cliente={cliente} />);

    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await screen.findByText("Saldo em conta");

    expect(container.textContent?.toLowerCase()).not.toContain("nubank");
    expect(screen.queryByTestId("logo-marca-proprietaria")).toBeNull();
  });

  test("3. Botões sem função mostram 'não disponível no protótipo'", async () => {
    const user = userEvent.setup();
    const cliente = criarClienteExemplos();
    render(<AppNewAI cliente={cliente} />);

    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await screen.findByText("Saldo em conta");

    const botaoPix = screen.getByRole("button", { name: /Área Pix e Transferir/i });
    await user.click(botaoPix);

    const alerta = await screen.findByRole("status");
    expect(within(alerta).getByText(textos.nao_disponivel)).toBeInTheDocument();
  });
});
