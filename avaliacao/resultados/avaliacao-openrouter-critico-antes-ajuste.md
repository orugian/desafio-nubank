# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **17/24** aprovados
- Chamadas ao modelo: **49** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 3348 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 6144 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 2719 | 2 | registrar_declaracao | — |
| CV-05 | 1 | FALHA | 3942 | 2 | consultar_investimentos | Texto não contém "bruto" |
| CV-07 | 1 | OK | 3756 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 3659 | 2 | criar_hipotese | — |
| CV-11 | 1 | FALHA | 5527 | 2 | criar_hipotese | Esperava 0 ferramentas, mas chamou: criar_hipotese |
| CV-14 | 1 | FALHA | 5435 | 1 | — | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; Texto não contém "05/11"; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 1 | OK | 665 | 1 | — | — |
| CV-18 | 1 | OK | 1810 | 1 | — | — |
| CV-19 | 1 | OK | 1562 | 1 | — | — |
| CV-28 | 1 | FALHA | 5898 | 4 | confirmar_movimentacao | Texto não contém "movimentação simulada" |
| CV-01 | 2 | OK | 3336 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 6160 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 10929 | 2 | registrar_declaracao | — |
| CV-05 | 2 | FALHA | 4437 | 2 | consultar_investimentos | Texto não contém "bruto" |
| CV-07 | 2 | OK | 2309 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 4213 | 2 | criar_hipotese | — |
| CV-11 | 2 | FALHA | 5247 | 2 | criar_hipotese | Esperava 0 ferramentas, mas chamou: criar_hipotese |
| CV-14 | 2 | OK | 5260 | 2 | registrar_declaracao | — |
| CV-17 | 2 | OK | 3401 | 1 | — | — |
| CV-18 | 2 | OK | 1170 | 1 | — | — |
| CV-19 | 2 | OK | 1120 | 1 | — | — |
| CV-28 | 2 | FALHA | 5856 | 4 | confirmar_movimentacao | Texto não contém "movimentação simulada" |
