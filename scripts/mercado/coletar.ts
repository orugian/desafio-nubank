import Decimal from "decimal.js";
import { INICIO_HISTORICO, type SerieCdi, type SerieFechamentos } from "@/contratos";

export const URL_BCB_SGS12 =
  "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=03/11/2025&dataFinal=29/10/2026";
export const OBTIDO_EM_BCB = "2026-10-28T12:39:47-03:00";

export const URL_BRAPI_PETR4 =
  "https://brapi.dev/api/quote/PETR4?range=3mo&interval=1d";
export const OBTIDO_EM_BRAPI = "2026-10-28T13:45:39-03:00";

export const URL_COINGECKO_BTC =
  "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=brl&days=92&interval=daily";
export const OBTIDO_EM_COINGECKO = "2026-10-28T12:39:48-03:00";

export const DATA_CORTE_FECHAMENTO = "2026-10-27";

type ItemBrutoBcb = { data: string; valor: string };
type RespostaBrutaBrapi = {
  results?: Array<{
    symbol?: string;
    historicalDataPrice?: Array<{ date: number; close: number }>;
  }>;
};
type RespostaBrutaCoinGecko = {
  prices?: Array<[number, number]>;
};

export function reaisParaCentavos(reais: number | string): number {
  return new Decimal(String(reais)).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function converterSerieBcb(
  bruto: unknown,
  meta?: { obtido_em?: string; url?: string },
): SerieCdi {
  if (!Array.isArray(bruto)) {
    throw new Error("Resposta do BCB deve ser uma lista");
  }
  const serie = (bruto as ItemBrutoBcb[])
    .map((item) => {
      const [dia, mes, ano] = item.data.split("/");
      return {
        data: `${ano}-${mes}-${dia}`,
        taxa_diaria_pct: String(item.valor).replace(",", "."),
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    fonte: "BCB SGS 12",
    url: meta?.url ?? URL_BCB_SGS12,
    obtido_em: meta?.obtido_em ?? OBTIDO_EM_BCB,
    serie,
  };
}

export function converterSerieBrapi(
  bruto: unknown,
  meta?: { obtido_em?: string; url?: string; ateData?: string },
): SerieFechamentos {
  const obj = bruto as RespostaBrutaBrapi;
  const primeiro = obj?.results?.[0];
  if (!primeiro || !primeiro.symbol || !Array.isArray(primeiro.historicalDataPrice)) {
    throw new Error("Resposta da brapi inválida");
  }
  const ateData = meta?.ateData ?? DATA_CORTE_FECHAMENTO;
  const ticker = primeiro.symbol;
  const serie = primeiro.historicalDataPrice
    .map((item) => ({
      data: new Date(item.date * 1000).toISOString().slice(0, 10),
      preco_centavos: reaisParaCentavos(item.close),
    }))
    .filter((item) => item.data <= ateData)
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    fonte: "brapi",
    url: meta?.url ?? `https://brapi.dev/api/quote/${ticker}?range=3mo&interval=1d`,
    obtido_em: meta?.obtido_em ?? OBTIDO_EM_BRAPI,
    ticker,
    serie,
  };
}

export function converterSerieCoinGecko(
  bruto: unknown,
  meta?: { obtido_em?: string; url?: string; deData?: string; ateData?: string },
): SerieFechamentos {
  const obj = bruto as RespostaBrutaCoinGecko;
  if (!Array.isArray(obj?.prices)) {
    throw new Error("Resposta da CoinGecko inválida");
  }
  const deData = meta?.deData ?? INICIO_HISTORICO;
  const ateData = meta?.ateData ?? DATA_CORTE_FECHAMENTO;
  const porData = new Map<string, number>();

  for (const [ts, preco] of obj.prices) {
    const data = new Date(ts).toISOString().slice(0, 10);
    if (data >= deData && data <= ateData && !porData.has(data)) {
      porData.set(data, reaisParaCentavos(preco));
    }
  }

  const serie = Array.from(porData.entries())
    .map(([data, preco_centavos]) => ({ data, preco_centavos }))
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    fonte: "CoinGecko",
    url: meta?.url ?? URL_COINGECKO_BTC,
    obtido_em: meta?.obtido_em ?? OBTIDO_EM_COINGECKO,
    ticker: "BTC",
    serie,
  };
}
