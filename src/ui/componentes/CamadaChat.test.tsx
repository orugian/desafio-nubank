// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import exemplo from "@/contratos/exemplos/api-sessao-p1.json";
import type { EstadoSessao, Falha } from "@/contratos";
import { CamadaChat } from "./CamadaChat";

const estado = exemplo.dados.estado as EstadoSessao;
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function props() {
  return { estado, enviando: false, textoPendente: null, falhaAtual: null as Falha | null, avisosRecentes: [], aoFechar: vi.fn(), aoEnviarMensagem: vi.fn(), aoTentarNovamente: vi.fn(), aoRecomecar: vi.fn(), aoExecutarAcao: vi.fn() };
}

describe("CamadaChat", () => {
  test("nova conversa pede confirmação explícita, cancela sem mudar estado e só chama callback ao aceitar", async () => {
    const user = userEvent.setup();
    const p = props();
    const confirma = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const snapshot = JSON.stringify(estado);
    render(<CamadaChat {...p} />);
    const entrada = screen.getByRole("textbox", { name: "Mensagem" });
    expect(screen.getByRole("button", { name: "Fechar chat" })).toHaveFocus();
    expect(entrada).not.toHaveFocus();
    await user.type(entrada, "Rascunho");
    await user.click(screen.getByRole("button", { name: "Nova conversa" }));
    expect(confirma).toHaveBeenCalledWith(expect.stringMatching(/simulações.*operações.*declarações.*hipóteses.*pendências/i));
    expect(p.aoRecomecar).not.toHaveBeenCalled();
    expect(entrada).toHaveValue("Rascunho");
    await user.click(screen.getByRole("button", { name: "Nova conversa" }));
    expect(p.aoRecomecar).toHaveBeenCalledTimes(1);
    expect(entrada).toHaveValue("");
    expect(JSON.stringify(estado)).toBe(snapshot);
  });

  test("envio bloqueia reinício inclusive na falha F-06", async () => {
    const p = props();
    p.falhaAtual = { tipo: "F-06", codigo: "ESTADO_INVALIDO", mensagem: "Estado inválido", pode_tentar_novamente: false };
    const confirma = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { rerender } = render(<CamadaChat {...p} enviando />);
    expect(screen.getByRole("button", { name: "Nova conversa" })).toBeDisabled();
    expect(within(screen.getByRole("alert")).getByRole("button")).toBeDisabled();
    expect(confirma).not.toHaveBeenCalled();
    rerender(<CamadaChat {...p} />);
    await userEvent.click(within(screen.getByRole("alert")).getByRole("button"));
    expect(confirma).toHaveBeenCalledOnce();
    expect(p.aoRecomecar).toHaveBeenCalledOnce();
  });

  test("mantém labels, limite e envio sem foco automático no campo", async () => {
    const user = userEvent.setup();
    const p = props();
    render(<CamadaChat {...p} />);
    const dialogo = screen.getByRole("dialog", { name: "Chat NewAI" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    const entrada = within(dialogo).getByPlaceholderText("Digite sua mensagem...");
    expect(entrada).toHaveAttribute("maxLength", "1000");
    expect(entrada).not.toHaveFocus();
    expect(entrada.closest("form")).toHaveClass("pb-[max(0.75rem,env(safe-area-inset-bottom))]");
    await user.click(entrada);
    await user.paste("a".repeat(1001));
    expect(entrada).toHaveValue("a".repeat(1000));
    await user.click(within(dialogo).getByRole("button", { name: "Enviar mensagem" }));
    expect(p.aoEnviarMensagem).toHaveBeenCalledWith("a".repeat(1000));
    expect(entrada).toHaveValue("");
  });

  test("Escape e botão fecham o diálogo e o foco volta ao elemento anterior", async () => {
    const user = userEvent.setup();
    const anterior = document.createElement("button");
    document.body.appendChild(anterior);
    anterior.focus();
    const p = props();
    const { unmount } = render(<CamadaChat {...p} />);
    await user.keyboard("{Escape}");
    expect(p.aoFechar).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Fechar chat" }));
    expect(p.aoFechar).toHaveBeenCalledTimes(2);
    unmount();
    expect(anterior).toHaveFocus();
    anterior.remove();
  });

  test("retorna foco ao fechar e rola só a lista de mensagens, nunca os ancestrais", () => {
    const anterior = document.createElement("button");
    document.body.appendChild(anterior);
    anterior.focus();
    // scrollIntoView também rola a moldura do app e esconde o botão Fechar.
    const rolar = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = rolar;
    const p = props();
    const { unmount } = render(<CamadaChat {...p} />);
    expect(rolar).not.toHaveBeenCalled();
    const lista = screen.getByRole("dialog").querySelector<HTMLElement>(".overflow-y-auto")!;
    expect(lista).not.toBeNull();
    unmount();
    expect(anterior).toHaveFocus();
    Element.prototype.scrollIntoView = original;
    anterior.remove();
  });
});
