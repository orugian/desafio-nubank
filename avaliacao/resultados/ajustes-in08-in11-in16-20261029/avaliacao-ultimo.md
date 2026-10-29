# Avaliação B6 (critico)

- Provedor: `openrouter` · Modelo: `deepseek/deepseek-v4.1-flash-1017`
- Resultado: **20/24** aprovados
- Chamadas ao modelo: **52** (limite de 40 requisições/minuto no modo real)

| Caso | Rep | Status | Latência (ms) | Chamadas | Ferramentas | Observações |
|---|---|---|---|---|---|---|
| CV-01 | 1 | OK | 6232 | 2 | criar_hipotese | — |
| CV-02 | 1 | OK | 6618 | 4 | criar_hipotese | — |
| CV-03 | 1 | OK | 3253 | 2 | registrar_declaracao | — |
| CV-05 | 1 | FALHA | 3929 | 2 | consultar_investimentos | Consulta inicial deve usar a data padrão de 15/11, sem filtro ate_data |
| CV-07 | 1 | OK | 2665 | 2 | propor_movimentacao | — |
| CV-08 | 1 | OK | 3830 | 2 | criar_hipotese | — |
| CV-11 | 1 | OK | 964 | 1 | — | — |
| CV-14 | 1 | FALHA | 6405 | 2 | consultar_cartao | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 1 | OK | 827 | 1 | — | — |
| CV-18 | 1 | OK | 1419 | 1 | — | — |
| CV-19 | 1 | OK | 1584 | 1 | — | — |
| CV-28 | 1 | OK | 8999 | 6 | confirmar_movimentacao | — |
| CV-01 | 2 | OK | 4281 | 2 | criar_hipotese | — |
| CV-02 | 2 | OK | 6922 | 4 | criar_hipotese | — |
| CV-03 | 2 | OK | 2479 | 2 | registrar_declaracao | — |
| CV-05 | 2 | FALHA | 4090 | 2 | consultar_investimentos | Consulta inicial deve usar a data padrão de 15/11, sem filtro ate_data |
| CV-07 | 2 | OK | 2548 | 2 | propor_movimentacao | — |
| CV-08 | 2 | OK | 3686 | 2 | criar_hipotese | — |
| CV-11 | 2 | OK | 828 | 1 | — | — |
| CV-14 | 2 | FALHA | 3738 | 2 | consultar_cartao | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; POSSIVEL_DUPLICIDADE não devolvido ao modelo |
| CV-17 | 2 | OK | 1115 | 1 | — | — |
| CV-18 | 2 | OK | 3512 | 1 | — | — |
| CV-19 | 2 | OK | 930 | 1 | — | — |
| CV-28 | 2 | OK | 8798 | 6 | confirmar_movimentacao | — |
