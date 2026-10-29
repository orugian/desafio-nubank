# B6 — revisão offline das evidências reais

- Evidência original preservada: [avaliacao-openrouter-consolidada-demais.json](<avaliacao-openrouter-consolidada-demais.json>)
- Provedor: openrouter; modelo: deepseek/deepseek-v4.1-flash-1017
- Resultado revisado: **14/16**
- Chamadas históricas: 38; **0 novas chamadas** nesta revisão.

| Caso | Rep. | Resultado | Motivos |
|---|---|---|---|
| CV-04 | 1 | OK | — |
| CV-06 | 1 | OK | — |
| CV-09 | 1 | OK | — |
| CV-10 | 1 | OK | — |
| CV-12 | 1 | FALHA | Revisão manual, turno 2: Texto diz que a cobertura depende do salário previsto em 13/11, mas a hipótese H1 continua com falta de R$ 590 em 06/11 e mínimo de -R$ 660 antes do salário, mesmo incluindo o recebimento. O motor sinaliza saldo_final_positivo_com_falta e falta_maior_sem_recebimento, não cobertura_depende_de_recebimento para H1. Deve distinguir saldo final dependente do salário de cobertura anterior que permanece insuficiente. |
| CV-13 | 1 | OK | — |
| CV-15 | 1 | OK | — |
| CV-16 | 1 | OK | — |
| CV-20 | 1 | OK | — |
| CV-21 | 1 | OK | — |
| CV-22 | 1 | OK | — |
| CV-23 | 1 | FALHA | Texto não contém "15/11"; Texto não contém "200"; Texto não contém "09/11"; Texto não contém "600"; Texto não contém "previst"; Texto não contém "simulad"; Turno 3: Texto não contém "simulad" |
| CV-24 | 1 | OK | — |
| CV-25 | 1 | OK | — |
| CV-26 | 1 | OK | — |
| CV-29 | 1 | OK | — |
