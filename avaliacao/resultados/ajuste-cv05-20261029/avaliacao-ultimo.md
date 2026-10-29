# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **20/24** aprovados
- Chamadas ao modelo: **53** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 6513 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 7734 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 3002 | 2 | registrar_declaracao | — |
| CV-05 | 1 | FALHA | 4093 | 2 | consultar_investimentos | Consulta inicial deve usar a data padrão de 15/11, sem filtro ate_data |
| CV-07 | 1 | OK | 2549 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 3949 | 2 | criar_hipotese | — |
| CV-11 | 1 | OK | 1015 | 1 | — | — |
| CV-14 | 1 | FALHA | 6576 | 2 | consultar_cartao | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 1 | OK | 873 | 1 | — | — |
| CV-18 | 1 | OK | 1710 | 1 | — | — |
| CV-19 | 1 | OK | 1594 | 1 | — | — |
| CV-28 | 1 | OK | 8817 | 6 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 5566 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 8184 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 2501 | 2 | registrar_declaracao | — |
| CV-05 | 2 | FALHA | 5872 | 3 | consultar_investimentos, consultar_investimentos | Consulta inicial deve usar a data padrão de 15/11, sem filtro ate_data |
| CV-07 | 2 | OK | 2858 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 3392 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 1189 | 1 | — | — |
| CV-14 | 2 | FALHA | 3988 | 2 | consultar_cartao | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 2 | OK | 1292 | 1 | — | — |
| CV-18 | 2 | OK | 995 | 1 | — | — |
| CV-19 | 2 | OK | 1706 | 1 | — | — |
| CV-28 | 2 | OK | 8889 | 6 | confirmar_movimentacao | — |
