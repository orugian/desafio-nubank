import { beforeEach, describe, expect, test, vi } from "vitest";
import { esquemaSnapshotMercado, textos } from "@/contratos";
import {
  CRIPTO_IDS,
  TTL_CACHE_MERCADO_MS,
  buscarAoVivo,
  buscarCotacao,
  converterParaIsoBrasilia,
  limparCacheMercado,
  snapshotGravado,
  type FetchLike,
} from "./index";

beforeEach(() => {
  limparCacheMercado();
});

describe("T2 · mercado ao vivo (ao-vivo.test.ts)", () => {
  test("1: ativo: false → rejeita sem chamar o fetch", async () => {
    const fetchSpy = vi.fn();
    await expect(
      buscarAoVivo({ timeout_ms: 1000, ativo: false, fetch: fetchSpy }),
    ).rejects.toThrow("mercado ao vivo desativado");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("2: ativo: true com 3 fontes OK → ao_vivo true, valores corretos e passa no esquema", async () => {
    const fetchFalso: FetchLike = async (url) => {
      if (url.includes("bcb.gov.br")) {
        return new Response(
          JSON.stringify([{ data: "30/10/2026", valor: "0.051234" }]),
          { status: 200 },
        );
      }
      if (url.includes("brapi.dev")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "PETR4",
                longName: "Petróleo Brasileiro S.A.",
                regularMarketPrice: 38.47,
                regularMarketChangePercent: 1.5,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("coingecko.com")) {
        return new Response(
          JSON.stringify({
            bitcoin: {
              brl: 612345.678,
              brl_24h_change: 2.1,
              last_updated_at: 1793365200,
            },
          }),
          { status: 200 },
        );
      }
      throw new Error(`URL desconhecida: ${url}`);
    };

    const snap = await buscarAoVivo({
      timeout_ms: 1000,
      ativo: true,
      fetch: fetchFalso,
    });

    expect(snap.ao_vivo).toBe(true);
    expect(snap.tentou_ao_vivo).toBe(true);

    // CDI falso do BCB
    expect(snap.cdi).toEqual({
      taxa_diaria_pct: "0.051234",
      data_ref: "2026-10-30",
      fonte: "BCB SGS 12",
    });

    // PETR4: 38.47 * 100 = 3847 centavos
    // 13:05 UTC - 3h = 10:05 UTC-3 -> 2026-10-30T10:05:00-03:00
    expect(snap.precos.PETR4).toEqual({
      preco_centavos: 3847,
      data_hora: "2026-10-30T10:05:00-03:00",
      fonte: "brapi",
    });

    // BTC: 612345.678 * 100 = 61234567.8 -> round half-up = 61234568 centavos
    // 1793365200 s = 2026-10-30T13:00:00Z -> 13:00 UTC - 3h = 10:00 UTC-3 -> 2026-10-30T10:00:00-03:00
    const dataHoraBtcEsperada = converterParaIsoBrasilia(1793365200);
    expect(dataHoraBtcEsperada).toBe("2026-10-30T10:00:00-03:00");
    expect(snap.precos.BTC).toEqual({
      preco_centavos: 61234568,
      data_hora: "2026-10-30T10:00:00-03:00",
      fonte: "CoinGecko",
    });

    // Mais recente entre 10:05:00 e 10:00:00 é 10:05:00
    expect(snap.obtido_em).toBe("2026-10-30T10:05:00-03:00");

    // Valida com esquema
    expect(() => esquemaSnapshotMercado.parse(snap)).not.toThrow();
  });

  test("3: brapi falha (status 500), outras OK → PETR4 continua gravado, ao_vivo true", async () => {
    const gravado = snapshotGravado();
    const fetchFalso: FetchLike = async (url) => {
      if (url.includes("bcb.gov.br")) {
        return new Response(
          JSON.stringify([{ data: "30/10/2026", valor: "0.051234" }]),
          { status: 200 },
        );
      }
      if (url.includes("brapi.dev")) {
        return new Response("Internal Server Error", { status: 500 });
      }
      if (url.includes("coingecko.com")) {
        return new Response(
          JSON.stringify({
            bitcoin: {
              brl: 612345.678,
              brl_24h_change: 2.1,
              last_updated_at: 1793365200,
            },
          }),
          { status: 200 },
        );
      }
      throw new Error(`URL desconhecida: ${url}`);
    };

    const snap = await buscarAoVivo({
      timeout_ms: 1000,
      ativo: true,
      fetch: fetchFalso,
    });

    expect(snap.ao_vivo).toBe(true);
    expect(snap.tentou_ao_vivo).toBe(true);
    expect(snap.precos.PETR4).toEqual(gravado.precos.PETR4);
    expect(snap.precos.BTC.preco_centavos).toBe(61234568);
    expect(snap.cdi.taxa_diaria_pct).toBe("0.051234");
    expect(() => esquemaSnapshotMercado.parse(snap)).not.toThrow();
  });

  test("4: todas falham / fetch lança → igual ao gravado mas tentou_ao_vivo true e ao_vivo false", async () => {
    const gravado = snapshotGravado();
    const fetchFalha: FetchLike = async () => {
      throw new Error("Falha total de rede");
    };

    const snap = await buscarAoVivo({
      timeout_ms: 1000,
      ativo: true,
      fetch: fetchFalha,
    });

    expect(snap).toEqual({
      ...gravado,
      tentou_ao_vivo: true,
      ao_vivo: false,
    });
    expect(() => esquemaSnapshotMercado.parse(snap)).not.toThrow();
  });

  test("5: timeout: fetch que respeita o signal e nunca resolve → com timeout_ms: 20 termina com gravado + tentou_ao_vivo true", async () => {
    const gravado = snapshotGravado();
    const fetchLento: FetchLike = async (_url, init) => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    };

    const snap = await buscarAoVivo({
      timeout_ms: 20,
      ativo: true,
      fetch: fetchLento,
    });

    expect(snap).toEqual({
      ...gravado,
      tentou_ao_vivo: true,
      ao_vivo: false,
    });
    expect(() => esquemaSnapshotMercado.parse(snap)).not.toThrow();
  });

  test("6: token: com brapi_token: 'tok' cabeçalho Authorization é 'Bearer tok' e URL sem 'tok'; sem token, sem Authorization", async () => {
    const chamadasBrapi: { url: string; headers?: Record<string, string> }[] = [];
    const fetchCaptura: FetchLike = async (url, init) => {
      if (url.includes("brapi.dev")) {
        chamadasBrapi.push({ url, headers: init?.headers });
      }
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    };

    // Com token
    await buscarAoVivo({
      timeout_ms: 500,
      ativo: true,
      fetch: fetchCaptura,
      brapi_token: "tok",
    });
    expect(chamadasBrapi.length).toBeGreaterThanOrEqual(1);
    const chamadaComToken = chamadasBrapi[0];
    expect(chamadaComToken.headers?.Authorization).toBe("Bearer tok");
    expect(chamadaComToken.url).not.toContain("tok");

    // Sem token (limpa o cache para forçar nova requisição e observar os cabeçalhos)
    chamadasBrapi.length = 0;
    limparCacheMercado();
    const oldToken = process.env.BRAPI_TOKEN;
    delete process.env.BRAPI_TOKEN;
    try {
      await buscarAoVivo({
        timeout_ms: 500,
        ativo: true,
        fetch: fetchCaptura,
      });
      expect(chamadasBrapi.length).toBeGreaterThanOrEqual(1);
      const chamadaSemToken = chamadasBrapi[0];
      expect(chamadaSemToken.headers?.Authorization).toBeUndefined();
    } finally {
      if (oldToken !== undefined) process.env.BRAPI_TOKEN = oldToken;
    }
  });

  test("7: buscarCotacao com ações, cripto, desativado e indisponível", async () => {
    const snapGravado = snapshotGravado();
    const fetchCotacao: FetchLike = async (url) => {
      if (url.includes("brapi.dev/api/quote/VALE3")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "VALE3",
                longName: "Vale S.A.",
                regularMarketPrice: 65.4,
                regularMarketChangePercent: 1.2345,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("coingecko.com") && url.includes("ids=ethereum")) {
        return new Response(
          JSON.stringify({
            ethereum: {
              brl: 15432.1,
              brl_24h_change: -0.543,
              last_updated_at: 1793365200,
            },
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    };

    // 1. buscarCotacao("vale3", ...) -> brapi quote/VALE3, longName, 1.2345 -> "1.23"
    // 65.40 * 100 = 6540 centavos; 1.2345 arredondado 2 casas = "1.23"
    const rVale = await buscarCotacao(
      "vale3",
      { ativo: true, timeout_ms: 500, fetch: fetchCotacao },
      snapGravado,
    );
    expect(rVale.ok).toBe(true);
    if (rVale.ok) {
      expect(rVale.cotacao).toEqual({
        ticker: "VALE3",
        nome: "Vale S.A.",
        tipo: "acao",
        preco_centavos: 6540,
        variacao_dia_pct: "1.23",
        data_hora: "2026-10-30T10:05:00-03:00",
        fonte: "brapi",
        ao_vivo: true,
      });
    }

    // 2. buscarCotacao("eth", ...) -> CoinGecko ids=ethereum
    // 15432.10 * 100 = 1543210 centavos; -0.543 arredondado 2 casas = "-0.54"
    expect(CRIPTO_IDS["ETH"]).toBe("ethereum");
    const rEth = await buscarCotacao(
      "eth",
      { ativo: true, timeout_ms: 500, fetch: fetchCotacao },
      snapGravado,
    );
    expect(rEth.ok).toBe(true);
    if (rEth.ok) {
      expect(rEth.cotacao).toEqual({
        ticker: "ETH",
        nome: null,
        tipo: "cripto",
        preco_centavos: 1543210,
        variacao_dia_pct: "-0.54",
        data_hora: "2026-10-30T10:00:00-03:00",
        fonte: "CoinGecko",
        ao_vivo: true,
      });
    }

    // 3. desativado + "PETR4" -> snapshot com ao_vivo false
    const rPetr4Desativado = await buscarCotacao(
      "PETR4",
      { ativo: false, timeout_ms: 500, fetch: fetchCotacao },
      snapGravado,
    );
    expect(rPetr4Desativado.ok).toBe(true);
    if (rPetr4Desativado.ok) {
      expect(rPetr4Desativado.cotacao).toEqual({
        ticker: "PETR4",
        nome: null,
        tipo: "acao",
        preco_centavos: snapGravado.precos.PETR4.preco_centavos,
        variacao_dia_pct: null,
        data_hora: snapGravado.precos.PETR4.data_hora,
        fonte: snapGravado.precos.PETR4.fonte,
        ao_vivo: false,
      });
    }

    // 4. desativado + "VALE3" -> COTACAO_INDISPONIVEL
    const rValeDesativado = await buscarCotacao(
      "VALE3",
      { ativo: false, timeout_ms: 500, fetch: fetchCotacao },
      snapGravado,
    );
    expect(rValeDesativado.ok).toBe(false);
    if (!rValeDesativado.ok) {
      expect(rValeDesativado.erro.codigo).toBe("COTACAO_INDISPONIVEL");
      expect(rValeDesativado.erro.mensagem).toBe(textos.erros.COTACAO_INDISPONIVEL);
      expect(rValeDesativado.erro.campos).toEqual(["ticker"]);
    }
  });

  test("8: MERCADO_AO_VIVO env: '1' sem ativo usa fetch injetado; '0' não usa", async () => {
    const snapGravado = snapshotGravado();
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes("brapi.dev/api/quote/VALE3")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "VALE3",
                regularMarketPrice: 65.4,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const envOriginal = process.env.MERCADO_AO_VIVO;
    try {
      process.env.MERCADO_AO_VIVO = "1";
      const r1 = await buscarCotacao("VALE3", { timeout_ms: 500, fetch: fetchSpy }, snapGravado);
      expect(r1.ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockClear();
      process.env.MERCADO_AO_VIVO = "0";
      const r0 = await buscarCotacao("VALE3", { timeout_ms: 500, fetch: fetchSpy }, snapGravado);
      expect(r0.ok).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (envOriginal !== undefined) {
        process.env.MERCADO_AO_VIVO = envOriginal;
      } else {
        delete process.env.MERCADO_AO_VIVO;
      }
    }
  });

  test("9: T9a - duas chamadas seguidas de buscarCotacao('VALE3') → fetch chamado 1 vez; resultado igual", async () => {
    const snapGravado = snapshotGravado();
    let tempo = 1_000_000;
    const agora_ms = () => tempo;

    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes("brapi.dev/api/quote/VALE3")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "VALE3",
                longName: "Vale S.A.",
                regularMarketPrice: 65.4,
                regularMarketChangePercent: 1.23,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const res1 = await buscarCotacao(
      "VALE3",
      { ativo: true, fetch: fetchSpy, timeout_ms: 1000, agora_ms },
      snapGravado,
    );
    expect(res1.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const res2 = await buscarCotacao(
      "VALE3",
      { ativo: true, fetch: fetchSpy, timeout_ms: 1000, agora_ms },
      snapGravado,
    );
    expect(res2.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res2).toEqual(res1);
  });

  test("10: T9b - avançando agora_ms em 61_000 → fetch chamado de novo", async () => {
    const snapGravado = snapshotGravado();
    let tempo = 1_000_000;
    const agora_ms = () => tempo;

    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes("brapi.dev/api/quote/VALE3")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "VALE3",
                longName: "Vale S.A.",
                regularMarketPrice: 65.4,
                regularMarketChangePercent: 1.23,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });

    // 1ª chamada: popula cache
    const res1 = await buscarCotacao(
      "VALE3",
      { ativo: true, fetch: fetchSpy, timeout_ms: 1000, agora_ms },
      snapGravado,
    );
    expect(res1.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Avança além do TTL de 60_000 ms
    tempo += 61_000;

    // 2ª chamada: cache expirado, chama fetch de novo
    const res2 = await buscarCotacao(
      "VALE3",
      { ativo: true, fetch: fetchSpy, timeout_ms: 1000, agora_ms },
      snapGravado,
    );
    expect(res2.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("11: T9c - resposta 429 não é cacheada: primeira chamada 429 (cai no fallback/erro), segunda com 200 → usa rede e devolve ao vivo", async () => {
    const snapGravado = snapshotGravado();
    let statusHttp = 429;
    let tempo = 1_000_000;
    const agora_ms = () => tempo;

    const fetchSpy = vi.fn(async (url: string) => {
      if (statusHttp === 429) {
        return new Response("Too Many Requests", { status: 429 });
      }
      if (url.includes("brapi.dev/api/quote/VALE3")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "VALE3",
                longName: "Vale S.A.",
                regularMarketPrice: 68.5,
                regularMarketChangePercent: 2.0,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });

    // 1ª chamada: 429 não é cacheado, cai no erro COTACAO_INDISPONIVEL (VALE3 não está no gravado)
    const res1 = await buscarCotacao(
      "VALE3",
      { ativo: true, fetch: fetchSpy, timeout_ms: 1000, agora_ms },
      snapGravado,
    );
    expect(res1.ok).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Próxima resposta será 200
    statusHttp = 200;

    // 2ª chamada sem avançar tempo: deve tentar a rede novamente pois o 429 não gravou entrada
    const res2 = await buscarCotacao(
      "VALE3",
      { ativo: true, fetch: fetchSpy, timeout_ms: 1000, agora_ms },
      snapGravado,
    );
    expect(res2.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    if (res2.ok) {
      expect(res2.cotacao.preco_centavos).toBe(6850);
      expect(res2.cotacao.ao_vivo).toBe(true);
    }
  });

  test("12: T9d - buscarAoVivo duas vezes seguidas → cada uma das 3 URLs buscada 1 vez no total", async () => {
    const urlsChamadas: string[] = [];
    let tempo = 1_000_000;
    const agora_ms = () => tempo;

    const fetchSpy: FetchLike = vi.fn(async (url) => {
      urlsChamadas.push(url);
      if (url.includes("bcb.gov.br")) {
        return new Response(
          JSON.stringify([{ data: "30/10/2026", valor: "0.051234" }]),
          { status: 200 },
        );
      }
      if (url.includes("brapi.dev")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "PETR4",
                longName: "Petróleo Brasileiro S.A.",
                regularMarketPrice: 38.47,
                regularMarketChangePercent: 1.5,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("coingecko.com")) {
        return new Response(
          JSON.stringify({
            bitcoin: {
              brl: 612345.678,
              brl_24h_change: 2.1,
              last_updated_at: 1793365200,
            },
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const snap1 = await buscarAoVivo({
      timeout_ms: 1000,
      ativo: true,
      fetch: fetchSpy,
      agora_ms,
    });
    expect(snap1.ao_vivo).toBe(true);
    expect(urlsChamadas.length).toBe(3);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    const snap2 = await buscarAoVivo({
      timeout_ms: 1000,
      ativo: true,
      fetch: fetchSpy,
      agora_ms,
    });
    expect(snap2.ao_vivo).toBe(true);
    expect(urlsChamadas.length).toBe(3);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(snap2).toEqual(snap1);
  });

  test("13: T9e - buscarCotacao('BTC') logo após buscarAoVivo → não chama a CoinGecko de novo se a URL for a mesma", async () => {
    const chamadasCoinGecko: string[] = [];
    let tempo = 1_000_000;
    const agora_ms = () => tempo;

    const fetchSpy: FetchLike = vi.fn(async (url) => {
      if (url.includes("coingecko.com")) {
        chamadasCoinGecko.push(url);
        return new Response(
          JSON.stringify({
            bitcoin: {
              brl: 612345.678,
              brl_24h_change: 2.1,
              last_updated_at: 1793365200,
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("bcb.gov.br")) {
        return new Response(
          JSON.stringify([{ data: "30/10/2026", valor: "0.051234" }]),
          { status: 200 },
        );
      }
      if (url.includes("brapi.dev")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                symbol: "PETR4",
                regularMarketPrice: 38.47,
                regularMarketTime: "2026-10-30T13:05:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const snapAoVivo = await buscarAoVivo({
      timeout_ms: 1000,
      ativo: true,
      fetch: fetchSpy,
      agora_ms,
    });
    expect(snapAoVivo.ao_vivo).toBe(true);
    expect(chamadasCoinGecko.length).toBe(1);

    // As URLs de CoinGecko BTC em buscarAoVivo e buscarCotacao("BTC") coincidem:
    // https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true&include_last_updated_at=true
    // Logo, buscarCotacao reutiliza o cache sem chamar a rede.
    const resCotacao = await buscarCotacao(
      "BTC",
      { ativo: true, timeout_ms: 1000, fetch: fetchSpy, agora_ms },
      snapAoVivo,
    );
    expect(resCotacao.ok).toBe(true);
    if (resCotacao.ok) {
      expect(resCotacao.cotacao.preco_centavos).toBe(61234568);
      expect(resCotacao.cotacao.ao_vivo).toBe(true);
    }
    expect(chamadasCoinGecko.length).toBe(1);
  });
});
