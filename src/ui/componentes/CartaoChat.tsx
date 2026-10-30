"use client";

import {
  formatarDiaMes,
  formatarPercentual,
  formatarReais,
  textos,
  type CartaoResposta,
  type EstadoSessao,
} from "@/contratos";
import { TabelaCompartilhada } from "./TabelaCompartilhada";
import { CartaoCenario } from "./CartaoCenario";
import { CartoesFinanceiros, AvisoFinanceiro } from "./CartoesFinanceiros";
import { CartoesResumo } from "./CartoesResumo";
import s from "./Financeiro.styles";

export function CartaoChat({
  cartao,
  estado,
  ocupado,
  aoExecutarAcao,
}: {
  cartao: CartaoResposta;
  estado: EstadoSessao;
  ocupado: boolean;
  aoExecutarAcao: (tipo: "confirmar" | "cancelar", operacao_id: string) => void;
}) {
  if (cartao.tipo === "simulacao_investimento" || cartao.tipo === "pix_credito" || cartao.tipo === "simulacao_parcelamento" || cartao.tipo === "comparativo_investimento") return <CartoesFinanceiros cartao={cartao} />;

  if (cartao.tipo === "comparacao") return <CartaoCenario cartao={cartao} />;
  if (cartao.tipo === "investimentos" || cartao.tipo === "imposto_renda" || cartao.tipo === "o_que_mudou") return <CartoesResumo cartao={cartao} />;

  if (cartao.tipo === "operacao_pendente") {
    const aindaPendente = estado.operacao_pendente?.id === cartao.operacao_id;
    const desabilitado = ocupado || !aindaPendente;
    return (
      <div className={s.card}>
        <h2>Guardar em {cartao.destino.nome}</h2>
        <div className={s.lead}>{formatarReais(cartao.valor_centavos)}</div>
        <p className={s.note}>{textos.faixa_prototipo} · Proposta de movimentação simulada ({cartao.operacao_id})</p>
        {cartao.alerta && <AvisoFinanceiro>{cartao.alerta}</AvisoFinanceiro>}
        {cartao.rendimento_estimado && (
          <div className="text-xs text-[#646464]">
            Rendimento estimado até {formatarDiaMes(cartao.rendimento_estimado.ate_data)}:{" "}
            <span className="font-semibold text-[#111111]">
              {formatarReais(cartao.rendimento_estimado.rendimento_bruto_centavos)}
            </span>{" "}
            ({cartao.rendimento_estimado.rotulo})
          </div>
        )}
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => aoExecutarAcao("confirmar", cartao.operacao_id)}
            className="min-h-11 flex-1 py-2 px-3 rounded-full bg-[#820AD1] text-white font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B168F]"
          >
            {textos.acoes.confirmar}
          </button>
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => aoExecutarAcao("cancelar", cartao.operacao_id)}
            className="min-h-11 flex-1 py-2 px-3 rounded-full bg-[#F0F0F0] text-[#111111] font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B168F]"
          >
            {textos.acoes.cancelar}
          </button>
        </div>
      </div>
    );
  }

  if (cartao.tipo === "operacao_concluida") {
    return (
      <div className={s.card}>
        <p className={s.note}>{textos.faixa_prototipo}</p>
        <p className="font-semibold my-3">{cartao.mensagem}</p>
        <div className="text-sm text-[#646464]">
          Saldo disponível hoje: {formatarReais(cartao.saldo_disponivel_hoje_centavos)}
        </div>
      </div>
    );
  }

  if (cartao.tipo === "historico") {
    return (
      <div className={s.card}>
        <div className="font-semibold text-sm">
          Histórico ({formatarDiaMes(cartao.resultado.de)} a {formatarDiaMes(cartao.resultado.ate)})
        </div>
        <TabelaCompartilhada
          caption="Lançamentos do histórico"
          itens={cartao.resultado.itens}
          obterChave={(i) => i.id}
          colunas={[
            { chave: "data", titulo: "Data", renderizar: (i) => formatarDiaMes(i.data) },
            {
              chave: "desc",
              titulo: "Descrição",
              renderizar: (i) => `${i.descricao} (${i.categoria})`,
            },
            {
              chave: "valor",
              titulo: "Valor",
              alinharDireita: true,
              renderizar: (i) => formatarReais(i.valor_centavos),
            },
          ]}
        />
      </div>
    );
  }

  if (cartao.tipo === "cartao_credito") {
    const faturaRef = cartao.cartao.fatura_fechada ?? cartao.cartao.fatura_aberta;
    return (
      <div className={s.card}>
        <div className="font-semibold text-sm">
          Cartão · Fatura ({faturaRef.fatura_id}): {formatarReais(faturaRef.valor_centavos)}
        </div>
        <TabelaCompartilhada
          caption="Itens da fatura"
          itens={faturaRef.itens}
          obterChave={(i, idx) => `${i.descricao}-${idx}`}
          colunas={[
            {
              chave: "desc",
              titulo: "Item",
              renderizar: (i) => `${i.descricao}${i.parcela ? ` (${i.parcela})` : ""}`,
            },
            {
              chave: "valor",
              titulo: "Valor",
              alinharDireita: true,
              renderizar: (i) => formatarReais(i.valor_centavos),
            },
          ]}
        />
      </div>
    );
  }

  if (cartao.tipo === "rendimento") {
    return (
      <div className={s.card}>
        <div className="font-semibold">
          Projeção de rendimento até {formatarDiaMes(cartao.resultado.ate_data)}:{" "}
          {formatarReais(cartao.resultado.rendimento_bruto_centavos)}
        </div>
        <div className="text-xs text-[#646464]">{cartao.resultado.rotulo}</div>
      </div>
    );
  }

  if (cartao.tipo === "rascunho_atendimento") {
    return (
      <div className={s.card}>
        <div className="text-sm font-semibold text-[#646464]">
          {textos.rotulos.rascunho_nao_enviado}
        </div>
        <div className="font-semibold mt-0.5">{cartao.motivo}</div>
        <p className="mt-1 text-[#646464]">{cartao.texto}</p>
      </div>
    );
  }

  if (cartao.tipo === "aviso_valor") {
    return (
      <div className={s.card}>
        {cartao.mensagem}
      </div>
    );
  }

  if (cartao.tipo === "cotacao") {
    const { resultado } = cartao;
    const variacaoNum =
      resultado.variacao_dia_pct !== null ? Number(resultado.variacao_dia_pct) : null;
    return (
      <div className={s.card}>
        <div className="font-semibold text-sm text-[#111111]">
          {resultado.ticker}
          {resultado.nome ? ` · ${resultado.nome}` : ""}
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold text-[#111111] tabular-nums">
            {formatarReais(resultado.preco_centavos)}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              resultado.ao_vivo ? "bg-emerald-50 text-[#259E56]" : "bg-gray-100 text-[#646464]"
            }`}
          >
            {resultado.ao_vivo ? "ao vivo" : "gravado"}
          </span>
          {resultado.variacao_dia_pct !== null && variacaoNum !== null && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                variacaoNum >= 0 ? "text-[#259E56]" : "text-[#F65758]"
              }`}
            >
              {variacaoNum > 0 ? "+" : ""}
              {formatarPercentual(resultado.variacao_dia_pct)}
            </span>
          )}
        </div>

        {resultado.valorizacao_periodo_pct !== null && resultado.periodo_desde !== null && (
          <div className="text-xs text-[#646464]">
            Valorização desde {formatarDiaMes(resultado.periodo_desde)}:{" "}
            <span className="font-medium text-[#111111]">
              {formatarPercentual(resultado.valorizacao_periodo_pct)}
            </span>
          </div>
        )}

        {resultado.na_carteira && (
          <div className="text-xs text-[#646464]">
            Você tem {resultado.na_carteira.quantidade} ·{" "}
            {formatarReais(resultado.na_carteira.valor_centavos)}
          </div>
        )}

        <div className="text-xs text-[#646464] border-t border-[#EEEEEE] pt-1 mt-0.5">
          {resultado.rotulo}
        </div>
      </div>
    );
  }

  if (cartao.tipo === "erro") {
    return (
      <div className={s.card}>
        <span className="font-semibold">{cartao.codigo}: </span>
        {cartao.mensagem}
      </div>
    );
  }

  return null;
}
