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

  test("5 e 6. Botão NewAI abre chat com sugestões; enviar mostra 'Enviando...' e bloqueia envio; fechar e abrir de outra tela preserva histórico", async () => {
    const user = userEvent.setup();
    const base = criarClienteExemplos();
    let resolverTurno!: () => void;
    const promessaTurno = new Promise<void>((r) => {
      resolverTurno = r;
    });

    const cliente = {
      ...base,
      async enviarTurno(req: Parameters<typeof base.enviarTurno>[0]) {
        await promessaTurno;
        return base.enviarTurno(req);
      },
    };

    render(<AppNewAI cliente={cliente} />);
    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await screen.findByText("Saldo em conta");

    await user.click(screen.getByRole("button", { name: /NewAI/i }));
    const dialogo = await screen.findByRole("dialog", { name: /Chat/i });
    for (const sug of textos.sugestoes_chat) {
      expect(within(dialogo).getByText(sug)).toBeInTheDocument();
    }

    const input = within(dialogo).getByPlaceholderText("Digite sua mensagem...");
    await user.type(input, "Posso separar R$ 500 hoje para minha viagem?");
    const botaoEnviar = within(dialogo).getByRole("button", { name: /Enviar mensagem/i });
    await user.click(botaoEnviar);

    expect(within(dialogo).getByText(/Enviando/i)).toBeInTheDocument();
    expect(botaoEnviar).toBeDisabled();

    resolverTurno();
    expect(
      await within(dialogo).findByText(/Se você separar R\$ 500 hoje/i),
    ).toBeInTheDocument();

    await user.click(within(dialogo).getByRole("button", { name: /Fechar chat/i }));
    await user.click(screen.getByRole("button", { name: /Conta e extrato/i }));
    await user.click(screen.getByRole("button", { name: /NewAI/i }));

    const dialogoReaberto = await screen.findByRole("dialog", { name: /Chat/i });
    expect(
      within(dialogoReaberto).getByText(/Se você separar R\$ 500 hoje/i),
    ).toBeInTheDocument();
  });

  test("7. Falha mostra mensagem do servidor; 'Tentar novamente' reenvia o mesmo mensagem.id; versão inesperada → F-06", async () => {
    const user = userEvent.setup();
    const base = criarClienteExemplos();
    const idsRecebidos: string[] = [];
    let tentativa = 0;

    const cliente = {
      ...base,
      async enviarTurno(req: Parameters<typeof base.enviarTurno>[0]) {
        idsRecebidos.push(req.mensagem.id);
        tentativa += 1;
        if (tentativa === 1) {
          return base.enviarTurno({
            ...req,
            mensagem: { ...req.mensagem, texto: "simular timeout" },
          });
        }
        if (tentativa === 2) {
          return base.enviarTurno(req);
        }
        const ok = await base.enviarTurno(req);
        if (ok.status === "ok") {
          return { ...ok, estado: { ...ok.estado, versao: 99 } };
        }
        return ok;
      },
    };

    render(<AppNewAI cliente={cliente} />);
    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await user.click(screen.getByRole("button", { name: /NewAI/i }));

    const dialogo = await screen.findByRole("dialog", { name: /Chat/i });
    const input = within(dialogo).getByPlaceholderText("Digite sua mensagem...");
    await user.type(input, "Posso separar R$ 500 hoje?");
    await user.click(within(dialogo).getByRole("button", { name: /Enviar mensagem/i }));

    expect(await within(dialogo).findByText(textos.falhas["F-01"])).toBeInTheDocument();

    const btnTentar = within(dialogo).getByRole("button", { name: textos.acoes.tentar_novamente });
    await user.click(btnTentar);

    expect(await within(dialogo).findByText(/Se você separar R\$ 500 hoje/i)).toBeInTheDocument();
    expect(idsRecebidos).toHaveLength(2);
    expect(idsRecebidos[0]).toBe(idsRecebidos[1]);

    await user.type(input, "Outra pergunta");
    await user.click(within(dialogo).getByRole("button", { name: /Enviar mensagem/i }));
    expect(await within(dialogo).findByText(textos.falhas["F-06"])).toBeInTheDocument();
  });

  test("8. Comparação mostra indicadores, rótulos, legenda da margem, premissas e tabela expansível; o_que_mudou mostra diferenças", async () => {
    const user = userEvent.setup();
    const cliente = criarClienteExemplos();
    render(<AppNewAI cliente={cliente} />);

    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await user.click(screen.getByRole("button", { name: /NewAI/i }));

    const dialogo = await screen.findByRole("dialog", { name: /Chat/i });
    const input = within(dialogo).getByPlaceholderText("Digite sua mensagem...");
    await user.type(input, "Na verdade as contas da casa do dia 15 são R$ 150.");
    await user.click(within(dialogo).getByRole("button", { name: /Enviar mensagem/i }));

    expect(await within(dialogo).findByText(textos.legenda_margem)).toBeInTheDocument();
    expect(within(dialogo).getByText(textos.premissas[1]!)).toBeInTheDocument();
    expect(
      within(dialogo).getByText(/Contas da casa \(C\) em 15\/11: R\$ 200,00 → R\$ 150,00/i),
    ).toBeInTheDocument();

    const btnExpandir = within(dialogo).getByRole("button", { name: /Ver eventos da projeção/i });
    await user.click(btnExpandir);
    expect(within(dialogo).getByText("Saldo zerado")).toBeInTheDocument();
  });

  test("9 e 10. Operação pendente: Confirmar chama /api/acao com operacao_id, fica desabilitado, exibe mensagem de sistema e atualiza saldo na Home; Recomeçar restaura 1.800", async () => {
    const user = userEvent.setup();
    const base = criarClienteExemplos();
    const operacoesConfirmadas: string[] = [];

    const cliente = {
      ...base,
      async enviarAcao(req: Parameters<typeof base.enviarAcao>[0]) {
        operacoesConfirmadas.push(req.acao.operacao_id);
        return base.enviarAcao(req);
      },
    };

    render(<AppNewAI cliente={cliente} />);
    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await user.click(screen.getByRole("button", { name: /NewAI/i }));

    const dialogo = await screen.findByRole("dialog", { name: /Chat/i });
    const input = within(dialogo).getByPlaceholderText("Digite sua mensagem...");
    await user.type(input, "Guarda R$ 500 na caixinha da viagem.");
    await user.click(within(dialogo).getByRole("button", { name: /Enviar mensagem/i }));

    const btnConfirmar = await within(dialogo).findByRole("button", {
      name: textos.acoes.confirmar,
    });
    await user.click(btnConfirmar);

    expect(operacoesConfirmadas).toEqual(["OP1"]);
    expect(btnConfirmar).toBeDisabled();
    expect(
      await within(dialogo).findByText(
        textos.mensagem_operacao_simulada(50000, "Caixinha Viagem"),
      ),
    ).toBeInTheDocument();

    await user.click(within(dialogo).getByRole("button", { name: /Fechar chat/i }));
    expect(screen.getByText("R$ 1.300,00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Recomeçar/i }));
    expect(await screen.findByText("R$ 1.800,00")).toBeInTheDocument();
  });

  test("4. Caixinhas/investimentos mostram valor, aplicado, rentabilidade, valorização, disponibilidade, proteção e origem do preço", async () => {
    const user = userEvent.setup();
    const cliente = criarClienteExemplos();
    render(<AppNewAI cliente={cliente} />);

    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));
    await user.click(screen.getByRole("button", { name: /Investimentos/i }));

    expect(await screen.findByText("Total investido")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.830,00")).toBeInTheDocument();
    expect(screen.getByText(/Caixinha Reserva/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Reserva de emergência: não usar para objetivos/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/17\.86%/)).toBeInTheDocument();
    expect(screen.getByText(/brapi \(valor de teste\)/i)).toBeInTheDocument();
    expect(screen.getByText(/15\/03\/2027|15\/03/)).toBeInTheDocument();
  });

  test("11. Telas Conta/extrato, Cartão/faturas e 'Como funciona' (config, fontes de mercado e rastro)", async () => {
    const user = userEvent.setup();
    const cliente = criarClienteExemplos();
    render(<AppNewAI cliente={cliente} />);

    await user.click(await screen.findByRole("button", { name: /Bia \(fictícia\)/i }));

    // Conta/extrato
    await user.click(screen.getByRole("button", { name: /Conta e extrato/i }));
    expect(await screen.findByRole("tab", { name: /Usar/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Guardar/i })).toBeInTheDocument();
    expect(screen.getByText(/Pagamento da fatura/i)).toBeInTheDocument();

    // Cartão/faturas (voltar para home e abrir cartão)
    await user.click(screen.getByRole("button", { name: /^Início$/i }));
    await user.click(screen.getByRole("button", { name: /Meus cartões/i }));
    expect(await screen.findByText(/Limite total/i)).toBeInTheDocument();
    expect(screen.getByText("R$ 4.000,00")).toBeInTheDocument();
    expect(screen.getByText(/Restaurante/i)).toBeInTheDocument();

    // Gerar 1 resposta com rastro no chat e abrir "Como funciona"
    await user.click(screen.getByRole("button", { name: /NewAI/i }));
    const dialogo = await screen.findByRole("dialog", { name: /Chat/i });
    const input = within(dialogo).getByPlaceholderText("Digite sua mensagem...");
    await user.type(input, "Posso separar R$ 500 hoje para minha viagem?");
    await user.click(within(dialogo).getByRole("button", { name: /Enviar mensagem/i }));
    await within(dialogo).findByText(/Se você separar R\$ 500 hoje/i);
    await user.click(within(dialogo).getByRole("button", { name: /Fechar chat/i }));

    await user.click(screen.getByRole("button", { name: /^Como funciona$/i }));
    expect(await screen.findByText(/Configuração e transparência/i)).toBeInTheDocument();
    expect(screen.getByText(/BCB SGS 12/i)).toBeInTheDocument();
    expect(screen.getAllByText(/criar_hipotese/i).length).toBeGreaterThan(0);
  });
});
