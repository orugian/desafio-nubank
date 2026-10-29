# B6 — aceite por efeito, PEDIDO 4 opção A e confirmação real (29/10/2026)

**Resultado: o conjunto crítico passou 24/24 na rodada final (12 casos × 2). Ainda não houve aprovação humana de M3/M4, CONGELADO ou P1.**

## O que mudou e por quê

O avaliador às vezes reprovava respostas corretas porque exigia uma **forma** que o contrato não permite ou que não muda o resultado. Exemplos:
- CV-14 pedia `registrar_declaracao` com erro de duplicidade, mas a mensagem não tem data nem meio de pagamento, que o contrato exige.
- CV-05 exigia `consultar_investimentos` sem `ate_data`, mesmo quando a data informada era igual à padrão.

O responsável autorizou o ajuste da S2 e pediu que a mesma classe de problema fosse eliminada nos demais casos.

**Correções (somente S2: `avaliacao/`, `instrucoes.md`, `src/contratos/descricoes.ts`; nenhum contrato, domínio ou executor S1 alterado):**

| Caso | Antes (forma) | Agora (efeito) |
|---|---|---|
| CV-14 | `registrar_declaracao` + `POSSIVEL_DUPLICIDADE` (inalcançável) | **CR-15a-triagem**: `consultar_cartao`, fatura com Supermercado R$ 480,00 com vencimento em 05/11, pergunta se é outra compra, nenhum registro sem dados, negócio inalterado (PEDIDO 4, opção A) |
| CV-05 | `ate_data` ausente | data do cartão = data padrão do motor (omitir ou informar 15/11 dá o mesmo resultado) |
| CV-06 | herdava a exigência de data de CV-05 | **CR-06-rendimento**: compara o cartão com o motor; o rendimento não depende da data |
| CV-10 | `categoria: "delivery"` literal | **H-setembro-delivery**: período de setembro e total do motor, com qualquer filtro equivalente; texto cita 160 |
| CV-02, CV-24 | `a_partir_de` e `data` de `separar` literais | oráculo do cenário; `data` opcional = hoje; alterações em qualquer ordem |
| CV-04/11/25 | "?" literal | pedido de esclarecimento que cita o dado faltante, com ou sem "?"; afirmar o dado ou dispensá-lo reprova |
| CV-08 | pergunta isolada | pergunta sobre a ordem que cita entrada ou saída; perguntar "primeiro" sobre outra coisa reprova |
| CV-23 | despedida tinha de repetir o resumo | resumo avaliado no turno 3; despedida livre (sem mutação, termos proibidos ou alegação de execução) |
| Texto | datas e números literais; "bruto", "simulad" e "não posso recomendar" literais | `textoContemEquivalente`: DD/MM com ou sem zero, ou ISO 2026; inteiro com ou sem ponto e ",00"; sinônimos limitados |

**Mantido de propósito:** termos proibidos globais (critério explícito do plano); CR-48 exige nova chamada de `confirmar_movimentacao` (spec); oráculos numéricos e invariância de estado.

**Proteção contra falsos positivos** (duas auditorias independentes: subagente interno e `agy` adversarial, ambas somente leitura): datas com outro ano, `2026/08/11`, `200,90`, `1.800,50`, "simultaneamente", "sem dinheiro real disponível", "não foi simulação, foi real", "não indico X; aloque em Y", "quaisquer", "informe de rendimentos", "já registrei", "efetivada". Todos têm teste e reprovam.

**Revisão offline:** `npx tsx avaliacao/revisar.ts --origem <json> --saida <prefixo> --reavaliar` recalcula critérios, oráculos e invariância sobre evidências gravadas, sem chamar o modelo. O modo padrão (conservador) só acrescenta reprovações.

## Evidências reais (OpenRouter `deepseek/deepseek-v4.1-flash-1017`, autorizado)

| Rodada | Críticos 2× | Demais 1× | Observação |
|---|---:|---:|---|
| [aceite-efeito](<aceite-efeito-20261029/avaliacao-ultimo.md>) | 24/24 | 13/16 → 14/16 reavaliado | CV-13 pediu confirmação de data já dita; CV-23 sem limite de simulação |
| [aceite-efeito-final](<aceite-efeito-final-20261029/avaliacao-ultimo.md>) | 21/24 → 22/24 | 15/16 → 16/16 | CV-05 com 29/11 |
| [confirmacao-final](<confirmacao-final-20261029/avaliacao-ultimo.md>) | 23/24 | 15/16 | CV-18 consultou o cartão; CV-23 H2 a partir de "atual" |
| [confirmacao-final-2](<confirmacao-final-2-20261029/avaliacao-ultimo.md>) | 22/24 | **16/16** | CV-05 com 05/11 (dica de data do salário vazou para `ate_data`) |
| [**confirmacao-final-3**](<confirmacao-final-3-20261029/avaliacao-ultimo.md>) | **24/24** | CV-06, CV-12 e CV-26 1/1 | rodada vigente, após a última mudança de descrição |

Cada ajuste de instrução/descrição foi seguido pela reexecução do conjunto crítico, como exige o plano.

## Chamadas

- Nesta etapa: **421** chamadas OpenRouter (5 rodadas). Antes dela, a autorização S2 já somava 435; o total da autorização S2 passa a **856**. Nenhuma chamada de mercado; custo monetário não consultado.
- Auditorias `agy` e subagentes: somente leitura, sem chamadas ao modelo da aplicação.

## Limites

- Os casos não críticos passaram 16/16 na rodada anterior; depois disso só mudou a descrição de `ate_data` e `projetar_rendimento`, e os casos afetados (CV-06 e CV-26) foram reexecutados e passaram.
- A instabilidade observada (CV-05, CV-18) mostra que o modelo pode variar entre execuções; 24/24 não garante comportamento universal.
- Não houve congelamento nem aprovação de marcos. CV-27 (P1, deploy) não foi executado.
