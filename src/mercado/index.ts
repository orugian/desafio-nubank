// Mercado (spec §4.3, D-23, §6.1). snapshotGravado no B3b; buscarAoVivo no B3c (P1).

import Decimal from "decimal.js";
import {
  dataExiste,
  erro,
  esquemaSerieCdi,
  esquemaSerieFechamentos,
  esquemaSnapshotMercado,
  esquemaTaxaTexto,
  textos,
  type ResultadoDominio,
  type SnapshotMercado,
} from "@/contratos";
import cdiBruto from "../../dados/mercado/cdi.json";
import btcBruto from "../../dados/mercado/fechamentos-BTC.json";
import petr4Bruto from "../../dados/mercado/fechamentos-PETR4.json";

const cdi = esquemaSerieCdi.parse(cdiBruto);
const petr4 = esquemaSerieFechamentos.parse(petr4Bruto);
const btc = esquemaSerieFechamentos.parse(btcBruto);

/** Valores gravados em `dados/mercado/`, com `ao_vivo: false` e a data. */
export function snapshotGravado(): SnapshotMercado {
  const ultimoCdi = [...cdi.serie].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;
  const ultimoPetr4 = [...petr4.serie].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;
  const ultimoBtc = [...btc.serie].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;

  return esquemaSnapshotMercado.parse({
    ao_vivo: false,
    obtido_em: cdi.obtido_em,
    tentou_ao_vivo: false,
    cdi: {
      taxa_diaria_pct: ultimoCdi.taxa_diaria_pct,
      data_ref: ultimoCdi.data,
      fonte: cdi.fonte,
    },
    precos: {
      [petr4.ticker]: {
        preco_centavos: ultimoPetr4.preco_centavos,
        data_hora: `${ultimoPetr4.data}T18:00:00-03:00`,
        fonte: petr4.fonte,
      },
      [btc.ticker]: {
        preco_centavos: ultimoBtc.preco_centavos,
        data_hora: `${ultimoBtc.data}T21:00:00-03:00`,
        fonte: btc.fonte,
      },
    },
  });
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<Response>;
export type OpcoesAoVivo = {
  timeout_ms: number;
  fetch?: FetchLike;
  ativo?: boolean;
  brapi_token?: string;
  /** Relógio injetado só para testes; permitido aqui pois é TTL de cache de rede, não data de negócio. */
  agora_ms?: () => number;
};

export const TTL_CACHE_MERCADO_MS = 60_000;
type EntradaCache = { expira_em: number; corpo: unknown };
const cacheMercado = new Map<string, EntradaCache>();
export function limparCacheMercado(): void { cacheMercado.clear(); }

async function obterJsonComCache(
  url: string,
  headers: Record<string, string> | undefined,
  fetchFn: FetchLike,
  timeoutMs: number,
  agoraMs: () => number,
): Promise<any> {
  const agora = agoraMs();
  const entrada = cacheMercado.get(url);
  if (entrada) {
    if (entrada.expira_em > agora) {
      return entrada.corpo;
    }
    cacheMercado.delete(url);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { headers, signal: controller.signal });
    if (!res.ok) {
      return null;
    }
    const corpo = await res.json();
    cacheMercado.set(url, {
      expira_em: agora + TTL_CACHE_MERCADO_MS,
      corpo,
    });
    return corpo;
  } finally {
    clearTimeout(timer);
  }
}

export type CotacaoBruta = {
  ticker: string;
  nome: string | null;
  tipo: "acao" | "cripto";
  preco_centavos: number;
  variacao_dia_pct: string | null;
  data_hora: string;
  fonte: string;
  ao_vivo: boolean;
};

export const CRIPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
};

/** Converte ISO UTC ou epoch seconds para data/hora de Brasília (UTC-3 fixo) por aritmética. */
export function converterParaIsoBrasilia(timestamp: string | number): string {
  const epochMs =
    typeof timestamp === "number"
      ? timestamp < 1e11
        ? timestamp * 1000
        : timestamp
      : Date.parse(timestamp);

  if (Number.isNaN(epochMs)) {
    throw new Error(`Data/hora inválida: ${String(timestamp)}`);
  }

  const ms = epochMs - 3 * 3600 * 1000;
  const d = new Date(ms);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const horas = String(d.getUTCHours()).padStart(2, "0");
  const minutos = String(d.getUTCMinutes()).padStart(2, "0");
  const segundos = String(d.getUTCSeconds()).padStart(2, "0");
  return `${ano}-${mes}-${dia}T${horas}:${minutos}:${segundos}-03:00`;
}

/** Tenta o ao vivo uma vez; em timeout ou erro devolve o gravado com `tentou_ao_vivo: true` (F-07). Ligado por padrão (salvo MERCADO_AO_VIVO="0"). */
export async function buscarAoVivo(opcoes: OpcoesAoVivo): Promise<SnapshotMercado> {
  const ativo = opcoes.ativo !== undefined ? opcoes.ativo : process.env.MERCADO_AO_VIVO !== "0";
  if (!ativo) {
    throw new Error("mercado ao vivo desativado");
  }

  const fetchFn = opcoes.fetch ?? globalThis.fetch;
  const brapiToken = opcoes.brapi_token ?? process.env.BRAPI_TOKEN;
  const timeoutMs = opcoes.timeout_ms;
  const agoraMs = opcoes.agora_ms ?? Date.now;
  const gravado = snapshotGravado();

  // 1. BCB
  const buscarBcb = async (): Promise<{ cdi: SnapshotMercado["cdi"] } | null> => {
    try {
      const url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json";
      const json = await obterJsonComCache(url, undefined, fetchFn, timeoutMs, agoraMs);
      if (!Array.isArray(json) || json.length === 0) return null;
      const item = json[0];
      if (!item || typeof item !== "object") return null;
      const dataStr = String(item.data ?? "");
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataStr);
      if (!match) return null;
      const dataRef = `${match[3]}-${match[2]}-${match[1]}`;
      if (!dataExiste(dataRef)) return null;
      const valorStr = String(item.valor ?? "").trim();
      if (!esquemaTaxaTexto.safeParse(valorStr).success) return null;
      return {
        cdi: {
          taxa_diaria_pct: valorStr,
          data_ref: dataRef,
          fonte: "BCB SGS 12",
        },
      };
    } catch {
      return null;
    }
  };

  // 2. brapi (PETR4)
  const buscarBrapiPetr4 = async (): Promise<{
    preco: { preco_centavos: number; data_hora: string; fonte: string };
    data_hora: string;
  } | null> => {
    try {
      const url = "https://brapi.dev/api/quote/PETR4";
      const headers = brapiToken ? { Authorization: `Bearer ${brapiToken}` } : undefined;
      const json = await obterJsonComCache(url, headers, fetchFn, timeoutMs, agoraMs);
      const item = json?.results?.[0];
      if (!item || typeof item !== "object") return null;
      if (typeof item.regularMarketPrice !== "number" || Number.isNaN(item.regularMarketPrice) || item.regularMarketPrice <= 0) {
        return null;
      }
      const precoCentavos = new Decimal(String(item.regularMarketPrice))
        .mul(100)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
      if (precoCentavos <= 0) return null;
      const dataHora = converterParaIsoBrasilia(item.regularMarketTime);
      return {
        preco: {
          preco_centavos: precoCentavos,
          data_hora: dataHora,
          fonte: "brapi",
        },
        data_hora: dataHora,
      };
    } catch {
      return null;
    }
  };

  // 3. CoinGecko (BTC)
  const buscarCoinGeckoBtc = async (): Promise<{
    preco: { preco_centavos: number; data_hora: string; fonte: string };
    data_hora: string;
  } | null> => {
    try {
      const url =
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true&include_last_updated_at=true";
      const json = await obterJsonComCache(url, undefined, fetchFn, timeoutMs, agoraMs);
      const btcInfo = json?.bitcoin;
      if (!btcInfo || typeof btcInfo !== "object") return null;
      if (typeof btcInfo.brl !== "number" || Number.isNaN(btcInfo.brl) || btcInfo.brl <= 0) {
        return null;
      }
      const precoCentavos = new Decimal(String(btcInfo.brl))
        .mul(100)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
      if (precoCentavos <= 0) return null;
      if (typeof btcInfo.last_updated_at !== "number") return null;
      const dataHora = converterParaIsoBrasilia(btcInfo.last_updated_at);
      return {
        preco: {
          preco_centavos: precoCentavos,
          data_hora: dataHora,
          fonte: "CoinGecko",
        },
        data_hora: dataHora,
      };
    } catch {
      return null;
    }
  };

  const [resCdi, resPetr4, resBtc] = await Promise.all([
    buscarBcb(),
    buscarBrapiPetr4(),
    buscarCoinGeckoBtc(),
  ]);

  const algumaFonteSucesso = resCdi !== null || resPetr4 !== null || resBtc !== null;
  if (!algumaFonteSucesso) {
    return esquemaSnapshotMercado.parse({
      ...gravado,
      tentou_ao_vivo: true,
      ao_vivo: false,
    });
  }

  const datasHorasObtidas: string[] = [];
  if (resPetr4) datasHorasObtidas.push(resPetr4.data_hora);
  if (resBtc) datasHorasObtidas.push(resBtc.data_hora);

  const obtidoEm =
    datasHorasObtidas.length > 0
      ? [...datasHorasObtidas].sort().at(-1)!
      : gravado.obtido_em;

  const novoSnapshot: SnapshotMercado = {
    ao_vivo: true,
    tentou_ao_vivo: true,
    obtido_em: obtidoEm,
    cdi: resCdi ? resCdi.cdi : gravado.cdi,
    precos: {
      ...gravado.precos,
      ...(resPetr4 ? { PETR4: resPetr4.preco } : {}),
      ...(resBtc ? { BTC: resBtc.preco } : {}),
    },
  };

  return esquemaSnapshotMercado.parse(novoSnapshot);
}

/** Busca cotação ao vivo com fallback gravado. Ligado por padrão (salvo MERCADO_AO_VIVO="0"). */
export async function buscarCotacao(
  ticker: string,
  opcoes: OpcoesAoVivo,
  mercado: SnapshotMercado,
): Promise<ResultadoDominio<{ cotacao: CotacaoBruta }>> {
  const tickerNormalizado = ticker.trim().toUpperCase();
  const ativo = opcoes.ativo !== undefined ? opcoes.ativo : process.env.MERCADO_AO_VIVO !== "0";
  const fetchFn = opcoes.fetch ?? globalThis.fetch;
  const brapiToken = opcoes.brapi_token ?? process.env.BRAPI_TOKEN;
  const timeoutMs = opcoes.timeout_ms;
  const agoraMs = opcoes.agora_ms ?? Date.now;

  if (ativo && tickerNormalizado.length > 0) {
    if (tickerNormalizado in CRIPTO_IDS) {
      const id = CRIPTO_IDS[tickerNormalizado];
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=brl&include_24hr_change=true&include_last_updated_at=true`;
      try {
        const json = await obterJsonComCache(url, undefined, fetchFn, timeoutMs, agoraMs);
        if (json) {
          const info = json?.[id];
          if (info && typeof info.brl === "number" && !Number.isNaN(info.brl) && info.brl > 0) {
            const precoCentavos = new Decimal(String(info.brl))
              .mul(100)
              .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
              .toNumber();
            if (precoCentavos > 0 && typeof info.last_updated_at === "number") {
              const dataHora = converterParaIsoBrasilia(info.last_updated_at);
              let variacaoDiaPct: string | null = null;
              if (typeof info.brl_24h_change === "number" && !Number.isNaN(info.brl_24h_change)) {
                variacaoDiaPct = new Decimal(String(info.brl_24h_change))
                  .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                  .toFixed(2);
              }
              return {
                ok: true,
                cotacao: {
                  ticker: tickerNormalizado,
                  nome: null,
                  tipo: "cripto",
                  preco_centavos: precoCentavos,
                  variacao_dia_pct: variacaoDiaPct,
                  data_hora: dataHora,
                  fonte: "CoinGecko",
                  ao_vivo: true,
                },
              };
            }
          }
        }
      } catch {
        // Falha ignorada, segue para fallback
      }
    } else {
      const url = `https://brapi.dev/api/quote/${tickerNormalizado}`;
      const headers = brapiToken ? { Authorization: `Bearer ${brapiToken}` } : undefined;
      try {
        const json = await obterJsonComCache(url, headers, fetchFn, timeoutMs, agoraMs);
        if (json) {
          const item = json?.results?.[0];
          if (item && typeof item.regularMarketPrice === "number" && !Number.isNaN(item.regularMarketPrice) && item.regularMarketPrice > 0) {
            const precoCentavos = new Decimal(String(item.regularMarketPrice))
              .mul(100)
              .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
              .toNumber();
            if (precoCentavos > 0) {
              const dataHora = converterParaIsoBrasilia(item.regularMarketTime);
              let variacaoDiaPct: string | null = null;
              if (typeof item.regularMarketChangePercent === "number" && !Number.isNaN(item.regularMarketChangePercent)) {
                variacaoDiaPct = new Decimal(String(item.regularMarketChangePercent))
                  .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                  .toFixed(2);
              }
              const nomeBruto = item.longName ?? item.shortName ?? null;
              const nome = typeof nomeBruto === "string" && nomeBruto.trim().length > 0 ? nomeBruto.trim() : null;
              return {
                ok: true,
                cotacao: {
                  ticker: tickerNormalizado,
                  nome,
                  tipo: "acao",
                  preco_centavos: precoCentavos,
                  variacao_dia_pct: variacaoDiaPct,
                  data_hora: dataHora,
                  fonte: "brapi",
                  ao_vivo: true,
                },
              };
            }
          }
        }
      } catch {
        // Falha ignorada, segue para fallback
      }
    }
  }

  // Fallback: se desativado ou se a consulta ao vivo falhou
  const gravado = mercado.precos[tickerNormalizado];
  if (gravado) {
    return {
      ok: true,
      cotacao: {
        ticker: tickerNormalizado,
        nome: null,
        tipo: tickerNormalizado in CRIPTO_IDS ? "cripto" : "acao",
        preco_centavos: gravado.preco_centavos,
        variacao_dia_pct: null,
        data_hora: gravado.data_hora,
        fonte: gravado.fonte,
        ao_vivo: mercado.ao_vivo,
      },
    };
  }

  return erro("COTACAO_INDISPONIVEL", textos.erros.COTACAO_INDISPONIVEL, ["ticker"]);
}
