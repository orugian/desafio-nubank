// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { formatarReais, type VisaoApp } from "@/contratos";
import exemplo from "@/contratos/exemplos/visao-p1.json";
import { TelaCartao, TelaConta, TelaInvestimentos } from "./componentes/TelasDetalhe";

afterEach(cleanup);

function visaoTeste(): VisaoApp {
  const visao = structuredClone(exemplo.dados) as VisaoApp;
  visao.proximos_pagamentos[0]!.estimativa_texto = "Estimativa livre: R$ 98.765,43 (valor sigiloso)";
  visao.posicoes.find((p) => p.id === "INV1")!.protecao = { tipo: "parcial", valor_centavos: 12345 };
  visao.posicoes.find((p) => p.id === "INV2")!.protecao = { tipo: "parcial", valor_centavos: 23456 };
  return visao;
}

const callbacks = { aoVoltar: vi.fn(), aoNaoDisponivel: vi.fn() };

describe("Privacidade nas telas de detalhe", () => {
  test("conta oculta pagamentos, extrato e texto de estimativa livre; busca e alternância continuam funcionando", async () => {
    const user = userEvent.setup();
    const visao = visaoTeste();
    const { container, rerender } = render(<TelaConta visao={visao} mostrarSaldos={true} {...callbacks} />);
    const pagamento = visao.proximos_pagamentos[0]!;
    const extrato = visao.extrato[0]!;
    expect(container.textContent).toContain(pagamento.estimativa_texto);
    expect(container.textContent).toContain(formatarReais(pagamento.valor_centavos));
    expect(container.textContent).toContain(formatarReais(extrato.valor_centavos));

    rerender(<TelaConta visao={visao} mostrarSaldos={false} {...callbacks} />);
    expect(container.textContent).not.toContain(pagamento.estimativa_texto);
    expect(container.textContent).not.toContain("98.765,43");
    for (const item of [...visao.proximos_pagamentos, ...visao.extrato]) {
      expect(container.textContent).not.toContain(formatarReais(item.valor_centavos));
    }
    expect(screen.getByText("Fatura do cartão (A)")).toBeInTheDocument();
    const tabela = screen.getByRole("table", { name: "Histórico de lançamentos da conta" });
    expect(within(tabela).getAllByText("••••")).toHaveLength(visao.extrato.length);
    await user.type(screen.getByPlaceholderText("Buscar no histórico"), "Salário");
    expect(within(tabela).getAllByText("••••")).toHaveLength(1);
    await user.click(screen.getByRole("tab", { name: "Guardar" }));
    expect(screen.getByRole("tab", { name: "Guardar" })).toHaveAttribute("aria-selected", "true");
    rerender(<TelaConta visao={visao} mostrarSaldos={true} {...callbacks} />);
    expect(container.textContent).toContain(pagamento.estimativa_texto);
    expect(within(tabela).getByText(`+${formatarReais(extrato.valor_centavos)}`)).toBeInTheDocument();
  });

  test("investimentos ocultam valores aplicados e proteção parcial em caixinhas e carteira", () => {
    const visao = visaoTeste();
    const caixinha = visao.posicoes.find((p) => p.id === "INV1")!;
    const carteira = visao.posicoes.find((p) => p.id === "INV2")!;
    const { container, rerender } = render(<TelaInvestimentos visao={visao} mostrarSaldos={true} aoNaoDisponivel={callbacks.aoNaoDisponivel} />);
    for (const valor of [caixinha.aplicado_centavos, carteira.aplicado_centavos, 12345, 23456]) {
      expect(container.textContent).toContain(formatarReais(valor));
    }
    rerender(<TelaInvestimentos visao={visao} mostrarSaldos={false} aoNaoDisponivel={callbacks.aoNaoDisponivel} />);
    for (const posicao of visao.posicoes.filter((p) => p.categoria !== "saldo_separado")) {
      expect(container.textContent).not.toContain(formatarReais(posicao.valor_atual_centavos));
      expect(container.textContent).not.toContain(formatarReais(posicao.aplicado_centavos));
    }
    expect(container.textContent).not.toContain(formatarReais(12345));
    expect(container.textContent).not.toContain(formatarReais(23456));
    expect(container.textContent).toContain("Proteção: parcial (••••)");
    expect(container.textContent).toContain("Proteção parcial: ••••");
    expect(screen.getByText(/Caixinha Reserva/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cotação" })).toBeInTheDocument();
    rerender(<TelaInvestimentos visao={visao} mostrarSaldos={true} aoNaoDisponivel={callbacks.aoNaoDisponivel} />);
    expect(container.textContent).toContain(formatarReais(12345));
  });

  test("cartão oculta faturas, limite, itens e próximas faturas; padrão é visível", async () => {
    const user = userEvent.setup();
    const visao = visaoTeste();
    const cartao = visao.cartao!;
    const aoNaoDisponivel = vi.fn();
    const { container, rerender } = render(<TelaCartao visao={visao} aoVoltar={callbacks.aoVoltar} aoNaoDisponivel={aoNaoDisponivel} />);
    const valores = [cartao.limite_centavos, cartao.fatura_fechada!.valor_centavos, cartao.fatura_aberta.valor_centavos, ...cartao.fatura_fechada!.itens.map((i) => i.valor_centavos), ...cartao.fatura_aberta.itens.map((i) => i.valor_centavos), ...cartao.proximas.map((f) => f.valor_centavos)];
    for (const valor of valores) expect(container.textContent).toContain(formatarReais(valor));
    rerender(<TelaCartao visao={visao} mostrarSaldos={false} aoVoltar={callbacks.aoVoltar} aoNaoDisponivel={aoNaoDisponivel} />);
    for (const valor of valores) expect(container.textContent).not.toContain(formatarReais(valor));
    expect(within(screen.getByRole("table", { name: "Itens da fatura fechada" })).getAllByText("••••")).toHaveLength(cartao.fatura_fechada!.itens.length);
    expect(within(screen.getByRole("table", { name: "Itens da fatura aberta" })).getAllByText("••••")).toHaveLength(cartao.fatura_aberta.itens.length);
    expect(screen.getByText(/F2701 · vencimento/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pagar" }));
    expect(aoNaoDisponivel).toHaveBeenCalledOnce();
    rerender(<TelaCartao visao={visao} mostrarSaldos={true} aoVoltar={callbacks.aoVoltar} aoNaoDisponivel={aoNaoDisponivel} />);
    for (const valor of valores) expect(container.textContent).toContain(formatarReais(valor));
  });

  test("cartão sem fatura fechada usa a aberta e sem cartão mantém retorno", async () => {
    const visao = visaoTeste();
    visao.cartao!.fatura_fechada = null;
    const aoVoltar = vi.fn();
    const { container, rerender } = render(<TelaCartao visao={visao} mostrarSaldos={false} aoVoltar={aoVoltar} aoNaoDisponivel={callbacks.aoNaoDisponivel} />);
    expect(container.textContent).not.toContain(formatarReais(visao.cartao!.fatura_aberta.valor_centavos));
    expect(within(screen.getByRole("table", { name: "Itens da fatura aberta" })).getAllByText("••••")).toHaveLength(visao.cartao!.fatura_aberta.itens.length);
    expect(screen.queryByRole("table", { name: "Itens da fatura fechada" })).not.toBeInTheDocument();
    rerender(<TelaCartao visao={{ ...visao, cartao: null }} mostrarSaldos={false} aoVoltar={aoVoltar} aoNaoDisponivel={callbacks.aoNaoDisponivel} />);
    expect(screen.getByText("Esta persona não possui cartão de crédito.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Voltar" }));
    expect(aoVoltar).toHaveBeenCalledOnce();
  });
});
