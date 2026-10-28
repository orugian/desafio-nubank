// Motor de caixa (spec §5.1, §6.1).

import {
  FIM_JANELA,
  HOJE,
  textos,
  type Alteracao,
  type Contexto,
  type EntradaComparacao,
  type EstadoSessao,
  type OQueMudou,
  type Origem,
  type Persona,
  type ResultadoCenario,
  type ResultadoDominio,
} from "@/contratos";
import { projetar, type Evento } from "./projecao";

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

/** Situação atual primeiro, depois as hipóteses ativas na ordem do estado. */
export function calcularCenarios(persona: Persona, estado: EstadoSessao, contexto: Contexto): ResultadoCenario[] {
  void estado, contexto;
  const p = projetar(eventosBase(persona), persona.conta.saldo_inicio_hoje_centavos, new Set());
  return [
    {
      cenario_id: "atual",
      nome: textos.rotulos.situacao_atual,
      status: "calculado",
      linhas: p.linhas,
      indicadores: p.indicadores,
      faturas_afetadas: [],
      datas_ordem_relevante: p.datas_ordem_relevante,
      avisos: p.avisos,
    },
  ];
}

/** Declaração altera a situação atual (R-04, R-20). Não muda `versao`. */
export function registrarDeclaracao(
  persona: Persona,
  estado: EstadoSessao,
  alteracao: Alteracao,
  origem: Origem,
): ResultadoDominio<{ estado: EstadoSessao; declaracao_id: string }> {
  void persona, estado, alteracao, origem;
  throw new Error("não implementado");
}

/** Hipótese sobre a situação atual ou sobre outra hipótese, com cópia renumerada (§4.5). */
export function criarHipotese(
  persona: Persona,
  estado: EstadoSessao,
  entrada: { nome: string; a_partir_de: string; alteracoes: Alteracao[] },
  origem: Origem,
): ResultadoDominio<{ estado: EstadoSessao; hipotese_id: string }> {
  void persona, estado, entrada, origem;
  throw new Error("não implementado");
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
  void antes, depois;
  throw new Error("não implementado");
}

/** Revalida o estado por replay (D-15); falha → ESTADO_INVALIDO (CR-19). */
export function validarEstado(persona: Persona, estado: EstadoSessao, contexto: Contexto): ResultadoDominio {
  void persona, estado, contexto;
  throw new Error("não implementado");
}
