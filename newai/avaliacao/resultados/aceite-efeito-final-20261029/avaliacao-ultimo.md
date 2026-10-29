# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **21/24** aprovados
- Chamadas ao modelo: **52** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 3508 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 6554 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 3979 | 2 | registrar_declaracao | — |
| CV-05 | 1 | FALHA | 4168 | 2 | consultar_investimentos | Oráculo CR-06 não atendido; Consulta classificou até 2026-11-29, mas a data padrão do motor é 2026-11-15 |
| CV-07 | 1 | OK | 4174 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 3719 | 2 | criar_hipotese | — |
| CV-11 | 1 | OK | 662 | 1 | — | — |
| CV-14 | 1 | FALHA | 5084 | 2 | consultar_cartao | Texto não contém "05/11" |
| CV-17 | 1 | OK | 3882 | 1 | — | — |
| CV-18 | 1 | OK | 1237 | 1 | — | — |
| CV-19 | 1 | OK | 921 | 1 | — | — |
| CV-28 | 1 | OK | 14893 | 6 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 3198 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 6866 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 3407 | 2 | registrar_declaracao | — |
| CV-05 | 2 | FALHA | 5439 | 2 | consultar_investimentos | Oráculo CR-06 não atendido; Consulta classificou até 2026-11-29, mas a data padrão do motor é 2026-11-15 |
| CV-07 | 2 | OK | 3892 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 4635 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 1187 | 1 | — | — |
| CV-14 | 2 | OK | 2823 | 2 | consultar_cartao | — |
| CV-17 | 2 | OK | 2143 | 1 | — | — |
| CV-18 | 2 | OK | 1181 | 1 | — | — |
| CV-19 | 2 | OK | 1416 | 1 | — | — |
| CV-28 | 2 | OK | 13643 | 6 | confirmar_movimentacao | — |
