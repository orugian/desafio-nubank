import Decimal from "decimal.js";
import {
  INICIO_HISTORICO,
  esquemaResultadoCotacao,
  formatarDiaMesHora,
  type Contexto,
  type EstadoSessao,
  type Persona,
  type Posicao,
  type ResultadoCotacao,
} from "@/contratos";
import type { CotacaoBruta } from "@/mercado";

export function montarResultadoCotacao(
  persona: Persona,
  estado: EstadoSessao,
  contexto: Contexto,
  bruta: CotacaoBruta,
): ResultadoCotacao {
  void estado;

  const ticker = bruta.ticker.toUpperCase();
  const serieFechamentos = contexto.series.fechamentos[ticker]?.serie;
  const ordenada = serieFechamentos ? [...serieFechamentos].sort((a, b) => a.data.localeCompare(b.data)) : [];

  let valorizacao_periodo_pct: string | null = null;
  let periodo_desde: string | null = null;

  if (ordenada.length > 0) {
    const pontoBase = ordenada.find((p) => p.data >= INICIO_HISTORICO);
    if (pontoBase && pontoBase.preco_centavos > 0) {
      periodo_desde = pontoBase.data;
      const preco = new Decimal(bruta.preco_centavos);
      const base = new Decimal(pontoBase.preco_centavos);
      valorizacao_periodo_pct = preco
        .sub(base)
        .mul(100)
        .div(base)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2);
    }
  }

  let variacao_dia_pct = bruta.variacao_dia_pct;
  if (variacao_dia_pct === null && !bruta.ao_vivo && ordenada.length >= 2) {
    const ultimo = new Decimal(ordenada.at(-1)!.preco_centavos);
    const penultimo = new Decimal(ordenada.at(-2)!.preco_centavos);
    variacao_dia_pct = ultimo
      .sub(penultimo)
      .mul(100)
      .div(penultimo)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toFixed(2);
  }

  const posicao = persona.posicoes.find(
    (p): p is Extract<Posicao, { categoria: "acao" | "cripto" }> =>
      (p.categoria === "acao" || p.categoria === "cripto") && p.ticker.toUpperCase() === ticker,
  );

  let na_carteira: ResultadoCotacao["na_carteira"] = null;
  if (posicao) {
    let qtdTotal = new Decimal(0);
    for (const c of posicao.compras) {
      qtdTotal = qtdTotal.add(new Decimal(c.quantidade));
    }
    const valorCentavos = qtdTotal
      .mul(bruta.preco_centavos)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    na_carteira = {
      posicao_id: posicao.id,
      quantidade: qtdTotal.toString(),
      valor_centavos: valorCentavos,
    };
  }

  const prefixo = bruta.ao_vivo ? "cotação ao vivo" : "cotação gravada";
  const rotulo = `${prefixo} de ${formatarDiaMesHora(bruta.data_hora)} (${bruta.fonte}); não é previsão de preço`;

  const nome = typeof bruta.nome === "string" && bruta.nome.trim().length > 0 ? bruta.nome.trim() : null;

  return esquemaResultadoCotacao.parse({
    ticker,
    nome,
    tipo: bruta.tipo,
    preco_centavos: bruta.preco_centavos,
    variacao_dia_pct,
    data_hora: bruta.data_hora,
    fonte: bruta.fonte,
    ao_vivo: bruta.ao_vivo,
    valorizacao_periodo_pct,
    periodo_desde,
    na_carteira,
    rotulo,
  });
}
