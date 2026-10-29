// Motor de caixa (spec §5.1, §6.1).

import {
  FIM_JANELA,
  HOJE,
  LIMITES,
  OPERACOES_EM_DECLARACAO,
  erro,
  esquemaEstadoSessao,
  formatarReais,
  formatarDiaMes,
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
import { diaJuliano, somarDias } from "@/dominio/calendario";
import { projetar, type Evento } from "./projecao";
import { comparar } from "./comparacao";
import { alocarCompra, consultarCartao, verificarDuplicidade } from "@/dominio/cartao";
import type { AlocacaoCompra } from "@/contratos";

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

type Cena = {
  eventos: Evento[];
  compras_cartao: { evento: Evento; alocacao: AlocacaoCompra }[];
  gasto_diario_centavos: number;
  entradas_primeiro: readonly string[];
};
type Camada = "declaracao" | "hipotese";

/** R-21: blocos de 7 dias a partir de hoje, saída no primeiro dia; gasto 0 não gera blocos. */
function blocos(gasto: number): Evento[] {
  if (gasto <= 0) return [];
  const eventos: Evento[] = [];
  for (let inicio = HOJE, k = 1; inicio <= FIM_JANELA; inicio = somarDias(inicio, 7), k++) {
    const dias = Math.min(7, diaJuliano(FIM_JANELA) - diaJuliano(inicio) + 1);
    eventos.push({
      id: `G${k}`,
      data: inicio,
      descricao: "Gastos do dia a dia (estimado)",
      tipo: "saida",
      meio: "pix_ou_debito",
      origem: "estimado",
      estimativa: { metodo: "gasto_diario", valor_por_dia_centavos: gasto, dias, texto: textos.rotulos.estimado_gasto_diario(gasto, dias) },
      previsto: false,
      valor_centavos: gasto * dias,
      original: null,
      cadastro: cadastro("bloco", k),
      especie: "bloco",
    });
  }
  return eventos;
}

const falha = (codigo: ErroDominio["codigo"], campos: string[] = [], detalhes?: Record<string, unknown>, mensagem?: string) =>
  erro(codigo, mensagem ?? textos.erros[codigo], campos, detalhes).erro;

/** Regras de domínio de uma alteração sobre a cena em que será aplicada (§4.5, R-02, R-03, R-18). */
function validar(persona: Persona, estado: EstadoSessao, cena: Cena, alt: Alteracao, camada: Camada): ErroDominio | null {
  if (camada === "declaracao" && !OPERACOES_EM_DECLARACAO.includes(alt.operacao)) {
    return falha("OPERACAO_NAO_PERMITIDA", ["operacao"], undefined, `${alt.operacao} não vale como declaração; use uma hipótese.`);
  }
  const data = "data" in alt ? alt.data : undefined;
  if (data !== undefined && data < HOJE) return falha("DATA_ANTES_DE_HOJE", ["data"]);
  if (data !== undefined && data > FIM_JANELA) return falha("DATA_FORA_DA_JANELA", ["data"]);

  if (alt.operacao === "alterar_evento" || alt.operacao === "remover_evento") {
    const alvo = cena.eventos.find((e) => e.id === alt.evento_id) ?? cena.compras_cartao.find((c) => c.evento.id === alt.evento_id)?.evento;
    const intocavel = /^G\d+$/.test(alt.evento_id) || /^OP\d+$/.test(alt.evento_id) || alvo?.especie === "fatura" || alvo?.especie === "bloco" || alvo?.especie === "operacao";
    const itemFechado = persona.cartao?.faturas.some((f) => f.status === "fechada" && (f.id === alt.evento_id || f.itens.some((i) => i.lancamento_id === alt.evento_id)));
    if (intocavel || itemFechado) {
      return falha(
        "OPERACAO_NAO_PERMITIDA",
        ["evento_id"],
        { evento_id: alt.evento_id },
        "Fatura fechada, gasto estimado e movimentação executada não podem ser alterados; o gasto estimado muda só por alterar_gasto_diario.",
      );
    }
    if (!alvo) return falha("EVENTO_INEXISTENTE", ["evento_id"], { evento_id: alt.evento_id });
    const compra = cena.compras_cartao.find((c) => c.evento.id === alt.evento_id);
    if (compra && alt.operacao === "alterar_evento") {
      const r = alocarCompra(persona, estado, { data: alt.data ?? compra.evento.data, valor_centavos: alt.valor !== undefined ? paraCentavos(alt.valor) : compra.evento.valor_centavos, parcelas: compra.alocacao.parcelas.length });
      if (!r.ok) return r.erro;
    }
  }
  if (alt.operacao === "adicionar_evento" && alt.tipo === "saida" && !alt.confirmar_nao_duplicado) {
    const baseCartao = consultarCartao(persona, { ...estado, declaracoes: [] });
    let personaDaCena = persona;
    if (persona.cartao && baseCartao) {
      const aberta = baseCartao.fatura_aberta;
      const itens = aberta.itens.map((i) => ({ descricao: i.descricao, valor_centavos: i.valor_centavos, lancamento_id: i.lancamento_id ?? undefined, data: i.data ?? undefined, parcelamento_id: i.parcelamento_id ?? undefined, parcela: i.parcela ?? undefined }));
      for (const compra of cena.compras_cartao) {
        for (const p of compra.alocacao.parcelas) {
          if (p.fatura_id === aberta.fatura_id) itens.push({ descricao: compra.evento.descricao, valor_centavos: p.valor_centavos, data: compra.evento.data, lancamento_id: undefined, parcelamento_id: undefined, parcela: undefined });
        }
      }
      const fatura = { id: aberta.fatura_id, fechamento: aberta.fechamento, vencimento: aberta.vencimento, status: "aberta" as const, valor_centavos: itens.reduce((s, i) => s + i.valor_centavos, 0), itens };
      personaDaCena = { ...persona, cartao: { ...persona.cartao, faturas: [...persona.cartao.faturas.filter((f) => f.id !== aberta.fatura_id), fatura] } };
    }
    const duplicidade = verificarDuplicidade(personaDaCena, { valor_centavos: paraCentavos(alt.valor) });
    if (duplicidade.duplicado) {
      const citacoes = duplicidade.itens.map((i) => `${i.descricao} ${formatarReais(i.valor_centavos).replace("R$ ", "")}, ${i.vencimento ? `fatura de ${formatarDiaMes(i.vencimento)}` : `lançamento de ${formatarDiaMes(i.data!)}`}`);
      return falha("POSSIVEL_DUPLICIDADE", ["valor", "confirmar_nao_duplicado"], { itens: duplicidade.itens }, `${textos.erros.POSSIVEL_DUPLICIDADE} ${citacoes.join("; ")}. Confirme se é outra compra.`);
    }
  }
  if (alt.operacao === "adicionar_evento" && alt.meio === "cartao_credito") {
    const r = alocarCompra(persona, estado, { data: alt.data, valor_centavos: paraCentavos(alt.valor), parcelas: alt.parcelas ?? 1 });
    if (!r.ok) return r.erro;
  }
  return null;
}

/** Aplica uma alteração já validada sobre a cena. */
function aplicar(persona: Persona, estado: EstadoSessao, cena: Cena, alt: Alteracao, id: string, camada: Camada, indice: number): Cena {
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
    return { ...cena, eventos: [...cena.eventos, evento] };
  }
  if (alt.operacao === "alterar_evento") {
    const compra = cena.compras_cartao.find((c) => c.evento.id === alt.evento_id);
    if (compra) {
      const evento = { ...compra.evento, data: alt.data ?? compra.evento.data, valor_centavos: alt.valor !== undefined ? paraCentavos(alt.valor) : compra.evento.valor_centavos, origem: camada };
      const r = alocarCompra(persona, estado, { data: evento.data, valor_centavos: evento.valor_centavos, parcelas: compra.alocacao.parcelas.length });
      if (!r.ok) return cena;
      return { ...cena, compras_cartao: cena.compras_cartao.map((c) => c === compra ? { evento, alocacao: { parcelas: r.parcelas } } : c) };
    }
    return {
      ...cena,
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
    return { ...cena, eventos: cena.eventos.filter((e) => e.id !== alt.evento_id), compras_cartao: cena.compras_cartao.filter((c) => c.evento.id !== alt.evento_id) };
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
    if (alt.meio === "cartao_credito") {
      const alocacao = alocarCompra(persona, estado, { data: alt.data, valor_centavos: evento.valor_centavos, parcelas: alt.parcelas ?? 1 });
      if (!alocacao.ok) return cena; // As entradas de domínio são validadas antes do replay.
      return { ...cena, compras_cartao: [...cena.compras_cartao, { evento, alocacao: { parcelas: alocacao.parcelas } }] };
    }
    return { ...cena, eventos: [...cena.eventos, evento] };
  }
  if (alt.operacao === "definir_ordem_no_dia") {
    return { ...cena, entradas_primeiro: [...new Set([...cena.entradas_primeiro, alt.data])] };
  }
  if (alt.operacao === "alterar_gasto_diario") {
    return { ...cena, gasto_diario_centavos: paraCentavos(alt.valor_por_dia) };
  }
  return cena;
}

const cenaBase = (persona: Persona): Cena => ({
  eventos: eventosBase(persona),
  compras_cartao: [],
  gasto_diario_centavos: persona.gasto_diario.valor_centavos,
  entradas_primeiro: [],
});

function situacaoAtual(persona: Persona, estado: EstadoSessao): Cena {
  const cena = estado.declaracoes.reduce(
    (c, d, k) => aplicar(persona, estado, c, d.alteracao, d.id, "declaracao", k),
    cenaBase(persona),
  );
  const operacoes: Evento[] = estado.operacoes.map((op, k) => ({
    id: op.id, data: op.data, descricao: textos.descricao_movimentacao(persona.posicoes.find((p) => p.id === op.destino)?.nome ?? op.destino),
    tipo: "saida", meio: "movimentacao_interna", origem: "operacao", estimativa: null, previsto: false,
    valor_centavos: op.valor_centavos, original: null, cadastro: cadastro("operacao", k), especie: "operacao",
  }));
  return { ...cena, eventos: [...cena.eventos, ...operacoes] };
}

/** Spec §2: disponível não inclui estimativas, hipóteses nem entradas previstas. */
export function saldoDisponivelHoje(persona: Persona, estado: EstadoSessao): number {
  const saidas = situacaoAtual(persona, estado).eventos.filter((e) => e.data === HOJE && e.tipo === "saida" && (e.origem === "declaracao" || e.especie === "operacao"));
  return persona.conta.saldo_inicio_hoje_centavos - saidas.reduce((s, e) => s + e.valor_centavos, 0);
}

function resultado(persona: Persona, estado: EstadoSessao, cenario_id: string, nome: string, cena: Cena | null, saldoInicial: number): ResultadoCenario {
  if (cena === null) {
    return { cenario_id, nome, status: "inconsistente", linhas: [], indicadores: null, faturas_afetadas: [], datas_ordem_relevante: [], avisos: [] };
  }
  const p = projetar([...cena.eventos, ...blocos(cena.gasto_diario_centavos)], saldoInicial, new Set(cena.entradas_primeiro));
  const baseCartao = consultarCartao(persona, { ...estado, declaracoes: [] });
  const baseFaturas = baseCartao ? [baseCartao.fatura_aberta, ...baseCartao.proximas] : [];
  const afetadas = new Map<string, ResultadoCenario["faturas_afetadas"][number]>();
  for (const compra of cena.compras_cartao) {
    for (const parcela of compra.alocacao.parcelas) {
      const anterior = baseFaturas.find((f) => f.fatura_id === parcela.fatura_id)?.valor_centavos ?? 0;
      const fatura = afetadas.get(parcela.fatura_id) ?? { fatura_id: parcela.fatura_id, vencimento: parcela.vencimento, total_antes_centavos: anterior, total_depois_centavos: anterior };
      afetadas.set(parcela.fatura_id, { ...fatura, total_depois_centavos: fatura.total_depois_centavos + parcela.valor_centavos });
    }
  }
  return {
    cenario_id,
    nome,
    status: "calculado",
    linhas: p.linhas,
    indicadores: p.indicadores,
    faturas_afetadas: [...afetadas.values()].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
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
      if (alvo !== null && !cena.eventos.some((e) => e.id === alvo) && !cena.compras_cartao.some((c) => c.evento.id === alvo)) {
        cena = null; // R-14
        break;
      }
      cena = aplicar(persona, estado, cena, a.alteracao, a.id, "hipotese", k);
    }
    return resultado(persona, estado, h.id, h.nome, cena, saldo);
  });
  return [resultado(persona, estado, "atual", textos.rotulos.situacao_atual, atual, saldo), ...hipoteses];
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
  const problema = validar(persona, estado, situacaoAtual(persona, estado), v.argumentos.alteracao, "declaracao");
  if (problema) return { ok: false, erro: problema };
  const n = estado.contadores.D + 1;
  const declaracao_id = `D${n}`;
  return {
    ok: true,
    declaracao_id,
    estado: {
      ...estado,
      operacao_pendente: null,
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
    const problema = validar(persona, estado, cena, a.alteracao, "hipotese");
    if (problema) return { ok: false, erro: { ...problema, campos: problema.campos.map((c) => `alteracoes.${k}.${c}`) } };
    cena = aplicar(persona, estado, cena, a.alteracao, a.id, "hipotese", k);
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
    let cena: Cena = cenaBase(persona);
    for (const [k, d] of restantes.entries()) {
      if (validar(persona, estado, cena, d.alteracao, "declaracao")) {
        return {
          ok: false,
          erro: falha("OPERACAO_NAO_PERMITIDA", ["alvo_id"], { depende: d.id }, `${d.id} depende de ${alvo_id}; desfaça ${d.id} antes.`),
        };
      }
      cena = aplicar(persona, estado, cena, d.alteracao, d.id, "declaracao", k);
    }
    return { ok: true, removido: alvo_id, estado: { ...estado, declaracoes: restantes, operacao_pendente: null } };
  }
  return { ok: false, erro: falha("ARGUMENTOS_INVALIDOS", ["alvo_id"]) };
}

/** R-24: alterações do turno e diferenças de indicadores por cenário. */
export function compararCenarios(antes: EntradaComparacao, depois: EntradaComparacao): OQueMudou {
  return comparar(antes, depois);
}

/** Revalida o estado por replay (D-15); falha → ESTADO_INVALIDO (CR-19). */
export function validarEstado(persona: Persona, estado: EstadoSessao, contexto: Contexto): ResultadoDominio {
  void contexto;
  const invalido = (motivo: string) => erro("ESTADO_INVALIDO", textos.erros.ESTADO_INVALIDO, [], { motivo });
  const r = esquemaEstadoSessao.safeParse(estado);
  if (!r.success) return invalido(`fora do esquema: ${r.error.issues[0]?.path.join(".")}`);
  const e = r.data;
  if (e.persona_id !== persona.id) return invalido("persona diferente");

  // Identificadores e contadores (§4.5: ids nunca reutilizados).
  const numero = (id: string) => Number(id.replace(/^\D+/, "").split(".")[0]);
  const ids = (lista: { id: string }[]) => lista.map((x) => x.id);
  if (new Set(ids(e.declaracoes)).size !== e.declaracoes.length) return invalido("declaração repetida");
  if (new Set(ids(e.hipoteses)).size !== e.hipoteses.length) return invalido("hipótese repetida");
  if (e.declaracoes.some((d) => numero(d.id) > e.contadores.D)) return invalido("contador D atrás de id usado");
  if (e.hipoteses.some((h) => numero(h.id) > e.contadores.H)) return invalido("contador H atrás de id usado");
  if (e.hipoteses.length > LIMITES.hipoteses_ativas) return invalido("hipóteses demais");

  const destinoPermitido = (id: string) => persona.posicoes.some((p) => p.id === id && (p.categoria === "saldo_separado" || p.categoria === "caixinha"));
  if (new Set(ids(e.operacoes)).size !== e.operacoes.length) return invalido("operação repetida");
  for (const op of e.operacoes) {
    if (numero(op.id) < 1 || numero(op.id) > e.contadores.OP) return invalido("contador OP atrás de id usado");
    if (op.data !== HOJE) return invalido("operação fora de hoje");
    if (!destinoPermitido(op.destino)) return invalido("destino de operação inválido");
  }
  if (e.operacao_pendente) {
    const op = e.operacao_pendente;
    if (numero(op.id) < 1 || numero(op.id) > e.contadores.OP || e.operacoes.some((executada) => executada.id === op.id)) return invalido("id da pendente inválido");
    if (op.criada_na_versao > e.versao) return invalido("pendente criada no futuro");
    if (!destinoPermitido(op.destino)) return invalido("destino da pendente inválido");
  }

  // Replay das declarações na ordem.
  let cena = cenaBase(persona);
  for (const [k, d] of e.declaracoes.entries()) {
    const problema = validar(persona, estado, cena, d.alteracao, "declaracao");
    if (problema) return invalido(`${d.id}: ${problema.codigo}`);
    cena = aplicar(persona, estado, cena, d.alteracao, d.id, "declaracao", k);
  }

  // O-04/CR-19: nem o JSON da pendente nem o de operações executadas pode
  // fabricar recursos. Declarações posteriores podem gerar falta legítima;
  // por isso o teto histórico das OP usa o saldo inicial, não o saldo atual.
  const totalOperacoes = e.operacoes.reduce((s, op) => s + op.valor_centavos, 0);
  if (totalOperacoes > Math.max(0, persona.conta.saldo_inicio_hoje_centavos)) return invalido("operações excedem o saldo inicial disponível");
  if (e.operacao_pendente && e.operacao_pendente.valor_centavos > saldoDisponivelHoje(persona, e)) return invalido("pendente excede saldo disponível hoje");

  // Hipóteses: estrutura e regras que não dependem da existência do alvo (R-14 permite inconsistência).
  for (const h of e.hipoteses) {
    if (h.alteracoes.length > LIMITES.alteracoes_por_hipotese) return invalido(`${h.id}: alterações demais`);
    let cenaHipotese = cena;
    for (const [k, a] of h.alteracoes.entries()) {
      if (a.id !== `${h.id}.${k + 1}`) return invalido(`${h.id}: id de alteração ${a.id}`);
      const problema = validar(persona, estado, cenaHipotese, a.alteracao, "hipotese");
      if (problema && problema.codigo !== "EVENTO_INEXISTENTE") return invalido(`${a.id}: ${problema.codigo}`);
      if (!problema) cenaHipotese = aplicar(persona, estado, cenaHipotese, a.alteracao, a.id, "hipotese", k);
    }
  }
  return { ok: true };
}
