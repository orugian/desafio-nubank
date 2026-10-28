import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  NOMES_FERRAMENTAS,
  VERSAO_CONTRATOS,
  descricoesFerramentas,
  textos,
  type Config,
  type DepsConversa,
  type Provedor,
  type SnapshotMercado,
} from "@/contratos";
import { snapshotGravado as snapshotGravadoModulo, buscarAoVivo as buscarAoVivoModulo } from "@/mercado";
import { criarExecutores } from "./executores";
import { criarProvedor, type ConfigProvedor } from "./provedor";
import cdiJson from "../../dados/mercado/cdi.json";
import btcJson from "../../dados/mercado/fechamentos-BTC.json";
import petr4Json from "../../dados/mercado/fechamentos-PETR4.json";

export async function lerInstrucoes(): Promise<string> {
  const caminho = join(process.cwd(), "instrucoes.md");
  return readFile(caminho, "utf8");
}

export function obterSnapshotFallback(): SnapshotMercado {
  try {
    return snapshotGravadoModulo();
  } catch {
    const ultimoCdi = cdiJson.serie.at(-1) ?? { data: "2026-10-27", taxa_diaria_pct: "0.050788" };
    const ultimoPetr4 = petr4Json.serie.at(-1) ?? { data: "2026-10-27", preco_centavos: 5279 };
    const ultimoBtc = btcJson.serie.at(-1) ?? { data: "2026-10-27", preco_centavos: 43008618 };
    return {
      ao_vivo: false,
      obtido_em: cdiJson.obtido_em,
      tentou_ao_vivo: false,
      cdi: {
        taxa_diaria_pct: ultimoCdi.taxa_diaria_pct,
        data_ref: ultimoCdi.data,
        fonte: cdiJson.fonte,
      },
      precos: {
        PETR4: {
          preco_centavos: ultimoPetr4.preco_centavos,
          data_hora: `${ultimoPetr4.data}T18:00:00-03:00`,
          fonte: petr4Json.fonte,
        },
        BTC: {
          preco_centavos: ultimoBtc.preco_centavos,
          data_hora: `${ultimoBtc.data}T21:00:00-03:00`,
          fonte: btcJson.fonte,
        },
      },
    };
  }
}

export function criarDepsPadrao(configProvedor?: ConfigProvedor): DepsConversa {
  const provedor = criarProvedor(configProvedor);
  const executores = criarExecutores();
  return {
    provedor,
    executores,
    mercado: {
      snapshotGravado: obterSnapshotFallback,
      async buscarAoVivo(opcoes) {
        try {
          return await buscarAoVivoModulo(opcoes);
        } catch {
          return obterSnapshotFallback();
        }
      },
    },
    instrucoes: lerInstrucoes,
  };
}

export function montarConfig(
  provedor: Provedor,
  instrucoes: string,
  mercado: SnapshotMercado,
): Config {
  return {
    versao_contratos: VERSAO_CONTRATOS,
    provedor: provedor.nome,
    modelo: provedor.modelo,
    instrucoes,
    ferramentas: NOMES_FERRAMENTAS.map((nome) => ({
      nome,
      descricao: descricoesFerramentas[nome],
    })),
    regras_fixas: [...textos.regras_fixas],
    fontes_mercado: [
      {
        nome: "BCB SGS 12",
        url: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados",
        uso: "CDI diário",
        obtido_em: mercado.obtido_em,
      },
      {
        nome: "brapi",
        url: "https://brapi.dev/api/quote/PETR4",
        uso: "fechamentos de ação",
        obtido_em: mercado.obtido_em,
      },
      {
        nome: "CoinGecko",
        url: "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart",
        uso: "bitcoin em reais",
        obtido_em: mercado.obtido_em,
      },
    ],
    modo: process.env.MODO === "publico" ? "publico" : "local",
  };
}

export function verificarCodigoAcesso(codigoInformado?: string): boolean {
  if (process.env.MODO !== "publico") return true;
  const esperado = process.env.CODIGO_ACESSO ?? "";
  return Boolean(esperado && codigoInformado === esperado);
}
