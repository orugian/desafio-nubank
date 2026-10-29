// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { textos } from "@/contratos/textos";

function Faixa() {
  const [aberta, setAberta] = useState(false);
  return (
    <div>
      <p>{textos.faixa_prototipo}</p>
      <button onClick={() => setAberta(true)}>Abrir</button>
      {aberta && <p>{textos.nao_disponivel}</p>}
    </div>
  );
}

describe("infraestrutura de teste de componente", () => {
  test("renderiza a faixa de protótipo e reage a clique", async () => {
    render(<Faixa />);
    expect(screen.getByText("Protótipo · dados fictícios")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByText("não disponível no protótipo")).toBeVisible();
  });
});
