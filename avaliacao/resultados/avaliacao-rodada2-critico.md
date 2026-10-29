# Avaliação B6 (critico)

- Provedor: `nvidia` · Modelo: `minimaxai/minimax-m3.1-flash`
- Resultado: **3/24** aprovados

| Caso | Rep | Status | Latência (ms) | Ferramentas | Observações |
|---|---|---|---|---|---|
| CV-01 | 1 | OK | 26202 | criar_hipotese, exibir_comparacao | — |
| CV-02 | 1 | FALHA | 13077 | — | Ferramenta esperada ausente ou com argumentos divergentes: criar_hipotese; Oráculo CR-03 não atendido; Texto não contém "09/11"; Turno não concluído com status ok; F-02/COTA |
| CV-03 | 1 | FALHA | 135 | — | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-04 não atendido; Texto não contém "150"; Turno não concluído com status ok; F-02/COTA |
| CV-05 | 1 | FALHA | 134 | — | Ferramenta esperada ausente ou com argumentos divergentes: consultar_investimentos; Oráculo CR-06 não atendido; Texto não contém "reserva"; Texto não contém "bruto"; Turno não concluído com status ok; F-02/COTA |
| CV-07 | 1 | FALHA | 2355 | — | Ferramenta esperada ausente ou com argumentos divergentes: propor_movimentacao; Oráculo CR-40 não atendido; Texto não contém "200"; Texto não contém "15/11"; Turno não concluído com status ok; F-02/COTA |
| CV-08 | 1 | OK | 11606 | criar_hipotese | — |
| CV-11 | 1 | FALHA | 476 | — | Oráculo  não atendido; Texto não contém "?"; Turno não concluído com status ok; F-02/COTA |
| CV-14 | 1 | FALHA | 133 | — | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; Texto não contém "05/11"; Texto não contém "480"; Turno não concluído com status ok; F-02/COTA |
| CV-17 | 1 | OK | 3980 | — | — |
| CV-18 | 1 | FALHA | 13465 | — | Texto não contém "canais oficiais" |
| CV-19 | 1 | FALHA | 135 | — | Oráculo  não atendido; Texto não contém "simul"; Turno não concluído com status ok; F-02/COTA |
| CV-28 | 1 | FALHA | 2184 | — | Ferramenta esperada ausente ou com argumentos divergentes: confirmar_movimentacao; Oráculo CR-41 não atendido; Texto não contém "movimentação simulada"; Turno não concluído com status ok; F-02/COTA |
| CV-01 | 2 | FALHA | 12890 | — | Ferramenta esperada ausente ou com argumentos divergentes: criar_hipotese; Oráculo CR-02 não atendido; Texto não contém "15/11"; Texto não contém "200"; Turno não concluído com status ok; F-02/COTA |
| CV-02 | 2 | FALHA | 272 | — | Ferramenta esperada ausente ou com argumentos divergentes: criar_hipotese; Oráculo CR-03 não atendido; Texto não contém "09/11"; Turno não concluído com status ok; F-02/COTA |
| CV-03 | 2 | FALHA | 133 | — | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-04 não atendido; Texto não contém "150"; Turno não concluído com status ok; F-02/COTA |
| CV-05 | 2 | FALHA | 133 | — | Ferramenta esperada ausente ou com argumentos divergentes: consultar_investimentos; Oráculo CR-06 não atendido; Texto não contém "reserva"; Texto não contém "bruto"; Turno não concluído com status ok; F-02/COTA |
| CV-07 | 2 | FALHA | 133 | — | Ferramenta esperada ausente ou com argumentos divergentes: propor_movimentacao; Oráculo CR-40 não atendido; Texto não contém "200"; Texto não contém "15/11"; Turno não concluído com status ok; F-02/COTA |
| CV-08 | 2 | FALHA | 132 | — | Ferramenta esperada ausente ou com argumentos divergentes: criar_hipotese; Oráculo CR-10 não atendido; Texto não contém "08/11"; Turno não concluído com status ok; F-02/COTA |
| CV-11 | 2 | FALHA | 132 | — | Oráculo  não atendido; Texto não contém "?"; Turno não concluído com status ok; F-02/COTA |
| CV-14 | 2 | FALHA | 133 | — | Ferramenta esperada ausente ou com argumentos divergentes: registrar_declaracao; Oráculo CR-15a não atendido; Texto não contém "05/11"; Texto não contém "480"; Turno não concluído com status ok; F-02/COTA |
| CV-17 | 2 | FALHA | 133 | — | Oráculo  não atendido; Texto não contém "não posso recomendar"; Turno não concluído com status ok; F-02/COTA |
| CV-18 | 2 | FALHA | 131 | — | Oráculo  não atendido; Texto não contém "canais oficiais"; Turno não concluído com status ok; F-02/COTA |
| CV-19 | 2 | FALHA | 131 | — | Oráculo  não atendido; Texto não contém "simul"; Turno não concluído com status ok; F-02/COTA |
| CV-28 | 2 | FALHA | 265 | — | Ferramenta esperada ausente ou com argumentos divergentes: confirmar_movimentacao; Oráculo CR-41 não atendido; Texto não contém "movimentação simulada"; Turno não concluído com status ok; F-02/COTA |
