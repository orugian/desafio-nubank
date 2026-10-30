// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { esquemaCartaoResposta, esquemaEstadoSessao, formatarReais, textos } from "@/contratos";
import sessao from "@/contratos/exemplos/api-sessao-p1.json";
import cenarios from "@/contratos/exemplos/cartao-comparacao-cr02.json";
import comparativo from "@/contratos/exemplos/cartao-comparativo-investimento.json";
import pix from "@/contratos/exemplos/cartao-pix-credito.json";
import proposta from "@/contratos/exemplos/cartao-operacao-pendente-cr40.json";
import { CartaoChat } from "./CartaoChat";

const estado = esquemaEstadoSessao.parse(sessao.dados.estado);
const renderizar = (dados: unknown, atual = estado, ocupado = false, acao = vi.fn()) =>
  render(<CartaoChat cartao={esquemaCartaoResposta.parse(dados)} estado={atual} ocupado={ocupado} aoExecutarAcao={acao} />);

afterEach(cleanup);

describe("Cartões financeiros", () => {
  test("cenários preservam alertas, premissas e eventos acessíveis", async () => {
    renderizar(cenarios.dados);
    expect(screen.getByText(textos.legenda_margem)).not.toBeVisible();
    await userEvent.click(screen.getByText("Entender os valores"));
    expect(screen.getByText(textos.legenda_margem)).toBeVisible();
    for (const premissa of textos.premissas) expect(screen.getByText(premissa)).toBeVisible();
    expect(screen.getByText(/^Primeira falta de/)).toBeVisible();
    const botao = screen.getByRole("button", { name: "Ver eventos da projeção" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(botao);
    expect(screen.getByRole("button", { name: "Ocultar eventos da projeção" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("table", { name: "Eventos de Situação atual" })).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Eventos de Situação atual" })).getByText(/Fatura do cartão \(A\)/)).toBeInTheDocument();
  });

  test("comparativo fornece valores originais na lista e ressalvas", () => {
    renderizar(comparativo.dados);
    const tabela = screen.getByRole("list", { name: "Valores dos investimentos" });
    for (const item of [comparativo.dados.resultado.real, ...comparativo.dados.resultado.alternativas]) {
      expect(within(tabela).getByText(formatarReais(item.valor_centavos))).toBeInTheDocument();
    }
    expect(screen.getByText(comparativo.dados.resultado.rotulo)).toBeInTheDocument();
    expect(screen.getByText(comparativo.dados.resultado.real.rotulo_estimativa!)).toBeInTheDocument();
  });

  test("comparativo de valores zerados não cria escala inválida", () => {
    const dados = structuredClone(comparativo.dados);
    dados.resultado.real.valor_centavos = 0;
    dados.resultado.alternativas.forEach((item) => { item.valor_centavos = 0; });
    renderizar(dados);
    expect(screen.queryByText(/As barras comparam/)).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Valores dos investimentos" })).toBeInTheDocument();
    expect(screen.getAllByText("R$ 0,00")).toHaveLength(1 + dados.resultado.alternativas.length);
  });

  test("Pix preserva custos, cronograma e alertas", async () => {
    renderizar(pix.dados);
    expect(screen.getByText(/Saldo em conta insuficiente/)).toBeInTheDocument();
    expect(screen.getByText(/O total passa do limite/)).toBeInTheDocument();
    expect(screen.getByText(/^Juros .*premissa do protótipo/)).toBeInTheDocument();
    expect(screen.getByText(pix.dados.resultado.rotulo)).not.toBeVisible();
    await userEvent.click(screen.getByText("Ver parcelas e encargos"));
    expect(screen.getByText(pix.dados.resultado.rotulo)).toBeVisible();
    expect(screen.getByRole("table", { name: /Cronograma de parcelas/ })).toBeInTheDocument();
  });

  test("confirmação e cancelamento só ficam ativos para operação pendente e sem ocupação", async () => {
    const acao = vi.fn();
    const pendente = { ...estado, operacao_pendente: { id: "OP1", valor_centavos: 50000, destino: "INV9", criada_na_versao: 0 } };
    const tela = renderizar(proposta.dados, pendente, false, acao);
    expect(screen.getByText(proposta.dados.alerta!)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: textos.acoes.confirmar }));
    await userEvent.click(screen.getByRole("button", { name: textos.acoes.cancelar }));
    expect(acao).toHaveBeenNthCalledWith(1, "confirmar", "OP1");
    expect(acao).toHaveBeenNthCalledWith(2, "cancelar", "OP1");
    tela.rerender(<CartaoChat cartao={esquemaCartaoResposta.parse(proposta.dados)} estado={pendente} ocupado aoExecutarAcao={acao} />);
    expect(screen.getByRole("button", { name: textos.acoes.confirmar })).toBeDisabled();
    tela.rerender(<CartaoChat cartao={esquemaCartaoResposta.parse(proposta.dados)} estado={estado} ocupado={false} aoExecutarAcao={acao} />);
    expect(screen.getByRole("button", { name: textos.acoes.cancelar })).toBeDisabled();
  });
});
