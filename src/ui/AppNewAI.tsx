"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  Barcode,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  HelpCircle,
  Menu,
  PiggyBank,
  Smartphone,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  formatarDiaMes,
  formatarReais,
  textos,
  type AvisoTurno,
  type Config,
  type EstadoSessao,
  type Falha,
  type ResumoPersona,
  type VisaoApp,
} from "@/contratos";
import { obterClientePadrao, type ClienteApi } from "./cliente-api";
import { CamadaChat } from "./componentes/CamadaChat";
import {
  TelaCartao,
  TelaComoFunciona,
  TelaConta,
  TelaInvestimentos,
} from "./componentes/TelasDetalhe";

export type AbaTela = "home" | "investimentos" | "conta" | "cartao" | "como_funciona";

const CHAVE_STORAGE = "newai_sessao_v1";

type SessaoPersistida = {
  estado: EstadoSessao;
  visao: VisaoApp;
  config: Config;
  abaAtual: AbaTela;
  chatAberto: boolean;
};

export function AppNewAI({ cliente: clienteProp }: { cliente?: ClienteApi }) {
  const [cliente] = useState<ClienteApi>(() => clienteProp ?? obterClientePadrao());
  const [personas, setPersonas] = useState<ResumoPersona[]>([]);
  const [estado, setEstado] = useState<EstadoSessao | null>(null);
  const [visao, setVisao] = useState<VisaoApp | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [abaAtual, setAbaAtual] = useState<AbaTela>("home");
  const [chatAberto, setChatAberto] = useState(false);
  const [mostrarSaldos, setMostrarSaldos] = useState(true);
  const [avisoTemporario, setAvisoTemporario] = useState<string | null>(null);
  const [erroFatal, setErroFatal] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ultimoEnvio, setUltimoEnvio] = useState<{ id: string; texto: string } | null>(null);
  const [falhaChat, setFalhaChat] = useState<Falha | null>(null);
  const [avisosChat, setAvisosChat] = useState<AvisoTurno[]>([]);
  const [contadorMsg, setContadorMsg] = useState(1);
  // Lock síncrono: o estado React só é atualizado no próximo render.
  const operacaoEmAndamento = useRef(false);

  useEffect(() => {
    try {
      const salvo = window.sessionStorage.getItem(CHAVE_STORAGE);
      if (salvo) {
        const parsed = JSON.parse(salvo) as SessaoPersistida;
        if (parsed?.estado && parsed?.visao && parsed?.config) {
          setEstado(parsed.estado);
          setVisao(parsed.visao);
          setConfig(parsed.config);
          setAbaAtual(parsed.abaAtual ?? "home");
          setChatAberto(Boolean(parsed.chatAberto));
        }
      }
    } catch {
      // ignora sessionStorage corrompido
    }
    void cliente.listarPersonas().then(setPersonas).catch(() => {});
  }, [cliente]);

  useEffect(() => {
    if (!estado || !visao || !config) return;
    try {
      const dados: SessaoPersistida = { estado, visao, config, abaAtual, chatAberto };
      window.sessionStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
    } catch {
      // ignora erro de quota
    }
  }, [estado, visao, config, abaAtual, chatAberto]);

  async function iniciarPersona(persona_id: string) {
    if (operacaoEmAndamento.current) return;
    operacaoEmAndamento.current = true;
    setEnviando(true);
    const informarFalha = (falha: Falha) => {
      if (estado) {
        setAvisoTemporario(falha.mensagem);
        setFalhaChat({
          ...falha,
          mensagem: `${falha.mensagem} Tente iniciar uma nova conversa novamente.`,
          pode_tentar_novamente: false,
        });
      } else {
        setErroFatal(falha.mensagem);
      }
    };
    try {
      const res = await cliente.criarSessao({ persona_id });
      if (res.status === "ok") {
        setEstado(res.estado);
        setVisao(res.visao);
        setConfig(res.config);
        setAbaAtual("home");
        setAvisoTemporario(null);
        setErroFatal(null);
        setFalhaChat(null);
        setAvisosChat([]);
        setUltimoEnvio(null);
      } else {
        informarFalha(res.falha);
      }
    } catch {
      informarFalha({
        tipo: "F-03",
        codigo: "INDISPONIVEL",
        mensagem: textos.falhas["F-03"],
        pode_tentar_novamente: false,
      });
    } finally {
      operacaoEmAndamento.current = false;
      setEnviando(false);
    }
  }

  async function dispararTurno(msg: { id: string; texto: string }) {
    if (!estado || operacaoEmAndamento.current) return;
    operacaoEmAndamento.current = true;
    const versaoEsperada = estado.versao + 1;
    setEnviando(true);
    setFalhaChat(null);
    setUltimoEnvio(msg);

    try {
      const res = await cliente.enviarTurno({
        estado,
        mensagem: msg,
        tela_atual: abaAtual,
      });

      if (res.status === "ok") {
        if (res.estado.versao !== versaoEsperada) {
          setFalhaChat({
            tipo: "F-06",
            codigo: "ESTADO_INVALIDO",
            mensagem: textos.falhas["F-06"],
            pode_tentar_novamente: false,
          });
          return;
        }
        setEstado(res.estado);
        setVisao(res.visao);
        setAvisosChat(res.avisos);
        setUltimoEnvio(null);
      } else {
        setFalhaChat(res.falha);
        if (res.estado) setEstado(res.estado);
      }
    } catch {
      setFalhaChat({
        tipo: "F-03",
        codigo: "INDISPONIVEL",
        mensagem: textos.falhas["F-03"],
        pode_tentar_novamente: true,
      });
    } finally {
      operacaoEmAndamento.current = false;
      setEnviando(false);
    }
  }

  function enviarMensagemNova(texto: string) {
    const id = `msg-${Date.now()}-${contadorMsg}`;
    setContadorMsg((n) => n + 1);
    void dispararTurno({ id, texto });
  }

  function tentarNovamenteTurno() {
    if (!ultimoEnvio || enviando) return;
    void dispararTurno(ultimoEnvio);
  }

  async function executarAcaoMovimentacao(
    tipo: "confirmar" | "cancelar",
    operacao_id: string,
  ) {
    if (!estado || operacaoEmAndamento.current) return;
    operacaoEmAndamento.current = true;
    const versaoEsperada = estado.versao + 1;
    setEnviando(true);
    setFalhaChat(null);

    try {
      const res = await cliente.enviarAcao({
        estado,
        acao: { tipo, operacao_id },
      });

      if (res.status === "ok") {
        if (res.estado.versao !== versaoEsperada) {
          setFalhaChat({
            tipo: "F-06",
            codigo: "ESTADO_INVALIDO",
            mensagem: textos.falhas["F-06"],
            pode_tentar_novamente: false,
          });
          return;
        }
        setEstado(res.estado);
        setVisao(res.visao);
        setAvisosChat(res.avisos);
      } else {
        setFalhaChat(res.falha);
        if (res.estado) setEstado(res.estado);
      }
    } catch {
      setFalhaChat({
        tipo: "F-03",
        codigo: "INDISPONIVEL",
        mensagem: textos.falhas["F-03"],
        pode_tentar_novamente: true,
      });
    } finally {
      operacaoEmAndamento.current = false;
      setEnviando(false);
    }
  }

  function acionarNaoDisponivel() {
    setAvisoTemporario(textos.nao_disponivel);
  }

  if (!estado || !visao || !config) {
    return (
      <div className="newai-viewport">
        <div className="newai-frame">
          <div className="bg-[#111111] text-white text-xs py-1.5 px-4 text-center font-medium">
            {textos.faixa_prototipo}
          </div>
          <main className="newai-scroll p-6 flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#111111]">Escolha uma persona</h1>
              <p className="text-sm text-[#646464] mt-1">
                Selecione o perfil fictício para iniciar a simulação financeira.
              </p>
            </div>
            {erroFatal && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 text-red-800 text-sm">
                {erroFatal}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {personas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void iniciarPersona(p.id)}
                  disabled={enviando}
                  className="w-full text-left p-4 rounded-2xl border border-[#EEEEEE] bg-[#F8F8F8] hover:bg-[#F3E9FB] transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-[#111111] text-base">{p.nome}</div>
                    <div className="text-sm text-[#646464] mt-0.5">{p.resumo}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#820AD1] shrink-0" />
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="newai-viewport">
      <div className="newai-frame">
        {/* Faixa de protótipo permanente em todas as telas */}
        <div className="newai-topbar bg-[#111111] text-white text-xs px-4">
          <span>{textos.faixa_prototipo}</span>
          <div className="newai-topbar-actions">
            <button
              type="button"
              onClick={() => setAbaAtual("como_funciona")}
              className="underline text-[11px] text-[#E3DFFD]"
            >
              Como funciona
            </button>
            <button
              type="button"
              onClick={() => void iniciarPersona(estado.persona_id)}
              disabled={enviando}
              className="underline text-[11px] text-white disabled:opacity-50"
            >
              Recomeçar
            </button>
            <button
              type="button"
              onClick={() => setChatAberto(true)}
              aria-label="Abrir chat com a Nina (NewAI)"
              className="newai-launcher"
            >
              <span>Nina</span>
            </button>
          </div>
        </div>

        {avisoTemporario && (
          <div
            role="status"
            className="bg-[#F3E9FB] text-[#5B168F] text-xs px-4 py-2.5 flex items-center justify-between border-b border-[#E3DFFD]"
          >
            <span>{avisoTemporario}</span>
            <button
              type="button"
              onClick={() => setAvisoTemporario(null)}
              className="text-xs font-semibold underline ml-2"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="newai-scroll">
        {abaAtual === "home" && (
          <div className="flex flex-col flex-1">
            {/* Cabeçalho roxo (IMG_2103) */}
            <header className="bg-[#820AD1] text-white px-6 pt-6 pb-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Perfil"
                  onClick={acionarNaoDisponivel}
                  className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <UserRound className="w-6 h-6 text-white" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={mostrarSaldos ? "Ocultar valores" : "Mostrar valores"}
                    onClick={() => setMostrarSaldos((v) => !v)}
                    className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10"
                  >
                    {mostrarSaldos ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Como funciona o protótipo"
                    onClick={() => setAbaAtual("como_funciona")}
                    className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Trocar persona"
                    disabled={enviando}
                    onClick={() => {
                      if (operacaoEmAndamento.current) return;
                      window.sessionStorage.removeItem(CHAVE_STORAGE);
                      setEstado(null);
                      setVisao(null);
                      setConfig(null);
                    }}
                    className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="text-lg font-semibold">Olá, {visao.persona.nome}</div>
            </header>

            {/* Faixa neutra secundária */}
            <div className="bg-[#F2E5C6] text-[#111111] px-6 py-2.5 text-xs font-medium flex items-center justify-between">
              <span>Planejamento financeiro simulado · janela até 29/11</span>
              <ChevronRight className="w-4 h-4 text-[#646464]" />
            </div>

            {/* Bloco Saldo em conta */}
            <section className="px-6 pt-6 pb-4">
              <button
                type="button"
                onClick={() => setAbaAtual("conta")}
                className="w-full text-left flex items-center justify-between group"
              >
                <div>
                  <h2 className="text-lg font-semibold text-[#111111]">Saldo em conta</h2>
                  <p className="text-2xl font-semibold text-[#111111] mt-1 tabular-nums">
                    {mostrarSaldos
                      ? formatarReais(visao.conta.saldo_disponivel_hoje_centavos)
                      : "••••"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#646464]" />
              </button>

              {/* Atalhos circulares */}
              <div className="flex gap-4 overflow-x-auto py-5 no-scrollbar">
                <button
                  type="button"
                  onClick={acionarNaoDisponivel}
                  className="flex flex-col items-center gap-2 shrink-0 w-20"
                >
                  <span className="w-16 h-16 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#111111]">
                    <ArrowUpDown className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-medium text-[#111111] text-center leading-tight">
                    Área Pix e Transferir
                  </span>
                </button>

                <button
                  type="button"
                  onClick={acionarNaoDisponivel}
                  className="flex flex-col items-center gap-2 shrink-0 w-20"
                >
                  <span className="w-16 h-16 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#111111]">
                    <Barcode className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-medium text-[#111111] text-center leading-tight">
                    Pagar
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtual("investimentos")}
                  className="flex flex-col items-center gap-2 shrink-0 w-20"
                >
                  <span className="w-16 h-16 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#111111]">
                    <PiggyBank className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-medium text-[#111111] text-center leading-tight">
                    Caixinhas e Investir
                  </span>
                </button>

                <button
                  type="button"
                  onClick={acionarNaoDisponivel}
                  className="flex flex-col items-center gap-2 shrink-0 w-20"
                >
                  <span className="w-16 h-16 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[#111111]">
                    <Smartphone className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-medium text-[#111111] text-center leading-tight">
                    Recarga de celular
                  </span>
                </button>
              </div>

              {/* Pílula Meus cartões */}
              <button
                type="button"
                onClick={() => (visao.cartao ? setAbaAtual("cartao") : acionarNaoDisponivel())}
                className="w-full p-4 rounded-2xl bg-[#F0F0F0] flex items-center gap-3 text-sm font-medium text-[#111111]"
              >
                <CreditCard className="w-5 h-5" />
                <span>Meus cartões</span>
              </button>
            </section>

            <hr className="border-[#EEEEEE]" />

            {/* Seção Cartão de crédito */}
            {visao.cartao && (
              <section className="px-6 py-5 border-b border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setAbaAtual("cartao")}
                  className="w-full text-left flex items-center justify-between"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-[#111111]">Cartão de crédito</h2>
                    <p className="text-xs text-[#646464] mt-1">
                      {visao.cartao.fatura_fechada ? "Fatura fechada" : "Fatura aberta"}
                    </p>
                    <p className="text-xl font-semibold text-[#111111] mt-0.5 tabular-nums">
                      {mostrarSaldos
                        ? formatarReais(
                            (visao.cartao.fatura_fechada ?? visao.cartao.fatura_aberta)
                              .valor_centavos,
                          )
                        : "••••"}
                    </p>
                    <p className="text-xs text-[#646464] mt-1">
                      Vencimento{" "}
                      {formatarDiaMes(
                        (visao.cartao.fatura_fechada ?? visao.cartao.fatura_aberta).vencimento,
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#646464]" />
                </button>
              </section>
            )}

            {/* Seção Próximos compromissos */}
            <section className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[#111111]">Próximos compromissos</h2>
                <button
                  type="button"
                  onClick={() => setAbaAtual("conta")}
                  className="text-xs font-medium text-[#820AD1]"
                >
                  Ver conta
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {visao.proximos_pagamentos.map((p) => (
                  <div
                    key={p.evento_id}
                    className="p-3 rounded-xl bg-[#F8F8F8] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#111111]">
                        {p.descricao} ({p.evento_id})
                      </span>
                      <span className="block text-[#646464]">
                        {formatarDiaMes(p.data)} · {p.previsto ? textos.rotulos.previsto : p.meio}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums text-[#111111]">
                      {mostrarSaldos ? `${p.tipo === "saida" ? "−" : "+"} ${formatarReais(p.valor_centavos)}` : "••••"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {abaAtual === "investimentos" && (
          <TelaInvestimentos
            visao={visao}
            mostrarSaldos={mostrarSaldos}
            aoNaoDisponivel={acionarNaoDisponivel}
            aoPerguntar={(texto) => {
              setChatAberto(true);
              enviarMensagemNova(texto);
            }}
          />
        )}

        {abaAtual === "conta" && (
          <TelaConta
            visao={visao}
            mostrarSaldos={mostrarSaldos}
            aoVoltar={() => setAbaAtual("home")}
            aoNaoDisponivel={acionarNaoDisponivel}
          />
        )}

        {abaAtual === "cartao" && (
          <TelaCartao
            visao={visao}
            mostrarSaldos={mostrarSaldos}
            aoVoltar={() => setAbaAtual("home")}
            aoNaoDisponivel={acionarNaoDisponivel}
          />
        )}

        {abaAtual === "como_funciona" && (
          <TelaComoFunciona
            config={config}
            estado={estado}
            aoVoltar={() => setAbaAtual("home")}
          />
        )}

        </div>

        {/* Barra inferior reservada dentro da moldura. */}
        <nav
          aria-label="Navegação principal"
          className="newai-navigation flex items-center gap-2 bg-white/95 border border-[#EEEEEE] rounded-full px-4 py-2 shadow-sm"
        >
          <button
            type="button"
            aria-label="Início"
            onClick={() => setAbaAtual("home")}
            className={`w-12 h-11 rounded-full flex items-center justify-center ${
              abaAtual === "home" ? "bg-[#F3E9FB] text-[#820AD1]" : "text-[#646464]"
            }`}
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Investimentos"
            onClick={() => setAbaAtual("investimentos")}
            className={`w-12 h-11 rounded-full flex items-center justify-center ${
              abaAtual === "investimentos" ? "bg-[#F3E9FB] text-[#820AD1]" : "text-[#646464]"
            }`}
          >
            <DollarSign className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Conta e extrato"
            onClick={() => setAbaAtual("conta")}
            className={`w-12 h-11 rounded-full flex items-center justify-center ${
              abaAtual === "conta" ? "bg-[#F3E9FB] text-[#820AD1]" : "text-[#646464]"
            }`}
          >
            <Wallet className="w-5 h-5" />
          </button>
        </nav>

        {chatAberto && (
          <CamadaChat
            estado={estado}
            enviando={enviando}
            textoPendente={ultimoEnvio?.texto ?? null}
            falhaAtual={falhaChat}
            avisosRecentes={avisosChat}
            aoFechar={() => setChatAberto(false)}
            aoEnviarMensagem={enviarMensagemNova}
            aoTentarNovamente={tentarNovamenteTurno}
            aoRecomecar={() => void iniciarPersona(estado.persona_id)}
            aoExecutarAcao={(tipo, opId) => void executarAcaoMovimentacao(tipo, opId)}
          />
        )}
      </div>
    </div>
  );
}
