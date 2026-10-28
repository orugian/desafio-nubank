// Descrições das ferramentas e dos campos, enviadas ao modelo.
// A Sessão 2 pode editar este arquivo no B6 sem pedido de contrato.
// Nomes de ferramentas e de campos NÃO mudam aqui (estão em ferramentas.ts).

import type { NomeFerramenta } from "./ferramentas";

export const descricoesFerramentas: Record<NomeFerramenta, string> = {
  consultar_historico:
    "Consulta lançamentos dos últimos 3 meses (30/07 a 29/10/2026), com filtros e agrupamento. Somente leitura.",
  consultar_cartao:
    "Mostra o cartão de crédito: fatura fechada, fatura aberta e próximas faturas com parcelas. Somente leitura.",
  consultar_investimentos:
    "Mostra cada investimento: valor atual, aplicado, rentabilidade bruta, disponibilidade e proteção, classificado até uma data. Sem ate_data, usa a data da falta mais próxima. Somente leitura; não recomenda nada. Não chame esta ferramenta se a pessoa apenas pedir recomendação de onde investir.",
  projetar_rendimento:
    "Calcula o rendimento bruto estimado de um valor em produto atrelado ao CDI até uma data (no máximo 2026-11-29), com CDI constante. Informe destino (id da posição) ou cdi_pct.",
  registrar_declaracao:
    "Registra um fato afirmado pela pessoa que muda a situação atual (ex.: valor ou data de um compromisso). Use alterar_evento com o id do evento para correções.",
  criar_hipotese:
    "Cria um cenário \"e se\" sobre a situação atual ou sobre outra hipótese (a_partir_de). Use para \"posso separar…?\", \"e se…?\" e \"simular\". Não altera a situação atual.",
  desfazer: "Remove uma declaração (D<n>) ou uma hipótese (H<n>). O id não é reutilizado.",
  propor_movimentacao:
    "Propõe guardar dinheiro no Saldo separado ou numa caixinha, só quando a pessoa dá a ordem explícita (\"guarda\", \"separa\", \"coloca na caixinha\"). Cria uma proposta pendente que precisa de confirmação. Movimentação simulada.",
  confirmar_movimentacao:
    "Confirma a movimentação simulada pendente com o operacao_id dela. Só use depois de a pessoa confirmar.",
  cancelar_movimentacao: "Cancela a movimentação simulada pendente com o operacao_id dela.",
  exibir_comparacao: "Anexa à resposta a comparação dos cenários ativos.",
  preparar_resumo_atendimento:
    "Prepara um rascunho de resumo para o atendimento humano. O rascunho não é enviado.",
};

/** Descrições de campos reutilizados nos esquemas das ferramentas. */
export const descricoesCampos = {
  valor: "Valor em reais, texto com ponto decimal e sem separador de milhar. Ex.: \"500\", \"12.50\".",
  valor_por_dia: "Gasto diário em reais, texto com ponto decimal. Ex.: \"10\".",
  data: "Data AAAA-MM-DD. Hoje é 2026-10-30; a projeção vai até 2026-11-29.",
  evento_id: "Id do evento como aparece no contexto (ex.: \"C\", \"R1\", \"E2\", \"D1\", \"H1.1\").",
  meio: "Meio de pagamento. Saídas: pix, debito, boleto, debito_automatico, cartao_credito. Entradas: pix, transferencia, salario. Se a pessoa não disse, pergunte.",
  parcelas: "Número de parcelas (1 a 12), só com cartao_credito.",
  confirmar_nao_duplicado: "true só depois de a pessoa confirmar que é outro gasto, diferente do item já existente.",
  a_partir_de: "\"atual\" ou o id da hipótese de origem (ex.: \"H1\").",
  destino: "Id da posição de destino (ex.: \"SEP\", \"INV9\").",
  ate_data: "Data AAAA-MM-DD até a qual classificar ou projetar (no máximo 2026-11-29).",
  operacao_id: "Id da operação pendente (ex.: \"OP1\").",
  alvo_id: "Id da declaração (D<n>) ou da hipótese (H<n>).",
} as const;
