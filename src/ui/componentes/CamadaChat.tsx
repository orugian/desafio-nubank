"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import {
  textos,
  type AvisoTurno,
  type CartaoResposta,
  type EstadoSessao,
  type Falha,
} from "@/contratos";
import { CartaoChat } from "./CartaoChat";

export function CamadaChat({
  estado,
  enviando,
  textoPendente,
  falhaAtual,
  avisosRecentes,
  aoFechar,
  aoEnviarMensagem,
  aoTentarNovamente,
  aoRecomecar,
  aoExecutarAcao,
}: {
  estado: EstadoSessao;
  enviando: boolean;
  textoPendente: string | null;
  falhaAtual: Falha | null;
  avisosRecentes: AvisoTurno[];
  aoFechar: () => void;
  aoEnviarMensagem: (texto: string) => void;
  aoTentarNovamente: () => void;
  aoRecomecar: () => void;
  aoExecutarAcao: (tipo: "confirmar" | "cancelar", operacao_id: string) => void;
}) {
  const [rascunho, setRascunho] = useState("");

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    const limpo = rascunho.trim();
    if (!limpo || enviando) return;
    setRascunho("");
    aoEnviarMensagem(limpo);
  }

  return (
    <div
      role="dialog"
      aria-label="Chat NewAI"
      aria-modal="true"
      className="fixed inset-0 z-40 flex justify-center bg-black/30"
    >
      <div className="w-full max-w-[430px] h-full bg-[#F0F0F0] flex flex-col shadow-lg">
        {/* Faixa de protótipo no topo do chat */}
        <div className="bg-[#111111] text-white text-[11px] py-1 px-4 text-center">
          {textos.faixa_prototipo}
        </div>

        {/* Cabeçalho branco do chat (IMG_2114) */}
        <header className="bg-white px-4 py-3 border-b border-[#EEEEEE] flex items-center justify-between shadow-2xs">
          <button
            type="button"
            aria-label="Fechar chat"
            onClick={aoFechar}
            className="w-11 h-11 rounded-full flex items-center justify-center text-[#646464] hover:bg-[#F0F0F0]"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-base font-semibold text-[#111111]">Chat</h2>
          <div className="w-11" />
        </header>

        {/* Lista de mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          <div className="self-center bg-[#BDBDBD] text-white text-xs px-3 py-1 rounded-full font-medium">
            30/10/2026
          </div>

          {estado.conversa.length === 0 && !enviando && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="bg-white rounded-2xl p-4 text-sm text-[#111111] max-w-[85%] self-start shadow-2xs">
                <div className="font-semibold text-xs text-[#820AD1] mb-1">Assistente NewAI</div>
                <p>
                  Olá! Posso simular decisões financeiras sobre seus compromissos e investimentos
                  fictícios até 29/11/2026.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {textos.sugestoes_chat.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    disabled={enviando}
                    onClick={() => aoEnviarMensagem(sug)}
                    className="px-3.5 py-2 rounded-full bg-white border border-[#E3DFFD] text-xs font-medium text-[#5B168F] hover:bg-[#F3E9FB]"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {estado.conversa.map((m) => {
            if (m.papel === "sistema") {
              return (
                <div
                  key={m.mensagem_id}
                  data-testid="mensagem-sistema"
                  className="self-center w-full max-w-[92%] rounded-xl border border-[#5B168F]/30 bg-[#E3DFFD] px-3.5 py-2.5 text-xs text-[#111111]"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#5B168F] mb-0.5">
                    Mensagem do sistema · {textos.faixa_prototipo}
                  </div>
                  <div>{m.texto}</div>
                </div>
              );
            }

            if (m.papel === "usuario") {
              return (
                <div
                  key={m.mensagem_id}
                  className="self-end max-w-[84%] rounded-2xl rounded-br-xs bg-[#A6A6A6] text-[#111111] px-4 py-3 text-sm"
                >
                  {m.texto}
                </div>
              );
            }

            return (
              <div
                key={m.mensagem_id}
                className="self-start w-full max-w-[92%] flex flex-col gap-1"
              >
                <div className="rounded-2xl rounded-bl-xs bg-white text-[#111111] px-4 py-3 text-sm shadow-2xs">
                  <div className="font-semibold text-xs text-[#820AD1] mb-1">Assistente NewAI</div>
                  <div className="whitespace-pre-line">{m.texto}</div>
                </div>
                {(m.cartoes as CartaoResposta[]).map((c, idx) => (
                  <CartaoChat
                    key={`${m.mensagem_id}-c-${idx}`}
                    cartao={c}
                    estado={estado}
                    ocupado={enviando}
                    aoExecutarAcao={aoExecutarAcao}
                  />
                ))}
              </div>
            );
          })}

          {enviando && (
            <div className="flex flex-col gap-2">
              {textoPendente && (
                <div className="self-end max-w-[84%] rounded-2xl rounded-br-xs bg-[#A6A6A6] text-[#111111] px-4 py-3 text-sm opacity-80">
                  {textoPendente}
                </div>
              )}
              <div
                role="status"
                className="self-start rounded-2xl bg-white px-4 py-2.5 text-xs font-medium text-[#646464]"
              >
                Enviando...
              </div>
            </div>
          )}

          {avisosRecentes.map((av) => (
            <div
              key={av.codigo}
              className="self-center w-full max-w-[92%] rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900"
            >
              {av.mensagem}
            </div>
          ))}

          {falhaAtual && (
            <div
              role="alert"
              className="self-center w-full max-w-[92%] rounded-2xl border border-[#F65758] bg-white p-3.5 text-xs text-[#111111] flex flex-col gap-2"
            >
              <div className="text-[10px] font-semibold uppercase text-[#F65758]">
                Aviso do sistema ({falhaAtual.tipo} · {falhaAtual.codigo})
              </div>
              <div className="font-medium">{falhaAtual.mensagem}</div>
              <div className="flex items-center gap-2">
                {falhaAtual.pode_tentar_novamente && (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={aoTentarNovamente}
                    className="px-3.5 py-1.5 rounded-full bg-[#820AD1] text-white font-semibold"
                  >
                    {textos.acoes.tentar_novamente}
                  </button>
                )}
                {falhaAtual.tipo === "F-06" && (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={aoRecomecar}
                    className="px-3.5 py-1.5 rounded-full bg-[#111111] text-white font-semibold"
                  >
                    {textos.acoes.recomecar}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Compositor no rodapé (IMG_2114) */}
        <form
          onSubmit={submeter}
          className="bg-white px-6 py-3 border-t border-[#EEEEEE] flex items-center gap-2"
        >
          <div className="flex-1 flex items-center bg-[#F0F0F0] rounded-full px-4 py-2.5">
            <input
              type="text"
              value={rascunho}
              disabled={enviando}
              onChange={(e) => setRascunho(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent text-sm text-[#111111] placeholder:text-[#646464] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Enviar mensagem"
              disabled={enviando || !rascunho.trim()}
              className="ml-2 w-9 h-9 rounded-full flex items-center justify-center text-[#820AD1] disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
