# B6 — revisão offline das evidências reais

- Evidência original preservada: [avaliacao-openrouter-consolidada-critico.json](<avaliacao-openrouter-consolidada-critico.json>)
- Provedor: openrouter; modelo: deepseek/deepseek-v4.1-flash-1017
- Resultado revisado: **20/24**
- Chamadas históricas: 50; **0 novas chamadas** nesta revisão.

| Caso | Rep. | Resultado | Motivos |
|---|---|---|---|
| CV-01 | 1 | OK | — |
| CV-02 | 1 | OK | — |
| CV-03 | 1 | OK | — |
| CV-05 | 1 | FALHA | Consulta inicial deve usar a data padrão de 15/11, sem filtro ate_data; Revisão manual, turno 1: Texto chama R$ 2.202,46 de aplicado, mas esse é o valor atual. O principal das posições soma R$ 1.920,90 (INV1 100000 + INV2 50000 + INV3 42090 centavos). A mesma consulta usa ate_data 29/11, em vez do default 15/11. Evidência: avaliacao-openrouter-consolidada-critico.json, texto_final de CV-05/R1 e cartão do mesmo turno. |
| CV-07 | 1 | OK | — |
| CV-08 | 1 | OK | — |
| CV-11 | 1 | OK | — |
| CV-14 | 1 | FALHA | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; Texto não contém "05/11"; Texto não contém "480"; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 1 | OK | — |
| CV-18 | 1 | OK | — |
| CV-19 | 1 | OK | — |
| CV-28 | 1 | OK | — |
| CV-01 | 2 | OK | — |
| CV-02 | 2 | OK | — |
| CV-03 | 2 | OK | — |
| CV-05 | 2 | OK | — |
| CV-07 | 2 | OK | — |
| CV-08 | 2 | FALHA | Não perguntou a ordem da entrada e da saída em 08/11 |
| CV-11 | 2 | OK | — |
| CV-14 | 2 | FALHA | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; Texto não contém "05/11"; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 2 | OK | — |
| CV-18 | 2 | OK | — |
| CV-19 | 2 | OK | — |
| CV-28 | 2 | OK | — |
