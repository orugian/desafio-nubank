import { describe, expect, test } from "vitest";
import { estadoInicial, type DepsConversa, type RespostaProvedor } from "@/contratos";
import { processarAcao, processarTurno } from "@/conversa";
import { carregarPersona } from "@/dados";
import { confirmarMovimentacao } from "@/dominio/operacoes";
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
  test("CR-14b/IN-10: modelo recebe as faturas calculadas da hipótese, não apenas indicadores de caixa", async () => {
    const r = await criarExecutores().ferramentas.criar_hipotese({
      nome: "Conserto em 4x", a_partir_de: "atual", alteracoes: [{
        operacao: "adicionar_evento", tipo: "saida", descricao: "Conserto",
        valor: "800", data: "2026-11-06", meio: "cartao_credito", parcelas: 4,
      }],
    }, { estado: estadoInicial("p3", snapshotGravado()), mensagem_id: "conserto-cartao" });
    if (!r.ok) throw new Error(r.erro.mensagem);
    const payload = r.resultado as { cenarios?: Array<{ cenario_id: string; faturas_afetadas: Array<{
      vencimento: string; total_antes_centavos: number; total_depois_centavos: number;
    }> }> };
    const hipotese = payload.cenarios?.find((c) => c.cenario_id === "H1");
    expect(hipotese?.faturas_afetadas.map((f) => [f.vencimento, f.total_depois_centavos - f.total_antes_centavos])).toEqual([
      ["2026-12-05", 20000], ["2027-01-05", 20000], ["2027-02-05", 20000], ["2027-03-05", 20000],
    ]);
  });
  test("CR-19/O-04: pendente adulterada acima do saldo não passa validação nem executa por ação ou domínio", async () => {
    const executores = criarExecutores();
    const inicial = estadoInicial("p1", snapshotGravado());
    const proposta = await executores.ferramentas.propor_movimentacao({ valor: "500", destino: "SEP" },
      { estado: inicial, mensagem_id: "propor" });
    if (!proposta.ok || !proposta.estado.operacao_pendente) throw new Error("proposta inválida");
    const adulterado = structuredClone(proposta.estado);
    adulterado.operacao_pendente!.valor_centavos = 500000;
    expect(await executores.validarEstado(adulterado)).toMatchObject({ ok: false, erro: { codigo: "ESTADO_INVALIDO" } });
    const acao = await processarAcao({ estado: adulterado, acao: { tipo: "confirmar", operacao_id: "OP1" } },
      depsRoteirizadas([]));
    expect(acao).toMatchObject({ status: "falha", falha: { tipo: "F-06", codigo: "ESTADO_INVALIDO" }, estado: adulterado });
    const persona = carregarPersona("p1");
    if (!persona.ok) throw new Error(persona.erro.mensagem);
    expect(confirmarMovimentacao(persona.persona, adulterado, "OP1")).toMatchObject({
      ok: false, erro: { codigo: "SALDO_INSUFICIENTE_HOJE" },
    });
    expect(adulterado.operacoes).toEqual([]);

    // Operação impossível inserida no JSON também não é aceita como já executada.
    const operacaoForjada = { ...inicial, contadores: { D: 0, H: 0, OP: 1 },
      operacoes: [{ id: "OP1", valor_centavos: 500000, destino: "SEP", data: "2026-10-30" }] };
    expect(await executores.validarEstado(operacaoForjada)).toMatchObject({ ok: false, erro: { codigo: "ESTADO_INVALIDO" } });
  });
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
