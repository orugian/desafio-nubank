// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { TextoMarkdown } from "./TextoMarkdown";

afterEach(cleanup);

describe("TextoMarkdown", () => {
  test("exibe títulos, ênfase, parágrafos, listas e valores sem alterá-los", () => {
    render(<TextoMarkdown texto={'## Resultado\n\n**R$ 1.234,56** e *12,5%*\nLinha seguinte\n\n- Primeiro\n- Segundo\n\n3. Terceiro\n5. Quinto'} />);
    expect(screen.getByRole("heading", { name: "Resultado", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("R$ 1.234,56").tagName).toBe("STRONG");
    expect(screen.getByText("12,5%").tagName).toBe("EM");
    expect(screen.getByText(/Linha seguinte/)).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getByText("Quinto")).toHaveAttribute("value", "5");
  });

  test("permite somente links seguros e mantém HTML e links perigosos como texto", () => {
    const { container } = render(<TextoMarkdown texto={'[Fonte](https://example.com/a) [E-mail](mailto:teste@example.com) [ataque](javascript:alert) <img src=x onerror=alert(1)> <script>perigo</script>'} />);
    expect(screen.getByRole("link", { name: "Fonte" })).toHaveAttribute("href", "https://example.com/a");
    expect(screen.getByRole("link", { name: "E-mail" })).toHaveAttribute("href", "mailto:teste@example.com");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(container.textContent).toContain("[ataque](javascript:alert)");
    expect(container.textContent).toContain("<script>perigo</script>");
    expect(container.querySelector("img, script")).toBeNull();
  });

  test("formata blocos de código completos e preserva cercas incompletas", () => {
    const { container, rerender } = render(<TextoMarkdown texto={'```json\n{"valor": "R$ 10,00"}\n```'} />);
    expect(container.querySelector("code")).toHaveTextContent('{"valor": "R$ 10,00"}');
    expect(container.textContent).not.toContain("```");
    expect(container.textContent).toContain("json");
    rerender(<TextoMarkdown texto={'```json\n{"valor": 10}'} />);
    expect(container.textContent).toContain('```json');
  });

  test("tabelas preservam colunas, valores e pipes escapados; tabela malformada permanece literal", () => {
    const { rerender, container } = render(<TextoMarkdown texto={'| Ativo | Valor | Observação |\n| --- | ---: | --- |\n| A | R$ 1.234,56 | A\\|B |\n| B | -12,50% | <b>x</b> |'} />);
    const tabela = screen.getByRole("table");
    expect(within(tabela).getAllByRole("columnheader")).toHaveLength(3);
    expect(within(tabela).getByText("A|B")).toBeInTheDocument();
    expect(within(tabela).getByText("R$ 1.234,56")).toBeInTheDocument();
    expect(within(tabela).getByText("-12,50%")).toBeInTheDocument();
    expect(within(tabela).getByText("<b>x</b>")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
    const invalida = '| A | B |\n| --- | --- |\n| apenas uma |';
    rerender(<TextoMarkdown texto={invalida} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(container.textContent).toBe(invalida);
  });
});
