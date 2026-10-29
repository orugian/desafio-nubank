# Avaliação B6 (todos)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **13/16** aprovados
- Chamadas ao modelo: **37** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-04 | 1 | OK | 1422 | 1 | — | — |
| CV-06 | 1 | OK | 5269 | 2 | consultar_investimentos | — |
| CV-09 | 1 | OK | 6889 | 4 | registrar_declaracao | — |
| CV-10 | 1 | OK | 2257 | 2 | consultar_historico | — |
| CV-12 | 1 | OK | 4919 | 3 | criar_hipotese | — |
| CV-13 | 1 | FALHA | 2771 | 2 | — | Ferramenta esperada ausente ou com argumentos divergentes: criar_hipotese; Oráculo CR-14b não atendido; Texto não contém "05/12"; Cartão de comparação ausente |
| CV-15 | 1 | OK | 1459 | 1 | — | — |
| CV-16 | 1 | OK | 3223 | 2 | consultar_investimentos | — |
| CV-20 | 1 | OK | 2231 | 1 | — | — |
| CV-21 | 1 | OK | 698 | 1 | — | — |
| CV-22 | 1 | OK | 1461 | 1 | — | — |
| CV-23 | 1 | FALHA | 10221 | 6 | — | Turno 3: Texto não contém "simulad" |
| CV-24 | 1 | OK | 9958 | 6 | criar_hipotese, criar_hipotese, criar_hipotese | — |
| CV-25 | 1 | FALHA | 2408 | 1 | — | Texto não contém "?"; Pergunta não solicita os esclarecimentos exigidos pelo caso |
| CV-26 | 1 | OK | 2390 | 2 | projetar_rendimento | — |
| CV-29 | 1 | OK | 3112 | 2 | consultar_investimentos | — |
