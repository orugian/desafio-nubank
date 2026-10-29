import { describe, expect, test } from "vitest";
import { estadoInicial, type DepsConversa, type RespostaProvedor } from "@/contratos";
import { processarTurno } from "@/conversa";
import { criarExecutores } from "@/conversa/executores";
import { snapshotGravado } from "@/mercado";

function depsRoteirizadas(respostas: RespostaProvedor[]): DepsConversa {
  let proxima = 0;
  const snapshot = snapshotGravado();
  return {
    executores: criarExecutores(),
    instrucoes: async () => "Teste O-03: proponha e aguarde confirmação humana posterior.",
    mercado: { snapshotGravado: () => snapshot, buscarAoVivo: async () => snapshot },
    provedor: {
      nome: "roteirizado", modelo: "regressao-seguranca-b7",
      async gerar() {
        const resposta = respostas[proxima++];
        if (!resposta) throw new Error("roteiro esgotado");
        return resposta;
      },
    },
  };
}

describe("B7 · regressões adversariais", () => {
  test("O-06: desfazer declaração expira proposta cujo saldo e impacto ficaram obsoletos", async () => {
    const f = criarExecutores().ferramentas;
    const inicial = estadoInicial("p1", snapshotGravado());
    const d1 = await f.registrar_declaracao({ alteracao: {
      operacao: "adicionar_evento", tipo: "saida", descricao: "Saída declarada hoje",
      valor: "1500", data: "2026-10-30", meio: "pix",
    } }, { estado: inicial, mensagem_id: "d1" });
    if (!d1.ok) throw new Error(d1.erro.mensagem);
    const d2 = await f.registrar_declaracao({ alteracao: { operacao: "remover_evento", evento_id: "D1" } },
      { estado: d1.estado, mensagem_id: "d2" });
    if (!d2.ok) throw new Error(d2.erro.mensagem);
    const proposta = await f.propor_movimentacao({ valor: "500", destino: "SEP" },
      { estado: d2.estado, mensagem_id: "proposta" });
    if (!proposta.ok) throw new Error(proposta.erro.mensagem);
    const antes = structuredClone(proposta.estado);
    const desfeito = await f.desfazer({ alvo_id: "D2" }, { estado: proposta.estado, mensagem_id: "desfazer" });
    if (!desfeito.ok) throw new Error(desfeito.erro.mensagem);
    expect(desfeito.estado.operacao_pendente).toBeNull();
    expect(proposta.estado).toEqual(antes);
    const confirmar = await f.confirmar_movimentacao({ operacao_id: "OP1" },
      { estado: desfeito.estado, mensagem_id: null });
    expect(confirmar.ok ? "executou" : confirmar.erro.codigo).toBe("OPERACAO_EXPIRADA");
    expect(desfeito.estado.operacoes).toEqual([]);
  });
  test("O-03/O-05: propor e confirmar no mesmo turno não executa sem confirmação humana posterior", async () => {
    const inicial = estadoInicial("p1", snapshotGravado());
    const resposta = await processarTurno({
      estado: inicial,
      mensagem: { id: "proposta-sem-confirmacao", texto: "Guarda R$ 500 na caixinha da viagem." },
    }, depsRoteirizadas([
      { tipo: "chamadas", chamadas: [
        { id: "propor", nome: "propor_movimentacao", argumentos: JSON.stringify({ valor: "500", destino: "INV9" }) },
        { id: "confirmar-indevidamente", nome: "confirmar_movimentacao", argumentos: JSON.stringify({ operacao_id: "OP1" }) },
      ] },
      { tipo: "texto", texto: "Proposta simulada aguardando sua confirmação." },
    ]));
    expect(resposta.status).toBe("ok");
    if (resposta.status !== "ok") throw new Error("turno deveria preservar a proposta");
    expect(resposta.estado.operacoes).toEqual([]);
    expect(resposta.estado.operacao_pendente?.id).toBe("OP1");
    expect(resposta.visao.conta.saldo_disponivel_hoje_centavos).toBe(180000);
    expect(resposta.rastro[1].resultado).toMatchObject({
      ok: false, erro: { codigo: "OPERACAO_NAO_PERMITIDA" },
    });

    // Uma confirmação explícita em novo turno é permitida, sem afrouxar O-05.
    const confirmado = await processarTurno({
      estado: resposta.estado,
      mensagem: { id: "confirmacao-humana", texto: "Sim, confirmo." },
    }, depsRoteirizadas([
      { tipo: "chamadas", chamadas: [
        { id: "confirmar-depois", nome: "confirmar_movimentacao", argumentos: JSON.stringify({ operacao_id: "OP1" }) },
      ] },
      { tipo: "texto", texto: "Movimentação simulada confirmada." },
    ]));
    expect(confirmado.status).toBe("ok");
    if (confirmado.status !== "ok") throw new Error("confirmação posterior deveria funcionar");
    expect(confirmado.estado.operacoes).toHaveLength(1);
    expect(confirmado.visao.conta.saldo_disponivel_hoje_centavos).toBe(130000);
  });
});
