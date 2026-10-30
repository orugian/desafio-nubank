"use client";

import { useState } from "react";
import {
  formatarData,
  formatarDiaMes,
  formatarPercentual,
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
      <div className="mt-2 min-w-0 rounded-[20px] border border-[#EEEEEE] bg-white p-4 text-xs leading-relaxed text-[#111111] flex flex-col gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5B168F]">Projeção</div>
          <div className="mt-1 font-semibold text-lg leading-tight text-[#111111]">Comparação de cenários</div>
        </div>
        <p className="text-xs text-[#4A4A4A] bg-[#F8F8F8] p-3 rounded-xl">
          {textos.legenda_margem}
        </p>

        <div className="flex flex-col gap-3">
          {cartao.cenarios.map((c) => (
            <div
              key={c.cenario_id}
              className="min-w-0 rounded-2xl border border-[#EEEEEE] p-3.5 bg-[#FAFAFA] flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-sm text-[#111111]">
                  {c.nome} ({c.cenario_id})
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3E9FB] text-[#5B168F]">
                  {c.status}
                </span>
              </div>

              {c.indicadores && (
                <div className="grid grid-cols-1 gap-2 text-xs mt-1">
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
                    <div className="col-span-full rounded-lg bg-red-50 p-2 text-[#9B1C1C] font-medium">
                      {textos.rotulos.primeira_falta}:{" "}
                      {formatarDiaMes(c.indicadores.primeira_falta.data)} ·{" "}
                      {formatarReais(c.indicadores.primeira_falta.valor_descoberto_centavos)} (
                      {c.indicadores.primeira_falta.saidas_do_dia.join(", ")})
                    </div>
                  )}
                  {c.indicadores.sem_recebimentos && (
                    <div className="col-span-full text-[#4A4A4A] border-t border-[#EEEEEE] pt-2 mt-0.5">
                      <span className="font-medium">{textos.rotulos.sem_recebimentos}: </span>
                      falta {formatarReais(c.indicadores.sem_recebimentos.insuficiencia_centavos)} ·
                      saldo final{" "}
                      {formatarReais(c.indicadores.sem_recebimentos.saldo_final_centavos)}
                    </div>
                  )}
                </div>
              )}

              {c.avisos.map((av) => (
                <div key={av} className="rounded-lg bg-amber-50 p-2 text-xs text-[#8A5300] font-medium">
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
          aria-expanded={expandido}
          className="min-h-11 self-start text-left text-xs font-semibold text-[#5B168F] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#820AD1]"
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
          <div className="p-3 rounded-xl bg-red-50 text-[#9B1C1C] font-medium">{cartao.alerta}</div>
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
      <div className="mt-2 min-w-0 rounded-[20px] border border-[#EEEEEE] bg-white p-4 text-xs leading-relaxed flex flex-col gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5B168F]">Carteira</div>
          <div className="mt-1 font-semibold text-base">
            Investimentos (classificados até {formatarDiaMes(cartao.resultado.ate_data)})
          </div>
        </div>
        <div className="rounded-xl bg-[#F3E9FB] p-3">
          <div className="text-xs text-[#5B168F]">Valor total</div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-[#111111]">{formatarReais(cartao.resultado.totais.valor_total_centavos)}</div>
        </div>
        <div className="text-xs text-[#4A4A4A]">{cartao.resultado.rotulo_rentabilidade}</div>
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
                  {p.restricao && <div className="text-[11px] text-[#8A5300]">{p.restricao}</div>}
                  {p.rotulo_estimativa && <div className="text-[11px] text-[#4A4A4A]">{p.rotulo_estimativa}</div>}
                  <div className="text-[11px] text-[#4A4A4A]">Fonte: {p.fonte}</div>
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
    const faturaRef = cartao.cartao.fatura_fechada ?? cartao.cartao.fatura_aberta;
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs flex flex-col gap-2">
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

  if (cartao.tipo === "cotacao") {
    const { resultado } = cartao;
    const variacaoNum =
      resultado.variacao_dia_pct !== null ? Number(resultado.variacao_dia_pct) : null;
    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs flex flex-col gap-2">
        <div className="font-semibold text-sm text-[#111111]">
          {resultado.ticker}
          {resultado.nome ? ` · ${resultado.nome}` : ""}
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold text-[#111111] tabular-nums">
            {formatarReais(resultado.preco_centavos)}
          </span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
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
          <div className="text-[11px] text-[#646464]">
            Valorização desde {formatarDiaMes(resultado.periodo_desde)}:{" "}
            <span className="font-medium text-[#111111]">
              {formatarPercentual(resultado.valorizacao_periodo_pct)}
            </span>
          </div>
        )}

        {resultado.na_carteira && (
          <div className="text-[11px] text-[#646464]">
            Você tem {resultado.na_carteira.quantidade} ·{" "}
            {formatarReais(resultado.na_carteira.valor_centavos)}
          </div>
        )}

        <div className="text-[11px] text-[#646464] border-t border-[#EEEEEE] pt-1 mt-0.5">
          {resultado.rotulo}
        </div>
      </div>
    );
  }

  if (cartao.tipo === "comparativo_investimento") {
    const { resultado } = cartao;
    type LinhaComparativo = {
      id: "real" | "cdi" | "prefixado";
      nome: string;
      valor_centavos: number;
      resultado_centavos: number;
      rentabilidade_pct: string;
      diferenca_centavos?: number;
      isMelhor: boolean;
    };

    const linhas: LinhaComparativo[] = [
      {
        id: "real",
        nome: "Seu investimento",
        valor_centavos: resultado.real.valor_centavos,
        resultado_centavos: resultado.real.resultado_centavos,
        rentabilidade_pct: resultado.real.rentabilidade_pct,
        isMelhor: resultado.melhor === "real",
      },
      ...resultado.alternativas.map((alt) => ({
        id: alt.id,
        nome: alt.nome,
        valor_centavos: alt.valor_centavos,
        resultado_centavos: alt.resultado_centavos,
        rentabilidade_pct: alt.rentabilidade_pct,
        diferenca_centavos: alt.diferenca_centavos,
        isMelhor: resultado.melhor === alt.id,
      })),
    ];
    // A escala é apenas visual; os valores exibidos continuam sendo os do contrato.
    const maiorValor = Math.max(0, ...linhas.map((linha) => linha.valor_centavos));

    return (
      <div className="mt-2 min-w-0 rounded-[20px] border border-[#EEEEEE] bg-white p-4 text-xs leading-relaxed flex flex-col gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5B168F]">Investimentos</div>
        <div className="font-semibold text-base text-[#111111]">
          Comparativo · {resultado.posicao.nome}
        </div>
        <div className="text-[11px] text-[#646464]">
          Aplicado {formatarReais(resultado.aplicado_centavos)} desde{" "}
          {formatarDiaMes(resultado.inicio)} ({resultado.dias_corridos} dias)
        </div>

        {maiorValor > 0 && (
          <p className="text-xs text-[#4A4A4A]">As barras comparam o valor hoje; os valores exatos estão na tabela.</p>
        )}
        <TabelaCompartilhada
          caption={`Comparativo de rendimento para ${resultado.posicao.nome}`}
          itens={linhas}
          obterChave={(l) => l.id}
          colunas={[
            {
              chave: "nome",
              titulo: "Investimento",
              renderizar: (l) => (
                <div className={l.isMelhor ? "font-bold text-[#111111]" : "text-[#111111]"}>
                  <span>{l.nome}</span>
                  {l.isMelhor && (
                    <span className="ml-1 text-[10px] text-[#259E56] font-semibold">(melhor)</span>
                  )}
                </div>
              ),
            },
            {
              chave: "valor",
              titulo: "Valor hoje",
              alinharDireita: true,
              renderizar: (l) => (
                <div>
                  <span className={l.isMelhor ? "font-bold tabular-nums whitespace-nowrap" : "tabular-nums whitespace-nowrap"}>
                    {formatarReais(l.valor_centavos)}
                  </span>
                  {maiorValor > 0 && (
                    <div aria-hidden="true" className="mt-1 h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-[#EEE8F3]">
                      <div className="h-full rounded-full bg-[#820AD1]" style={{ width: `${(l.valor_centavos / maiorValor) * 100}%` }} />
                    </div>
                  )}
                </div>
              ),
            },
            {
              chave: "resultado",
              titulo: "Resultado",
              alinharDireita: true,
              renderizar: (l) => (
                <div className={l.isMelhor ? "font-bold tabular-nums" : "tabular-nums"}>
                  <div className="whitespace-nowrap">{formatarReais(l.resultado_centavos)}</div>
                  <div className="whitespace-nowrap text-[10px] font-normal text-[#646464]">
                    {formatarPercentual(l.rentabilidade_pct)}
                  </div>
                  {l.diferenca_centavos !== undefined && (
                    <div
                      className={`whitespace-nowrap text-[10px] font-normal ${
                        l.diferenca_centavos >= 0 ? "text-[#259E56]" : "text-[#F65758]"
                      }`}
                    >
                      dif. {l.diferenca_centavos > 0 ? "+" : ""}
                      {formatarReais(l.diferenca_centavos)}
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />

        <div className="text-[11px] text-[#646464] border-t border-[#EEEEEE] pt-1 mt-0.5 flex flex-col gap-0.5">
          <div>{resultado.rotulo}</div>
          {resultado.real.rotulo_estimativa && <div>{resultado.real.rotulo_estimativa}</div>}
        </div>
      </div>
    );
  }

  if (cartao.tipo === "simulacao_investimento") {
    const { resultado } = cartao;
    const taxaPrefTexto = resultado.taxa_aa_pct ? resultado.taxa_aa_pct.replace(".", ",") : "";
    const indexadorTitulo =
      resultado.indexador === "cdi"
        ? `${resultado.cdi_pct}% do CDI`
        : `prefixado ${taxaPrefTexto}% a.a.`;

    return (
      <div className="mt-2 min-w-0 rounded-[20px] border border-[#EEEEEE] bg-white p-4 text-xs leading-relaxed flex flex-col gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5B168F]">Investimentos</div>
        <div className="font-semibold text-base text-[#111111]">Simulação · {indexadorTitulo}</div>
        <div className="text-[11px] text-[#646464]">
          {formatarReais(resultado.valor_centavos)} de {formatarDiaMes(resultado.inicio)} a{" "}
          {formatarData(resultado.fim)} ({resultado.dias_corridos} dias)
        </div>

        <div className="flex flex-col gap-1.5 text-xs text-[#111111]">
          <div className="flex justify-between">
            <span className="text-[#646464]">Rendimento bruto</span>
            <span className="font-semibold tabular-nums">
              {formatarReais(resultado.rendimento_bruto_centavos)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#646464]">
              IOF ({formatarPercentual(resultado.aliquota_iof_pct)})
            </span>
            <span className="tabular-nums">{formatarReais(resultado.iof_centavos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#646464]">
              IR ({formatarPercentual(resultado.aliquota_ir_pct)})
            </span>
            <span className="tabular-nums">{formatarReais(resultado.ir_centavos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#646464]">Rendimento líquido</span>
            <span className="font-semibold tabular-nums text-[#259E56]">
              {formatarReais(resultado.rendimento_liquido_centavos)}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-[#F3E9FB] p-3 mt-1 text-sm font-semibold text-[#111111]">
            <span>Valor final líquido</span>
            <span className="tabular-nums">
              {formatarReais(resultado.valor_final_liquido_centavos)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-[#646464]">
            <span>Rentabilidade líquida</span>
            <span className="font-semibold tabular-nums text-[#259E56]">
              {formatarPercentual(resultado.rentabilidade_liquida_pct)}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-[#646464] border-t border-[#EEEEEE] pt-1 mt-0.5">
          {resultado.rotulo}
        </div>
      </div>
    );
  }

  if (cartao.tipo === "pix_credito") {
    const { resultado } = cartao;
    const jurosTexto = resultado.juros_am_pct.replace(".", ",");
    const jurosOrigemTexto =
      resultado.juros_origem === "premissa" ? "premissa do protótipo" : "informado";

    return (
      <div className="mt-2 min-w-0 rounded-[20px] border border-[#EEEEEE] bg-white p-4 text-xs leading-relaxed flex flex-col gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5B168F]">Simulação de crédito</div>
        <div className="font-semibold text-base text-[#111111]">
          Pix no crédito · {formatarReais(resultado.valor_centavos)} em {resultado.parcelas}x
        </div>

        {resultado.saldo_suficiente === false ? (
          <div className="p-3 rounded-xl bg-amber-50 text-[#8A5300] font-medium text-xs">
            Saldo em conta insuficiente: faltam {formatarReais(resultado.falta_saldo_centavos)}
          </div>
        ) : (
          <div className="text-[11px] text-[#646464]">
            Há saldo em conta para este Pix; no crédito há juros.
          </div>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-[#111111]">
          <div className="flex justify-between">
            <span className="text-[#646464]">
              Juros {jurosTexto}% a.m. ({jurosOrigemTexto})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#646464]">IOF</span>
            <span className="tabular-nums">{formatarReais(resultado.iof_centavos)}</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-[#F3E9FB] p-3 mt-1 text-sm font-semibold text-[#111111]">
            <span>Total pago</span>
            <span className="tabular-nums">{formatarReais(resultado.total_pago_centavos)}</span>
          </div>
          <div className="flex justify-between gap-2 font-semibold text-[#9B1C1C]">
            <span>Custo do crédito</span>
            <span className="tabular-nums">{formatarReais(resultado.custo_total_centavos)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-[#646464]">
            <span>CET</span>
            <span className="tabular-nums">
              {formatarPercentual(resultado.cet_am_pct)} a.m. /{" "}
              {formatarPercentual(resultado.cet_aa_pct)} a.a.
            </span>
          </div>
        </div>

        <TabelaCompartilhada
          caption="Cronograma de parcelas do Pix no crédito"
          itens={resultado.cronograma}
          obterChave={(p) => String(p.numero)}
          colunas={[
            {
              chave: "parcela",
              titulo: "Parcela",
              renderizar: (p) => `${p.numero}/${resultado.parcelas}`,
            },
            {
              chave: "vencimento",
              titulo: "Vencimento",
              renderizar: (p) => formatarDiaMes(p.vencimento),
            },
            {
              chave: "valor",
              titulo: "Valor",
              alinharDireita: true,
              renderizar: (p) => formatarReais(p.valor_centavos),
            },
          ]}
        />

        {resultado.excede_limite && (
          <div className="p-3 rounded-xl bg-red-50 text-[#9B1C1C] font-medium text-xs">
            O total passa do limite disponível do cartão (
            {formatarReais(resultado.limite_disponivel_centavos)})
          </div>
        )}

        <div className="text-[11px] text-[#646464] border-t border-[#EEEEEE] pt-1 mt-0.5">
          {resultado.rotulo}
        </div>
      </div>
    );
  }

  if (cartao.tipo === "imposto_renda") {
    const { resultado } = cartao;

    return (
      <div className="mt-2 rounded-2xl border border-[#EEEEEE] bg-white p-3.5 text-xs flex flex-col gap-2.5">
        <div className="font-semibold text-sm text-[#111111]">
          Imposto de renda · ano-calendário {resultado.ano_calendario}
        </div>

        {resultado.investimentos && (
          <div className="flex flex-col gap-2 border-t border-[#EEEEEE] pt-2">
            <div className="font-semibold text-xs text-[#111111]">Investimentos</div>
            <TabelaCompartilhada
              caption="IR sobre investimentos"
              itens={resultado.investimentos.itens}
              obterChave={(it) => it.posicao_id}
              colunas={[
                {
                  chave: "nome",
                  titulo: "Posição",
                  renderizar: (it) => <span className="font-medium">{it.nome}</span>,
                },
                {
                  chave: "ir",
                  titulo: "IR estimado",
                  alinharDireita: true,
                  renderizar: (it) => (
                    <div className="flex flex-col">
                      <span className="font-semibold tabular-nums">
                        {formatarReais(it.ir_estimado_centavos)}
                      </span>
                      <span className="text-[10px] text-[#646464]">
                        {it.isento ? "isento" : formatarPercentual(it.aliquota_pct)} ·{" "}
                        {it.data_pagamento
                          ? `pagamento ${formatarDiaMes(it.data_pagamento)}`
                          : it.forma}
                      </span>
                    </div>
                  ),
                },
              ]}
            />
            <div className="text-xs font-semibold text-right tabular-nums text-[#111111]">
              Total estimado: {formatarReais(resultado.investimentos.total_ir_estimado_centavos)}
            </div>
          </div>
        )}

        {resultado.irpf && (
          <div className="flex flex-col gap-2 border-t border-[#EEEEEE] pt-2">
            <div className="font-semibold text-xs text-[#111111]">
              IRPF (declaração {resultado.exercicio})
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-[#111111]">
              <div className="flex justify-between">
                <span className="text-[#646464]">
                  Renda mensal considerada (
                  {resultado.irpf.origem === "historico" ? "pela média do histórico" : "informada"})
                </span>
                <span className="font-medium tabular-nums">
                  {formatarReais(resultado.irpf.rendimento_mensal_centavos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#646464]">
                  Imposto mensal ({resultado.irpf.forma_mensal})
                </span>
                <span className="tabular-nums">
                  {formatarReais(resultado.irpf.mensal.imposto_centavos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#646464]">Imposto anual devido</span>
                <span className="font-medium tabular-nums">
                  {formatarReais(resultado.irpf.imposto_devido_centavos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#646464]">Já retido/recolhido no ano</span>
                <span className="tabular-nums">
                  {formatarReais(resultado.irpf.retido_ou_recolhido_anual_centavos)}
                </span>
              </div>

              {resultado.irpf.a_pagar_centavos > 0 ? (
                <div className="flex justify-between font-bold text-sm text-[#F65758] border-t border-[#EEEEEE] pt-1.5 mt-0.5">
                  <span>A pagar</span>
                  <span className="tabular-nums">
                    {formatarReais(resultado.irpf.a_pagar_centavos)}
                  </span>
                </div>
              ) : resultado.irpf.a_restituir_centavos > 0 ? (
                <div className="flex justify-between font-bold text-sm text-[#259E56] border-t border-[#EEEEEE] pt-1.5 mt-0.5">
                  <span>A restituir</span>
                  <span className="tabular-nums">
                    {formatarReais(resultado.irpf.a_restituir_centavos)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between font-bold text-sm text-[#111111] border-t border-[#EEEEEE] pt-1.5 mt-0.5">
                  <span>Sem imposto a pagar</span>
                  <span className="tabular-nums">{formatarReais(0)}</span>
                </div>
              )}

              <div className="text-[11px] text-[#646464] mt-0.5">
                Prazo para declaração: {formatarData(resultado.irpf.prazo_declaracao)}
              </div>

              {resultado.irpf.premissas.length > 0 && (
                <div className="border-t border-[#EEEEEE] pt-1 mt-0.5 text-[10px] text-[#646464]">
                  <div className="font-semibold mb-0.5">Premissas:</div>
                  <ul className="list-disc pl-3.5 space-y-0.5">
                    {resultado.irpf.premissas.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-[11px] text-[#646464] border-t border-[#EEEEEE] pt-1 mt-0.5 flex flex-col gap-0.5">
          <div>{resultado.rotulo}</div>
          <div>{resultado.fontes.join(" · ")}</div>
        </div>
      </div>
    );
  }

  if (cartao.tipo === "erro") {
    return (
      <div className="mt-2 rounded-2xl border border-[#F65758] bg-red-50 p-3 text-xs text-red-900">
        <span className="font-semibold">{cartao.codigo}: </span>
        {cartao.mensagem}
      </div>
    );
  }

  return null;
}
