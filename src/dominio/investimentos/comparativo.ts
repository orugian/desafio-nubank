import Decimal from "decimal.js";
import {
  HOJE,
  erro,
  textos,
  type Contexto,
  type DataISO,
  type EstadoSessao,
  type Persona,
  type ResultadoComparativo,
  type ResultadoDominio,
} from "@/contratos";
import { diaJuliano } from "@/dominio/calendario";
import { avaliarRendaFixaCdi, consultarInvestimentos, indiceTaxasCdi } from "./index";

const DecimalComparativo = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

function formatarPct2Casas(numerador: Decimal, denominador: Decimal): string {
  if (denominador.isZero()) return "0.00";
  return numerador.mul(100).div(denominador).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

const REGEX_TAXA_PCT = /^\d{1,3}(\.\d{1,4})?$/;

export function compararInvestimento(
  persona: Persona,
  estado: EstadoSessao,
  contexto: Contexto,
  pedido: { posicao_id: string; cdi_pct?: number; prefixado_aa_pct?: string },
): ResultadoDominio<ResultadoComparativo> {
  const pos = persona.posicoes.find((p) => p.id === pedido.posicao_id);
  if (!pos) {
    return erro("POSICAO_INEXISTENTE", textos.erros.POSICAO_INEXISTENTE, ["posicao_id"]);
  }

  if (pos.categoria === "saldo_separado") {
    return erro("OPERACAO_NAO_PERMITIDA", "Saldo separado não rende; não há o que comparar.", ["posicao_id"]);
  }

  if (pedido.prefixado_aa_pct !== undefined) {
    if (typeof pedido.prefixado_aa_pct !== "string" || !REGEX_TAXA_PCT.test(pedido.prefixado_aa_pct)) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["prefixado_aa_pct"]);
    }
    const t = Number(pedido.prefixado_aa_pct);
    if (t <= 0 || t > 100) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["prefixado_aa_pct"]);
    }
  }

  if (pedido.cdi_pct !== undefined) {
    if (typeof pedido.cdi_pct !== "number" || isNaN(pedido.cdi_pct) || pedido.cdi_pct <= 0 || pedido.cdi_pct > 300) {
      return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["cdi_pct"]);
    }
  }

  let aportes: Array<{ data: DataISO; valor_centavos: number }> = [];

  if (pos.categoria === "acao" || pos.categoria === "cripto") {
    aportes = pos.compras.map((c) => ({
      data: c.data,
      valor_centavos: new DecimalComparativo(c.quantidade)
        .mul(c.preco_centavos)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber(),
    }));
  } else {
    const aportesOperacao = estado.operacoes
      .filter((op) => op.destino === pos.id)
      .map((op) => ({ data: op.data, valor_centavos: op.valor_centavos }));
    aportes = [...pos.aportes, ...aportesOperacao];
  }

  aportes.sort((a, b) => a.data.localeCompare(b.data));

  if (aportes.length === 0) {
    return erro("OPERACAO_NAO_PERMITIDA", "Essa posição ainda não tem aplicações para comparar.", ["posicao_id"]);
  }

  const inicio = aportes[0].data;
  const aplicado_centavos = aportes.reduce((acc, a) => acc + a.valor_centavos, 0);

  const dias_corridos = Math.max(0, diaJuliano(HOJE) - diaJuliano(inicio));
  const dias_uteis = contexto.calendario.diasUteisEntre(inicio, HOJE);

  const rInvestimentos = consultarInvestimentos(persona, estado, contexto, {});
  if (!rInvestimentos.ok) {
    return rInvestimentos;
  }
  const posReal = rInvestimentos.posicoes.find((p) => p.posicao_id === pedido.posicao_id);
  if (!posReal) {
    return erro("POSICAO_INEXISTENTE", textos.erros.POSICAO_INEXISTENTE, ["posicao_id"]);
  }

  const real = {
    valor_centavos: posReal.valor_atual_centavos,
    resultado_centavos: posReal.resultado_centavos,
    rentabilidade_pct: posReal.rentabilidade_pct,
    estimado: posReal.estimado,
    rotulo_estimativa: posReal.rotulo_estimativa,
  };

  const cdiPct = pedido.cdi_pct ?? 100;
  const { taxaNoDia, ultimaDataSerie } = indiceTaxasCdi(contexto);
  const avalCdi = avaliarRendaFixaCdi(aportes, cdiPct, contexto, taxaNoDia);
  const valorCdi = avalCdi.valorAtual;
  const cdiDataRef = avalCdi.ultimaRefUsada ?? ultimaDataSerie;
  const resultadoCdi = valorCdi - aplicado_centavos;
  const rentabilidadeCdi = formatarPct2Casas(
    new DecimalComparativo(resultadoCdi),
    new DecimalComparativo(aplicado_centavos),
  );
  const diferencaCdi = valorCdi - real.valor_centavos;

  const alternativas: ResultadoComparativo["alternativas"] = [
    {
      id: "cdi",
      nome: `${cdiPct}% do CDI`,
      valor_centavos: valorCdi,
      resultado_centavos: resultadoCdi,
      rentabilidade_pct: rentabilidadeCdi,
      diferenca_centavos: diferencaCdi,
    },
  ];

  if (pedido.prefixado_aa_pct !== undefined) {
    const tDec = new DecimalComparativo(pedido.prefixado_aa_pct).div(100);
    const base = new DecimalComparativo(1).add(tDec);

    let somaValoresPrefixados = new DecimalComparativo(0);
    for (const ap of aportes) {
      const du = contexto.calendario.diasUteisEntre(ap.data, HOJE);
      const exp = new DecimalComparativo(du).div(252);
      const fator = base.pow(exp);
      somaValoresPrefixados = somaValoresPrefixados.add(new DecimalComparativo(ap.valor_centavos).mul(fator));
    }

    const valorPrefixado = somaValoresPrefixados.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    const resultadoPrefixado = valorPrefixado - aplicado_centavos;
    const rentabilidadePrefixado = formatarPct2Casas(
      new DecimalComparativo(resultadoPrefixado),
      new DecimalComparativo(aplicado_centavos),
    );
    const diferencaPrefixado = valorPrefixado - real.valor_centavos;

    alternativas.push({
      id: "prefixado",
      nome: `Prefixado ${pedido.prefixado_aa_pct.replace(".", ",")}% a.a.`,
      valor_centavos: valorPrefixado,
      resultado_centavos: resultadoPrefixado,
      rentabilidade_pct: rentabilidadePrefixado,
      diferenca_centavos: diferencaPrefixado,
    });
  }

  let melhor: "real" | "cdi" | "prefixado" = "real";
  const altPrefixado = alternativas.find((a) => a.id === "prefixado");

  if (altPrefixado) {
    if (altPrefixado.valor_centavos > real.valor_centavos && altPrefixado.valor_centavos > valorCdi) {
      melhor = "prefixado";
    } else if (valorCdi > real.valor_centavos) {
      // Empate CDI = prefixado acima do real favorece "cdi" (contrato T5); empate com o real favorece "real".
      melhor = "cdi";
    } else {
      melhor = "real";
    }
  } else {
    if (valorCdi > real.valor_centavos) {
      melhor = "cdi";
    } else {
      melhor = "real";
    }
  }

  return {
    ok: true,
    posicao: {
      posicao_id: pos.id,
      nome: pos.nome,
      categoria: pos.categoria,
      ticker: pos.categoria === "acao" || pos.categoria === "cripto" ? pos.ticker : null,
    },
    aportes,
    aplicado_centavos,
    inicio,
    dias_corridos,
    dias_uteis,
    real,
    alternativas,
    melhor,
    cdi_data_ref: cdiDataRef,
    rotulo: "bruto, antes de IR, IOF e custos; mesmas datas e valores aplicados; resultado passado não garante resultado futuro",
  };
}
