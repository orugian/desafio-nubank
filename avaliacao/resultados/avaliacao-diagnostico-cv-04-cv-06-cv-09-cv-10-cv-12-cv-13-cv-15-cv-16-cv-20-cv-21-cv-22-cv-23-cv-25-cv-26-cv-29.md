# Avaliação B6 (todos)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **10/15** aprovados
- Chamadas ao modelo: **30** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-04 | 1 | OK | 1680 | 1 | — | — |
| CV-06 | 1 | OK | 3424 | 2 | consultar_investimentos | — |
| CV-09 | 1 | FALHA | 11463 | 5 | criar_hipotese, criar_hipotese | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-09b não atendido; Indicadores divergentes em atual/CR-09b: esperado {"saldo_minimo_centavos":13500,"data_saldo_minimo":"2026-11-27","insuficiencia_centavos":0,"saldo_final_centavos":13500}; Indicadores divergentes em H1/CR-10b: esperado {"saldo_minimo_centavos":-16500,"data_saldo_minimo":"2026-11-27","primeira_falta":{"data":"2026-11-25","valor_descoberto_centavos":12000,"saidas_do_dia":["E5"]},"saldo_final_centavos":-16500} |
| CV-10 | 1 | OK | 2665 | 2 | consultar_historico | — |
| CV-12 | 1 | OK | 4793 | 3 | criar_hipotese | — |
| CV-13 | 1 | OK | 5608 | 3 | criar_hipotese | — |
| CV-15 | 1 | OK | 725 | 1 | — | — |
| CV-16 | 1 | FALHA | 1821 | 1 | — | Ferramenta esperada ausente ou com argumentos divergentes: consultar_investimentos; Oráculo CR-16 não atendido; Cartão de investimentos ausente |
| CV-20 | 1 | FALHA | 4331 | 2 | registrar_declaracao | Esperava 0 ferramentas, mas chamou: registrar_declaracao |
| CV-21 | 1 | OK | 756 | 1 | — | — |
| CV-22 | 1 | FALHA | 3902 | 1 | — | Texto contém termo proibido: "pode gastar"; Texto contém termo proibido: "pode gastar" |
| CV-23 | 1 | OK | 3958 | 3 | — | — |
| CV-25 | 1 | OK | 1504 | 1 | — | — |
| CV-26 | 1 | OK | 3581 | 2 | projetar_rendimento | — |
| CV-29 | 1 | FALHA | 3580 | 2 | consultar_investimentos | Texto contém termo proibido: "recomendo" |
