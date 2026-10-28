"use client";

import { useState } from "react";
import {
  formatarDiaMes,
  formatarReais,
  textos,
  type CartaoResposta,
  type EstadoSessao,
} from "@/contratos";
import { TabelaCompartilhada } from "./TabelaCompartilhada";

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
  const [expandido, setExpandido] = useState(false);

  if (cartao.tipo === "comparacao") {
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs text-[#111111] flex flex-col gap-3">
        <div className="font-semibold text-sm text-[#111111]">Comparação de cenários</div>
        <p className="text-[11px] text-[#646464] bg-[#F8F8F8] p-2 rounded-lg">
          {textos.legenda_margem}
        </p>

        <div className="flex flex-col gap-3">
          {cartao.cenarios.map((c) => (
            <div
              key={c.cenario_id}
              className="rounded-xl border border-[#EEEEEE] p-3 bg-[#FAFAFA] flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#111111]">
                  {c.nome} ({c.cenario_id})
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3E9FB] text-[#5B168F]">
                  {c.status}
                </span>
              </div>

              {c.indicadores && (
                <div className="grid grid-cols-2 gap-1.5 text-[11px] mt-1">
                  <div>
                    <span className="text-[#646464]">{textos.rotulos.margem}: </span>
                    <span className="font-semibold tabular-nums">
                      {formatarReais(c.indicadores.margem_hoje_centavos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#646464]">{textos.rotulos.saldo_minimo}: </span>
                    <span className="font-semibold tabular-nums">
                      {formatarReais(c.indicadores.saldo_minimo_centavos)} (
                      {formatarDiaMes(c.indicadores.data_saldo_minimo)})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#646464]">{textos.rotulos.insuficiencia}: </span>
                    <span className="font-semibold tabular-nums">
                      {formatarReais(c.indicadores.insuficiencia_centavos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#646464]">{textos.rotulos.saldo_final}: </span>
                    <span className="font-semibold tabular-nums">
                      {formatarReais(c.indicadores.saldo_final_centavos)}
                    </span>
                  </div>
                  {c.indicadores.primeira_falta && (
                    <div className="col-span-2 text-[#F65758] font-medium">
                      {textos.rotulos.primeira_falta}:{" "}
                      {formatarDiaMes(c.indicadores.primeira_falta.data)} ·{" "}
                      {formatarReais(c.indicadores.primeira_falta.valor_descoberto_centavos)} (
                      {c.indicadores.primeira_falta.saidas_do_dia.join(", ")})
                    </div>
                  )}
                  {c.indicadores.sem_recebimentos && (
                    <div className="col-span-2 text-[#646464] border-t border-[#EEEEEE] pt-1 mt-0.5">
                      <span className="font-medium">{textos.rotulos.sem_recebimentos}: </span>
                      falta {formatarReais(c.indicadores.sem_recebimentos.insuficiencia_centavos)} ·
                      saldo final{" "}
                      {formatarReais(c.indicadores.sem_recebimentos.saldo_final_centavos)}
                    </div>
                  )}
                </div>
              )}

              {c.avisos.map((av) => (
                <div key={av} className="text-[11px] text-[#DB791C] font-medium">
                  {textos.rotulos.avisos_cenario[av]}
                </div>
              ))}

              {c.datas_ordem_relevante.map((d) => (
                <div key={d} className="text-[11px] text-[#5B168F] font-medium">
                  {textos.rotulos.ordem_relevante(d)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-left text-xs font-semibold text-[#820AD1] underline"
        >
          {expandido ? "Ocultar eventos da projeção" : "Ver eventos da projeção"}
        </button>

        {expandido && (
          <div className="flex flex-col gap-3">
            {cartao.cenarios.map((c) => (
              <div key={c.cenario_id} className="flex flex-col gap-1">
                <div className="font-semibold text-[11px] text-[#646464]">{c.nome}</div>
                <TabelaCompartilhada
                  caption={`Eventos de ${c.nome}`}
                  itens={c.linhas}
                  obterChave={(l, idx) => `${c.cenario_id}-${l.evento_id}-${idx}`}
                  colunas={[
                    {
                      chave: "data",
                      titulo: "Data",
                      renderizar: (l) => formatarDiaMes(l.data),
                    },
                    {
                      chave: "evento",
                      titulo: "Evento",
                      renderizar: (l) => (
                        <div>
                          <div className="font-medium">
                            {l.descricao} ({l.evento_id})
                          </div>
                          <div className="text-[10px] text-[#646464]">
                            {textos.rotulos.origem[l.origem]}
                            {l.previsto ? ` · ${textos.rotulos.previsto}` : ""}
                          </div>
                          {l.original && (
                            <div className="text-[10px] text-[#5B168F]">
                              {textos.rotulos.original_para_declarado(
                                formatarReais(l.original.valor_centavos),
                                formatarReais(l.valor_centavos),
                              )}
                            </div>
                          )}
                          {l.rotulo && (
                            <div className="text-[10px] font-semibold text-[#F65758]">
                              {l.rotulo}
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      chave: "valor",
                      titulo: "Valor",
                      alinharDireita: true,
                      renderizar: (l) =>
                        `${l.tipo === "saida" ? "−" : "+"}${formatarReais(l.valor_centavos)}`,
                    },
                    {
                      chave: "saldo",
                      titulo: "Saldo após",
                      alinharDireita: true,
                      renderizar: (l) => formatarReais(l.saldo_apos_centavos),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-[#EEEEEE] pt-2 text-[11px] text-[#646464]">
          <div className="font-semibold mb-1">Premissas:</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {textos.premissas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (cartao.tipo === "o_que_mudou") {
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs text-[#111111] flex flex-col gap-2">
        <div className="font-semibold text-sm">O que mudou</div>
        {cartao.alteracoes.map((a) => (
          <div key={a.id} className="p-2 rounded-lg bg-[#F3E9FB] text-[#5B168F] font-medium">
            {a.id}: {a.descricao}
          </div>
        ))}
        {cartao.cenarios.map((c) => (
          <div key={c.cenario_id} className="border-t border-[#EEEEEE] pt-2">
            <div className="font-semibold">
              {c.nome} ({c.situacao})
            </div>
            <ul className="mt-1 space-y-0.5 text-[11px] text-[#646464]">
              {c.diferencas.map((d) => (
                <li key={d.indicador}>
                  {d.indicador}: {String(d.antes ?? "—")} → {String(d.depois ?? "—")}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (cartao.tipo === "operacao_pendente") {
    const aindaPendente = estado.operacao_pendente?.id === cartao.operacao_id;
    const desabilitado = ocupado || !aindaPendente;
    return (
      <div className="mt-2 rounded-2xl border border-[#820AD1] bg-white p-3.5 text-xs text-[#111111] flex flex-col gap-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#5B168F]">
          {textos.faixa_prototipo} · Proposta de movimentação simulada ({cartao.operacao_id})
        </div>
        <div className="font-semibold text-sm">
          Guardar {formatarReais(cartao.valor_centavos)} em {cartao.destino.nome}
        </div>
        {cartao.alerta && (
          <div className="p-2 rounded-lg bg-red-50 text-[#F65758] font-medium">{cartao.alerta}</div>
        )}
        {cartao.rendimento_estimado && (
          <div className="text-[11px] text-[#646464]">
            Rendimento estimado até {formatarDiaMes(cartao.rendimento_estimado.ate_data)}:{" "}
            <span className="font-semibold text-[#111111]">
              {formatarReais(cartao.rendimento_estimado.rendimento_bruto_centavos)}
            </span>{" "}
            ({cartao.rendimento_estimado.rotulo})
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => aoExecutarAcao("confirmar", cartao.operacao_id)}
            className="flex-1 py-2 px-3 rounded-full bg-[#820AD1] text-white font-semibold disabled:opacity-40"
          >
            {textos.acoes.confirmar}
          </button>
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => aoExecutarAcao("cancelar", cartao.operacao_id)}
            className="flex-1 py-2 px-3 rounded-full bg-[#F0F0F0] text-[#111111] font-semibold disabled:opacity-40"
          >
            {textos.acoes.cancelar}
          </button>
        </div>
      </div>
    );
  }

  if (cartao.tipo === "operacao_concluida") {
    return (
      <div className="mt-2 rounded-2xl border border-[#259E56] bg-white p-3.5 text-xs text-[#111111] flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold uppercase text-[#259E56]">
          {textos.faixa_prototipo}
        </div>
        <div className="font-semibold">{cartao.mensagem}</div>
        <div className="text-[11px] text-[#646464]">
          Saldo disponível hoje: {formatarReais(cartao.saldo_disponivel_hoje_centavos)}
        </div>
      </div>
    );
  }

  if (cartao.tipo === "investimentos") {
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs flex flex-col gap-2">
        <div className="font-semibold text-sm">
          Investimentos (classificados até {formatarDiaMes(cartao.resultado.ate_data)})
        </div>
        <div className="text-[11px] text-[#646464]">{cartao.resultado.rotulo_rentabilidade}</div>
        <TabelaCompartilhada
          caption="Posições de investimento"
          itens={cartao.resultado.posicoes}
          obterChave={(p) => p.posicao_id}
          colunas={[
            {
              chave: "nome",
              titulo: "Posição",
              renderizar: (p) => (
                <div>
                  <div className="font-medium">
                    {p.nome} ({p.posicao_id})
                  </div>
                  <div className="text-[10px] text-[#646464]">
                    {textos.rotulos.classificacao[p.classificacao]} · disp.{" "}
                    {formatarDiaMes(p.data_disponibilidade)}
                  </div>
                  {p.restricao && <div className="text-[10px] text-[#DB791C]">{p.restricao}</div>}
                </div>
              ),
            },
            {
              chave: "valor",
              titulo: "Atual / Aplicado",
              alinharDireita: true,
              renderizar: (p) => (
                <div>
                  <div className="font-semibold">{formatarReais(p.valor_atual_centavos)}</div>
                  <div className="text-[10px] text-[#646464]">
                    apl. {formatarReais(p.aplicado_centavos)} ({p.rentabilidade_pct}%)
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }

  if (cartao.tipo === "historico") {
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs flex flex-col gap-2">
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
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs flex flex-col gap-2">
        <div className="font-semibold text-sm">
          Cartão · Fatura fechada ({cartao.cartao.fatura_fechada.fatura_id}):{" "}
          {formatarReais(cartao.cartao.fatura_fechada.valor_centavos)}
        </div>
        <TabelaCompartilhada
          caption="Itens da fatura fechada"
          itens={cartao.cartao.fatura_fechada.itens}
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
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs">
        <div className="font-semibold">
          Projeção de rendimento até {formatarDiaMes(cartao.resultado.ate_data)}:{" "}
          {formatarReais(cartao.resultado.rendimento_bruto_centavos)}
        </div>
        <div className="text-[11px] text-[#646464]">{cartao.resultado.rotulo}</div>
      </div>
    );
  }

  if (cartao.tipo === "rascunho_atendimento") {
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs">
        <div className="text-[10px] font-semibold uppercase text-[#646464]">
          {textos.rotulos.rascunho_nao_enviado}
        </div>
        <div className="font-semibold mt-0.5">{cartao.motivo}</div>
        <p className="mt-1 text-[#646464]">{cartao.texto}</p>
      </div>
    );
  }

  if (cartao.tipo === "aviso_valor") {
    return (
      <div className="mt-2 rounded-2xl border border-[#DB791C] bg-amber-50 p-3 text-xs text-amber-900">
        {cartao.mensagem}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-[#F65758] bg-red-50 p-3 text-xs text-red-900">
      <span className="font-semibold">{cartao.codigo}: </span>
      {cartao.mensagem}
    </div>
  );
}
