// Motor de caixa (spec §5.1, §6.1).

import {
  FIM_JANELA,
  HOJE,
  formatarReais,
  textos,
  validarArgumentos,
  type Alteracao,
  type Contexto,
  type EntradaComparacao,
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
        bloco: false,
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
      bloco: false,
    });
  }
  return eventos;
}

/** Texto `^\d{1,7}(\.\d{1,2})?$` → centavos, sem ponto flutuante. */
export function paraCentavos(valor: string): number {
  const [reais, cent = ""] = valor.split(".");
  return Number(reais) * 100 + Number(cent.padEnd(2, "0"));
}

type Cena = { eventos: Evento[] };
type Camada = "declaracao" | "hipotese";

/** Aplica uma alteração (declaração ou hipótese) sobre a cena. */
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
      bloco: false,
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
  return cena;
}

function situacaoAtual(persona: Persona, estado: EstadoSessao): Cena {
  return estado.declaracoes.reduce(
    (c, d, k) => aplicar(c, d.alteracao, d.id, "declaracao", k),
    { eventos: eventosBase(persona) } as Cena,
  );
}

function resultado(cenario_id: string, nome: string, cena: Cena, saldoInicial: number): ResultadoCenario {
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
    const cena = h.alteracoes.reduce((c, a, k) => aplicar(c, a.alteracao, a.id, "hipotese", k), atual);
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
  void persona;
  const v = validarArgumentos("registrar_declaracao", { alteracao });
  if (!v.ok) return { ok: false, erro: v.erro };
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
  void persona;
  const v = validarArgumentos("criar_hipotese", entrada);
  if (!v.ok) return { ok: false, erro: v.erro };
  const n = estado.contadores.H + 1;
  const hipotese_id = `H${n}`;
  const copiadas =
    v.argumentos.a_partir_de === "atual"
      ? []
      : (estado.hipoteses.find((h) => h.id === v.argumentos.a_partir_de)?.alteracoes ?? []);
  const todas = [
    ...copiadas.map((a) => ({ copiado_de: a.id, alteracao: a.alteracao })),
    ...v.argumentos.alteracoes.map((alteracao) => ({ copiado_de: null, alteracao })),
  ];
  const hipotese: Hipotese = {
    id: hipotese_id,
    nome: v.argumentos.nome,
    a_partir_de: v.argumentos.a_partir_de,
    mensagem_id: origem.mensagem_id,
    alteracoes: todas.map((a, k) => ({ id: `${hipotese_id}.${k + 1}`, ...a })),
  };
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
  void persona, estado, alvo_id;
  throw new Error("não implementado");
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
