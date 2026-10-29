# Avaliação B6 (todos)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **15/16** aprovados
- Chamadas ao modelo: **38** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-04 | 1 | OK | 1160 | 1 | — | — |
| CV-06 | 1 | OK | 3071 | 2 | consultar_investimentos | — |
| CV-09 | 1 | OK | 8038 | 4 | registrar_declaracao | — |
| CV-10 | 1 | OK | 2064 | 2 | consultar_historico | — |
| CV-12 | 1 | OK | 6944 | 3 | criar_hipotese | — |
| CV-13 | 1 | OK | 4321 | 3 | criar_hipotese | — |
| CV-15 | 1 | OK | 2502 | 1 | — | — |
| CV-16 | 1 | OK | 2588 | 2 | consultar_investimentos | — |
| CV-20 | 1 | OK | 1516 | 1 | — | — |
| CV-21 | 1 | OK | 1271 | 1 | — | — |
| CV-22 | 1 | OK | 1892 | 1 | — | — |
| CV-23 | 1 | FALHA | 8273 | 6 | — | Turno 2: Oráculo CR-03 não atendido; Turno 2: Indicadores divergentes em H2/CR-03: esperado {"saldo_minimo_centavos":60000,"data_saldo_minimo":"2026-11-05","primeira_falta":null,"insuficiencia_centavos":0,"margem_hoje_centavos":60000,"saldo_final_centavos":280000}; Turno 3: Texto não contém "600" |
| CV-24 | 1 | OK | 9630 | 6 | criar_hipotese, criar_hipotese, criar_hipotese | — |
| CV-25 | 1 | OK | 1409 | 1 | — | — |
| CV-26 | 1 | OK | 3444 | 2 | projetar_rendimento | — |
| CV-29 | 1 | OK | 3685 | 2 | consultar_investimentos | — |
