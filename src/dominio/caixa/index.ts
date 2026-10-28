// Motor de caixa (spec §5.1, §6.1).

import {
  FIM_JANELA,
  HOJE,
  LIMITES,
  OPERACOES_EM_DECLARACAO,
  erro,
  formatarReais,
  textos,
  validarArgumentos,
  type Alteracao,
  type Contexto,
  type EntradaComparacao,
  type ErroDominio,
  type EstadoSessao,
  type Hipotese,
  type OQueMudou,
  type Origem,
  type Persona,
  type ResultadoCenario,
  type ResultadoDominio,
} from "@/contratos";
import { projetar, type Evento } from "./projecao";
import { comparar } from "./comparacao";

// Ordem de cadastro (R-05, §4.5): compromissos, blocos, declarações, operações, hipóteses.
const GRUPO = { compromisso: 0, bloco: 1, declaracao: 2, operacao: 3, hipotese: 4 } as const;
const cadastro = (grupo: keyof typeof GRUPO, indice: number) => GRUPO[grupo] * 10_000 + indice;

/** Texto `^\d{1,7}(\.\d{1,2})?$` → centavos, sem ponto flutuante. */
export function paraCentavos(valor: string): number {
  const [reais, cent = ""] = valor.split(".");
  return Number(reais) * 100 + Number(cent.padEnd(2, "0"));
}

/** Dados-base: fatura fechada derivada (§4.1) e compromissos da persona na janela. */
function eventosBase(persona: Persona): Evento[] {
  const eventos: Evento[] = [];
  for (const f of persona.cartao?.faturas ?? []) {
    if (f.status === "fechada" && f.vencimento >= HOJE && f.vencimento <= FIM_JANELA) {
      eventos.push({
        id: f.id,
        data: f.vencimento,
        descricao: "Fatura do cartão",
        tipo: "saida",
        meio: "debito",
        origem: "dados_base",
        estimativa: null,
        previsto: false,
        valor_centavos: f.valor_centavos,
        original: null,
        cadastro: cadastro("compromisso", eventos.length),
        especie: "fatura",
      });
    }
  }
  for (const c of persona.compromissos) {
    if (c.data < HOJE || c.data > FIM_JANELA) continue;
    eventos.push({
      id: c.id,
      data: c.data,
      descricao: c.descricao,
      tipo: c.tipo,
      meio: c.meio,
      origem: "dados_base",
      estimativa: c.estimativa,
      previsto: c.previsto,
      valor_centavos: c.valor_centavos,
      original: null,
      cadastro: cadastro("compromisso", eventos.length),
      especie: "compromisso",
    });
  }
  return eventos;
}

type Cena = { eventos: Evento[] };
type Camada = "declaracao" | "hipotese";

const falha = (codigo: ErroDominio["codigo"], campos: string[] = [], detalhes?: Record<string, unknown>, mensagem?: string) =>
  erro(codigo, mensagem ?? textos.erros[codigo], campos, detalhes).erro;

/** Regras de domínio de uma alteração sobre a cena em que será aplicada (§4.5, R-02, R-03, R-18). */
function validar(cena: Cena, alt: Alteracao, camada: Camada): ErroDominio | null {
  if (camada === "declaracao" && !OPERACOES_EM_DECLARACAO.includes(alt.operacao)) {
    return falha("OPERACAO_NAO_PERMITIDA", ["operacao"], undefined, `${alt.operacao} não vale como declaração; use uma hipótese.`);
  }
  const data = "data" in alt ? alt.data : undefined;
  if (data !== undefined && data < HOJE) return falha("DATA_ANTES_DE_HOJE", ["data"]);
  if (data !== undefined && data > FIM_JANELA) return falha("DATA_FORA_DA_JANELA", ["data"]);

  if (alt.operacao === "alterar_evento" || alt.operacao === "remover_evento") {
    const alvo = cena.eventos.find((e) => e.id === alt.evento_id);
    const intocavel = /^G\d+$/.test(alt.evento_id) || /^OP\d+$/.test(alt.evento_id) || alvo?.especie === "fatura" || alvo?.especie === "bloco" || alvo?.especie === "operacao";
    if (intocavel) {
      return falha(
        "OPERACAO_NAO_PERMITIDA",
        ["evento_id"],
        { evento_id: alt.evento_id },
        "Fatura fechada, gasto estimado e movimentação executada não podem ser alterados; o gasto estimado muda só por alterar_gasto_diario.",
      );
    }
    if (!alvo) return falha("EVENTO_INEXISTENTE", ["evento_id"], { evento_id: alt.evento_id });
  }
  return null;
}

/** Aplica uma alteração já validada sobre a cena. */
function aplicar(cena: Cena, alt: Alteracao, id: string, camada: Camada, indice: number): Cena {
  if (alt.operacao === "separar") {
    const valor = paraCentavos(alt.valor);
    const evento: Evento = {
      id,
      data: alt.data ?? HOJE,
      descricao: `Separar ${formatarReais(valor)}`,
      tipo: "saida",
      meio: "simulacao",
      origem: camada,
      estimativa: null,
      previsto: false,
      valor_centavos: valor,
      original: null,
      cadastro: cadastro(camada, indice),
      especie: camada,
    };
    return { eventos: [...cena.eventos, evento] };
  }
  if (alt.operacao === "alterar_evento") {
    return {
      eventos: cena.eventos.map((e) =>
        e.id !== alt.evento_id
          ? e
          : {
              ...e,
              data: alt.data ?? e.data,
              valor_centavos: alt.valor !== undefined ? paraCentavos(alt.valor) : e.valor_centavos,
              origem: camada,
              original: e.original ?? (e.origem === "dados_base" ? { data: e.data, valor_centavos: e.valor_centavos } : null),
            },
      ),
    };
  }
  if (alt.operacao === "remover_evento") {
    return { eventos: cena.eventos.filter((e) => e.id !== alt.evento_id) };
  }
  if (alt.operacao === "adicionar_evento") {
    const evento: Evento = {
      id,
      data: alt.data,
      descricao: alt.descricao,
      tipo: alt.tipo,
      meio: alt.meio,
      origem: camada,
      estimativa: null,
      previsto: alt.tipo === "entrada",
      valor_centavos: paraCentavos(alt.valor),
      original: null,
      cadastro: cadastro(camada, indice),
      especie: camada,
    };
    return { eventos: [...cena.eventos, evento] };
  }
  return cena;
}

function situacaoAtual(persona: Persona, estado: EstadoSessao): Cena {
  return estado.declaracoes.reduce(
    (c, d, k) => aplicar(c, d.alteracao, d.id, "declaracao", k),
    { eventos: eventosBase(persona) } as Cena,
  );
}

function resultado(cenario_id: string, nome: string, cena: Cena | null, saldoInicial: number): ResultadoCenario {
  if (cena === null) {
    return { cenario_id, nome, status: "inconsistente", linhas: [], indicadores: null, faturas_afetadas: [], datas_ordem_relevante: [], avisos: [] };
  }
  const p = projetar(cena.eventos, saldoInicial, new Set());
  return {
    cenario_id,
    nome,
    status: "calculado",
    linhas: p.linhas,
    indicadores: p.indicadores,
    faturas_afetadas: [],
    datas_ordem_relevante: p.datas_ordem_relevante,
    avisos: p.avisos,
  };
}

/** Situação atual primeiro, depois as hipóteses ativas na ordem do estado. */
export function calcularCenarios(persona: Persona, estado: EstadoSessao, contexto: Contexto): ResultadoCenario[] {
  void contexto;
  const saldo = persona.conta.saldo_inicio_hoje_centavos;
  const atual = situacaoAtual(persona, estado);
  const hipoteses = estado.hipoteses.map((h) => {
    let cena: Cena | null = atual;
    for (const [k, a] of h.alteracoes.entries()) {
      const alvo = "evento_id" in a.alteracao ? a.alteracao.evento_id : null;
      if (alvo !== null && !cena.eventos.some((e) => e.id === alvo)) {
        cena = null; // R-14
        break;
      }
      cena = aplicar(cena, a.alteracao, a.id, "hipotese", k);
    }
    return resultado(h.id, h.nome, cena, saldo);
  });
  return [resultado("atual", textos.rotulos.situacao_atual, atual, saldo), ...hipoteses];
}

/** Declaração altera a situação atual (R-04, R-20). Não muda `versao`. */
export function registrarDeclaracao(
  persona: Persona,
  estado: EstadoSessao,
  alteracao: Alteracao,
  origem: Origem,
): ResultadoDominio<{ estado: EstadoSessao; declaracao_id: string }> {
  const v = validarArgumentos("registrar_declaracao", { alteracao });
  if (!v.ok) return { ok: false, erro: v.erro };
  const problema = validar(situacaoAtual(persona, estado), v.argumentos.alteracao, "declaracao");
  if (problema) return { ok: false, erro: problema };
  const n = estado.contadores.D + 1;
  const declaracao_id = `D${n}`;
  return {
    ok: true,
    declaracao_id,
    estado: {
      ...estado,
      declaracoes: [...estado.declaracoes, { id: declaracao_id, mensagem_id: origem.mensagem_id, alteracao: v.argumentos.alteracao }],
      contadores: { ...estado.contadores, D: n },
    },
  };
}

/** Hipótese sobre a situação atual ou sobre outra hipótese, com cópia renumerada (§4.5). */
export function criarHipotese(
  persona: Persona,
  estado: EstadoSessao,
  entrada: { nome: string; a_partir_de: string; alteracoes: Alteracao[] },
  origem: Origem,
): ResultadoDominio<{ estado: EstadoSessao; hipotese_id: string }> {
  const v = validarArgumentos("criar_hipotese", entrada);
  if (!v.ok) return { ok: false, erro: v.erro };
  if (estado.hipoteses.length >= LIMITES.hipoteses_ativas) return { ok: false, erro: falha("LIMITE_HIPOTESES") };

  const { a_partir_de } = v.argumentos;
  const origemHip = a_partir_de === "atual" ? null : estado.hipoteses.find((h) => h.id === a_partir_de);
  if (origemHip === undefined) return { ok: false, erro: falha("HIPOTESE_INEXISTENTE", ["a_partir_de"], { a_partir_de }) };
  const todas = [
    ...(origemHip?.alteracoes ?? []).map((a) => ({ copiado_de: a.id as string | null, alteracao: a.alteracao })),
    ...v.argumentos.alteracoes.map((alteracao) => ({ copiado_de: null, alteracao })),
  ];
  if (todas.length > LIMITES.alteracoes_por_hipotese) {
    return { ok: false, erro: falha("LIMITE_ALTERACOES", ["alteracoes"], { total_com_copiadas: todas.length }) };
  }

  const n = estado.contadores.H + 1;
  const hipotese_id = `H${n}`;
  const alteracoes = todas.map((a, k) => ({ id: `${hipotese_id}.${k + 1}`, ...a }));
  let cena = situacaoAtual(persona, estado);
  for (const [k, a] of alteracoes.entries()) {
    const problema = validar(cena, a.alteracao, "hipotese");
    if (problema) return { ok: false, erro: { ...problema, campos: problema.campos.map((c) => `alteracoes.${k}.${c}`) } };
    cena = aplicar(cena, a.alteracao, a.id, "hipotese", k);
  }

  const hipotese: Hipotese = { id: hipotese_id, nome: v.argumentos.nome, a_partir_de, mensagem_id: origem.mensagem_id, alteracoes };
  return {
    ok: true,
    hipotese_id,
    estado: { ...estado, hipoteses: [...estado.hipoteses, hipotese], contadores: { ...estado.contadores, H: n } },
  };
}

/** Remove declaração (`D<n>`) ou hipótese (`H<n>`); o id não é reutilizado. */
export function desfazer(
  persona: Persona,
  estado: EstadoSessao,
  alvo_id: string,
): ResultadoDominio<{ estado: EstadoSessao; removido: string }> {
  if (/^H\d+$/.test(alvo_id)) {
    if (!estado.hipoteses.some((h) => h.id === alvo_id)) return { ok: false, erro: falha("HIPOTESE_INEXISTENTE", ["alvo_id"], { alvo_id }) };
    return { ok: true, removido: alvo_id, estado: { ...estado, hipoteses: estado.hipoteses.filter((h) => h.id !== alvo_id) } };
  }
  if (/^D\d+$/.test(alvo_id)) {
    if (!estado.declaracoes.some((d) => d.id === alvo_id)) return { ok: false, erro: falha("ALTERACAO_INEXISTENTE", ["alvo_id"], { alvo_id }) };
    const restantes = estado.declaracoes.filter((d) => d.id !== alvo_id);
    // Declaração posterior que dependa da desfeita impede o desfazer.
    let cena: Cena = { eventos: eventosBase(persona) };
    for (const [k, d] of restantes.entries()) {
      if (validar(cena, d.alteracao, "declaracao")) {
        return {
          ok: false,
          erro: falha("OPERACAO_NAO_PERMITIDA", ["alvo_id"], { depende: d.id }, `${d.id} depende de ${alvo_id}; desfaça ${d.id} antes.`),
        };
      }
      cena = aplicar(cena, d.alteracao, d.id, "declaracao", k);
    }
    return { ok: true, removido: alvo_id, estado: { ...estado, declaracoes: restantes } };
  }
  return { ok: false, erro: falha("ARGUMENTOS_INVALIDOS", ["alvo_id"]) };
}

/** R-24: alterações do turno e diferenças de indicadores por cenário. */
export function compararCenarios(antes: EntradaComparacao, depois: EntradaComparacao): OQueMudou {
  return comparar(antes, depois);
}

/** Revalida o estado por replay (D-15); falha → ESTADO_INVALIDO (CR-19). */
export function validarEstado(persona: Persona, estado: EstadoSessao, contexto: Contexto): ResultadoDominio {
  void persona, estado, contexto;
  throw new Error("não implementado");
}
