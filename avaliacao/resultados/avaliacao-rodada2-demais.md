# Avaliação B6 (todos)

- Provedor: `nvidia` · Modelo: `minimaxai/minimax-m3.1-flash`
- Resultado: **4/15** aprovados

| Caso | Rep | Status | Latência (ms) | Ferramentas | Observações |
|---|---|---|---|---|---|
| CV-04 | 1 | OK | 2278 | — | — |
| CV-06 | 1 | FALHA | 17351 | consultar_investimentos | Oráculo CR-06 não atendido; INV3.classificacao: nao_resgatavel_ate_data ≠ resgatavel_ate_data; Totais de investimentos divergentes do motor |
| CV-09 | 1 | OK | 23994 | registrar_declaracao | — |
| CV-10 | 1 | FALHA | 481 | — | Ferramenta esperada ausente ou com argumentos divergentes: consultar_historico; Oráculo  não atendido; Texto não contém "delivery"; Turno não concluído com status ok; F-02/COTA |
| CV-12 | 1 | FALHA | 3246 | — | Ferramenta esperada ausente ou com argumentos divergentes: criar_hipotese; Oráculo CR-14 não atendido; Texto não contém "800"; Turno não concluído com status ok; F-02/COTA |
| CV-13 | 1 | FALHA | 6680 | — | Ferramenta esperada ausente ou com argumentos divergentes: criar_hipotese; Oráculo CR-14b não atendido; Texto não contém "05/12"; Turno não concluído com status ok; F-02/COTA |
| CV-15 | 1 | OK | 7417 | — | — |
| CV-16 | 1 | FALHA | 244 | — | Ferramenta esperada ausente ou com argumentos divergentes: consultar_investimentos; Oráculo CR-16 não atendido; Texto não contém "reserva"; Turno não concluído com status ok; F-02/COTA |
| CV-20 | 1 | FALHA | 133 | — | Oráculo  não atendido; Texto não contém "1.800"; Turno não concluído com status ok; F-02/COTA |
| CV-21 | 1 | OK | 1093 | — | — |
| CV-22 | 1 | FALHA | 135 | — | Oráculo  não atendido; Texto não contém "não"; Turno não concluído com status ok; F-02/COTA |
| CV-23 | 1 | FALHA | 264 | — | Oráculo  não atendido; Texto não contém "15/11"; Turno não concluído com status ok; F-02/COTA |
| CV-25 | 1 | FALHA | 136 | — | Oráculo  não atendido; Texto não contém "?"; Turno não concluído com status ok; F-02/COTA |
| CV-26 | 1 | FALHA | 134 | — | Ferramenta esperada ausente ou com argumentos divergentes: projetar_rendimento; Oráculo CR-32 não atendido; Texto não contém "bruto"; Turno não concluído com status ok; F-02/COTA |
| CV-29 | 1 | FALHA | 133 | — | Ferramenta esperada ausente ou com argumentos divergentes: consultar_investimentos; Oráculo CR-34 não atendido; Texto não contém "estimado"; Turno não concluído com status ok; F-02/COTA |
