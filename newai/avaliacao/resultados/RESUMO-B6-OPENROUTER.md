# B6 — avaliação OpenRouter e revisão das evidências

**Resultado: parcial / critério de aprovação não atendido. Não libera M3/M4, P1 ou B10.**

## Evidência que vale para esta conclusão

| Conjunto | Execuções | Placar automático inicial | Após revisão offline e manual |
|---|---:|---:|---:|
| 12 críticos, duas repetições | 24 | 22/24 | **20/24** |
| Demais, uma repetição; inclui CV-24 local | 16 | 15/16 | **14/16** |

- [Críticos revisados](<avaliacao-openrouter-revisada-critico.md>) e [JSON completo](<avaliacao-openrouter-revisada-critico.json>).
- [Demais revisados](<avaliacao-openrouter-revisada-demais.md>) e [JSON completo](<avaliacao-openrouter-revisada-demais.json>).
- Evidências originais preservadas: [críticos](<avaliacao-openrouter-consolidada-critico.json>) e [demais](<avaliacao-openrouter-consolidada-demais.json>).
- [Achados manuais](<achados-revisao-consolidada.json>) foram acrescentados sem alterar as respostas ou executar novas chamadas.
- **9 dos 12 casos críticos passaram nas duas repetições.** Não substituir isso pelo placar histórico de 24/24, produzido antes de corrigir a sequência de CV-28, a mensagem de CV-14 e a avaliação dos turnos.
- CV-23 foi avaliado e falhou; resumo/encerramento é recurso P1/B8 no plano, não foi implementado nesta etapa. CV-27 não foi executado: depende de deploy P1, ainda não autorizado.

## Falhas remanescentes

| Caso | Falha observada | Área / encaminhamento |
|---|---|---|
| CV-05, repetição 1 | Aplicou filtro 29/11 em vez do default 15/11. Chamou o valor atual de R$ 2.202,46 de principal aplicado; principal real R$ 1.920,90. | S2: instruções/seleção de ferramenta e fidelidade do texto ao motor. |
| CV-08, repetição 2 | Não perguntou se a entrada do cliente chega antes da saída do aluguel em 08/11. | S2: pergunta obrigatória quando a ordem é relevante. |
| CV-12 | Texto atribui cobertura ao salário futuro, embora a falta anterior permaneça mesmo com o recebimento. Valores do motor estão corretos. | S2: distinguir falta anterior, saldo final e cenário sem recebimento. |
| CV-14, ambas | Mensagem original omite meio/data. Modelo pergunta detalhes, seguindo a regra para gasto novo, mas não alcança POSSIVEL_DUPLICIDADE nem explica a fatura de 05/11. | Clarificar fluxo de triagem de duplicidade sem inventar meio/data ou afrouxar a mensagem/asserts. Nenhuma mudança de contrato autorizada. |
| CV-23 (P1) | Encerramento não apresenta comparação final, premissas e limites. | Não iniciar B8/P1 sem liberação; não contabilizar como implementação P0 concluída. |

Não se reproduziu defeito de cálculo do domínio nessas falhas. A revisão independente confrontou todos os textos/turnos consolidados com cartões, cenários, valores, datas e premissas; não encontrou outro erro financeiro concreto. Isso não garante comportamento universal para mensagens novas.

## O que foi corrigido no avaliador

- Resposta, estado de entrada/saída, cartões e rastro de **todos os turnos**, não só o último.
- Ferramentas adicionais indevidas e mudanças de negócio em consultas/recusas reprovam o caso.
- Oráculos conferem cartões entregues contra o motor, incluindo números por posição; valores monetários equivalentes são comparados em centavos.
- CV-14 usa a mensagem literal da spec e verifica invariância de todo o negócio após a duplicidade.
- CV-28 usa proposta → `sim` → `sim`: versões 1 → 2 → 3, OP1 única, erro tipado OPERACAO_JA_EXECUTADA na repetição e negócio/visão iguais. **Passou nas duas repetições reais completas.**
- CV-24 foi incluído no catálogo: original → cópia temporária alterada → restaurada, três sessões novas, mesmo cálculo/cartões, pergunta exclusiva somente na fase alterada. **Passou real**, com seis chamadas; o arquivo compartilhado de instruções não foi modificado pelo teste.
- CV-23 foi corrigido para CV-01 → CV-02 → resumo → encerramento, sem implementar o recurso P1.
- CV-05 exige o horizonte padrão e CV-08 verifica a pergunta de ordem. A revisão offline só acrescenta reprovações; não transforma falhas anteriores em aprovação.

## Ambiente e custos

- OpenRouter pago foi autorizado explicitamente no chat, usando `deepseek/deepseek-v4.1-flash-1017`. O override foi aplicado aos comandos de avaliação, sem alterar os marcos, credenciais ou configuração normal de execução da demo.
- Limite do executor: 40 requisições por minuto; nenhum mercado ao vivo.
- Rodada consolidada: **88 chamadas** (50 críticos + 38 demais). Revisão offline: **0 chamadas adicionais**.
- Toda esta autorização OpenRouter na S2: **272 chamadas**: 49 + 48 + 48 nos três ensaios críticos anteriores, 30 nos demais anteriores, 9 no diagnóstico de cinco casos e 88 na consolidação. Arquivos duplicados de preservação não são somados novamente.
- Histórico S2 anterior: 52 chat completions registradas antes do B6; trecho NVIDIA do B6 registra 71 execuções de casos, sem contagem HTTP confiável. Não somar casos com requisições para inventar um acumulado global.
- Mercado: **0 novas chamadas**. Custo monetário não consultado; nenhuma compra ou credencial criada.

## Validação e identidade das instruções

- `npm test`: **235/235**, 22 arquivos. `npm run typecheck`: verde. Provedor roteirizado: 28 casos locais; esse resultado não substitui o aceite real.
- Instruções da rodada consolidada: commit `888eb03`.
- SHA-256 de `instrucoes.md`: `256A40958F5DC3BD6E8230E91DEBB0641D9F244F1E0C583C081E155887844AF2`.
- SHA-256 das descrições: `D7A5AA66D5C19AE4F83AF6010C7F1D7917E7575B09D1C5209ABD7AFBA8A2B65C`.
- Revisão dos dois relatórios, sem provedor: `npx tsx avaliacao/revisar.ts --origem <evidencia.json> --saida <novo-prefixo> --achados avaliacao/resultados/achados-revisao-consolidada.json`.

## Próximo passo / decisão

Corrigir os quatro casos P0, esclarecer a triagem de CV-14 preservando a mensagem original e os contratos, e só depois repetir o conjunto crítico completo. Não declarar congelamento ou demo gratuita com base nesta avaliação paga. Nenhum deploy, P1 ou B10 foi iniciado.
