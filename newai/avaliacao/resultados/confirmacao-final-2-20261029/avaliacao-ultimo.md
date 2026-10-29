# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **22/24** aprovados
- Chamadas ao modelo: **52** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 4614 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 5599 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 4367 | 2 | registrar_declaracao | — |
| CV-05 | 1 | FALHA | 3550 | 2 | consultar_investimentos | Oráculo CR-06 não atendido; Consulta classificou até 2026-11-05, mas a data padrão do motor é 2026-11-15 |
| CV-07 | 1 | OK | 4622 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 5610 | 2 | criar_hipotese | — |
| CV-11 | 1 | OK | 713 | 1 | — | — |
| CV-14 | 1 | OK | 3354 | 2 | consultar_cartao | — |
| CV-17 | 1 | OK | 2142 | 1 | — | — |
| CV-18 | 1 | OK | 923 | 1 | — | — |
| CV-19 | 1 | OK | 1510 | 1 | — | — |
| CV-28 | 1 | OK | 10435 | 6 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 3047 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 6155 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 3040 | 2 | registrar_declaracao | — |
| CV-05 | 2 | FALHA | 6433 | 2 | consultar_investimentos | Oráculo CR-06 não atendido; Consulta classificou até 2026-11-05, mas a data padrão do motor é 2026-11-15 |
| CV-07 | 2 | OK | 4217 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 4507 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 652 | 1 | — | — |
| CV-14 | 2 | OK | 3538 | 2 | consultar_cartao | — |
| CV-17 | 2 | OK | 1616 | 1 | — | — |
| CV-18 | 2 | OK | 1038 | 1 | — | — |
| CV-19 | 2 | OK | 1509 | 1 | — | — |
| CV-28 | 2 | OK | 14133 | 6 | confirmar_movimentacao | — |
