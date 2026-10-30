"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpDown,
  Barcode,
  ChevronLeft,
  FileText,
  PiggyBank,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  formatarDiaMes,
  formatarReais,
  textos,
  type Config,
  type EstadoSessao,
  type VisaoApp,
} from "@/contratos";
import { TabelaCompartilhada } from "./TabelaCompartilhada";

export function TelaInvestimentos({
  visao,
  mostrarSaldos,
  aoNaoDisponivel,
  aoPerguntar,
}: {
  visao: VisaoApp;
  mostrarSaldos: boolean;
  aoNaoDisponivel: () => void;
  aoPerguntar?: (texto: string) => void;
}) {
  const posicoesInvest = visao.posicoes.filter((p) => p.categoria !== "saldo_separado");
  const totalInvestido = posicoesInvest.reduce((s, p) => s + p.valor_atual_centavos, 0);
  const caixinhas = posicoesInvest.filter((p) => p.categoria === "caixinha");
  const carteira = posicoesInvest.filter(
    (p) => p.categoria !== "caixinha" && p.categoria !== "cripto",
  );
  const outros = posicoesInvest.filter((p) => p.categoria === "cripto");

  const posComTicker = visao.posicoes.find(
    (p) => (p.categoria === "acao" || p.categoria === "cripto") && p.ticker,
  );
  const perguntaCotacao = posComTicker?.ticker
    ? `Qual a cotação de ${posComTicker.ticker} agora?`
    : "Qual a cotação de PETR4 agora?";

  const posicoesComAplicacao = visao.posicoes.filter(
    (p) => p.categoria !== "saldo_separado" && p.aplicado_centavos > 0,
  );
  const posPreferida =
    posicoesComAplicacao.find((p) => p.categoria === "acao" || p.categoria === "cripto") ??
    posicoesComAplicacao[0];
  const perguntaComparar = posPreferida
    ? `Quanto eu teria ganho se tivesse colocado no CDI o que investi em ${posPreferida.nome}?`
    : "Quanto renderiam R$ 1.000 em 12 meses a 100% do CDI?";

  const perguntaSimular = "Quanto renderiam R$ 1.000 em 12 meses a 100% do CDI?";
  const perguntaImposto = "Quanto vou pagar de imposto de renda?";

  const atalhos = [
    { rotulo: "Cotação", Icone: TrendingUp, pergunta: perguntaCotacao },
    { rotulo: "Comparar", Icone: ArrowUpDown, pergunta: perguntaComparar },
    { rotulo: "Simular", Icone: PiggyBank, pergunta: perguntaSimular },
    { rotulo: "Imposto", Icone: FileText, pergunta: perguntaImposto },
  ];

  return (
    <div className="flex flex-col flex-1">
      <header className="bg-[#820AD1] text-white px-6 py-5 flex items-center justify-between">
        <div>
          <div className="text-sm opacity-90">Carteira de investimentos</div>
          <div className="text-lg font-semibold mt-0.5">{visao.persona.nome}</div>
        </div>
      </header>

      <section className="px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#111111]">Total investido</h1>
          <p className="text-2xl font-semibold text-[#111111] mt-1 tabular-nums">
            {mostrarSaldos ? formatarReais(totalInvestido) : "••••"}
          </p>
          <p className="text-xs text-[#646464] mt-1">{textos.rotulos.rentabilidade}</p>
        </div>
        <button
          type="button"
          onClick={aoNaoDisponivel}
          className="px-5 py-2.5 rounded-full bg-[#820AD1] text-white text-sm font-semibold"
        >
          Investir
        </button>
      </section>

      {/* Atalhos circulares */}
      <div className="px-6 pb-5 flex gap-4 overflow-x-auto">
        {atalhos.map(({ rotulo, Icone, pergunta }) => (
          <button
            key={rotulo}
            type="button"
            aria-label={rotulo}
            onClick={() => (aoPerguntar ? aoPerguntar(pergunta) : aoNaoDisponivel())}
            className="flex flex-col items-center gap-1.5 shrink-0 w-20"
          >
            <span className="w-14 h-14 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#111111]">
              <Icone className="w-5 h-5" />
            </span>
            <span className="text-xs font-medium text-[#111111]">{rotulo}</span>
          </button>
        ))}
      </div>

      {/* Caixinhas */}
      <section className="px-6 py-4 border-t border-[#EEEEEE] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5 text-[#820AD1]" />
          <h2 className="text-base font-semibold text-[#111111]">Caixinhas</h2>
        </div>
        {caixinhas.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl bg-[#F0F0F0] p-4 flex flex-col gap-1.5 text-xs text-[#111111]"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">
                {p.nome} ({p.id})
              </span>
              <span className="font-semibold text-sm tabular-nums">
                {mostrarSaldos ? formatarReais(p.valor_atual_centavos) : "••••"}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[#646464]">
              <span>Aplicado: {mostrarSaldos ? formatarReais(p.aplicado_centavos) : "••••"}</span>
              <span>Rentabilidade: {p.rentabilidade_pct}%</span>
              {p.cdi_pct && <span>{p.cdi_pct}% do CDI</span>}
              <span>Disponível: {formatarDiaMes(p.data_disponibilidade)}</span>
            </div>
            {p.protecao && (
              <div className="flex items-center gap-1 text-[#259E56] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  Proteção: {p.protecao.tipo}
                  {p.protecao.tipo === "parcial"
                    ? ` (${mostrarSaldos ? formatarReais(p.protecao.valor_centavos) : "••••"})`
                    : ""}
                </span>
              </div>
            )}
            {p.restricao && <div className="text-[#DB791C] font-medium">{p.restricao}</div>}
            <div className="text-[11px] text-[#646464]">Fonte: {p.fonte}</div>
          </div>
        ))}
      </section>

      {/* Minha Carteira e Outros produtos na TabelaCompartilhada */}
      <section className="px-6 py-4 border-t border-[#EEEEEE] flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[#111111]">Minha Carteira e Outros produtos</h2>
        <TabelaCompartilhada
          caption="Posições de investimento da carteira"
          itens={[...carteira, ...outros]}
          obterChave={(p) => p.id}
          colunas={[
            {
              chave: "ativo",
              titulo: "Posição / Detalhes",
              renderizar: (p) => (
                <div className="flex flex-col gap-0.5">
                  <div className="font-semibold">
                    {p.nome} ({p.id})
                  </div>
                  <div className="text-[11px] text-[#646464]">
                    Disponível em {p.data_disponibilidade} ({formatarDiaMes(p.data_disponibilidade)}
                    )
                  </div>
                  {p.protecao && (
                    <div className="text-[11px] text-[#259E56] font-medium">
                      Proteção {p.protecao.tipo}
                      {p.protecao.tipo === "parcial"
                        ? `: ${mostrarSaldos ? formatarReais(p.protecao.valor_centavos) : "••••"}`
                        : ""}
                    </div>
                  )}
                  {p.restricao && <div className="text-[11px] text-[#DB791C]">{p.restricao}</div>}
                  <div className="text-[11px] text-[#646464]">
                    Fonte: {p.fonte}
                    {p.estimado ? " · estimado" : ""}
                  </div>
                </div>
              ),
            },
            {
              chave: "valores",
              titulo: "Valores e Rentabilidade",
              alinharDireita: true,
              renderizar: (p) => (
                <div className="flex flex-col gap-0.5">
                  <div className="font-semibold">
                    {mostrarSaldos ? formatarReais(p.valor_atual_centavos) : "••••"}
                  </div>
                  <div className="text-[11px] text-[#646464]">
                    Aplicado: {mostrarSaldos ? formatarReais(p.aplicado_centavos) : "••••"}
                  </div>
                  <div className="text-[11px] text-[#259E56]">Rent.: {p.rentabilidade_pct}%</div>
                  {p.valorizacao_periodo_pct !== null && (
                    <div className="text-[11px] text-[#5B168F]">
                      Valorização: {p.valorizacao_periodo_pct}%
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}

export function TelaConta({
  visao,
  mostrarSaldos,
  aoVoltar,
  aoNaoDisponivel,
}: {
  visao: VisaoApp;
  mostrarSaldos: boolean;
  aoVoltar: () => void;
  aoNaoDisponivel: () => void;
}) {
  const [subAba, setSubAba] = useState<"usar" | "guardar">("usar");
  const [busca, setBusca] = useState("");
  const saldoSeparado =
    visao.posicoes.find((p) => p.id === "SEP")?.valor_atual_centavos ?? 0;

  const extratoFiltrado = visao.extrato.filter((e) =>
    busca.trim() ? e.descricao.toLowerCase().includes(busca.trim().toLowerCase()) : true,
  );

  return (
    <div className="flex flex-col flex-1">
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#EEEEEE]">
        <button
          type="button"
          aria-label="Voltar para início"
          onClick={aoVoltar}
          className="w-11 h-11 rounded-full flex items-center justify-center text-[#111111] hover:bg-[#F0F0F0]"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-semibold text-[#111111]">Conta</span>
        <div className="w-11" />
      </header>

      {/* Controle segmentado Usar / Guardar (IMG_2105) */}
      <div className="px-6 pt-4">
        <div
          role="tablist"
          aria-label="Seções da conta"
          className="grid grid-cols-2 rounded-full bg-[#F0F0F0] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subAba === "usar"}
            onClick={() => setSubAba("usar")}
            className={`py-2 rounded-full text-sm font-semibold transition-colors ${
              subAba === "usar" ? "bg-white text-[#111111] shadow-2xs" : "text-[#646464]"
            }`}
          >
            Usar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subAba === "guardar"}
            onClick={() => setSubAba("guardar")}
            className={`py-2 rounded-full text-sm font-semibold transition-colors ${
              subAba === "guardar" ? "bg-white text-[#111111] shadow-2xs" : "text-[#646464]"
            }`}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Total centralizado */}
      <section className="px-6 py-6 text-center">
        <div className="text-sm text-[#646464]">
          {subAba === "usar" ? "Saldo em conta" : "Saldo separado"}
        </div>
        <div className="text-3xl font-semibold text-[#111111] mt-1 tabular-nums">
          {mostrarSaldos
            ? formatarReais(
                subAba === "usar" ? visao.conta.saldo_disponivel_hoje_centavos : saldoSeparado,
              )
            : "••••"}
        </div>

        <div className="flex justify-center gap-5 mt-6">
          {[
            { nome: "Trazer dinheiro", Icone: ArrowDownToLine },
            { nome: "Transferir", Icone: ArrowUpDown },
            { nome: "Pagar", Icone: Barcode },
          ].map(({ nome, Icone }) => (
            <button
              key={nome}
              type="button"
              onClick={aoNaoDisponivel}
              className="flex flex-col items-center gap-1.5 w-20"
            >
              <span className="w-14 h-14 rounded-full border border-[#EEEEEE] bg-white flex items-center justify-center text-[#111111]">
                <Icone className="w-5 h-5" />
              </span>
              <span className="text-xs font-medium text-[#111111] leading-tight">{nome}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Saldo separado card */}
      <section className="px-6 pb-4">
        <div className="rounded-2xl border border-[#EEEEEE] p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[#646464]">Saldo separado</div>
            <div className="text-lg font-semibold text-[#111111] mt-0.5 tabular-nums">
              {mostrarSaldos ? formatarReais(saldoSeparado) : "••••"}
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#F3E9FB] text-[#5B168F] text-xs font-medium">
            SEP
          </span>
        </div>
      </section>

      {/* Próximos pagamentos */}
      <section className="px-6 py-4 border-t border-[#EEEEEE] flex flex-col gap-2.5">
        <h2 className="text-base font-semibold text-[#111111]">Próximos pagamentos</h2>
        {visao.proximos_pagamentos.map((p) => (
          <div
            key={p.evento_id}
            className="rounded-xl border border-[#EEEEEE] p-3 flex items-center justify-between text-xs"
          >
            <div>
              <div className="font-semibold text-[#111111]">
                {p.descricao} ({p.evento_id})
              </div>
              <div className="text-[#646464]">
                {formatarDiaMes(p.data)} · {textos.rotulos.origem[p.origem]}
                {p.previsto ? ` · ${textos.rotulos.previsto}` : ""}
              </div>
              {p.estimativa_texto && (
                <div className="text-[11px] text-[#5B168F]">
                  {mostrarSaldos ? p.estimativa_texto : "••••"}
                </div>
              )}
            </div>
            <div className="font-semibold tabular-nums">
              {mostrarSaldos
                ? `${p.tipo === "saida" ? "− " : "+ "}${formatarReais(p.valor_centavos)}`
                : "••••"}
            </div>
          </div>
        ))}
      </section>

      {/* Histórico (extrato) com busca e TabelaCompartilhada */}
      <section className="px-6 py-4 border-t border-[#EEEEEE] flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[#111111]">Histórico</h2>
        <div className="flex items-center gap-2 bg-[#F0F0F0] rounded-full px-4 py-2">
          <Search className="w-4 h-4 text-[#646464]" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no histórico"
            className="bg-transparent text-xs text-[#111111] flex-1 focus:outline-none"
          />
        </div>
        <TabelaCompartilhada
          caption="Histórico de lançamentos da conta"
          itens={extratoFiltrado}
          obterChave={(i) => i.id}
          colunas={[
            {
              chave: "data",
              titulo: "Data",
              renderizar: (i) => formatarDiaMes(i.data),
            },
            {
              chave: "descricao",
              titulo: "Lançamento",
              renderizar: (i) => (
                <div>
                  <div className="font-medium">{i.descricao}</div>
                  <div className="text-[10px] text-[#646464]">
                    {i.meio} · {i.categoria}
                    {i.simulado ? " · Simulado" : ""}
                  </div>
                </div>
              ),
            },
            {
              chave: "valor",
              titulo: "Valor",
              alinharDireita: true,
              renderizar: (i) =>
                mostrarSaldos
                  ? `${i.tipo === "saida" ? "−" : "+"}${formatarReais(i.valor_centavos)}`
                  : "••••",
            },
          ]}
        />
      </section>
    </div>
  );
}

export function TelaCartao({
  visao,
  mostrarSaldos = true,
  aoVoltar,
  aoNaoDisponivel,
}: {
  visao: VisaoApp;
  mostrarSaldos?: boolean;
  aoVoltar: () => void;
  aoNaoDisponivel: () => void;
}) {
  const cartao = visao.cartao;

  if (!cartao) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <button type="button" onClick={aoVoltar} className="text-sm text-[#820AD1] underline">
          Voltar
        </button>
        <p className="text-sm text-[#646464]">Esta persona não possui cartão de crédito.</p>
      </div>
    );
  }

  const faturaPrincipal = cartao.fatura_fechada ?? cartao.fatura_aberta;

  return (
    <div className="flex flex-col flex-1">
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#EEEEEE]">
        <button
          type="button"
          aria-label="Voltar para início"
          onClick={aoVoltar}
          className="w-11 h-11 rounded-full flex items-center justify-center text-[#111111] hover:bg-[#F0F0F0]"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-semibold text-[#111111]">Cartão de crédito</span>
        <div className="w-11" />
      </header>

      <section className="px-6 py-6 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-[#646464]">
            Fatura {cartao.fatura_fechada ? "fechada" : "aberta"} ({faturaPrincipal.fatura_id})
          </div>
          <div className="text-3xl font-semibold text-[#111111] tabular-nums">
            {mostrarSaldos ? formatarReais(faturaPrincipal.valor_centavos) : "••••"}
          </div>
          <div className="text-xs text-[#646464] mt-1">
            Limite total:{" "}
            <span className="font-semibold text-[#111111]">
              {mostrarSaldos ? formatarReais(cartao.limite_centavos) : "••••"}
            </span>
          </div>
          <div className="text-xs text-[#646464]">
            Vence em {formatarDiaMes(faturaPrincipal.vencimento)} · Fechamento em{" "}
            {formatarDiaMes(faturaPrincipal.fechamento)}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={aoNaoDisponivel}
              className="px-5 py-2.5 rounded-full bg-[#F65758] text-white text-xs font-semibold"
            >
              Pagar
            </button>
            <button
              type="button"
              onClick={aoNaoDisponivel}
              className="px-5 py-2.5 rounded-full bg-[#F0F0F0] text-[#111111] text-xs font-semibold"
            >
              Parcelar
            </button>
          </div>
        </div>

      </section>

      <section className="px-6 py-4 border-t border-[#EEEEEE] flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#111111]">
          Itens da fatura {cartao.fatura_fechada ? "fechada" : "aberta"} ({faturaPrincipal.fatura_id})
        </h2>
        <TabelaCompartilhada
          caption={`Itens da fatura ${cartao.fatura_fechada ? "fechada" : "aberta"}`}
          itens={faturaPrincipal.itens}
          obterChave={(i, idx) => `fech-${idx}`}
          colunas={[
            {
              chave: "item",
              titulo: "Descrição",
              renderizar: (i) => (
                <div>
                  <div className="font-medium">{i.descricao}</div>
                  <div className="text-[10px] text-[#646464]">
                    {i.parcela ? `Parcela ${i.parcela}` : i.data ? formatarDiaMes(i.data) : "Fixo"}
                  </div>
                </div>
              ),
            },
            {
              chave: "valor",
              titulo: "Valor",
              alinharDireita: true,
              renderizar: (i) => mostrarSaldos ? formatarReais(i.valor_centavos) : "••••",
            },
          ]}
        />
      </section>

      {cartao.fatura_fechada && (
      <section className="px-6 py-4 border-t border-[#EEEEEE] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111111]">
            Fatura aberta ({cartao.fatura_aberta.fatura_id}) · vence{" "}
            {formatarDiaMes(cartao.fatura_aberta.vencimento)}
          </h2>
          <span className="text-xs font-semibold tabular-nums">
            {mostrarSaldos ? formatarReais(cartao.fatura_aberta.valor_centavos) : "••••"}
          </span>
        </div>
        <TabelaCompartilhada
          caption="Itens da fatura aberta"
          itens={cartao.fatura_aberta.itens}
          obterChave={(i, idx) => `ab-${idx}`}
          colunas={[
            {
              chave: "item",
              titulo: "Descrição",
              renderizar: (i) => `${i.descricao}${i.parcela ? ` (${i.parcela})` : ""}`,
            },
            {
              chave: "valor",
              titulo: "Valor",
              alinharDireita: true,
              renderizar: (i) => mostrarSaldos ? formatarReais(i.valor_centavos) : "••••",
            },
          ]}
        />
      </section>
      )}

      {cartao.proximas.length > 0 && (
        <section className="px-6 py-4 border-t border-[#EEEEEE] flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[#111111]">Próximas faturas</h2>
          {cartao.proximas.map((f) => (
            <div
              key={f.fatura_id}
              className="p-2.5 rounded-xl bg-[#F8F8F8] flex items-center justify-between text-xs"
            >
              <span>
                {f.fatura_id} · vencimento {formatarDiaMes(f.vencimento)}
              </span>
              <span className="font-semibold tabular-nums">
                {mostrarSaldos ? formatarReais(f.valor_centavos) : "••••"}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function TelaComoFunciona({
  config,
  estado,
  aoVoltar,
}: {
  config: Config;
  estado: EstadoSessao;
  aoVoltar: () => void;
}) {
  const mensagensComRastro = estado.conversa.filter((m) => m.rastro && m.rastro.length > 0);

  return (
    <div className="flex flex-col flex-1">
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#EEEEEE]">
        <button
          type="button"
          aria-label="Voltar para início"
          onClick={aoVoltar}
          className="w-11 h-11 rounded-full flex items-center justify-center text-[#111111] hover:bg-[#F0F0F0]"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm font-semibold text-[#111111]">Como funciona</span>
        <div className="w-11" />
      </header>

      <div className="p-6 flex flex-col gap-5 text-xs text-[#111111]">
        <div>
          <h1 className="text-lg font-semibold">Configuração e transparência</h1>
          <p className="text-[#646464] mt-1">
            Provedor: <span className="font-semibold text-[#111111]">{config.provedor}</span> ·
            Modelo: <span className="font-semibold text-[#111111]">{config.modelo}</span> · Contrato{" "}
            {config.versao_contratos} ({config.modo})
          </p>
        </div>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold">Regras fixas do motor</h2>
          <ul className="list-disc pl-4 space-y-1 text-[#646464]">
            {config.regras_fixas.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Fontes de mercado</h2>
          {config.fontes_mercado.map((f) => (
            <div key={f.nome} className="p-3 rounded-xl bg-[#F8F8F8] border border-[#EEEEEE]">
              <div className="font-semibold">
                {f.nome} · {f.uso}
              </div>
              <div className="text-[11px] text-[#646464] break-all">{f.url}</div>
              <div className="text-[11px] text-[#646464]">
                Obtido em: {f.obtido_em ?? "não informado"}
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Rastro de chamadas das respostas</h2>
          {mensagensComRastro.length === 0 ? (
            <p className="text-[#646464]">Nenhuma ferramenta executada ainda nesta sessão.</p>
          ) : (
            mensagensComRastro.map((m) => (
              <div
                key={m.mensagem_id}
                className="p-3 rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] flex flex-col gap-1.5"
              >
                <div className="font-semibold text-[#5B168F]">
                  Mensagem {m.mensagem_id} (versão {m.versao})
                </div>
                {m.rastro.map((r, idx) => (
                  <div key={`${m.mensagem_id}-r-${idx}`} className="bg-white p-2 rounded border">
                    <div className="font-semibold">
                      Chamada {r.chamada}: {r.ferramenta}
                    </div>
                    <pre className="text-[10px] text-[#646464] overflow-x-auto">
                      {JSON.stringify(r.argumentos)}
                    </pre>
                  </div>
                ))}
              </div>
            ))
          )}
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold">Ferramentas registradas ({config.ferramentas.length})</h2>
          <div className="space-y-1">
            {config.ferramentas.map((t) => (
              <div key={t.nome} className="p-2 rounded bg-[#F8F8F8]">
                <span className="font-semibold">{t.nome}: </span>
                <span className="text-[#646464]">{t.descricao}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold">Instruções atuais (instrucoes.md)</h2>
          <pre className="p-3 rounded-xl bg-[#F8F8F8] border border-[#EEEEEE] whitespace-pre-wrap text-[11px] text-[#646464]">
            {config.instrucoes}
          </pre>
        </section>
      </div>
    </div>
  );
}
