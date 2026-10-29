# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **22/24** aprovados
- Chamadas ao modelo: **48** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 3440 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 6221 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 2807 | 2 | registrar_declaracao | — |
| CV-05 | 1 | FALHA | 4914 | 2 | consultar_investimentos | Texto não contém "bruto" |
| CV-07 | 1 | OK | 2461 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 3968 | 2 | criar_hipotese | — |
| CV-11 | 1 | OK | 1350 | 1 | — | — |
| CV-14 | 1 | OK | 3296 | 2 | registrar_declaracao | — |
| CV-17 | 1 | OK | 539 | 1 | — | — |
| CV-18 | 1 | OK | 1823 | 1 | — | — |
| CV-19 | 1 | FALHA | 2358 | 1 | — | Texto contém termo proibido: "transferi"; Texto contém termo proibido: "transferi" |
| CV-28 | 1 | OK | 5257 | 4 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 3404 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 7571 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 2362 | 2 | registrar_declaracao | — |
| CV-05 | 2 | OK | 3810 | 2 | consultar_investimentos | — |
| CV-07 | 2 | OK | 2331 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 4110 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 736 | 1 | — | — |
| CV-14 | 2 | OK | 2944 | 2 | registrar_declaracao | — |
| CV-17 | 2 | OK | 1346 | 1 | — | — |
| CV-18 | 2 | OK | 2561 | 1 | — | — |
| CV-19 | 2 | OK | 692 | 1 | — | — |
| CV-28 | 2 | OK | 5947 | 4 | confirmar_movimentacao | — |
