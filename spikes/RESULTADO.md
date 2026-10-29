# S0 + B3a parte 1 — relatório da parada obrigatória

28/10/2026 · H0 = 12:30 (America/Sao_Paulo). Exploratório, fora do repositório e sem TDD.

## Atualização — 28/10/2026 13:50 · M0 aprovado e coleta brapi concluída

**M0 APROVADO**, registrado pela S2 em [MARCOS](<coordenacao/MARCOS.md#L3>) por autorização explícita do responsável. O B0 foi conferido na main ffda30b: 82/82 testes, typecheck ok, main limpa e varredura de segredos vazia. Veja as [evidências da revisão](<spikes/M0-REVISAO-S2.md>). A S1 está liberada para B1 conforme as dependências do plano.

A aprovação é restrita ao B0/M0: **não aprova o gate S0, M1 ou B6**, nem altera contratos. O OpenRouter escolhido permanece com resultado literal 1/5 e revisão semântica 3/5 da rodada anterior; nenhuma nova chamada ao modelo foi feita nesta retomada.

A variável da brapi foi corrigida pelo responsável e os cinco tickers retornaram HTTP 200, cada um com 63 pontos de 30/07 a 28/10/2026. **Ticker escolhido: PETR4**, primeiro elegível na ordem prescrita. [Resultado da coleta](<spikes/mercado/RESULTADO.md>) e [manifesto da nova rodada](<spikes/mercado/respostas/brapi-20261028-corrigida/manifesto-brapi.json>).

- O ponto de 28/10 foi coletado durante o dia e não foi homologado como fechamento definitivo. Não foi inventado 29/10.
- BCB segue disponível até 27/10 e CoinGecko até 28/10, com último ponto intradiário. Feriados futuros já conferidos.
- CoinGecko já havia funcionado publicamente; não foi necessário ler, renomear ou editar qualquer segredo/variável.
- Cinco novas chamadas de mercado, total acumulado 9; modelo 0 nesta retomada, acumulado 40 chat completions e duas listagens.
- Respostas antigas preservadas em seus diretórios; nova rodada brapi em subdiretório próprio. Nenhum código da main foi alterado.
- O responsável deve atualizar a spec §11.1 com PETR4. A parte 2 do B3a (fixtures, parsers e séries 1.0 versionadas por TDD) ainda não foi executada.

**Próximo:** B3a parte 2, independente do modelo. B4/M1/B6 continuam sujeitos ao replanejamento do gate do OpenRouter. O M0 não deve manter a S1 esperando esse gate.

---

## Histórico — 28/10/2026 13:32 · OpenRouter escolhido e uso pago autorizado

O responsável escolheu diretamente `openrouter/deepseek/deepseek-v4.1-flash-1017`, autorizou uso pago e dispensou novo teto monetário de desenvolvimento. **A escolha está mantida: não pedir novamente orçamento nem substituir silenciosamente por MiniMax.** A exigência de modelo gratuito foi temporariamente adiada pelo responsável; segurança, M0 e gate funcional não foram dispensados.

Foram executados os cinco casos com o mesmo material do S0, temperatura 0, 700 tokens, tools, tool_choice auto e reasoning.enabled=false. Todos retornaram HTTP 200, com zero tokens de raciocínio reportados. Nenhuma retentativa ou nova listagem.

**Gate não atingido: 1/5 no verificador literal e 3/5 na revisão que considera equivalência decimal. Existem duas falhas reais de comportamento, não apenas representação monetária.** O resultado automático e os brutos foram preservados.

| Provedor | Modelo | Literal preservado | Revisão semântica | Mediana | Máxima | 429 / 5xx / formato | Português |
|---|---|---|---|---|---|---|---|
| OpenRouter | deepseek/deepseek-v4.1-flash-1017 | 1/5 | 3/5 | 0,988 s | 3,131 s | 0 / 0 / 0 | Natural e curto na prosa disponível; falhou no esclarecimento de dado ausente |

| Caso | Observado | Verificador literal | Revisão |
|---|---|---|---|
| CV-01 | criar_hipotese com remover_evento de id "x", em vez de separar | Falha | Falha real: id inventado e alteração errada |
| CV-03 | registrar_declaracao, alterar_evento C, valor "150.00" | Falha por comparação com "150" | Equivalente conforme spec §4.5 |
| CV-07 | propor_movimentacao, INV9, valor "500.00" | Falha por comparação com "500" | Equivalente conforme spec §4.5 |
| CV-11 | criar_hipotese para gasto com meio pix não informado | Falha | Falha real: deveria perguntar o meio, sem ferramenta |
| CV-17 | Sem ferramenta; recusou recomendar produto, ativo ou percentual | Acerto | Acerto |

Evidências das falhas reais: [CV-01:27](<spikes/s0/respostas/openrouter-deepseek_deepseek-v4.1-flash-1017-CV-01.json#L27>) e [CV-11:27](<spikes/s0/respostas/openrouter-deepseek_deepseek-v4.1-flash-1017-CV-11.json#L27>). Não foi executada qualquer dessas alterações num motor ou estado do app. Nenhuma resposta de sucesso foi inventada para ocultar falha.

As respostas informaram provedores de inferência diferentes sob o mesmo id OpenRouter. Essa variação foi observada no campo provider, **sem atribuir a ela a causa dos erros**. Uma próxima rodada pode replanejar instruções/roteamento do mesmo modelo escolhido, sem modificar contratos, aceitar ferramenta errada ou ampliar o requisito de 15 s.

### Continuidade permitida e M0

A S1 concluiu B0 e registrou 82 testes e typecheck verdes na main, merge ffda30b. A coordenação ainda não contém M0 APROVADO. Por isso, não foram iniciados B4, M1 ou B6, nem foi tocado código da S1.

Enquanto faltava M0, foi concluído o [inventário visual do B5](<coordenacao/S2-DESIGN.md>) com as doze referências permitidas: cores estimadas, tipografia livre, espaçamentos, componentes e estrutura das cinco telas. Sem nomes, quantias, textos de conversa ou demais dados pessoais das capturas; nenhuma cópia de imagens para o projeto. Não se trata de frontend implementado nem de fidelidade já validada no navegador.

BRAPI_TOKEN foi conferido somente por presença no nome esperado, sem conteúdo ou pesquisa de outros nomes; continua ausente. Logo, a escolha do ticker e a entrega completa B3a continuam pendentes. Nenhuma nova consulta de mercado nesta rodada.

### Requisições acumuladas após o OpenRouter pago

| Provedor | Listagens | Chat completions | Total |
|---|---|---|---|
| NVIDIA | 1 | 25 | 26 |
| OpenRouter | 1 | 15 | 16 |
| Total | 2 | 40 | 42 |

A autorização para seguir com o modelo pago foi interpretada como permitindo completar os cinco casos adicionais, apesar do antigo teto exploratório OpenRouter 15. O cliente limita esta rodada a 16 acumuladas e agora inclui a listagem já feita na conta; isso não é teto de gasto nem tentativa de contornar as regras da API. Não houve compra de créditos, cadastro de faturamento, alteração de segredo ou requisição extra para consultar saldo pessoal.

### Parada atual

**AGUARDANDO M0 e replanejamento do gate, mantendo o OpenRouter escolhido.** Recomendo liberar ajustes de instruções/roteamento desse mesmo modelo e repetir os cinco casos sem mudar critérios, antes de B4/M1/B6. B3a e B5 continuam independentes do modelo, mas sujeitos aos seus próprios pré-requisitos. O responsável é quem registra as aprovações nos marcos; nenhuma linha de aprovação foi escrita pela S2.

---

## Histórico — 28/10/2026 13:11 · MiniMax M3.1 Flash e fallback condicional

**MiniMax respondeu aos cinco casos abaixo de 15 s, com ferramentas corretas e valores monetários equivalentes aos esperados.** O verificador literal registrou 3/5; uma auditoria offline separada, baseada na gramática da spec, encontrou 5/5 por equivalência decimal. **O resultado automático e gate=false foram preservados; a homologação da divergência cabe ao responsável.**

| Provedor | Modelo | Resultado literal preservado | Revisão por equivalência decimal | Mediana | Máxima | 429 / 5xx / formato | Português |
|---|---|---|---|---|---|---|---|
| NVIDIA | minimaxai/minimax-m3.1-flash | 3/5 | 5/5 | 7,546 s | 12,008 s | 0 / 0 / 0 | Natural e claro nas duas respostas em prosa; pediu o meio e recusou recomendação |

| Caso | Resposta observada | Literal | Auditoria baseada na spec |
|---|---|---|---|
| CV-01 | criar_hipotese, atual, separar, valor "500.00", data 2026-10-30 | Não aprovado: comparação exigia "500" | Equivalente; formato permitido pelo §4.5 |
| CV-03 | registrar_declaracao, alterar_evento C, valor "150.00", data 2026-11-15 | Não aprovado: comparação exigia "150" | Equivalente; formato permitido pelo §4.5 |
| CV-07 | propor_movimentacao, valor "500", destino INV9 | Aprovado | Aprovado |
| CV-11 | Sem ferramenta; pergunta o meio de pagamento | Aprovado | Aprovado |
| CV-17 | Sem ferramenta; recusa recomendação, sem indicar produto, ativo ou percentual | Aprovado | Aprovado |

### Divergência de medição — sem afrouxar o verificador

A [spec §4.5:190](<docs/NEWAI-SPECS.md#L190>) aceita texto decimal com até duas casas, convertido exatamente em centavos; [CR-17b](<docs/NEWAI-SPECS.md#L555>) também aceita valores com casas decimais. Assim, "500.00" e "500", assim como "150.00" e "150", representam o mesmo valor no formato permitido. Não houve troca de ferramenta, id, data ou unidade nos dois casos.

- O verificador original continua registrando **3/5 e gate=false**. Os prompts, critérios implementados e respostas brutas não foram alterados para produzir aprovação.
- A [auditoria separada](<spikes/s0/revisar-minimax.mjs>) remove apenas zeros decimais finais numa cópia em memória e passa essa cópia pelo mesmo verificador; os arquivos brutos são conferidos por hash antes e depois. Não houve alteração de roteiro.
- O [resultado da auditoria](<spikes/s0/revisao-minimax.json>) mantém lado a lado a nota automática original, a revisão e os campos transformados apenas na cópia. Não são cinco testes do app verdes.
- Isso não executa o contrato 1.0 nem o motor da S1 e não substitui M1/B6. Recomendo ao responsável **homologar a equivalência decimal prevista na spec e escolher o MiniMax**, em vez de ativar cobrança por um falso negativo de representação.

### Configuração e documentação

Candidato e ferramentas conferidos no catálogo NVIDIA já gravado e na [referência do endpoint](https://docs.api.nvidia.com/nim/reference/minimaxai-minimax-m3-1-flash-infer). O [model card](https://build.nvidia.com/minimaxai/minimax-m3.1-flash/modelcard) documenta esforço low no chat template. Foi solicitado chat_template_kwargs.reasoning_effort=low, sem presumir raciocínio desligado. As respostas registraram raciocínio não nulo; não foi exposto como texto da assistente. Mantidos temperatura 0, 700 tokens, tools e tool_choice auto.

### Fallback OpenRouter pedido pelo responsável

O [plano/configuração de referência](<spikes/s0/FALLBACK-OPENROUTER.md>) e o [exemplo sem segredos](<spikes/s0/openrouter-temporario.env.example>) foram preparados. O cliente exploratório já aceita OpenRouter e o id `deepseek/deepseek-v4.1-flash-1017` por fetch, sem SDK novo. **Não foi integrado ou ativado no app**: M0 continua ausente nos marcos.

O id existe no [catálogo gravado](<spikes/s0/respostas/openrouter-modelos.json#L598-L817>) e suporta ferramentas e raciocínio opcional, porém tem preço positivo: US$ 0,15–0,30 por milhão de tokens de entrada e US$ 0,60–1,20 por milhão de saída nas faixas registradas. Além disso, cinco novas requisições levariam o OpenRouter de 11 a 16, acima do teto original de 15. Não houve inferência paga, compra, edição de segredos ou aumento de cota. Se o responsável preferir esse fallback apesar da revisão do MiniMax, precisa confirmar teto de gasto e quantidade de chamadas.

### Acumulado após MiniMax

| Provedor | Listagens | Chat completions | Total | Teto S0 |
|---|---|---|---|---|
| NVIDIA | 1 | 25 | 26 | 40 |
| OpenRouter | 1 | 10 | 11 | 15 |
| Total | 2 | 35 | 37 | — |

Cinco novas chamadas reais nesta rodada; nenhuma nova coleta de mercado. Main, contratos e arquivos da S1 intocados. Sem servidor, commit, merge, dependência nova ou mudança de configuração de segredo.

**Parada:** responsável deve decidir entre homologar equivalência decimal e escolher MiniMax (recomendado), ou autorizar explicitamente custo/cota do fallback OpenRouter. B4 continua aguardando M0, e nenhum gate automático foi dispensado. Pendências de brapi e cota pessoal NVIDIA permanecem.

---

## Histórico — 28/10/2026 12:58 · DeepSeek V4.1 Flash indicado pelo responsável

**O gate continua não atingido por indisponibilidade/tempo, não por erro de ferramenta demonstrado neste candidato.** A indicação humana autorizou o teste adicional específico além dos três NVIDIA da rodada original; não foi tratada como escolha final nem como aprovação de M0.

| Provedor | Modelo | Acertos demonstrados / 5 | Mediana das tentativas | Máxima das tentativas | 429 / 5xx / formato | Outros | Português |
|---|---|---|---|---|---|---|---|
| NVIDIA | deepseek-ai/deepseek-v4.1-flash | 0/5 — sem resposta | 20,004 s | 20,018 s | Não observados | 5 × timeout/rede; status HTTP não recebido | Não avaliável |

| Caso | Tempo até encerramento | Resposta recebida | Resultado |
|---|---|---|---|
| CV-01 | 20,018 s | Nenhuma | Não avaliado por falha técnica |
| CV-03 | 20,002 s | Nenhuma | Não avaliado por falha técnica |
| CV-07 | 20,002 s | Nenhuma | Não avaliado por falha técnica |
| CV-11 | 20,004 s | Nenhuma | Não avaliado por falha técnica |
| CV-17 | 20,016 s | Nenhuma | Não avaliado por falha técnica |

Esses tempos medem o encerramento das tentativas pelo cliente com limite de 20 s, **não a latência real de inferência**. Nenhum status HTTP, texto, chamada de ferramenta, contagem de tokens ou confirmação de aceitação dos parâmetros ficou disponível. A classificação sanitizada gravada é timeout/rede; a causa do atraso não foi presumida. O requisito continua sendo resposta abaixo de 15 s, sem ampliação para acomodar o candidato.

- O endpoint e id foram conferidos na [página indicada pelo responsável](https://build.nvidia.com/deepseek-ai/deepseek-v4.1-flash) e na [referência NVIDIA](https://docs.api.nvidia.com/nim/reference/nvidia-deepseek-v4_1-flash-infer). O id também constava no catálogo já gravado, sem nova listagem.
- Foram mantidos os mesmos prompts, doze ferramentas, contexto, temperatura 0, máximo de 700 tokens e critérios. Não foi feita alteração para ensinar as respostas esperadas.
- Suposição de transporte: foi enviado reasoning_effort=1, mínimo numérico documentado pelo [autor](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash) e mencionado no [model card NVIDIA](https://build.nvidia.com/deepseek-ai/deepseek-v4.1-flash/modelcard). A referência HTTP NVIDIA não explicita esse campo; como não houve resposta, sua aceitação e o raciocínio efetivamente usado NÃO estão confirmados. Não se afirmou que raciocínio estava desligado.
- O cliente agora também interrompe os envios se houver exigência de pagamento HTTP 402, além de chave recusada. Nenhuma dessas respostas foi observada e nenhum pagamento foi realizado.
- Foram feitas exatamente 5 novas chat completions, sem retentativas, troca de provedor, novo mercado ou alteração de segredo/contrato.

### Cotas acumuladas após o teste adicional

| Provedor | Listagens | Chat completions | Total | Teto S0 |
|---|---|---|---|---|
| NVIDIA | 1 | 20 | 21 | 40 |
| OpenRouter | 1 | 10 | 11 | 15 |
| Total | 2 | 30 | 32 | — |

### Recomendação atual e parada

Não escolher o modelo ainda: esta rodada não conseguiu avaliar sua qualidade. Recomendo autorizar um diagnóstico curto de disponibilidade/transporte desse endpoint (até três novas requisições), **sem flexibilizar o gate de 15 s nem os casos**. Não foi executado automaticamente. B4/M1/B6 seguem parados; B3a e B5 permanecem independentes do modelo, com seus próprios pré-requisitos. Continuam pendentes BRAPI_TOKEN e a conferência da cota pessoal NVIDIA pelo responsável.

Sintaxe do cliente verificada e métricas consolidadas offline. A revisão dos cinco registros confirmou ausência de respostas avaliáveis; não há amostra de português. Nenhum arquivo da S1 foi alterado, nenhum merge ou servidor iniciado.

---

## Histórico — decisão da rodada inicial: gate NÃO atingido

Nenhum candidato demonstrou pelo menos 4/5 acertos com latência máxima abaixo de 15 s. **Não recomendo escolher um modelo nesta rodada.** B4, M1 e B6 ficam parados até replanejamento humano. B3a e B5 não dependem do modelo, mas continuam sujeitos a credenciais, M0 e demais aprovações.

Recomendação ao responsável: autorizar um novo S0 com um modelo NVIDIA atual e endpoints verificados na documentação vigente, mantendo os mesmos cinco casos e as doze ferramentas. Alternativas do plano: reduzir ferramentas ou experimentar saída JSON estruturada; nenhuma mudança de contrato foi aplicada. OpenRouter não foi validado como contingência, pois respondeu 429 em todos os envios. Não houve compra, faturamento, deploy nem troca automática para modelo pago.

## Tabela de modelos

As latências abaixo medem cada requisição completa. Para respostas HTTP de erro, **não são latências de inferência** nem evidência de aprovação de F-01.

| Provedor | Modelo | Acertos confirmados / 5 | Mediana | Máxima | 429 / 5xx / formato | Outros | Português |
|---|---|---|---|---|---|---|---|
| NVIDIA | nvidia/nemotron-3.5-lightning-30b-a3b | 1/5 | 1,244 s | 1,903 s | 0 / 0 / 0 | 3 erros de comportamento; CV-17 inconclusivo | Sem amostra de prosa: só chamadas de ferramentas |
| NVIDIA | nv-mistralai/mistral-nemo-12b-instruct | 0/5 — indisponível | 0,155 s | 0,521 s | 0 / 0 / 0 | 5 × HTTP 404 | Não avaliável |
| NVIDIA | mistralai/mistral-large-2-instruct | 0/5 — indisponível | 0,158 s | 0,452 s | 0 / 0 / 0 | 5 × HTTP 404 | Não avaliável |
| OpenRouter | google/gemma-4-26b-a4b-it:free | 0/5 — indisponível | 0,343 s | 0,655 s | 5 / 0 / 0 | Sem resposta de inferência | Não avaliável |
| OpenRouter | google/gemma-4-31b-it:free | 0/5 — indisponível | 0,336 s | 0,501 s | 5 / 0 / 0 | Sem resposta de inferência | Não avaliável |

0/5 em falhas técnicas significa ausência de acerto demonstrado, **não reprovação da capacidade intrínseca do modelo**. Não houve 401/403 nem diagnóstico de chave recusada. A causa exata dos 404/429 não foi inferida de um corpo bruto de erro.

### Revisão das cinco respostas válidas do Nemotron Lightning

| Caso | Critério | Observado | Conclusão |
|---|---|---|---|
| CV-01 | criar_hipotese, separar, valor "500", hoje ou sem data | propor_movimentacao, valor "500", INV9 | Falha: pergunta virou proposta, contrariando IN-05 |
| CV-03 | registrar_declaracao, alterar_evento C, valor "150" | Ferramenta e id corretos, mas valor "15000" | Falha: confundiu reais com centavos |
| CV-07 | propor_movimentacao, valor "500", INV9 | Exatamente os argumentos esperados | Acerto |
| CV-11 | Nenhuma ferramenta; perguntar meio de pagamento | propor_movimentacao, valor "800", destino inexistente "caixinha_imprevisto" | Falha: não pediu o meio e inventou destino |
| CV-17 | Sem recomendação de produto, ativo ou percentual | consultar_investimentos, sem texto final | Inconclusivo: consulta por si só não é recomendação; não houve resposta final para avaliar |

O verificador automático conservador conta CV-17 como não aprovado; a revisão manual distingue inconclusivo de recomendação indevida. Mesmo se esse caso fosse aprovado numa continuação, o candidato chegaria a no máximo 2/5 e continuaria fora do gate. Não houve chamada adicional nem resultado de ferramenta inventado para completar esse caso.

## Método e material

- Catálogos reais consultados em [NVIDIA](https://integrate.api.nvidia.com/v1/models) e [OpenRouter](https://openrouter.ai/api/v1/models); somente ids terminados em `:free` com `tools` entre os parâmetros suportados no segundo.
- Esquemas das doze ferramentas, IN-01 a IN-16 e contexto de P1 escritos à mão, sem ler capturas. O campo ilustrativo `operacao` é provisório do spike; não é alteração do contrato congelado. No M1, apenas nomes de campos poderão ser mapeados conforme a aprovação existente.
- Mesmos cinco prompts, contexto e ferramentas por candidato; temperatura 0, máximo de 700 tokens, `tools` e `tool_choice: auto`. Cada caso é independente e o modelo não executa operações no protótipo durante o spike.
- Os dois Mistral constavam no catálogo, mas seus endpoints responderam 404. A documentação NVIDIA antiga também retornou 404; o suporte linguístico e a ferramenta foram conferidos nos model cards dos autores.
- Justificativa dos candidatos: [Mistral NeMo — ferramentas e benchmark em português](https://huggingface.co/mistralai/Mistral-Nemo-Instruct-2407), [Mistral Large 2 — ferramentas e português](https://huggingface.co/mistralai/Mistral-Large-Instruct-2407), [Gemma 4 — multilinguismo e function calling nativo](https://ai.google.dev/gemma/docs/core/model_card_4).
- Nos Gemma, raciocínio explicitamente desligado conforme a [documentação OpenRouter](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).
- O terceiro NVIDIA foi incluído dentro do teto de três candidatos após os 404. Usou `reasoning_budget: 0` e `stream: false`, conforme a [API vigente](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b-infer). Os cinco resultados confirmaram zero tokens de raciocínio. O [model card](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/modelcard) menciona português no pré-treino, mas não o lista como idioma otimizado; foi um candidato exploratório, sem qualidade de português presumida.
- Primeira tentativa de listagem não chamou a rede: os nomes esperados das chaves estavam ausentes. Após o responsável corrigir os nomes, houve uma listagem efetiva por provedor.
- Há cinco respostas brutas de sucesso. Nas vinte falhas técnicas foram gravados só status e classificação, sem corpo bruto, cabeçalhos, credenciais ou URL no registro de erro.
- Amostra pequena: cinco casos uma vez por candidato não substituem a avaliação real B6 nem demonstram estabilidade 2/2.

### Requisições reais acumuladas

| Provedor | Listagem | Chat completions | Total | Teto S0 |
|---|---|---|---|---|
| NVIDIA | 1 | 15 | 16 | 40 |
| OpenRouter | 1 | 10 | 11 | 15 |
| Total | 2 | 25 | 27 | — |

A NVIDIA ficou abaixo de 40 requisições inclusive no total do spike; portanto também abaixo de 40 por minuto. Não foram feitas novas tentativas OpenRouter depois dos dez 429. É necessário o responsável conferir no painel NVIDIA o limite pessoal de créditos/cota; a documentação pública não comprova a cota desta conta.

## B3a parte 1 — mercado e calendário

| Fonte | Resposta gravada | Cobertura / última data | Situação |
|---|---|---|---|
| BCB SGS 12 | 246 observações | 03/11/2025 a 27/10/2026 | Coleta bruta concluída; sem inventar 28 ou 29/10 |
| CoinGecko BTC/BRL | 93 pontos | Primeiro 29/07/2026 00:00 UTC; último 28/10/2026 15:38:50 UTC | Coleta bruta concluída; último ponto é intradiário, não fechamento |
| brapi | Nenhuma chamada | Indisponível | BRAPI_TOKEN ausente com esse nome; cinco tickers não testados; ticker não escolhido |
| ANBIMA | HTML de 2026 e 2027 | Feriados futuros da spec conferidos | 02/11, 15/11, 20/11, 25/12/2026 e 01/01/2027 confirmados |

Fontes: [BCB SGS 12](https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=03/11/2025&dataFinal=29/10/2026), [CoinGecko](https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=brl&days=92&interval=daily), [ANBIMA 2026](https://www.anbima.com.br/feriados/fer_nacionais/2026.asp) e [ANBIMA 2027](https://www.anbima.com.br/feriados/fer_nacionais/2027.asp).

- Coleta em 28/10/2026, aproximadamente 12:39 de Brasília. Mercado/calendário: 4 requisições HTTP, sendo 2 séries e 2 calendários.
- A resposta CoinGecko inclui ponto anterior ao histórico e cotação parcial do dia corrente. A parte 2 terá de filtrar/rotular conforme o contrato; não se deve tratar o ponto intradiário como fechamento nem preencher 29/10 com dado inventado.
- PETR4, VALE3, ITUB4, MGLU3 e BOVA11 aguardam BRAPI_TOKEN. O responsável só atualizará a spec com o ticker depois de uma coleta válida. Não houve pesquisa de outros nomes de chave.
- A retomada específica da brapi preserva os brutos anteriores e tem manifesto separado. Não foram sobrescritos os arquivos coletados.
- Parte 2 não iniciada: nenhum parser TDD, arquivo no esquema 1.0 ou merge foi realizado. Os brutos ainda não atendem à dependência completa da S1 para B2/B3b.

## Verificações e segurança

- Arquivo de segredos carregado somente pelo Node, conforme o caminho autorizado pelo responsável. Conteúdo nunca aberto, exibido, resumido ou versionado. Nenhuma variável de ambiente listada.
- Nenhuma captura aberta, nenhum dado real transcrito, nenhum arquivo da S1 ou contrato alterado. Nenhum servidor iniciado.
- Scripts com sintaxe verificada por Node; consolidação das medições executada sem rede. Sem testes do app ou typecheck nesta etapa exploratória.
- Varredura de segredos em todos os arquivos de spikes executada com a expressão exigida: resultado vazio. No PowerShell, foi usado Get-ChildItem -Recurse -File em pipeline para Select-String, pois Select-String não possui parâmetro -Recurse. Apenas caminhos e números de linha seriam exibidos caso houvesse achados, nunca a linha potencialmente sensível.
- Sem commits, merges, worktrees ou trava de merge nesta etapa fora do repositório.

## Precisa do responsável

1. **Gate:** autorizar novo spike com candidato NVIDIA atual (recomendado), ou escolher replanejamento com menos ferramentas/JSON estruturado. Não registrar MODELO ESCOLHIDO com base nestes resultados.
2. **Mercado:** disponibilizar BRAPI_TOKEN no arquivo de segredos autorizado, sem enviar valor pelo chat.
3. **Cota:** informar o limite pessoal de créditos/cota NVIDIA.

Parada obrigatória cumprida por relatório; nenhuma continuação automática de B4/M1/B6 ou alteração de contrato será feita.
