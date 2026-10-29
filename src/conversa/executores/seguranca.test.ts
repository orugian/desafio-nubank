import { describe, expect, test } from "vitest";
import { estadoInicial, type DepsConversa, type RespostaProvedor } from "@/contratos";
import { montarContextoDeterministico, processarAcao, processarTurno } from "@/conversa";
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
  test("IN-04: ferramenta fornece valores em reais formatados pelo código sem alterar os centavos", async () => {
    const r = await criarExecutores().ferramentas.criar_hipotese({
      nome: "Separar hoje", a_partir_de: "atual", alteracoes: [{ operacao: "separar", valor: "500" }],
    }, { estado: estadoInicial("p1", snapshotGravado()), mensagem_id: "formatar" });
    if (!r.ok) throw new Error(r.erro.mensagem);
    const resultado = r.resultado as { valores_formatados?: Record<string, string>; cenarios: Array<{
      linhas: Array<{ evento_id: string; valor_centavos: number }>;
    }> };
    const indiceSalario = resultado.cenarios[0].linhas.findIndex((l) => l.evento_id === "R1");
    expect(resultado.cenarios[0].linhas[indiceSalario].valor_centavos).toBe(300000);
    expect(resultado.valores_formatados?.[`cenarios[0].linhas[${indiceSalario}].valor_centavos`]).toBe("R$ 3.000,00");
    expect(resultado.valores_formatados?.["indicadores.insuficiencia_centavos"]).toBe("R$ 200,00");
  });
  test("PEDIDO 2: saldo do contexto acompanha a visão após saída declarada hoje e operação confirmada", async () => {
    const ex = criarExecutores();
    const d = await ex.ferramentas.registrar_declaracao({ alteracao: {
      operacao: "adicionar_evento", tipo: "saida", descricao: "Saída hoje",
      valor: "1500", data: "2026-10-30", meio: "pix",
    } }, { estado: estadoInicial("p1", snapshotGravado()), mensagem_id: "declarar" });
    if (!d.ok) throw new Error(d.erro.mensagem);
    const visaoDeclarada = await ex.montarVisao(d.estado);
    expect(visaoDeclarada.conta.saldo_disponivel_hoje_centavos).toBe(30000);
    expect(montarContextoDeterministico(d.estado).conta).toMatchObject({ saldo_disponivel_hoje_centavos: 30000 });
    const proposta = await ex.ferramentas.propor_movimentacao({ valor: "100", destino: "INV9" },
      { estado: d.estado, mensagem_id: "propor" });
    if (!proposta.ok) throw new Error(proposta.erro.mensagem);
    const confirma = await ex.ferramentas.confirmar_movimentacao({ operacao_id: "OP1" },
      { estado: proposta.estado, mensagem_id: null });
    if (!confirma.ok) throw new Error(confirma.erro.mensagem);
    expect((await ex.montarVisao(confirma.estado)).conta.saldo_disponivel_hoje_centavos).toBe(20000);
    expect(montarContextoDeterministico(confirma.estado).conta).toMatchObject({ saldo_disponivel_hoje_centavos: 20000 });
  });
  test("R-22/IN-11: nova declaração devolve sinal calculado de ordem relevante ao modelo", async () => {
    const r = await criarExecutores().ferramentas.registrar_declaracao({ alteracao: {
      operacao: "adicionar_evento", tipo: "saida", descricao: "Conserto antes do salário",
      valor: "1000", data: "2026-11-19", meio: "pix",
    } }, { estado: estadoInicial("p1", snapshotGravado()), mensagem_id: "ordem-salario" });
    if (!r.ok) throw new Error(r.erro.mensagem);
    const resultado = r.resultado as { cenarios?: Array<{ cenario_id: string; datas_ordem_relevante: string[] }> };
    expect(resultado.cenarios?.find((c) => c.cenario_id === "atual")?.datas_ordem_relevante).toEqual(["2026-11-19"]);
  });
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
