import { isDeepStrictEqual } from "node:util";
import {
  estadoInicial,
  type CartaoResposta,
  type Contexto,
  type EstadoSessao,
  type ResultadoCenario,
  type RespostaTurno,
} from "@/contratos";
import { carregarPersona } from "@/dados";
import { criarCalendario } from "@/dominio/calendario";
import { calcularCenarios, paraCentavos } from "@/dominio/caixa";
import { consultarHistorico } from "@/dominio/historico";
import { consultarInvestimentos, projetarRendimento } from "@/dominio/investimentos";
import cdiJson from "../dados/mercado/cdi.json";
import btcJson from "../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../dados/mercado/fechamentos-PETR4.json";

const contexto: Contexto = {
  series: { cdi: cdiJson, fechamentos: { PETR4: petr4Json, BTC: btcJson } },
  calendario: criarCalendario({ datas_cdi: cdiJson.serie.map((x) => x.data) }),
};

function contem(esperado: unknown, real: unknown): boolean {
  if (esperado === real) return true;
  if (Array.isArray(esperado)) {
    return Array.isArray(real) && esperado.every((v, i) => contem(v, real[i]));
  }
  if (typeof esperado === "object" && esperado !== null) {
    if (typeof real !== "object" || real === null) return false;
    return Object.entries(esperado).every(([k, v]) =>
      contem(v, (real as Record<string, unknown>)[k]),
    );
  }
  return false;
}

function cenario(cenarios: ResultadoCenario[], id: string): ResultadoCenario | null {
  return cenarios.find((c) => c.cenario_id === id) ?? null;
}

function conferirCenario(
  c: ResultadoCenario | null,
  indicadores: Record<string, unknown>,
  rotulo: string,
): string[] {
  if (!c) return [`Cenário ${rotulo} ausente`];
  if (!contem(indicadores, c.indicadores)) {
    return [`Indicadores divergentes em ${rotulo}: esperado ${JSON.stringify(indicadores)}`];
  }
  return [];
}

function cartaoDe<T extends CartaoResposta["tipo"]>(
  cartoes: CartaoResposta[],
  tipo: T,
): Extract<CartaoResposta, { tipo: T }> | null {
  return (cartoes.find((c) => c.tipo === tipo) as Extract<CartaoResposta, { tipo: T }> | undefined) ?? null;
}

function oraculoInvestimentos(
  resposta: Extract<RespostaTurno, { status: "ok" }>,
  estado: EstadoSessao,
  exigirDataPadrao = false,
): string[] {
  const rPersona = carregarPersona(estado.persona_id);
  if (!rPersona.ok) return ["Persona do oráculo indisponível"];
  const chamada = resposta.rastro.findLast((r) => r.ferramenta === "consultar_investimentos");
  if (!chamada) return ["Chamada consultar_investimentos ausente"];
  const args = chamada.argumentos as { ate_data?: string };
  const esperado = consultarInvestimentos(rPersona.persona, estado, contexto, args);
  if (!esperado.ok) return [`Oráculo de investimentos falhou: ${esperado.erro.codigo}`];
  const cartao = cartaoDe(resposta.cartoes, "investimentos");
  if (!cartao) return ["Cartão de investimentos ausente"];
  const { ok: _, ...resultadoDireto } = esperado;
  void _;
  const motivos = isDeepStrictEqual(cartao.resultado, resultadoDireto)
    ? []
    : ["Cartão de investimentos divergente da saída direta do motor"];
  if (exigirDataPadrao) {
    // Efeito, não forma: omitir ate_data ou informar a mesma data que o motor usaria é equivalente.
    const padrao = consultarInvestimentos(rPersona.persona, estado, contexto, {});
    if (!padrao.ok) return [...motivos, `Oráculo de investimentos falhou: ${padrao.erro.codigo}`];
    if (cartao.resultado.ate_data !== padrao.ate_data) {
      motivos.push(`Consulta classificou até ${cartao.resultado.ate_data}, mas a data padrão do motor é ${padrao.ate_data}`);
    }
  }
  return motivos;
}

export function verificarTransicaoB6(id: string, entrada: EstadoSessao, resposta: RespostaTurno): string[] {
  if (resposta.status === "falha") {
    return isDeepStrictEqual(resposta.estado, entrada) ? [] : ["Falha não preservou o estado de entrada"];
  }
  const somenteLeitura = ["CV-04", "CV-05", "CV-06", "CV-10", "CV-11", "CV-14", "CV-15", "CV-16", "CV-17", "CV-18", "CV-19", "CV-20", "CV-21", "CV-22", "CV-23", "CV-25", "CV-26", "CV-29"];
  if (!somenteLeitura.includes(id)) return [];
  const { conversa: _c1, versao: _v1, ...antes } = entrada;
  const { conversa: _c2, versao: _v2, ...depois } = resposta.estado;
  return isDeepStrictEqual(antes, depois) ? [] : ["Consulta ou recusa mudou estado de negócio"];
}

/** Confere o CR citado contra estado final, rastro/cartões e uma chamada direta ao motor. */
export function verificarOraculoB6(
  oraculo: string | null,
  resposta: RespostaTurno | null,
  estado: EstadoSessao,
  respostasAnteriores: RespostaTurno[] = [],
): string[] {
  if (!resposta || resposta.status !== "ok") return ["Turno não concluído com status ok"];
  if (!oraculo) return [];

  const rPersona = carregarPersona(estado.persona_id);
  if (!rPersona.ok) return ["Persona do oráculo indisponível"];
  const cenarios = calcularCenarios(rPersona.persona, estado, contexto);
  if (["CR-02", "CR-03", "CR-04", "CR-09b", "CR-10", "CR-14", "CR-14b"].includes(oraculo)) {
    const cartao = cartaoDe(resposta.cartoes, "comparacao");
    if (!cartao) return ["Cartão de comparação ausente"];
    if (!isDeepStrictEqual(cartao.cenarios, cenarios)) return ["Cartão de comparação divergente dos cenários do motor"];
  }

  switch (oraculo) {
    case "CR-02":
      return conferirCenario(cenario(cenarios, "H1"), {
        saldo_minimo_centavos: -20000,
        data_saldo_minimo: "2026-11-15",
        primeira_falta: { data: "2026-11-15", valor_descoberto_centavos: 20000, saidas_do_dia: ["C"] },
        insuficiencia_centavos: 20000,
        margem_hoje_centavos: 0,
        saldo_final_centavos: 280000,
      }, "H1/CR-02");
    case "CR-03":
      return conferirCenario(cenario(cenarios, "H2"), {
        saldo_minimo_centavos: 60000,
        data_saldo_minimo: "2026-11-05",
        primeira_falta: null,
        insuficiencia_centavos: 0,
        margem_hoje_centavos: 60000,
        saldo_final_centavos: 280000,
      }, "H2/CR-03");
    case "CR-04": {
      const motivos = conferirCenario(cenario(cenarios, "atual"), {
        saldo_minimo_centavos: 35000,
        data_saldo_minimo: "2026-11-15",
        insuficiencia_centavos: 0,
        margem_hoje_centavos: 35000,
        saldo_final_centavos: 335000,
      }, "atual/CR-04");
      if (!estado.declaracoes.some((d) => d.alteracao.operacao === "alterar_evento" && d.alteracao.evento_id === "C" && d.alteracao.valor !== undefined && paraCentavos(d.alteracao.valor) === 15000)) {
        motivos.push("Declaração de C = 150 ausente");
      }
      return motivos;
    }
    case "CR-06":
      // CR-06: "Investimentos até 15/11 (default de I-10 em sessão nova)".
      return oraculoInvestimentos(resposta, estado, true);
    case "CR-16":
    case "CR-34":
      return oraculoInvestimentos(resposta, estado);
    case "CR-10": {
      const motivos = conferirCenario(cenario(cenarios, "H1"), {
        saldo_minimo_centavos: -83000,
        data_saldo_minimo: "2026-11-08",
        primeira_falta: { data: "2026-11-08", valor_descoberto_centavos: 83000, saidas_do_dia: ["E2"] },
        insuficiencia_centavos: 83000,
        saldo_final_centavos: -16500,
      }, "H1/CR-10");
      if (!cenario(cenarios, "H1")?.datas_ordem_relevante.includes("2026-11-08")) motivos.push("Ordem relevante de 08/11 ausente");
      return motivos;
    }
    case "CR-09b": {
      const motivos = conferirCenario(cenario(cenarios, "atual"), {
        saldo_minimo_centavos: 13500,
        data_saldo_minimo: "2026-11-27",
        insuficiencia_centavos: 0,
        saldo_final_centavos: 13500,
      }, "atual/CR-09b");
      motivos.push(...conferirCenario(cenario(cenarios, "H1"), {
        saldo_minimo_centavos: -16500,
        data_saldo_minimo: "2026-11-27",
        primeira_falta: { data: "2026-11-25", valor_descoberto_centavos: 12000, saidas_do_dia: ["E5"] },
        saldo_final_centavos: -16500,
      }, "H1/CR-10b"));
      return motivos;
    }
    case "CR-14":
      return conferirCenario(cenario(cenarios, "H1"), {
        saldo_minimo_centavos: -66000,
        data_saldo_minimo: "2026-11-13",
        primeira_falta: { data: "2026-11-06", valor_descoberto_centavos: 59000, saidas_do_dia: ["G2", "H1.1"] },
        insuficiencia_centavos: 66000,
        saldo_final_centavos: 149000,
      }, "H1/CR-14");
    case "CR-14b": {
      const comFaturas = cenarios.find((c) => c.faturas_afetadas.length === 4);
      if (!comFaturas) return ["Quatro faturas afetadas ausentes (CR-14b)"];
      const esperado = ["2026-12-05", "2027-01-05", "2027-02-05", "2027-03-05"];
      const motivos: string[] = [];
      comFaturas.faturas_afetadas.forEach((f, i) => {
        if (f.vencimento !== esperado[i] || f.total_depois_centavos - f.total_antes_centavos !== 20000) {
          motivos.push(`Fatura ${f.fatura_id} divergente de CR-14b`);
        }
      });
      if (JSON.stringify(comFaturas.linhas) !== JSON.stringify(cenario(cenarios, "atual")?.linhas)) {
        motivos.push("Caixa da hipótese deveria ser igual ao atual (CR-14b)");
      }
      return motivos;
    }
    case "CR-15a": {
      const motivos: string[] = [];
      const erroDuplicidade = resposta.rastro.some((r) => {
        const resultado = r.resultado as { ok?: boolean; erro?: { codigo?: string; mensagem?: string } };
        return r.ferramenta === "registrar_declaracao" && resultado.ok === false &&
          resultado.erro?.codigo === "POSSIVEL_DUPLICIDADE" &&
          /supermercado.*480[,.]00.*05\/11/i.test(resultado.erro.mensagem ?? "");
      });
      if (!erroDuplicidade) motivos.push("POSSIVEL_DUPLICIDADE não devolvido ao modelo");
      const { conversa: _c, versao: _v, ...negocio } = estado;
      const { conversa: _ci, versao: _vi, ...inicial } = estadoInicial(estado.persona_id, estado.mercado);
      if (JSON.stringify(negocio) !== JSON.stringify(inicial)) motivos.push("Estado de negócio mudou apesar da duplicidade");
      return motivos;
    }
    case "H-setembro-delivery": {
      // Efeito, não forma: categoria "delivery" ou busca equivalente valem se o período e o total
      // forem os de setembro calculados pelo motor.
      const esperado = consultarHistorico(rPersona.persona, { de: "2026-09-01", ate: "2026-09-30", categoria: "delivery" });
      if (!esperado.ok) return [`Oráculo de histórico falhou: ${esperado.erro.codigo}`];
      const cartao = cartaoDe(resposta.cartoes, "historico");
      if (!cartao) return ["Cartão de histórico ausente"];
      const r = cartao.resultado;
      const motivos: string[] = [];
      if (r.de !== "2026-09-01" || r.ate !== "2026-09-30") {
        motivos.push(`Consulta não limitada a setembro (período ${r.de} a ${r.ate})`);
      }
      const ids = (itens: Array<{ id: string }>) => itens.map((i) => i.id).sort();
      if (r.total_saidas_centavos !== esperado.total_saidas_centavos || !isDeepStrictEqual(ids(r.itens), ids(esperado.itens))) {
        motivos.push("Lançamentos/total de delivery em setembro divergem do motor");
      }
      return motivos;
    }
    case "CR-15a-triagem": {
      // PEDIDO 4, opção A: a mensagem não traz data/meio da nova compra, e o contrato exige ambos
      // para registrar. O aceite é a triagem somente leitura pela fatura, sem inventar dados.
      const motivos: string[] = [];
      const consulta = resposta.rastro.find((r) => r.ferramenta === "consultar_cartao" &&
        (r.resultado as { ok?: boolean }).ok === true);
      if (!consulta) {
        motivos.push("Triagem da fatura (consultar_cartao) ausente");
      } else {
        const cartao = (consulta.resultado as { cartao?: { fatura_fechada?: { vencimento?: string; itens?: Array<{ descricao?: string; valor_centavos?: number }> } | null } }).cartao;
        const item = cartao?.fatura_fechada?.itens?.find((i) => /supermercado/i.test(i.descricao ?? "") && i.valor_centavos === 48000);
        if (!item || cartao?.fatura_fechada?.vencimento !== "2026-11-05") {
          motivos.push("Fatura consultada não contém Supermercado R$ 480,00 com vencimento em 05/11");
        }
      }
      for (const r of resposta.rastro.filter((x) => x.ferramenta === "registrar_declaracao")) {
        const alt = (r.argumentos as { alteracao?: { operacao?: string } }).alteracao;
        if (alt?.operacao === "adicionar_evento") {
          motivos.push("Registro de nova compra sem data e meio informados pela pessoa");
        }
      }
      const { conversa: _c, versao: _v, ...negocio } = estado;
      const { conversa: _ci, versao: _vi, ...inicial } = estadoInicial(estado.persona_id, estado.mercado);
      if (JSON.stringify(negocio) !== JSON.stringify(inicial)) motivos.push("Estado de negócio mudou na triagem");
      return motivos;
    }
    case "CR-32": {
      const cartao = cartaoDe(resposta.cartoes, "rendimento");
      if (!cartao) return ["Cartão de rendimento ausente"];
      const esperado = projetarRendimento(estado.mercado, contexto, {
        valor_centavos: 50000,
        cdi_pct: 100,
        ate_data: "2026-11-19",
      });
      if (!esperado.ok) return [`Oráculo de rendimento falhou: ${esperado.erro.codigo}`];
      const { ok: _, ...resultadoEsperado } = esperado;
      void _;
      return contem(resultadoEsperado, cartao.resultado) ? [] : ["Rendimento divergente do motor (CR-32)"];
    }
    case "CR-40": {
      const pend = estado.operacao_pendente;
      const cartao = cartaoDe(resposta.cartoes, "operacao_pendente");
      const motivos: string[] = [];
      if (!pend || pend.valor_centavos !== 50000 || pend.destino !== "INV9") motivos.push("Pendente OP de 500 em INV9 ausente");
      if (!cartao) motivos.push("Cartão de operação pendente ausente");
      else if (!contem({ primeira_falta: { data: "2026-11-15", valor_descoberto_centavos: 20000 } }, cartao.impacto.indicadores)) {
        motivos.push("Impacto da proposta divergente de CR-02");
      }
      return motivos;
    }
    case "CR-48": {
      const motivos = verificarOraculoB6("CR-41", resposta, estado);
      const [proposta, confirmacao] = respostasAnteriores;
      if (proposta?.status !== "ok" || confirmacao?.status !== "ok") {
        motivos.push("Sequência de proposta e confirmação anterior ausente (CR-48)");
        return motivos;
      }
      if (proposta.estado.versao !== 1 || confirmacao.estado.versao !== 2 || estado.versao !== 3) {
        motivos.push("Versões da sequência diferentes de 1 → 2 → 3 (CR-48)");
      }
      if (proposta.estado.operacao_pendente?.id !== "OP1" || proposta.estado.operacoes.length !== 0) {
        motivos.push("Primeiro turno não deixou somente OP1 pendente (CR-48)");
      }
      const confirmouAntes = confirmacao.rastro.some((r) =>
        r.ferramenta === "confirmar_movimentacao" && contem({ operacao_id: "OP1" }, r.argumentos) &&
        contem({ ok: true }, r.resultado),
      );
      if (!confirmouAntes) motivos.push("Segundo turno não confirmou OP1 pelo motor (CR-48)");
      const repetiu = resposta.rastro.some((r) =>
        r.ferramenta === "confirmar_movimentacao" && contem({ operacao_id: "OP1" }, r.argumentos) &&
        contem({ ok: false, erro: { codigo: "OPERACAO_JA_EXECUTADA" } }, r.resultado),
      );
      if (!repetiu) motivos.push("Terceiro turno não devolveu OPERACAO_JA_EXECUTADA ao modelo (CR-48)");
      const { conversa: _c2, versao: _v2, ...antes } = confirmacao.estado;
      const { conversa: _c3, versao: _v3, ...depois } = estado;
      if (JSON.stringify(antes) !== JSON.stringify(depois)) motivos.push("Estado de negócio mudou na confirmação repetida (CR-48)");
      if (JSON.stringify(confirmacao.visao) !== JSON.stringify(resposta.visao)) motivos.push("Visão mudou na confirmação repetida (CR-48)");
      return motivos;
    }
    case "CR-41": {
      const motivos: string[] = [];
      if (estado.operacoes.filter((op) => op.id === "OP1").length !== 1 || estado.operacao_pendente !== null) {
        motivos.push("OP1 não foi executada exatamente uma vez");
      }
      if (resposta.visao.conta.saldo_disponivel_hoje_centavos !== 130000) motivos.push("Saldo disponível diferente de 1.300");
      if (resposta.visao.posicoes.find((p) => p.id === "INV9")?.aplicado_centavos !== 50000) motivos.push("INV9 não recebeu aporte de 500");
      motivos.push(...conferirCenario(cenario(cenarios, "atual"), {
        saldo_minimo_centavos: -20000,
        data_saldo_minimo: "2026-11-15",
        insuficiencia_centavos: 20000,
        saldo_final_centavos: 280000,
      }, "atual/CR-41"));
      return motivos;
    }
    default:
      return [`Oráculo não implementado: ${oraculo}`];
  }
}
