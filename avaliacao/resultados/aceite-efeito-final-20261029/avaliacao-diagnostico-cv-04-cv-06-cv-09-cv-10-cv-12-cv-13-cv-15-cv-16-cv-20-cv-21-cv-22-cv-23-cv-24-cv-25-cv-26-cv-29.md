# Avaliação B6 (todos)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **15/16** aprovados
- Chamadas ao modelo: **39** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-04 | 1 | OK | 1603 | 1 | — | — |
| CV-06 | 1 | FALHA | 2786 | 2 | consultar_investimentos | Oráculo CR-06 não atendido; Consulta classificou até 2026-11-29, mas a data padrão do motor é 2026-11-15 |
| CV-09 | 1 | OK | 7896 | 4 | registrar_declaracao | — |
| CV-10 | 1 | OK | 2245 | 2 | consultar_historico | — |
| CV-12 | 1 | OK | 8063 | 3 | criar_hipotese | — |
| CV-13 | 1 | OK | 4890 | 3 | criar_hipotese | — |
| CV-15 | 1 | OK | 1460 | 1 | — | — |
| CV-16 | 1 | OK | 3324 | 2 | consultar_investimentos | — |
| CV-20 | 1 | OK | 947 | 1 | — | — |
| CV-21 | 1 | OK | 6059 | 1 | — | — |
| CV-22 | 1 | OK | 2791 | 1 | — | — |
| CV-23 | 1 | OK | 10259 | 7 | — | — |
| CV-24 | 1 | OK | 11756 | 6 | criar_hipotese, criar_hipotese, criar_hipotese | — |
| CV-25 | 1 | OK | 1871 | 1 | — | — |
| CV-26 | 1 | OK | 2688 | 2 | projetar_rendimento | — |
| CV-29 | 1 | OK | 2916 | 2 | consultar_investimentos | — |
