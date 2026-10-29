# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **22/24** aprovados
- Chamadas ao modelo: **50** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 5318 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 7798 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 2574 | 2 | registrar_declaracao | — |
| CV-05 | 1 | OK | 3706 | 2 | consultar_investimentos | — |
| CV-07 | 1 | OK | 3029 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 5408 | 2 | criar_hipotese | — |
| CV-11 | 1 | OK | 1355 | 1 | — | — |
| CV-14 | 1 | FALHA | 2175 | 1 | — | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; Texto não contém "05/11"; Texto não contém "480"; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 1 | OK | 832 | 1 | — | — |
| CV-18 | 1 | OK | 1614 | 1 | — | — |
| CV-19 | 1 | OK | 1958 | 1 | — | — |
| CV-28 | 1 | OK | 9126 | 6 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 4063 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 6757 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 2538 | 2 | registrar_declaracao | — |
| CV-05 | 2 | OK | 3909 | 2 | consultar_investimentos | — |
| CV-07 | 2 | OK | 2447 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 3767 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 861 | 1 | — | — |
| CV-14 | 2 | FALHA | 2346 | 1 | — | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; Texto não contém "05/11"; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 2 | OK | 1194 | 1 | — | — |
| CV-18 | 2 | OK | 1245 | 1 | — | — |
| CV-19 | 2 | OK | 2145 | 1 | — | — |
| CV-28 | 2 | OK | 8431 | 6 | confirmar_movimentacao | — |
