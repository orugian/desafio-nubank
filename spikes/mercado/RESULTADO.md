# B3a parte 1 — coleta pública concluída

28/10/2026 · retomada da brapi às 13:45 de Brasília, após o responsável corrigir o nome da variável.

## Ticker escolhido: PETR4

Foi o primeiro da ordem solicitada com histórico desde 30/07 disponível na consulta autenticada, sem solicitação de compra ou upgrade. Os cinco endpoints retornaram HTTP 200.

| Ticker | HTTP | Pontos históricos | Primeira data | Última data informada |
|---|---|---|---|---|
| PETR4 | 200 | 63 | 2026-07-30 | 2026-10-28 |
| VALE3 | 200 | 63 | 2026-07-30 | 2026-10-28 |
| ITUB4 | 200 | 63 | 2026-07-30 | 2026-10-28 |
| MGLU3 | 200 | 63 | 2026-07-30 | 2026-10-28 |
| BOVA11 | 200 | 63 | 2026-07-30 | 2026-10-28 |

[Manifesto da rodada](<spikes/mercado/respostas/brapi-20261028-corrigida/manifesto-brapi.json>) · [resposta PETR4](<spikes/mercado/respostas/brapi-20261028-corrigida/brapi-PETR4.json>).

A requisição usou range=3mo e interval=1d; credencial somente no cabeçalho exigido. A resposta do dia corrente **não foi homologada como fechamento definitivo**: a coleta aconteceu durante o dia 28/10. A parte 2 deve filtrar/rotular esse ponto conservadoramente ou recolher após fechamento, sem inventar 29/10.

## Demais fontes já coletadas

| Fonte | Disponibilidade registrada | Observação |
|---|---|---|
| BCB SGS 12 | 246 observações de 03/11/2025 a 27/10/2026 | Não preencher os dias ausentes com taxas inventadas |
| CoinGecko BTC/BRL | 93 pontos até 28/10/2026 15:38:50 UTC | Último ponto intradiário; não assumir fechamento definitivo |
| ANBIMA | Calendários de 2026 e 2027 | Feriados futuros da spec confirmados |

[Manifesto das fontes públicas](<spikes/mercado/respostas/manifesto.json>) e respostas brutas no mesmo diretório.

A CoinGecko já havia retornado HTTP 200 na coleta pública, sem chave obrigatória. Não foi necessário investigar, renomear ou editar variável/segredo. A autorização para ajustar o nome foi mantida apenas para eventual necessidade futura; nenhuma alteração desnecessária foi feita.

## Segurança, contagem e próxima entrega

- Cinco novas chamadas brapi; mercado/calendário acumulado: nove (BCB 1, CoinGecko 1, ANBIMA 2 e brapi 5).
- Respostas antigas preservadas. A nova rodada tem subdiretório próprio; não houve sobrescrita dos brutos nem retentativa.
- Nenhum conteúdo do arquivo de segredos foi aberto, exibido ou alterado; nenhuma variável de ambiente foi listada.
- Não houve compra, upgrade, cadastro de faturamento, mudança de contrato ou edição da spec.
- **O responsável deve atualizar o ticker para PETR4 na spec §11.1.** A S2 não edita a spec.
- A parte 1 entrega brutos; ainda não há séries versionadas no esquema 1.0. A parte 2 segue por TDD no worktree da S2 e é necessária para completar a dependência da S1 em B2/B3b.
