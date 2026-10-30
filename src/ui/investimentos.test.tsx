// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  formatarReais,
  type CartaoResposta,
  type EstadoSessao,
  type RequisicaoTurno,
  type VisaoApp,
} from "@/contratos";
import exCotacao from "@/contratos/exemplos/cartao-cotacao.json";
import exComparativo from "@/contratos/exemplos/cartao-comparativo-investimento.json";
import exSimulacao from "@/contratos/exemplos/cartao-simulacao-investimento.json";
import exPixCredito from "@/contratos/exemplos/cartao-pix-credito.json";
import exImpostoRenda from "@/contratos/exemplos/cartao-imposto-renda.json";
import exVisaoP1 from "@/contratos/exemplos/visao-p1.json";
import { CartaoChat } from "./componentes/CartaoChat";
import { TelaInvestimentos } from "./componentes/TelasDetalhe";
import { AppNewAI } from "./AppNewAI";
import { criarClienteExemplos } from "./cliente-api";

const estadoBase: EstadoSessao = {
  versao: 0,
  persona_id: "p1",
  mercado: {
    ao_vivo: false,
    obtido_em: "2026-10-28T11:00:00-03:00",
    tentou_ao_vivo: false,
    cdi: { taxa_diaria_pct: "0.05", data_ref: "2026-10-29", fonte: "teste" },
    precos: {},
  },
  conversa: [],
  declaracoes: [],
  operacoes: [],
  operacao_pendente: null,
  hipoteses: [],
  contadores: { D: 0, H: 0, OP: 0 },
};

describe("T7 · Cartões novos e atalhos de investimento", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test("1. Renderizar CartaoChat com cada um dos 5 exemplos e checar textos-chave", async () => {
    // 1.1 Cotação
    const resCotacao = exCotacao.dados.resultado;
    const { unmount: unmount1 } = render(
      <CartaoChat
        cartao={exCotacao.dados as CartaoResposta}
        estado={estadoBase}
        ocupado={false}
        aoExecutarAcao={vi.fn()}
      />,
    );
    const tituloCotacao = `${resCotacao.ticker}${resCotacao.nome ? ` · ${resCotacao.nome}` : ""}`;
    expect(screen.getByText(tituloCotacao)).toBeInTheDocument();
    expect(
      screen.getByText(formatarReais(resCotacao.preco_centavos)),
    ).toBeInTheDocument();
    expect(screen.getByText(resCotacao.rotulo)).toBeInTheDocument();
    if (resCotacao.na_carteira) {
      const valorCarteiraFormatado = formatarReais(resCotacao.na_carteira.valor_centavos);
      expect(
        screen.getByText((content) =>
          content.includes(`Você tem ${resCotacao.na_carteira!.quantidade}`) &&
          content.includes(valorCarteiraFormatado),
        ),
      ).toBeInTheDocument();
    }
    unmount1();

    // 1.2 Comparativo de investimento
    const resComparativo = exComparativo.dados.resultado;
    const { unmount: unmount2 } = render(
      <CartaoChat
        cartao={exComparativo.dados as CartaoResposta}
        estado={estadoBase}
        ocupado={false}
        aoExecutarAcao={vi.fn()}
      />,
    );
    const tituloComparativo = `Comparativo · ${resComparativo.posicao.nome}`;
    expect(screen.getByText(tituloComparativo)).toBeInTheDocument();
    expect(
      screen.getByText(formatarReais(resComparativo.real.valor_centavos)),
    ).toBeInTheDocument();
    expect(screen.getByText(resComparativo.rotulo)).toBeInTheDocument();
    const ocorrenciasMelhor = screen.getAllByText("Maior valor na comparação");
    expect(ocorrenciasMelhor).toHaveLength(1);
    unmount2();

    // 1.3 Simulação de investimento
    const resSimulacao = (exSimulacao.dados as Extract<CartaoResposta, { tipo: "simulacao_investimento" }>).resultado;
    const { unmount: unmount3 } = render(
      <CartaoChat
        cartao={exSimulacao.dados as CartaoResposta}
        estado={estadoBase}
        ocupado={false}
        aoExecutarAcao={vi.fn()}
      />,
    );
    const taxaPrefTexto = resSimulacao.taxa_aa_pct
      ? resSimulacao.taxa_aa_pct.replace(".", ",")
      : "";
    const indexadorTitulo =
      resSimulacao.indexador === "cdi"
        ? `${resSimulacao.cdi_pct}% do CDI`
        : `prefixado ${taxaPrefTexto}% a.a.`;
    const tituloSimulacao = `Simulação · ${indexadorTitulo}`;
    expect(screen.getByText(tituloSimulacao)).toBeInTheDocument();
    expect(
      screen.getByText(
        formatarReais(resSimulacao.valor_final_liquido_centavos),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatarReais(resSimulacao.rendimento_bruto_centavos)),
    ).toBeInTheDocument();
    expect(screen.getByText(resSimulacao.rotulo)).toBeInTheDocument();
    unmount3();

    // 1.4 Pix no crédito
    const resPix = exPixCredito.dados.resultado;
    const { unmount: unmount4 } = render(
      <CartaoChat
        cartao={exPixCredito.dados as CartaoResposta}
        estado={estadoBase}
        ocupado={false}
        aoExecutarAcao={vi.fn()}
      />,
    );
    const tituloPix = `Pix no crédito · ${formatarReais(resPix.valor_centavos)} em ${resPix.parcelas}x`;
    expect(screen.getByText(tituloPix)).toBeInTheDocument();
    expect(
      screen.getByText(formatarReais(resPix.total_pago_centavos)),
    ).toBeInTheDocument();
    expect(screen.getByText(resPix.rotulo)).toBeInTheDocument();
    expect(resPix.cronograma).toHaveLength(resPix.parcelas);
    await userEvent.click(screen.getByText("Ver parcelas e encargos"));
    for (let i = 1; i <= resPix.parcelas; i++) {
      expect(
        screen.getByText(`${i}/${resPix.parcelas}`),
      ).toBeInTheDocument();
    }
    unmount4();

    // 1.5 Imposto de renda
    const resIR = exImpostoRenda.dados.resultado;
    const { unmount: unmount5 } = render(
      <CartaoChat
        cartao={exImpostoRenda.dados as CartaoResposta}
        estado={estadoBase}
        ocupado={false}
        aoExecutarAcao={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        `Imposto de renda · ano-calendário ${resIR.ano_calendario}`,
      ),
    ).toBeInTheDocument();
    if (resIR.investimentos) {
      expect(screen.getByText("Investimentos")).toBeInTheDocument();
      const totalIrFormatado = formatarReais(resIR.investimentos.total_ir_estimado_centavos);
      expect(
        screen.getByText((content) =>
          content.includes("Total estimado:") && content.includes(totalIrFormatado),
        ),
      ).toBeInTheDocument();
    }
    if (resIR.irpf) {
      expect(
        screen.getByText(`IRPF (declaração ${resIR.exercicio})`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          formatarReais(resIR.irpf.rendimento_mensal_centavos),
        ),
      ).toBeInTheDocument();
    }
    expect(screen.getByText(resIR.rotulo)).toBeInTheDocument();
    expect(
      screen.getByText(resIR.fontes.join(" · ")),
    ).toBeInTheDocument();
    unmount5();
  });

  test("2. Cartão erro continua renderizando 'CODIGO: mensagem'", () => {
    const cartaoErro: CartaoResposta = {
      tipo: "erro",
      codigo: "COTACAO_INDISPONIVEL",
      mensagem: "Não consegui obter a cotação desse ativo agora.",
    };
    render(
      <CartaoChat
        cartao={cartaoErro}
        estado={estadoBase}
        ocupado={false}
        aoExecutarAcao={vi.fn()}
      />,
    );
    expect(screen.getByText(/COTACAO_INDISPONIVEL:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Não consegui obter a cotação desse ativo agora\./),
    ).toBeInTheDocument();
  });

  test("3. TelaInvestimentos com visao do exemplo e aoPerguntar = vi.fn()", async () => {
    const user = userEvent.setup();
    const aoPerguntar = vi.fn();
    const aoNaoDisponivel = vi.fn();

    // Cenário fallback sem ação/cripto com ticker: "Qual a cotação de PETR4 agora?"
    const visaoSemTicker: VisaoApp = {
      ...(structuredClone(exVisaoP1.dados) as VisaoApp),
      posicoes: (exVisaoP1.dados as VisaoApp).posicoes.filter(
        (p) => p.categoria !== "acao" && p.categoria !== "cripto",
      ),
    };

    const { unmount: unmountFallback } = render(
      <TelaInvestimentos
        visao={visaoSemTicker}
        mostrarSaldos={true}
        aoNaoDisponivel={aoNaoDisponivel}
        aoPerguntar={aoPerguntar}
      />,
    );

    const btnCotacaoFallback = screen.getByRole("button", { name: "Cotação" });
    await user.click(btnCotacaoFallback);
    expect(aoPerguntar).toHaveBeenCalledWith("Qual a cotação de PETR4 agora?");

    const btnImpostoFallback = screen.getByRole("button", { name: "Imposto" });
    await user.click(btnImpostoFallback);
    expect(aoPerguntar).toHaveBeenCalledWith("Quanto vou pagar de imposto de renda?");

    unmountFallback();
    aoPerguntar.mockClear();

    // Cenário com a visão completa de visao-p1.json (deriva o ticker da primeira posição acao/cripto)
    const visaoOriginal = structuredClone(exVisaoP1.dados) as VisaoApp;
    const posComTickerP1 = visaoOriginal.posicoes.find(
      (p) => (p.categoria === "acao" || p.categoria === "cripto") && p.ticker,
    );
    const tickerEsperado = posComTickerP1?.ticker ?? "PETR4";

    const { unmount: unmountOriginal } = render(
      <TelaInvestimentos
        visao={visaoOriginal}
        mostrarSaldos={true}
        aoNaoDisponivel={aoNaoDisponivel}
        aoPerguntar={aoPerguntar}
      />,
    );

    const btnCotacaoOriginal = screen.getByRole("button", { name: "Cotação" });
    await user.click(btnCotacaoOriginal);
    expect(aoPerguntar).toHaveBeenCalledWith(`Qual a cotação de ${tickerEsperado} agora?`);

    const btnImpostoOriginal = screen.getByRole("button", { name: "Imposto" });
    await user.click(btnImpostoOriginal);
    expect(aoPerguntar).toHaveBeenCalledWith("Quanto vou pagar de imposto de renda?");

    unmountOriginal();

    // Sem aoPerguntar, clicar "Imposto" chama aoNaoDisponivel
    render(
      <TelaInvestimentos
        visao={visaoOriginal}
        mostrarSaldos={true}
        aoNaoDisponivel={aoNaoDisponivel}
      />,
    );

    const btnImpostoSemProp = screen.getByRole("button", { name: "Imposto" });
    await user.click(btnImpostoSemProp);
    expect(aoNaoDisponivel).toHaveBeenCalled();
  });

  test("4. Fluxo do app: escolher Bia, ir para Investimentos, clicar 'Imposto' abre chat e envia turno", async () => {
    const user = userEvent.setup();
    const base = criarClienteExemplos();
    const turnosRecebidos: RequisicaoTurno[] = [];

    const cliente = {
      ...base,
      async enviarTurno(req: RequisicaoTurno) {
        turnosRecebidos.push(req);
        return base.enviarTurno(req);
      },
    };

    render(<AppNewAI cliente={cliente} />);

    // 1. Escolher Bia
    const botaoBia = await screen.findByRole("button", { name: /Bia \(fictícia\)/i });
    await user.click(botaoBia);
    await screen.findByText("Saldo em conta");

    // 2. Ir para Investimentos
    const botaoInvestimentos = screen.getByRole("button", { name: /^Investimentos$/i });
    await user.click(botaoInvestimentos);
    expect(await screen.findByText("Total investido")).toBeInTheDocument();

    // 3. Clicar "Imposto"
    const botaoImposto = screen.getByRole("button", { name: "Imposto" });
    await user.click(botaoImposto);

    // 4. O diálogo do chat abre
    const dialogo = await screen.findByRole("dialog", { name: /Chat/i });
    expect(dialogo).toBeInTheDocument();

    // 5. O cliente recebe enviarTurno com "Quanto vou pagar de imposto de renda?"
    await waitFor(() => {
      expect(turnosRecebidos.length).toBeGreaterThanOrEqual(1);
    });
    expect(turnosRecebidos[0]?.mensagem.texto).toBe("Quanto vou pagar de imposto de renda?");
  });
});
