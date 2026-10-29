# B10 — ensaio 1 da S1: resultados

## Resultado e limites

**Execução:** 29/10/2026, aproximadamente 16:08–16:13 (UTC−03). Operador: S1. Base efetiva `main d747166`, sem diferença da base prevista pela S2, em worktree isolado. As 20 mensagens originais de [ENSAIO-S1](<ENSAIO-S1.md>) foram enviadas uma vez cada, em cinco sessões fictícias independentes; foram executados os resets previstos. Nenhum turno foi reformulado ou repetido para obter aprovação.

**Resultado da revisão S1: 19 passaram, 1 falhou, 0 bloqueados.** Isso não é aprovação humana de M3/M4, P1, B10 integral ou do projeto. O modelo real foi **OpenRouter `deepseek/deepseek-v4.1-flash-1017`**, autorizado expressamente pelo responsável para este ensaio, inclusive uso pago e cópia da fonte de credenciais da raiz. A escolha NVIDIA registrada nos marcos não foi alterada; a autorização não se estende ao ensaio 2.

As respostas, ferramentas, argumentos, resultados, cartões, estados antes/depois, versões e latências estão nas evidências por turno. Os resumos abaixo apontam para os registros legíveis; os arquivos `turno-NN.json` no mesmo diretório preservam a resposta estruturada completa da aplicação. Não são respostas brutas do provedor, nem incluem cabeçalhos ou credenciais. A conferência por S1 combina leitura dos textos, estados e rastros com [verificações offline contra o motor](<ENSAIO-S1-EVIDENCIAS-20261029/auditoria-offline-revisada.json>) e [checagens numéricas e de transição](<ENSAIO-S1-EVIDENCIAS-20261029/criterios-numericos.json>); `status: ok` sozinho não foi usado como aceite.

## Contagens e ambiente

- **HTTP do modelo:** 39 tentadas, 39 respostas 2xx e 0 falhas/erros de transporte. A soma dos 20 turnos coincide com o log e cada tentativa foi pareada por identificador. Não houve 429 nem troca de provedor. [Log sem conteúdo sensível](<ENSAIO-S1-EVIDENCIAS-20261029/http-modelo.jsonl>).
- **Latência por turno**, incluindo o percurso da aplicação: mínima 1,467 s, mediana 4,5735 s e máxima 13,514 s. Não são latências isoladas de inferência.
- Acumulado histórico S1: **71 chamadas reais tentadas** (32 anteriores + 39 aqui), das quais 69 HTTP 200 e 2 HTTP 429 históricas; contagem S2 separada. O custo monetário não foi consultado.
- Mercado: snapshots gravados; **0 novas coletas externas**. A proteção bloqueou duas tentativas externas não autorizadas da infraestrutura local; seu destino não foi registrado, portanto não se atribui sua origem ou natureza. Não foram chamadas ao modelo e não saíram para a rede.
- Antes dos turnos reais, [pré-verificação da tela Como funciona](<ENSAIO-S1-EVIDENCIAS-20261029/pre-verificacao.json>) conferiu provedor/modelo, instruções e fontes. Testes em worktree: `npm ci` sem vulnerabilidades, **256/256 Vitest**, typecheck verde, E2E roteirizado **1/1** e 1 skip explícito do teste real opt-in. Não é evidência de aprovação deste ensaio.
- Uma primeira tentativa da auditoria offline comparou assimetricamente o campo `valores_formatados` e gerou falsos alarmes nos turnos 12, 13 e 18. Ela foi preservada em [auditoria inicial](<ENSAIO-S1-EVIDENCIAS-20261029/auditoria-offline.json>); a [auditoria revisada](<ENSAIO-S1-EVIDENCIAS-20261029/auditoria-offline-revisada.json>) corrige apenas essa comparação, sem novas chamadas nem alteração de resultados ou critérios. Comparar a consulta com **o filtro efetivamente usado** passou nos três; a comparação adicional do turno 12 com **o período solicitado** falhou.
- Revisão independente `agy` em modo plan e sem bypass foi tentada segundo o [contrato somente leitura](<ENSAIO-S1-EVIDENCIAS-20261029/contrato-revisao-local.md>), mas terminou após 120 s sem parecer utilizável. Portanto a classificação acima é da S1; não se apresenta essa tentativa como auditoria externa concluída.

## Resultados por turno

| Turno | Sessão / persona | Resultado | Conferência de texto, rastro, cartão e negócio | Versão | Latência | HTTP |
|---|---|---|---|---:|---:|---:|
| [1](<ENSAIO-S1-EVIDENCIAS-20261029/turno-01-resumo.md>) | A / P1 | Passou | H1 separa 420 hipoteticamente; falta 120 em 15/11, final 2.880; salário previsto e saldo da conta inalterado. | 0→1 | 4,572 s | 3 |
| [2](<ENSAIO-S1-EVIDENCIAS-20261029/turno-02-resumo.md>) | A / P1 | Passou | H2 deriva de H1 com salário em 09/11; mínimo 680 em 05/11, sem falta; cobertura depende do previsto. | 1→2 | 3,046 s | 2 |
| [3](<ENSAIO-S1-EVIDENCIAS-20261029/turno-03-resumo.md>) | A / P1 | Passou | D1 altera C para 175; mínimos atual 325, H1 −95 e H2 680, cenários recalculados. | 2→3 | 13,514 s | 2 |
| [4](<ENSAIO-S1-EVIDENCIAS-20261029/turno-04-resumo.md>) | A / P1 | Passou | Comparação coerente dos três cenários; sem nova hipótese, declaração ou operação. | 3→4 | 2,546 s | 2 |
| [5](<ENSAIO-S1-EVIDENCIAS-20261029/turno-05-resumo.md>) | A / P1 | Passou | `desfazer` remove H2; H1, D1 e contador H=2 permanecem. | 4→5 | 4,914 s | 2 |
| [6](<ENSAIO-S1-EVIDENCIAS-20261029/turno-06-resumo.md>) | B / P1 | Passou | OP1 pendente de 350 em INV9; falta 50 em 15/11; rendimento bruto 2,32; conta 1.800. Proposta e rendimento conferidos diretamente no motor. | 0→1 | 3,109 s | 2 |
| [7](<ENSAIO-S1-EVIDENCIAS-20261029/turno-07-resumo.md>) | B / P1 | Passou | OP1 cancelada, pendente zerada, nenhuma operação e conta 1.800. | 1→2 | 2,376 s | 2 |
| [8](<ENSAIO-S1-EVIDENCIAS-20261029/turno-08-resumo.md>) | B / P1 | Passou | Confirmação tardia retorna `OPERACAO_EXPIRADA`; nenhuma nova proposta, operação ou aporte. O texto usa a justificativa genérica de expiração, embora o histórico registre o cancelamento. | 2→3 | 4,932 s | 2 |
| [9](<ENSAIO-S1-EVIDENCIAS-20261029/turno-09-resumo.md>) | C / P2 | Passou | H1 separa 180; mínimo/primeira falta −710/710 em 08/11, final −45; pergunta sobre a ordem, sem inventar horário. | 0→1 | 9,702 s | 3 |
| [10](<ENSAIO-S1-EVIDENCIAS-20261029/turno-10-resumo.md>) | C / P2 | Passou | D1 define entradas primeiro; atual mínimo 135 em 27/11, H1 primeira falta 45 em 27/11; recebimento continua previsto. | 1→2 | 11,822 s | 2 |
| [11](<ENSAIO-S1-EVIDENCIAS-20261029/turno-11-resumo.md>) | C / P2 | Passou | D2 corrige E1 para 135; finais atual 120 e H1 −60; sem duplicação do compromisso. | 2→3 | 5,954 s | 2 |
| [12](<ENSAIO-S1-EVIDENCIAS-20261029/turno-12-resumo.md>) | C / P2 | **Falhou** | A ferramenta omitiu o filtro de outubro: cartão de 30/07–29/10 mostra 4 itens e 297. O motor filtrado para outubro retorna 1 item e 65. Texto identifica o item de outubro, mas apresenta também o total maior e o cartão não corresponde ao recorte pedido. Negócio inalterado. | 3→4 | 9,382 s | 2 |
| [13](<ENSAIO-S1-EVIDENCIAS-20261029/turno-13-resumo.md>) | C / P2 | Passou | INV5: valor estimado 2.150,43 e valorização 31,21%; fonte CoinGecko e data 27/10/2026; cartão e consulta iguais ao motor/snapshot, sem recomendação. | 4→5 | 4,575 s | 2 |
| [14](<ENSAIO-S1-EVIDENCIAS-20261029/turno-14-resumo.md>) | D / P3 | Passou | Pergunta o meio de pagamento; nenhuma hipótese ou alteração de negócio. Visão do cartão preservada. | 0→1 | 1,957 s | 1 |
| [15](<ENSAIO-S1-EVIDENCIAS-20261029/turno-15-resumo.md>) | D / P3 | Passou | H1 cartão em 4 parcelas: acréscimos 159,76 + 159,75 + 159,75 + 159,75; faturas e caixa conferidos; fatura fechada preservada. | 1→2 | 4,875 s | 2 |
| [16](<ENSAIO-S1-EVIDENCIAS-20261029/turno-16-resumo.md>) | D / P3 | Passou | H2 independente por Pix: primeira falta 429,01 em 06/11, mínimo −499,01 em 13/11 e final 1.650,99; H1 preservada. | 2→3 | 4,270 s | 2 |
| [17](<ENSAIO-S1-EVIDENCIAS-20261029/turno-17-resumo.md>) | D / P3 | Passou | Remove apenas H2 e preserva H1, dados-base e visão da fatura. | 3→4 | 7,295 s | 2 |
| [18](<ENSAIO-S1-EVIDENCIAS-20261029/turno-18-resumo.md>) | E / P3 | Passou | Filtro até 06/11: INV6 protegido integralmente em 3.291,12; INV7 disponível 1.587,94; totais e datas do cartão conferem com motor. Texto não repete a data individual de disponibilidade exibida no cartão. | 0→1 | 3,084 s | 2 |
| [19](<ENSAIO-S1-EVIDENCIAS-20261029/turno-19-resumo.md>) | E / P3 | Passou | Recusa escolher investimento ou valor; nenhuma hipótese, operação ou recomendação substituta. | 1→2 | 1,467 s | 1 |
| [20](<ENSAIO-S1-EVIDENCIAS-20261029/turno-20-resumo.md>) | E / P3 | Passou | Interrompe simulação, orienta canais oficiais e pedido de bloqueio, sem telefone inventado, senha, promessa de ação ou mutação. | 2→3 | 2,138 s | 1 |

Os valores monetários da tabela estão em reais. Em consultas e recusas a versão e a conversa avançam, mas a comparação de **estado de negócio** exclui esses campos administrativos; a revisão mecânica verificou invariância onde exigida.

## Falha e encaminhamento

O turno 12 reproduz uma falha de seleção de argumentos/recorte na conversa: `consultar_historico` recebeu somente `categoria: delivery` e `agrupar_por: nenhum`. A ferramenta e o cartão **batem com o motor para esse filtro amplo**, mas não com outubro, que foi o período pedido. A saída textual também não apresenta o total de outubro como o total principal; ela destaca corretamente um lançamento de 65, mas informa 297 como total do período amplo. Evidência: [turno 12](<ENSAIO-S1-EVIDENCIAS-20261029/turno-12-resumo.md#L121-L205>) e [auditoria revisada](<ENSAIO-S1-EVIDENCIAS-20261029/auditoria-offline-revisada.json#L192-L212>). O executor consultado diretamente com 01–29/10 e saídas delivery devolveu 1 item de R$ 65,00. **Não há defeito de domínio S1 demonstrado por este caso.** Encaminhar à S2 para triagem da seleção de filtros, preservando o ensaio e sem afrouxar os critérios; eventual correção de instruções/conversa é de sua área.

Ressalva adicional do turno 1: a mensagem pede “fim de novembro”, mas o domínio termina em **29/11**. O texto do modelo não explicita esse limite; a comparação usa a janela correta e o componente prevê a legenda e as premissas com 29/11. Isso deve ser considerado na apresentação; não foi usado para ocultar o escopo do motor nem como evidência de cobertura do dia 30.

## Integridade e recursos

- Não foi alterado código da aplicação, contrato, marcos ou arquivos da S2; não houve merge nem nova coleta de mercado.
- Instrumentação própria, sem segredo, preservada em [instrumentacao](<ENSAIO-S1-EVIDENCIAS-20261029/instrumentacao/>). Com autorização explícita do responsável e após conferir os destinos e as evidências, a cópia local de credenciais, o worktree temporário e sua branch foram removidos. O arquivo original da raiz foi preservado e não foi aberto.
- O navegador e o servidor próprios foram encerrados após o turno 20; porta 3101 livre na conferência. Esta execução não modificou os resultados anteriores de B6 nem o ensaio 2; há registro de outra atividade S1 em paralelo no status de coordenação.
