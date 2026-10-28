// Histórico (spec §5.2, §6.1). Implementação no B2.

import {
  FIM_HISTORICO,
  INICIO_HISTORICO,
  LIMITES,
  dataExiste,
  erro,
  esquemaFiltroHistorico,
  formatarDiaMes,
  textos,
  type DataISO,
  type FiltroHistorico,
  type Lancamento,
  type Persona,
  type ResultadoDominio,
  type ResultadoHistorico,
} from "@/contratos";
import { diaDaSemana, somarDias } from "@/dominio/calendario";

const ROTULOS_MES: Record<string, string> = {
  "07": "Julho/2026",
  "08": "Agosto/2026",
  "09": "Setembro/2026",
  "10": "Outubro/2026",
};

const ROTULOS_CATEGORIA: Record<Lancamento["categoria"], string> = {
  moradia: "Moradia",
  mercado: "Mercado",
  restaurante: "Restaurante",
  delivery: "Delivery",
  transporte: "Transporte",
  saude: "Saúde",
  educacao: "Educação",
  lazer: "Lazer",
  assinaturas: "Assinaturas",
  contas_casa: "Contas da casa",
  compras: "Compras",
  receitas: "Receitas",
  investimentos: "Investimentos",
  fatura: "Fatura do cartão",
  outros: "Outros",
};

/** H-04: semana de segunda a domingo; devolve a segunda-feira da semana de `data`. */
function segundaFeiraDaSemana(data: DataISO): DataISO {
  const dow = diaDaSemana(data); // 0 = domingo … 6 = sábado
  const deslocamento = dow === 0 ? -6 : 1 - dow;
  return somarDias(data, deslocamento);
}

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** H-02 a H-04: filtros, agrupamento e até 20 itens mais recentes. */
export function consultarHistorico(persona: Persona, filtroBruto: FiltroHistorico): ResultadoDominio<ResultadoHistorico> {
  if (filtroBruto.de !== undefined && !dataExiste(filtroBruto.de)) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["de"]);
  }
  if (filtroBruto.ate !== undefined && !dataExiste(filtroBruto.ate)) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["ate"]);
  }
  const parsed = esquemaFiltroHistorico.safeParse(filtroBruto);
  if (!parsed.success) {
    return erro(
      "ARGUMENTOS_INVALIDOS",
      textos.erros.ARGUMENTOS_INVALIDOS,
      parsed.error.issues.map((i) => String(i.path[0] ?? "filtro")),
    );
  }
  const filtro = parsed.data;
  const de: DataISO = filtro.de ?? INICIO_HISTORICO;
  const ate: DataISO = filtro.ate ?? FIM_HISTORICO;

  if (de < INICIO_HISTORICO || de > FIM_HISTORICO) {
    return erro("DATA_FORA_DO_HISTORICO", textos.erros.DATA_FORA_DO_HISTORICO, ["de"]);
  }
  if (ate < INICIO_HISTORICO || ate > FIM_HISTORICO) {
    return erro("DATA_FORA_DO_HISTORICO", textos.erros.DATA_FORA_DO_HISTORICO, ["ate"]);
  }
  if (de > ate) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["de", "ate"]);
  }

  const termoBusca = filtro.busca !== undefined ? normalizarTexto(filtro.busca.trim()) : null;

  const filtrados = persona.historico.filter((l) => {
    if (l.data < de || l.data > ate) return false;
    if (filtro.tipo !== undefined && l.tipo !== filtro.tipo) return false;
    if (filtro.meio !== undefined && l.meio !== filtro.meio) return false;
    if (filtro.categoria !== undefined && l.categoria !== filtro.categoria) return false;
    if (termoBusca !== null && !normalizarTexto(l.descricao).includes(termoBusca)) return false;
    return true;
  });

  let totalSaidas = 0;
  let totalEntradas = 0;
  for (const l of filtrados) {
    if (l.tipo === "saida") totalSaidas += l.valor_centavos;
    else totalEntradas += l.valor_centavos;
  }

  const agrupar = filtro.agrupar_por ?? "nenhum";
  const gruposMapa = new Map<
    string,
    { chave: string; rotulo: string; quantidade: number; total_saidas_centavos: number; total_entradas_centavos: number }
  >();

  if (agrupar !== "nenhum") {
    for (const l of filtrados) {
      let chave: string;
      let rotulo: string;
      if (agrupar === "categoria") {
        chave = l.categoria;
        rotulo = ROTULOS_CATEGORIA[l.categoria];
      } else if (agrupar === "mes") {
        chave = l.data.slice(0, 7);
        rotulo = ROTULOS_MES[l.data.slice(5, 7)] ?? chave;
      } else {
        chave = segundaFeiraDaSemana(l.data);
        const domingo = somarDias(chave, 6);
        rotulo = `Semana de ${formatarDiaMes(chave)} a ${formatarDiaMes(domingo)}`;
      }
      let g = gruposMapa.get(chave);
      if (!g) {
        g = { chave, rotulo, quantidade: 0, total_saidas_centavos: 0, total_entradas_centavos: 0 };
        gruposMapa.set(chave, g);
      }
      g.quantidade += 1;
      if (l.tipo === "saida") g.total_saidas_centavos += l.valor_centavos;
      else g.total_entradas_centavos += l.valor_centavos;
    }
  }

  const grupos = [...gruposMapa.values()].sort((a, b) => a.chave.localeCompare(b.chave));

  // Mais recentes primeiro (data decrescente; em empate, id decrescente).
  const itens = [...filtrados]
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
    .slice(0, LIMITES.itens_historico);

  return {
    ok: true,
    filtro,
    de,
    ate,
    quantidade: filtrados.length,
    total_saidas_centavos: totalSaidas,
    total_entradas_centavos: totalEntradas,
    grupos,
    itens,
  };
}
