# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **20/24** aprovados
- Chamadas ao modelo: **52** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 5035 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 8422 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 2526 | 2 | registrar_declaracao | — |
| CV-05 | 1 | OK | 3654 | 2 | consultar_investimentos | — |
| CV-07 | 1 | OK | 3143 | 2 | propor_movimentacao | — |
| CV-08 | 1 | FALHA | 3691 | 2 | criar_hipotese | Não perguntou a ordem da entrada e da saída em 08/11 |
| CV-11 | 1 | OK | 861 | 1 | — | — |
| CV-14 | 1 | FALHA | 3833 | 2 | consultar_cartao | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 1 | OK | 1292 | 1 | — | — |
| CV-18 | 1 | OK | 1019 | 1 | — | — |
| CV-19 | 1 | OK | 1842 | 1 | — | — |
| CV-28 | 1 | OK | 8932 | 6 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 7011 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 8315 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 2648 | 2 | registrar_declaracao | — |
| CV-05 | 2 | FALHA | 3320 | 2 | consultar_investimentos | Consulta inicial deve usar a data padrão de 15/11, sem filtro ate_data |
| CV-07 | 2 | OK | 2783 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 4231 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 1040 | 1 | — | — |
| CV-14 | 2 | FALHA | 3335 | 2 | consultar_cartao | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 2 | OK | 1027 | 1 | — | — |
| CV-18 | 2 | OK | 1649 | 1 | — | — |
| CV-19 | 2 | OK | 1350 | 1 | — | — |
| CV-28 | 2 | OK | 8683 | 6 | confirmar_movimentacao | — |
