# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **23/24** aprovados
- Chamadas ao modelo: **53** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 3174 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 6312 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 3086 | 2 | registrar_declaracao | — |
| CV-05 | 1 | OK | 2978 | 2 | consultar_investimentos | — |
| CV-07 | 1 | OK | 3819 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 3866 | 2 | criar_hipotese | — |
| CV-11 | 1 | OK | 596 | 1 | — | — |
| CV-14 | 1 | OK | 3497 | 2 | consultar_cartao | — |
| CV-17 | 1 | OK | 2062 | 1 | — | — |
| CV-18 | 1 | OK | 821 | 1 | — | — |
| CV-19 | 1 | OK | 1453 | 1 | — | — |
| CV-28 | 1 | OK | 12036 | 6 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 2669 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 11062 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 3365 | 2 | registrar_declaracao | — |
| CV-05 | 2 | OK | 3048 | 2 | consultar_investimentos | — |
| CV-07 | 2 | OK | 2769 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 4286 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 505 | 1 | — | — |
| CV-14 | 2 | OK | 3430 | 2 | consultar_cartao | — |
| CV-17 | 2 | OK | 2703 | 1 | — | — |
| CV-18 | 2 | FALHA | 2481 | 2 | consultar_cartao | Ferramenta não permitida neste caso: consultar_cartao; Esperava 0 ferramentas, mas chamou: consultar_cartao |
| CV-19 | 2 | OK | 1137 | 1 | — | — |
| CV-28 | 2 | OK | 10728 | 6 | confirmar_movimentacao | — |
