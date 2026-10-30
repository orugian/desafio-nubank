// Descrições das ferramentas e dos campos, enviadas ao modelo.
// A Sessão 2 pode editar este arquivo no B6 sem pedido de contrato.
// Nomes de ferramentas e de campos NÃO mudam aqui (estão em ferramentas.ts).

import type { NomeFerramenta } from "./ferramentas";

export const descricoesFerramentas: Record<NomeFerramenta, string> = {
  consultar_historico:
    "Consulta lançamentos dos últimos 6 meses (30/04 a 29/10/2026), com filtros e agrupamento. Somente leitura. Devolve também saldo_centavos (entradas − saídas) no total e em cada grupo; use-o em vez de calcular.",
  consultar_cartao:
    "Mostra o cartão de crédito: fatura fechada, fatura aberta e próximas faturas com parcelas. Somente leitura. Antes de incluir uma compra declarada com descrição e valor, consulte para triar item já existente. Se encontrar correspondência, cite o item e a fatura e pergunte se é outra compra. A consulta não registra compra nem devolve por si só erro tipado de duplicidade.",
  consultar_investimentos:
    "Mostra cada investimento: valor atual, aplicado, rentabilidade bruta, disponibilidade e proteção, classificado até uma data. Omita ate_data, chamando com {}, salvo quando a pessoa disser uma data explícita: sem ele, o motor usa a data da falta mais próxima, que é a correta para \"posso contar com ele?\". Não use o fim da janela nem outra data por conta própria. Somente leitura; não recomenda nada. Não chame esta ferramenta se a pessoa apenas pedir recomendação de onde investir.",
  projetar_rendimento:
    "Calcula o rendimento bruto estimado de um valor em produto atrelado ao CDI até uma data (no máximo 2026-11-29), com CDI constante. Informe destino (id da posição) ou cdi_pct. ate_data é obrigatória: use a data da pergunta ou a do contexto (ex.: \"até o salário\" = data do salário).",
  registrar_declaracao:
    "Registra um fato afirmado pela pessoa que muda a situação atual (ex.: valor ou data de um compromisso). Use alterar_evento com o id do evento para correções. Para adicionar compra, só chame com dados completos da nova compra. Primeiro consulte a fatura para triar possível duplicidade; se houver item correspondente, pergunte se é outra compra. Nunca invente data/meio nem reutilize os do item antigo para provocar um erro. Com dados completos, o motor pode devolver POSSIVEL_DUPLICIDADE; confirmar_nao_duplicado só após confirmação explícita de que é outro gasto.",
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
  consultar_cotacao:
    "Consulta a cotação atual de uma ação da B3 (ex.: PETR4) ou de cripto (BTC, ETH, SOL), ao vivo quando disponível, com a fonte, a data e, se a pessoa tiver o ativo, quantidade e valor na carteira. Somente leitura. Não é previsão de preço.",
  comparar_investimento:
    "Compara o resultado real de um investimento da pessoa (posicao_id) com o que o mesmo valor, aplicado nas mesmas datas, teria rendido no CDI (cdi_pct, padrão 100) e, se informado, num prefixado (prefixado_aa_pct ao ano). Use para \"quanto eu teria ganho se tivesse colocado no CDI/renda fixa?\". Valores brutos. Somente leitura.",
  simular_investimento:
    "Estima o retorno de um valor novo em renda fixa atrelada ao CDI (cdi_pct) ou prefixada (taxa_aa_pct ao ano), por prazo_meses (1 a 60) ou até ate_data, com IR regressivo e IOF. CDI constante na última taxa. Somente leitura; não recomenda produto.",
  simular_pix_credito:
    "Simula pagar um Pix usando o cartão de crédito (Pix no crédito) quando falta saldo em conta: juros ao mês (juros_am_pct; sem ele usa a premissa do protótipo de 4,99%), IOF, parcelas nas faturas, total pago e custo efetivo. Use só quando a pessoa perguntar por Pix sem saldo ou Pix no crédito. Nada é executado.",
  estimar_imposto_renda:
    "Estima o imposto de renda do ano-calendário 2026: sobre os investimentos (IR retido no resgate, come-cotas, ações e cripto com isenções e DARF) e o IRPF anual (declaração 2027) pela renda média do histórico ou por rendimento_mensal informado. escopo: tudo (padrão), investimentos ou irpf. Estimativa; não substitui a declaração.",
  simular_parcelamento:
    "Simula QUALQUER compra parcelada com valores informados pela pessoa (loja, financiamento, carnê, empréstimo pedido pela pessoa; não exige cartão Nubank). Não use para "e se eu pagar X no cartão em Nx" sem pergunta sobre juros ou custo: isso é criar_hipotese com compra no cartão: compara pagar à vista (com desconto_a_vista_pct, se houver) com parcelar em várias opções (parcelas_max ou opcoes_parcelas), com entrada opcional. Para cada opção devolve parcela, total pago, juros, taxa efetiva das parcelas (sem IOF/tarifas; não é o CET oficial da loja), quanto a parcela pesa na renda e o valor presente das parcelas pelo CDI (quanto valem hoje se o dinheiro ficasse rendendo), e aponta a opção de menor custo na simulação. Se a pessoa não informar a taxa, usa a premissa do protótipo de 2,99% a.m. e isso deve ser dito. Taxa anual informada vai em juros_aa_pct (o motor converte). Use para \"vale mais à vista ou parcelado?\", \"qual o cenário menos prejudicial?\". Simulação; não recomenda comprar nem contrata nada.",
  calcular_valores:
    "Calcula somas, diferenças, multiplicações, divisões e percentuais de valores informados pela pessoa (ex.: \"120+85.5+230\", \"25000*0.2\", \"3000-1250\"). Use sempre que precisar de uma conta sobre números da mensagem, em vez de calcular de cabeça. Números com ponto decimal e sem separador de milhar (\"1234.56\", não \"1.234,56\"); % pós-fixo divide por 100 (\"2500*10%\" = 250). Resultado com 2 casas.",
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
  ate_data: "Data AAAA-MM-DD até a qual classificar ou projetar (no máximo 2026-11-29). O limite máximo não é um valor padrão.",
  operacao_id: "Id da operação pendente (ex.: \"OP1\").",
  alvo_id: "Id da declaração (D<n>) ou da hipótese (H<n>).",
} as const;
