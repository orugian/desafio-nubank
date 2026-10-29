# Avaliação B6 (todos)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **2/5** aprovados
- Chamadas ao modelo: **9** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-09 | 1 | FALHA | 7435 | 4 | registrar_declaracao | Oráculo CR-09b não atendido; Cenário H1/CR-10b ausente |
| CV-16 | 1 | FALHA | 804 | 1 | — | Ferramenta esperada ausente ou com argumentos divergentes: consultar_investimentos; Oráculo CR-16 não atendido; Texto contém termo proibido: "recomendo"; Cartão de investimentos ausente |
| CV-20 | 1 | OK | 2196 | 1 | — | — |
| CV-22 | 1 | FALHA | 1708 | 1 | — | Texto contém termo proibido: "pode gastar"; Texto contém termo proibido: "pode gastar" |
| CV-29 | 1 | OK | 2427 | 2 | consultar_investimentos | — |
