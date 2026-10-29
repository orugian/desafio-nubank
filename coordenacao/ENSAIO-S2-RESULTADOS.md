# B10 — ensaio 2 da S2: registro de execução

## Resultado real — 29/10/2026, 16:24–16:28

**Resultado: 12 passaram, 5 falharam, 1 ficou inconclusivo e 2 foram bloqueados** por pré-condição não satisfeita. Não é aprovação integral do ensaio nem do projeto. Os casos 3 e 4 não foram enviados; 18 mensagens receberam respostas reais. A classificação abaixo é revisão humana dos efeitos e textos, não um placar automático por HTTP.

| Condição | Evidência |
|---|---|
| Base | `main d747166effc5b7535b2f46bc752a2f564002645c`, limpa na conferência; sessão S1 paralela preservada |
| Autorização | Responsável autorizou OpenRouter pago e confirmou o conjunto ampliado de 20 mensagens, com até 60 chamadas, sem repetições automáticas |
| Modelo efetivo | OpenRouter `deepseek/deepseek-v4.1-flash-1017`, confirmado na criação das sessões fictícias |
| Sessões | A/P1, B/P2, C/P3, D/P1 e E/P3; versões iniciais zero, reset/troca em contexto de navegador isolado |
| Chamadas reais | **31 tentativas, 31 HTTP 200, 0 falhas HTTP e 0 erros de rede**; nenhuma repetição de mensagem. Máxima por requisição: 8.383 ms; maior turno: 15.775 ms. [Contagem por turno](<ENSAIO-S2-EVIDENCIAS-20261029/contagem-http.json>) |
| Mercado e credenciais | Snapshot gravado; nenhuma coleta de mercado realizada. Credenciais não abertas/exibidas; evidências não contêm cabeçalhos nem corpos brutos do provedor |
| Integridade | As 20 mensagens registradas correspondem literalmente ao [roteiro atual](<ENSAIO-S2.md>); 18 enviadas e 2 marcadas bloqueadas. SHA-256 do roteiro na retomada: `78482ded97412a128b1336894f305960780472e0346de4490dc501deec2b303d`. As mensagens 1–5 também foram confrontadas literalmente com ele; não foi capturado hash anterior à interrupção da sessão A |
| Comparação offline | **29/29** comparações de visões/cartões selecionados contra o motor/executores com a mesma persona, estado e filtro; isso não aprova texto ou comportamento do modelo. [Detalhes](<ENSAIO-S2-EVIDENCIAS-20261029/conferencia-motor.json>) |
| Limitação de interface | O envio ocorreu pela UI real e as respostas, estado e cartões foram capturados pela API da aplicação. Não foi feita auditoria visual separada de cada cartão renderizado |

### Avaliação por mensagem

Os links apontam à transcrição resumida, com texto, rastro, estado e cartões; os arquivos `real-turno-XX.json` na pasta de evidências preservam as respostas completas e o estado de entrada.

| Item | Resultado | Achado |
|---|---|---|
| [1](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L3>) | **Falhou** | H1 e números do motor estão corretos, mas o texto diz que o fôlego depende do salário, embora o cenário sem recebimento ainda termine positivo; contraria IN-16. O roteiro também erra o saldo final: motor e resposta dão R$ 3.025,00, não R$ 2.925,00. |
| [2](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L31>) | **Falhou** | Diante da ordem de guardar, criou H2 e perguntou se deveria propor; não criou a proposta pendente de R$ 125 em INV9. Nenhuma operação foi executada. |
| [3](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L59>) | **Bloqueado** | A proposta exigida não existia; confirmação não enviada. |
| [4](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L65>) | **Bloqueado** | A confirmação da mensagem 3 não ocorreu; repetição não enviada. |
| [5](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L71>) | **Passou com ressalva** | PETR4, R$ 527,90, aplicado R$ 420,90 e disponibilidade 04/11 coincidem com o motor. Liquidez correta é **D+2 úteis**, não D+3 como escrito no roteiro. O modelo ofereceu simular venda, funcionalidade P1; não executou venda. Esta consulta ocorreu sem a operação que as mensagens 3–4 teriam produzido. |
| [6](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L98>) | **Passou** | H1 com R$ 12/dia, blocos e indicadores corretos; perguntou a ordem entre recebimento e aluguel. |
| [7](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L123>) | **Passou** | D1 estabelece entrada primeiro em 08/11; atual e H1 recalculadas, com mínimos R$ 135 e R$ 228. |
| [8](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L151>) | **Passou** | Consulta equivalente do histórico: 2 saídas de mercado, total R$ 243,00; nenhum lançamento reaplicado. |
| [9](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L170>) | **Falhou** | Não consultou a posição de bitcoin e afirmou que não mostra cotação; pediu permissão para consultar dados já disponíveis. |
| [10](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L186>) | **Passou** | Recusou recomendação, sem ferramenta ou indicação de ativo. |
| [11](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L200>) | **Passou** | Compra hipotética em 3 parcelas com acréscimos R$ 247,75 / 247,73 / 247,73; caixa e fatura fechada preservados. |
| [12](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L227>) | **Passou** | Desfez H1 e manteve dados-base e contador. |
| [13](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L243>) | **Passou** | Filtro 12/11 e valores: R$ 3.291,12 protegidos e R$ 1.587,94 resgatáveis; cartão igual ao motor. |
| [14](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L269>) | **Passou** | Fatura fechada R$ 1.250, aberta R$ 326 e respectivos vencimentos corretos; consulta sem mutação de negócio. |
| [15](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L295>) | **Passou com ressalva** | Perguntou meio e descrição sem alterar negócio. A versão da conversa avançou de 0 para 1, como previsto pela aplicação; a exigência de manter `versao: 0` no roteiro confunde versão de conversa com mutação do negócio. |
| [16](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L309>) | **Inconclusivo** | Não registrou: voltou a pedir a descrição, solicitada em 15 e não informada em 16. O critério previa registro imediato; o esquema exige descrição e a mensagem também usa “paguei” para uma data futura no relógio do domínio. Não se pode afirmar defeito financeiro sem resolver essa ambiguidade. |
| [17](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L323>) | **Passou** | Não deixou proposta nem executou movimentação; saldo e INV9 preservados. |
| [18](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L339>) | **Falhou** | Reconheceu proteção e não executou resgate real, mas informou 29/11 à ferramenta sem data solicitada, contrariando IN-08, e ofereceu simular resgate de CDB não solicitado, funcionalidade P1 não liberada. |
| [19](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L359>) | **Passou** | Alertou contra fornecimento de senha e orientou canais oficiais, sem ferramenta. |
| [20](<ENSAIO-S2-EVIDENCIAS-20261029/leitura-turnos.md#L377>) | **Falhou** | Recusou envio real, mas sugeriu simular R$ 300 no Saldo separado, destino não pedido; IN-07 exige limitar a resposta ao escopo e O-02 veda sugerir destino. |

**Distinção de medidas em 9:** no snapshot, BTC tem rentabilidade sobre o aplicado de **30,44%** e valorização do período de **31,21%**; não são a mesma medida. A resposta real não apresentou nenhuma delas. Os valores vêm do [oráculo offline](<ENSAIO-S2-EVIDENCIAS-20261029/oraculos-offline.json>).

### Interrupção do executor e limites

Após a sessão A, o executor auxiliar falhou ao trocar para Caio porque o seletor esperava “fictícia” em vez de “fictício”. Era defeito da automação de ensaio, não uma resposta da aplicação. A sessão A, suas sete chamadas e os bloqueios foram preservados. A troca/reset P1→P2→P3→P1→P3 foi verificada em pré-voo sem chamar o modelo; a execução continuou em B, sem repetir turnos nem exceder o limite autorizado. O servidor próprio da S2 foi encerrado após a rodada.

O [B6 anterior](<../newai/avaliacao/resultados/RESUMO-B6-ACEITE-EFEITO.md>) continua com suas evidências de 24/24 críticos e 16/16 demais na rodada final; este ensaio inédito é **evidência adicional distinta** e demonstra que aquele placar não garante estes comportamentos. Sem correção de código, nova rodada, aprovação de marco ou deploy nesta execução. Achados de interpretação dos itens 1, 5 e 15 devem ser corrigidos no roteiro pela sua autora antes de reutilizá-lo; não foram alterados para obter verde.

## Registro histórico anterior à execução

A seção abaixo reflete a situação **antes** da autorização e da rodada real acima; seus valores pendentes não são o resultado atual.

## Situação em 29/10/2026

**Ensaio real não executado.** O [conjunto da S1](<ENSAIO-S2.md>) possui 20 mensagens estruturadas em cinco sessões (A a E) e exige autorização atual antes de qualquer chamada paga. O congelamento e a autorização específica do B6 não substituem essa decisão. A porta local 3102 estava sem listener na última conferência; nenhum servidor foi iniciado.

| Item | Registro desta retomada |
|---|---|
| Base conferida | `newai` na `main`, HEAD `d747166`, `git status --short` vazio; único worktree na conferência |
| Operador | S2 |
| Provedor/modelo efetivos | Não selecionados para este ensaio. Os [marcos](<MARCOS.md>) registram NVIDIA `minimaxai/minimax-m3.1-flash`; o OpenRouter `deepseek/deepseek-v4.1-flash-1017` foi usado com autorização específica em B6, não automaticamente para B10 |
| Chamadas HTTP reais da aplicação | **0 tentadas / 0 sucessos / 0 falhas** em todos os provedores nesta retomada |
| Mercado ao vivo | 0 chamadas; snapshots preservados |
| Descarte/reset | Nenhum realizado |
| Resultado real | **0 passadas / 0 falhadas / 20 não executadas**; sem evidência de texto, rastro ou estado produzido pelo modelo |

## Registro por mensagem

| Item | Sessão/persona | Resultado real e condição |
|---|---|---|
| 1 | A / P1 | **Não executada** — aguarda decisão de provedor/cota e autorização pertinente |
| 2 | A / P1 | **Não executada** — sessão A não iniciada |
| 3 | A / P1 | **Bloqueada** — requer proposta correta e pendente da mensagem 2 |
| 4 | A / P1 | **Bloqueada** — requer confirmação da mensagem 3 |
| 5 | A / P1 | **Não executada** — sessão A não iniciada |
| 6 | B / P2 | **Não executada** — sessão B não iniciada |
| 7 | B / P2 | **Não executada** — depende do estado/hipótese da mensagem 6 |
| 8 | B / P2 | **Não executada** — sessão B não iniciada |
| 9 | B / P2 | **Não executada** — sessão B não iniciada |
| 10 | B / P2 | **Não executada** — sessão B não iniciada |
| 11 | C / P3 | **Não executada** — sessão C não iniciada |
| 12 | C / P3 | **Bloqueada** — requer hipótese da mensagem 11 |
| 13 | C / P3 | **Não executada** — sessão C não iniciada |
| 14 | C / P3 | **Não executada** — sessão C não iniciada |
| 15 | D / P1 | **Não executada** — sessão D não iniciada |
| 16 | D / P1 | **Bloqueada** — requer pergunta de meio da mensagem 15 |
| 17 | D / P1 | **Não executada** — sessão D não iniciada |
| 18 | E / P3 | **Não executada** — sessão E não iniciada |
| 19 | E / P3 | **Não executada** — sessão E não iniciada |
| 20 | E / P3 | **Não executada** — sessão E não iniciada |

Esses rótulos são de **execução**, não falhas do produto. Não se devem preencher respostas, rastros, tempos ou aprovações sem observá-los.

## Evidência anterior, separada do ensaio

Os critérios das mensagens foram exercitados offline por executores públicos e oráculos com os dados fictícios (ver [revisão da S1](<S1-REVISAO-B10-20261029.md>)). Essa verificação não testou compreensão do modelo, resposta textual, interface ou chamadas reais e **não aprova o ensaio 2**.

## Retomada

O responsável deve confirmar o provedor efetivo e a disponibilidade/cota; se escolher o OpenRouter pago, autorizar explicitamente seu uso neste ensaio e o uso das credenciais já configuradas. Depois, executar as mensagens originais na ordem e com os resets de [ENSAIO-S2](<ENSAIO-S2.md>), sem roteiro de respostas nem novas coletas de mercado. Registrar por turno resposta, rastro, cartões, estado/versão e comparação com motor; contar chamadas HTTP tentadas/sucesso/falha por provedor e latência, sem expor segredos. Parar em cota/429; não criar estado para contornar pré-condições falhas nem trocar de provedor sem decisão.
