# B6 — revisão offline das evidências reais

- Evidência original preservada: [avaliacao-ultimo.json](<avaliacao-ultimo.json>)
- Provedor: openrouter; modelo: deepseek/deepseek-v4.1-flash-1017
- Resultado revisado: **18/24**
- Chamadas históricas: 52; **0 novas chamadas** nesta revisão.

| Caso | Rep. | Resultado | Motivos |
|---|---|---|---|
| CV-01 | 1 | OK | — |
| CV-02 | 1 | OK | — |
| CV-03 | 1 | OK | — |
| CV-05 | 1 | FALHA | Revisão manual, turno 1: Texto chama R$ 2.202,46 de aplicado no total, mas esse é o valor atual. O principal aplicado das posições soma R$ 1.920,90; números do cartão corretos, rótulo financeiro incorreto. |
| CV-07 | 1 | OK | — |
| CV-08 | 1 | FALHA | Não perguntou a ordem da entrada e da saída em 08/11 |
| CV-11 | 1 | OK | — |
| CV-14 | 1 | FALHA | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 1 | OK | — |
| CV-18 | 1 | OK | — |
| CV-19 | 1 | OK | — |
| CV-28 | 1 | OK | — |
| CV-01 | 2 | OK | — |
| CV-02 | 2 | OK | — |
| CV-03 | 2 | OK | — |
| CV-05 | 2 | FALHA | Consulta inicial deve usar a data padrão de 15/11, sem filtro ate_data; Revisão manual, turno 1: Texto novamente chama o valor atual de R$ 2.202,46 de aplicado; o principal é R$ 1.920,90. Também diz que PETR4 é resgatável até 04/11, quando 04/11 é o início da disponibilidade, não prazo final. O filtro explícito 29/11 já viola o default de CV-05. |
| CV-07 | 2 | OK | — |
| CV-08 | 2 | FALHA | Não perguntou a ordem da entrada e da saída em 08/11; Revisão manual, turno 1: A resposta afirma que a ordem da entrada/aluguel importa, mas pergunta apenas manter a simulação ou ajustar o valor. Não pergunta se a entrada chega antes da saída. |
| CV-11 | 2 | OK | — |
| CV-14 | 2 | FALHA | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 2 | OK | — |
| CV-18 | 2 | OK | — |
| CV-19 | 2 | OK | — |
| CV-28 | 2 | OK | — |
