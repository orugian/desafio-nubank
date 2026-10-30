// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { textos } from "@/contratos";
import { AppNewAI } from "./AppNewAI";
import { criarClienteExemplos, type ClienteApi } from "./cliente-api";

describe("Nova conversa e movimentação simulada", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function abrirChat(cliente: ClienteApi) {
    const user = userEvent.setup();
    render(<AppNewAI cliente={cliente} />);
    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await user.click(screen.getByRole("button", { name: /NewAI/i }));
    return { user, chat: await screen.findByRole("dialog", { name: /Chat/i }) };
  }

  async function enviar(user: ReturnType<typeof userEvent.setup>, chat: HTMLElement, mensagem: string) {
    fireEvent.change(within(chat).getByPlaceholderText("Digite sua mensagem..."), { target: { value: mensagem } });
    await user.click(within(chat).getByRole("button", { name: /Enviar mensagem/i }));
  }

  test("confirmar nova conversa apaga histórico e reinicia declarações, hipóteses e movimentações", async () => {
    const base = criarClienteExemplos();
    const criarSessao = vi.fn(base.criarSessao);
    const enviarTurno = vi.fn(base.enviarTurno);
    const confirmacao = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user, chat } = await abrirChat({ ...base, criarSessao, enviarTurno });

    await enviar(user, chat, "Na verdade as contas da casa do dia 15 são R$ 150.");
    await within(chat).findByText(/Atualizei as contas da casa/i);
    await enviar(user, chat, "Posso separar R$ 500 hoje para minha viagem?");
    await within(chat).findByText(/Se você separar R\$ 500 hoje/i);
    await enviar(user, chat, "Guarda R$ 500 na caixinha da viagem.");
    await user.click(await within(chat).findByRole("button", { name: textos.acoes.confirmar }));
    await within(chat).findByText(textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"));

    await user.click(within(chat).getByRole("button", { name: /Nova conversa/i }));
    expect(confirmacao).toHaveBeenCalledOnce();
    expect(confirmacao.mock.calls[0]![0]).toMatch(/reinicia.*simulações.*operações/i);
    await waitFor(() => expect(criarSessao).toHaveBeenCalledTimes(2));
    expect(criarSessao.mock.calls[1]?.[0]).toEqual(criarSessao.mock.calls[0]?.[0]);
    expect(await within(chat).findByText(textos.sugestoes_chat[0]!)).toBeInTheDocument();
    expect(within(chat).queryByText(/Atualizei as contas da casa/i)).not.toBeInTheDocument();
    expect(within(chat).queryByText(/Se você separar R\$ 500 hoje/i)).not.toBeInTheDocument();
    expect(within(chat).queryByText(textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"))).not.toBeInTheDocument();
    await user.click(within(chat).getByRole("button", { name: /Fechar chat/i }));
    expect(screen.getByText("R$ 1.800,00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /NewAI/i }));
    const novoChat = await screen.findByRole("dialog", { name: /Chat/i });
    await enviar(user, novoChat, "Uma nova pergunta");
    await within(novoChat).findByText(/Se você separar R\$ 500 hoje/i);
    const estadoReiniciado = enviarTurno.mock.calls.at(-1)![0].estado;
    expect(estadoReiniciado.conversa).toHaveLength(0);
    expect(estadoReiniciado.declaracoes).toHaveLength(0);
    expect(estadoReiniciado.hipoteses).toHaveLength(0);
    expect(estadoReiniciado.operacoes).toHaveLength(0);
    expect(estadoReiniciado.operacao_pendente).toBeNull();
  });

  test("cancelar confirmação preserva conversa e saldo sem recriar sessão", async () => {
    const base = criarClienteExemplos();
    const criarSessao = vi.fn(base.criarSessao);
    const confirmacao = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { user, chat } = await abrirChat({ ...base, criarSessao });
    await enviar(user, chat, "Guarda R$ 500 na caixinha da viagem.");
    await user.click(await within(chat).findByRole("button", { name: textos.acoes.confirmar }));
    const mensagem = textos.mensagem_operacao_simulada(50000, "Caixinha Viagem");
    await within(chat).findByText(mensagem);

    await user.click(within(chat).getByRole("button", { name: /Nova conversa/i }));
    expect(confirmacao).toHaveBeenCalledOnce();
    expect(criarSessao).toHaveBeenCalledTimes(1);
    expect(within(chat).getByText(mensagem)).toBeInTheDocument();
    await user.click(within(chat).getByRole("button", { name: /Fechar chat/i }));
    expect(screen.getByText("R$ 1.300,00")).toBeInTheDocument();
  });

  test.each(["rejeição de rede", "falha retornada"] as const)("%s ao recriar sessão preserva histórico e saldo", async (modo) => {
    const base = criarClienteExemplos();
    const criarSessao = vi.fn(base.criarSessao).mockImplementationOnce(base.criarSessao);
    if (modo === "rejeição de rede") {
      criarSessao.mockRejectedValueOnce(new Error("falha de rede"));
    } else {
      criarSessao.mockResolvedValueOnce({
        status: "falha",
        estado: null,
        falha: { tipo: "F-03", codigo: "INDISPONIVEL", mensagem: "Sessão indisponível", pode_tentar_novamente: true },
      });
    }
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user, chat } = await abrirChat({ ...base, criarSessao });
    await enviar(user, chat, "Guarda R$ 500 na caixinha da viagem.");
    await user.click(await within(chat).findByRole("button", { name: textos.acoes.confirmar }));
    const mensagem = textos.mensagem_operacao_simulada(50000, "Caixinha Viagem");
    await within(chat).findByText(mensagem);
    await user.click(within(chat).getByRole("button", { name: /Nova conversa/i }));

    expect(await within(chat).findByRole("alert")).toHaveTextContent(
      modo === "rejeição de rede" ? textos.falhas["F-03"] : "Sessão indisponível",
    );
    expect(within(chat).getByText(mensagem)).toBeInTheDocument();
    await user.click(within(chat).getByRole("button", { name: /Fechar chat/i }));
    expect(screen.getByText("R$ 1.300,00")).toBeInTheDocument();
  });

  test("turno pendente bloqueia reset sem descartar a resposta", async () => {
    const base = criarClienteExemplos();
    let resolver!: () => void;
    const pendente = new Promise<void>((resolve) => { resolver = resolve; });
    const criarSessao = vi.fn(base.criarSessao);
    const enviarTurno: ClienteApi["enviarTurno"] = async (req) => {
      await pendente;
      return base.enviarTurno(req);
    };
    const confirmacao = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user, chat } = await abrirChat({ ...base, criarSessao, enviarTurno });
    await enviar(user, chat, "Posso separar R$ 500 hoje para minha viagem?");
    const botao = within(chat).getByRole("button", { name: /Nova conversa/i });
    expect(botao).toBeDisabled();
    await user.click(botao);
    expect(confirmacao).not.toHaveBeenCalled();
    expect(criarSessao).toHaveBeenCalledTimes(1);
    await user.click(within(chat).getByRole("button", { name: /Fechar chat/i }));
    const resetGlobal = screen.getByRole("button", { name: /Recomeçar/i });
    expect(resetGlobal).toBeDisabled();
    await user.click(resetGlobal);
    expect(criarSessao).toHaveBeenCalledTimes(1);
    resolver();
    await user.click(screen.getByRole("button", { name: /NewAI/i }));
    const chatReaberto = await screen.findByRole("dialog", { name: /Chat/i });
    expect(await within(chatReaberto).findByText(/Se você separar R\$ 500 hoje/i)).toBeInTheDocument();
    expect(within(chatReaberto).getByRole("button", { name: /Nova conversa/i })).toBeEnabled();
  });

  test("confirmar movimentação envia a operação e atualiza o saldo; cancelar não movimenta", async () => {
    const base = criarClienteExemplos();
    const enviarAcao = vi.fn(base.enviarAcao);
    const { user, chat } = await abrirChat({ ...base, enviarAcao });

    await enviar(user, chat, "Guarda R$ 500 na caixinha da viagem.");
    await user.click(await within(chat).findByRole("button", { name: textos.acoes.cancelar }));
    expect(await within(chat).findByText(textos.mensagem_operacao_cancelada(50000, "Caixinha Viagem"))).toBeInTheDocument();
    expect(enviarAcao.mock.calls[0]?.[0].acao).toEqual({ tipo: "cancelar", operacao_id: "OP1" });
    await user.click(within(chat).getByRole("button", { name: /Fechar chat/i }));
    expect(screen.getByText("R$ 1.800,00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /NewAI/i }));
    const chatReaberto = await screen.findByRole("dialog", { name: /Chat/i });
    await enviar(user, chatReaberto, "Guarda R$ 500 na caixinha da viagem.");
    const botoesConfirmar = await within(chatReaberto).findAllByRole("button", { name: textos.acoes.confirmar });
    await user.click(botoesConfirmar[botoesConfirmar.length - 1]!);
    expect(await within(chatReaberto).findByText(textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"))).toBeInTheDocument();
    expect(enviarAcao.mock.calls[1]?.[0].acao).toEqual({ tipo: "confirmar", operacao_id: "OP1" });
    await user.click(within(chatReaberto).getByRole("button", { name: /Fechar chat/i }));
    expect(screen.getByText("R$ 1.300,00")).toBeInTheDocument();
  });
});
