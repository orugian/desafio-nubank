// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { formatarReais, type CartaoResposta, type EstadoSessao } from "@/contratos";
import exParcelamento from "@/contratos/exemplos/cartao-simulacao-parcelamento.json";
import { CartaoChat } from "./componentes/CartaoChat";

type CartaoParcelamento = Extract<CartaoResposta, { tipo: "simulacao_parcelamento" }>;

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

function renderizar(cartao: CartaoParcelamento) {
  return render(<CartaoChat cartao={cartao} estado={estadoBase} ocupado={false} aoExecutarAcao={vi.fn()} />);
}

describe("cartão simulacao_parcelamento", () => {
  afterEach(() => cleanup());

  test("mostra compra, à vista, tabela por opção, menor custo e rótulo", () => {
    const cartao = exParcelamento.dados as CartaoParcelamento;
    const { resultado } = cartao;
    renderizar(cartao);

    expect(screen.getByText(`À vista ou parcelado · ${formatarReais(resultado.valor_centavos)}`)).toBeInTheDocument();
    expect(screen.getByText(resultado.rotulo)).toBeInTheDocument();

    const tabela = screen.getByRole("table", { name: "Opções de parcelamento simuladas" });
    const linhas = within(tabela).getAllByRole("row");
    expect(linhas).toHaveLength(resultado.opcoes.length + 1);
    for (const titulo of ["Parcelas", "Parcela", "Total", "Valor hoje (CDI)", "% da renda"]) {
      expect(within(tabela).getByRole("columnheader", { name: titulo })).toBeInTheDocument();
    }
    const o48 = resultado.opcoes.find((o) => o.parcelas === 48)!;
    const linha48 = linhas.find((l) => within(l).queryByText("48x"))!;
    expect(within(linha48).getByText(formatarReais(o48.parcela_centavos))).toBeInTheDocument();
    expect(within(linha48).getByText(formatarReais(o48.total_pago_centavos))).toBeInTheDocument();
    expect(within(linha48).getByText(formatarReais(o48.valor_presente_centavos))).toBeInTheDocument();
    expect(within(linha48).getByText("32,92%")).toBeInTheDocument();

    // No exemplo da moto, o menor custo é à vista: o destaque aparece uma vez, fora da tabela.
    expect(resultado.menor_custo).toBe("a_vista");
    expect(screen.getAllByText("menor custo na simulação")).toHaveLength(1);
    expect(within(tabela).queryByText("menor custo na simulação")).toBeNull();
    expect(screen.queryByText(/recomend/i)).toBeNull();
  });

  test("destaca a opção parcelada de menor custo e oculta % da renda sem renda", () => {
    const base = exParcelamento.dados as CartaoParcelamento;
    const cartao: CartaoParcelamento = {
      ...base,
      resultado: {
        ...base.resultado,
        menor_custo: 12,
        renda_liquida_mensal_centavos: null,
        opcoes: base.resultado.opcoes.map((o) => ({ ...o, comprometimento_renda_pct: null })),
      },
    };
    renderizar(cartao);
    const tabela = screen.getByRole("table", { name: "Opções de parcelamento simuladas" });
    const linha12 = within(tabela)
      .getAllByRole("row")
      .find((l) => within(l).queryByText("12x"))!;
    expect(within(linha12).getByText("menor custo na simulação")).toBeInTheDocument();
    expect(screen.getAllByText("menor custo na simulação")).toHaveLength(1);
    expect(within(tabela).queryByRole("columnheader", { name: "% da renda" })).toBeNull();
  });
});
