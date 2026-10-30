import { z } from "zod";
import {
  esquemaCategoria,
  esquemaCdiPct,
  esquemaCentavos,
  esquemaCentavosNaoNegativos,
  esquemaCentavosPositivos,
  esquemaData,
  esquemaIdFatura,
  esquemaIdLancamento,
  esquemaIdOperacao,
  esquemaIdParcelamento,
  esquemaIdPosicao,
  esquemaMeioInformado,
  esquemaPercentualTexto,
  esquemaProtecao,
  esquemaQuantidade,
  esquemaTaxaTexto,
  esquemaTipoEvento,
} from "./comum";
import { esquemaResultadoCenario } from "./cenario";
import { esquemaLancamento } from "./persona";
import { esquemaOperacaoExecutada, esquemaOperacaoPendente } from "./estado";
import { esquemaSnapshotMercado } from "./mercado";

const CATEGORIAS_POSICAO = [
  "saldo_separado",
  "caixinha",
  "cdb_liquidez_diaria",
  "cdb_vencimento",
  "fundo",
  "acao",
  "cripto",
] as const;
export const esquemaCategoriaPosicao = z.enum(CATEGORIAS_POSICAO);

// ---------------------------------------------------------------------------
// Investimentos (I-01 a I-10)
// ---------------------------------------------------------------------------

/** I-07. */
export const CLASSIFICACOES = ["protegida", "nao_resgatavel_ate_data", "resgatavel_ate_data"] as const;

export const esquemaPosicaoAvaliada = z.object({
  posicao_id: esquemaIdPosicao,
  nome: z.string().min(1),
  categoria: esquemaCategoriaPosicao,
  cdi_pct: esquemaCdiPct.nullable(),
  ticker: z.string().min(1).nullable(),
  quantidade: esquemaQuantidade.nullable(),
  aplicado_centavos: esquemaCentavosNaoNegativos,
  valor_atual_centavos: esquemaCentavosNaoNegativos,
  resultado_centavos: esquemaCentavos,
  /** I-05; "0.00" quando aplicado = 0. */
  rentabilidade_pct: esquemaPercentualTexto,
  /** I-06; só renda variável. */
  valorizacao_periodo_pct: esquemaPercentualTexto.nullable(),
  data_disponibilidade: esquemaData,
  classificacao: z.enum(CLASSIFICACOES),
  protegido_centavos: esquemaCentavosNaoNegativos,
  nao_resgatavel_centavos: esquemaCentavosNaoNegativos,
  resgatavel_centavos: esquemaCentavosNaoNegativos,
  protecao: esquemaProtecao,
  restricao: z.string().min(1).nullable(),
  /** Renda variável: valor estimado pela cotação (I-04). */
  estimado: z.boolean(),
  /** Ex.: "estimado com cotação de 27/10 18:00 (brapi)". */
  rotulo_estimativa: z.string().min(1).nullable(),
  /** Ex.: "BCB SGS 12, gravado em 28/10". */
  fonte: z.string().min(1),
});
export type PosicaoAvaliada = z.infer<typeof esquemaPosicaoAvaliada>;

export const esquemaResultadoInvestimentos = z.object({
  ate_data: esquemaData,
  /** I-10: de onde veio a data quando não informada. */
  ate_data_origem: z.enum(["informada", "falta_mais_proxima", "saldo_minimo"]),
  posicoes: z.array(esquemaPosicaoAvaliada),
  totais: z.object({
    valor_total_centavos: esquemaCentavosNaoNegativos,
    protegido_centavos: esquemaCentavosNaoNegativos,
    nao_resgatavel_centavos: esquemaCentavosNaoNegativos,
    resgatavel_centavos: esquemaCentavosNaoNegativos,
  }),
  /** "bruto, antes de IR, IOF e custos; não anualizado". */
  rotulo_rentabilidade: z.string().min(1),
  /** Data da última taxa de CDI usada (I-03: dia sem taxa usa a última conhecida). */
  cdi_data_ref: esquemaData,
  mercado: esquemaSnapshotMercado,
});
export type ResultadoInvestimentos = z.infer<typeof esquemaResultadoInvestimentos>;

/** I-08. */
export const esquemaResultadoProjecao = z.object({
  valor_centavos: esquemaCentavosPositivos,
  cdi_pct: esquemaCdiPct,
  ate_data: esquemaData,
  dias_uteis: z.int().nonnegative(),
  taxa_diaria_pct: esquemaTaxaTexto,
  cdi_data_ref: esquemaData,
  rendimento_bruto_centavos: esquemaCentavosNaoNegativos,
  /** "bruto, CDI constante". */
  rotulo: z.string().min(1),
  destino: z.object({ posicao_id: esquemaIdPosicao, nome: z.string().min(1) }).nullable(),
});
export type ResultadoProjecao = z.infer<typeof esquemaResultadoProjecao>;

// ---------------------------------------------------------------------------
// Histórico (H-02 a H-04)
// ---------------------------------------------------------------------------

export const esquemaFiltroHistorico = z.object({
  de: esquemaData.optional(),
  ate: esquemaData.optional(),
  tipo: esquemaTipoEvento.optional(),
  meio: esquemaMeioInformado.optional(),
  categoria: esquemaCategoria.optional(),
  busca: z.string().min(1).max(60).optional(),
  agrupar_por: z.enum(["categoria", "mes", "semana", "nenhum"]).optional(),
});
export type FiltroHistorico = z.infer<typeof esquemaFiltroHistorico>;

export const esquemaResultadoHistorico = z.object({
  filtro: esquemaFiltroHistorico,
  /** Período efetivo consultado. */
  de: esquemaData,
  ate: esquemaData,
  quantidade: z.int().nonnegative(),
  total_saidas_centavos: esquemaCentavosNaoNegativos,
  total_entradas_centavos: esquemaCentavosNaoNegativos,
  saldo_centavos: esquemaCentavos,
  /** Vazio quando `agrupar_por` ausente ou `nenhum`. Semana: chave = segunda-feira (H-04). */
  grupos: z.array(
    z.object({
      chave: z.string().min(1),
      rotulo: z.string().min(1),
      quantidade: z.int().nonnegative(),
      total_saidas_centavos: esquemaCentavosNaoNegativos,
      total_entradas_centavos: esquemaCentavosNaoNegativos,
      saldo_centavos: esquemaCentavos,
    }),
  ),
  /** Até 20 itens mais recentes. */
  itens: z.array(esquemaLancamento).max(20),
});
export type ResultadoHistorico = z.infer<typeof esquemaResultadoHistorico>;

// ---------------------------------------------------------------------------
// Cartão (C-01 a C-07)
// ---------------------------------------------------------------------------

export const esquemaItemFaturaVisao = z.object({
  lancamento_id: esquemaIdLancamento.nullable(),
  data: esquemaData.nullable(),
  descricao: z.string().min(1),
  valor_centavos: esquemaCentavosPositivos,
  parcelamento_id: esquemaIdParcelamento.nullable(),
  /** "k/n". */
  parcela: z.string().regex(/^\d{1,2}\/\d{1,2}$/).nullable(),
  origem: z.enum(["dados_base", "declaracao"]),
});

export const esquemaFaturaVisao = z.object({
  fatura_id: esquemaIdFatura,
  fechamento: esquemaData,
  vencimento: esquemaData,
  status: z.enum(["fechada", "aberta", "futura"]),
  valor_centavos: esquemaCentavosNaoNegativos,
  itens: z.array(esquemaItemFaturaVisao),
});
export type FaturaVisao = z.infer<typeof esquemaFaturaVisao>;

/** `consultarCartao` e `VisaoApp.cartao` (null para persona sem cartão). */
export const esquemaCartaoVisao = z.object({
  limite_centavos: esquemaCentavosPositivos,
  dia_fechamento: z.int().min(1).max(31),
  dia_vencimento: z.int().min(1).max(31),
  fatura_fechada: esquemaFaturaVisao.nullable(),
  fatura_aberta: esquemaFaturaVisao,
  proximas: z.array(esquemaFaturaVisao),
});
export type CartaoVisao = z.infer<typeof esquemaCartaoVisao>;

/** `alocarCompra` (C-02, C-03). */
export const esquemaAlocacaoCompra = z.object({
  parcelas: z
    .array(
      z.object({
        numero: z.int().min(1).max(12),
        fatura_id: esquemaIdFatura,
        fechamento: esquemaData,
        vencimento: esquemaData,
        valor_centavos: esquemaCentavosPositivos,
      }),
    )
    .min(1),
});
export type AlocacaoCompra = z.infer<typeof esquemaAlocacaoCompra>;

/** `verificarDuplicidade` (C-07). */
export const esquemaItemDuplicado = z.object({
  fonte: z.enum(["fatura", "lancamento"]),
  fatura_id: esquemaIdFatura.nullable(),
  vencimento: esquemaData.nullable(),
  lancamento_id: esquemaIdLancamento.nullable(),
  data: esquemaData.nullable(),
  descricao: z.string().min(1),
  valor_centavos: esquemaCentavosPositivos,
});
export type ItemDuplicado = z.infer<typeof esquemaItemDuplicado>;
export type ResultadoDuplicidade = { duplicado: false } | { duplicado: true; itens: ItemDuplicado[] };

// ---------------------------------------------------------------------------
// Operações simuladas (§5.5)
// ---------------------------------------------------------------------------

export const esquemaDestinoOperacao = z.object({
  posicao_id: esquemaIdPosicao,
  nome: z.string().min(1),
  /** Destino que rende (CDI): o cartão de proposta traz rendimento estimado (O-03). */
  rende: z.boolean(),
  cdi_pct: esquemaCdiPct.nullable(),
});

/** Corpo de `proporMovimentacao` quando ok (sem o estado novo). */
export const esquemaPropostaMovimentacao = z.object({
  operacao_pendente: esquemaOperacaoPendente,
  destino: esquemaDestinoOperacao,
  /** Situação atual com a saída hoje (O-03). */
  impacto: esquemaResultadoCenario,
  /** Ex.: "faltariam R$ 200,00 em 15/11"; null se não houver falta. */
  alerta: z.string().min(1).nullable(),
});

/** Corpo de `confirmarMovimentacao` quando ok (sem o estado novo). */
export const esquemaConfirmacaoMovimentacao = z.object({
  operacao: esquemaOperacaoExecutada,
  destino: esquemaDestinoOperacao,
  hipoteses_descartadas: z.array(z.string().regex(/^H\d+$/)),
  saldo_disponivel_hoje_centavos: esquemaCentavos,
});

export const esquemaIdOperacaoObj = z.object({ operacao_id: esquemaIdOperacao });
