# Relatório de Pesquisa e Priorização de Oportunidades: IA Conversacional para a Experiência do Cliente Nubank

---

## A. Síntese Executiva

Esta investigação analisou atritos no atendimento do Nubank utilizando fontes públicas auditáveis (Reclame Aqui, Reddit, NuCommunity e Banco Central). A oportunidade mais promissora identificada é o **Assistente Conversacional de Emergência e Rastreamento de Golpes/MED (Pix e Cartão)**.

O usuário prioritário é o cliente (PF ou MEI) vítima de golpe (engenharia social, falsa central) ou compra não reconhecida, no ápice do estresse e vulnerabilidade. A sustentação empírica demonstra que, embora o Nubank possua ferramentas de segurança e o hub SOS Nu, o atendimento em momentos de crise sofre com opacidade: o chat e o telefone direcionam para e-mails lentos, gerando respostas automáticas impessoais e falta de visibilidade sobre o andamento do Mecanismo Especial de Devolução (MED) do Banco Central, convertendo clientes em detratores públicos.

A proposta de IA conversacional acolhe o usuário em pânico, executa triagem imediata com linguagem clara, guia medidas preventivas e traduz os prazos regulatórios do MED em linguagem transparente.

A principal incerteza reside em determinar se a excelência no acolhimento e na previsibilidade comunicacional é suficiente para sustentar CSAT e retenção nos casos em que a recuperação financeira do dinheiro for tecnicamente inviável (quando a conta fraudadora de destino não possui saldo remanescente).

---

## B. Comparação das Oportunidades

| Oportunidade e mercado | Usuário e momento da jornada | Atrito identificado | Evidências | Oferta atual do Nubank | Contribuição possível da IA conversacional | Prioridade e justificativa | Concorrente já faz e tem resultado comprovado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Assistente de Emergência para Golpes, Fraudes e Rastreamento do MED** *(Brasil - PF/PJ)* | Cliente vítima de golpe Pix (falsa central, QR code malicioso) ou compra não reconhecida no cartão. Momento pós-incidente imediato. | **Opacidade e desamparo em crise:** O cliente entra em pânico, o chat transfere para e-mail e respostas automáticas não explicam o rito do MED, requisitos de boletim de ocorrência ou chances reais de estorno. | **E01**, **E02**, **E08** | Central de Proteção no app, plataforma SOS Nu com artigos estáticos e canais telefônicos/chat com encaminhamento para suporte por e-mail. | Acolhimento empático em linguagem natural, coleta estruturada de evidências do golpe (prints, chave Pix, B.O.), execução de travas preventivas e explicabilidade em tempo real do status do MED. | **Alta (Recomendada):** Maior gravidade emocional e risco de perda de patrimônio; atrito diretamente ligado à criação de detratores e cancelamentos. Perfeito ajuste ao formato conversacional ao vivo. | **Revolut** possui fluxo conversacional guiado e instantâneo para denúncia de fraudes com timeline visual de chargeback; **Inter** disponibiliza painel de acompanhamento do status do MED no app. |
| **2. Assistente de Transparência e Regularização em Bloqueios Cautelares de Conta** *(Brasil - PF)* | Correntista com conta ou saldo bloqueado preventivamente por movimentação atípica ou suspeita de fraude/MED. | **"Muro de silêncio" e encerramento sumário:** O cliente tem seu saldo bloqueado sem aviso; o atendimento telefônico/chat afirma não poder informar critérios e remete a e-mails padronizados que encerram a conta sob cláusulas contratuais. | **E01**, **E02**, **E03** | Motor antifraude que executa bloqueio preventivo de 3 dias + 5 dias para resgate e encerramento irreversível, sem canal interativo de contraprova. | Interface de esclarecimento do rito regulatório (Resolução BCB 147/2021), coleta de contraprovas de legitimidade da transação e facilitação do resgate de saldo residual para outra titularidade. | **Média:** Altíssima gravidade, porém a decisão final de desbloqueio compete estritamente às áreas de Compliance/PLD; risco de intervenção da IA interferir em políticas regulatórias de segurança. | **Revolut** e **N26** oferecem rito conversacional de autocredenciamento/justificativa de fundos dentro do app (*in-app verification flow*) antes do encerramento forçado. |
| **3. Consultor Conversacional de Liquidez e Resgate de Caixinhas** *(Brasil - PF)* | Poupador ou investidor iniciante que solicita resgate de Caixinhas (RDB ou Fundo), especialmente em fins de semana ou após 14h. | **Incompreensão de prazos e susto com "saldo sumido":** O cliente solicita o dinheiro, o valor sai da Caixinha mas não entra na conta imediatamente (D+1 útil); gera pânico de perda financeira e frustração com tributação (IOF/IR regressivo nos primeiros 30 dias). | **E08** | Interface padrão de Caixinhas com escolha de objetivo, exibição de rentabilidade estimada e aviso textual estático de horário de corte. | Simulação prévia ao resgate demonstrando valor líquido exato (com desconto detalhado de IR/IOF em R$) e indicação precisa de data/horário em que o crédito entrará na conta corrente. | **Média-Baixa:** Atrito frequente de primeiro nível, mas com menor impacto de churn severo quando comparado a perdas por fraude e bloqueio de conta. | **XP Investimentos** e **BTG Pactual** apresentam simulação líquida prévia antes da confirmação do resgate, discriminando tributos e data exata da liquidação. |
| **4. Copiloto de Atendimento de Primeiro Nível com Hand-off Contextual** *(Brasil - PF/PJ)* | Cliente geral com problemas complexos ou combinados (ex: pagamento de empréstimo debitado em fatura errada). | **"Loop de robô" e perda de histórico:** O bot do chat oferece artigos genéricos que não resolvem cenários atípicos; ao transferir para humano, não transmite o contexto, forçando o cliente a repetir tudo. | **E05**, **E06**, **E07**, **E08** | Chat no app baseado em árvore de decisão e busca de FAQ; fila de espera para atendimento humano genérico. | Interpretação de demandas multisserviço em linguagem natural e compilação de um "Dossiê de Handoff" estruturado para o atendente humano quando a IA não puder executar a transação. | **Média:** Forte relevância operacional, mas corre o risco de apresentar uma solução generalista de "chatbot faz-tudo", diluindo o impacto perante o painel avaliador. | **Inter (Babi)** e **Cora** operam IA integrada com resumo executivo de atendimento que abastece a tela do atendente humano instantaneamente. |
| **5. Assistente Conversacional de Reabilitação Financeira e Negociação de Dívidas** *(Brasil - PF)* | Cliente inadimplente ou que acabou de quitar dívida renegociada e deseja reativar o cartão de crédito. | **Opacidade na reativação de crédito:** O cliente quita a dívida acreditando na liberação do cartão e descobre cancelamento definitivo ou manutenção de score baixo sem saber quais passos práticos tomar para reconstruir limite. | **E04**, **E08** | Aba "Negociar faturas" com propostas rígidas; concessão de limite atrelada a modelos estatísticos opacos ou ao Nu Limite Garantido. | Diagnóstico interativo de saúde financeira, explicação pedagógica sobre tempo de recuperação de score interno e planos guiados de uso do Nu Limite Garantido. | **Baixa:** Depende quase que exclusivamente de apetite de risco de crédito do banco; a IA não tem autonomia para conceder crédito real sem aprovação do motor estatístico. | **Desenrola Brasil** e **PicPay** integram simulações conversacionais de acordo com faixas claras de reabilitação cadastral. |

---

## C. Evidências Essenciais

### **E01 — Bloqueio sumário e retenção em suporte automatizado**
- **Fonte / Link direto:** [Reclame Aqui — Reclamação 200424597](https://www.reclameaqui.com.br/nubank/nubank-bloqueou-minha-conta-e-nao-consigo-ativar-meu-novo-cartao_XgTrYIlP6gHhk3Rx/)
- **Datas:** Publicação em 26/10/2026 às 21:47 | Resposta oficial do Nubank em 27/10/2026 às 11:29 | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Conta Nu e Cartão de Débito/Crédito | Pessoa física.
- **Síntese:** Cliente solicitou segunda via do cartão e, ao recebê-lo, teve a conta bloqueada sem notificação prévia. O suporte por chat e telefone recusou atendimento alegando que o caso era exclusivo de e-mail (`meajuda@nubank.com.br`), onde recebeu respostas automáticas padronizadas. Em resposta pública, a Ouvidoria do Nubank declarou o encerramento unilateral e irreversível do contrato (citando cláusula 8.2.2 e diretrizes de segurança), exigindo envio manual de dados de outra instituição por e-mail para devolução do saldo remanescente, informando não realizar a devolução via Pix.
- **O que sustenta:** Comprova a barreira de continuidade e resolução no atendimento em situações de bloqueio preventivo/segurança, onde o primeiro nível se exime e o canal de e-mail é percebido como impessoal e opaco.
- **O que NÃO permite concluir:** Não permite concluir sobre a legitimidade da transação original ou se o bloqueio decorreu de ordem judicial ou obrigação de prevenção à lavagem de dinheiro (AML/Bacen).

### **E02 — Rito de bloqueio cautelar sem informação de causa**
- **Fonte / Link direto:** [Reddit r/ConselhosLegais — Relato de Several-Employ7370](https://www.reddit.com/r/ConselhosLegais/comments/1siwvu7/nubank_bloqueou_minha_conta_e_reteve_todo_meu/)
- **Datas:** Publicado em ~fevereiro/2026 | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Conta Nu / Saldo transacional | Pessoa física.
- **Síntese:** Usuário teve todo o saldo bloqueado por "medida preventiva" para análise de contestação sem indicação de qual movimentação motivou o alerta. O banco estabeleceu prazo de 3 dias de retenção total seguido de análise posterior. Nos comentários da comunidade jurídica, aponta-se a correlação direta com procedimentos do MED (Mecanismo Especial de Devolução do Pix).
- **O que sustenta:** Sustenta que o bloqueio cautelar causa desespero imediato devido à falta de acesso a recursos básicos e que a ausência de uma explicação acessível induz o cliente a buscar vias judiciais e órgãos reguladores.
- **O que NÃO permite concluir:** Não permite verificar se a conta recebeu valores de terceiros que contestaram a transação ou se o usuário foi vítima de fraude de triangulação.

### **E03 — Encerramento de conta de longa data por transação atípica de vida**
- **Fonte / Link direto:** [Reddit r/ConselhosLegais — Relato de vasahiat](https://www.reddit.com/r/ConselhosLegais/comments/1ux7bnj/nubank_bloqueou_minha_conta/)
- **Datas:** Publicado em ~abril/2026 | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Conta Nu | Cliente há mais de 5 anos.
- **Síntese:** Cliente com histórico de cinco anos recebeu valores (~R$ 10 mil) relativos a despesas de funeral/inventário do sogro, evento fora do seu padrão mensal habitual. A conta foi bloqueada sob o rito formal do Nubank: 3 dias de congelamento de saldo, 5 dias para retirada e cancelamento final e compulsório de todos os produtos, sem direito a diálogo ou contestação com operador humano.
- **O que sustenta:** Evidencia que variações legítimas no padrão de gastos acionam regras rígidas de segurança sem que haja uma camada conversacional prévia de checagem e acolhimento de contexto de vida.
- **O que NÃO permite concluir:** Não é possível afirmar se houve sinalização em bases externas (como CACS ou alertas interbancários do Bacen).

### **E04 — Perda de cliente de alto valor por ausência de suporte humano dedicado**
- **Fonte / Link direto:** [NuCommunity — Tópico público: C6 Carbon ou Ultravioleta](https://comunidade.nubank.com.br/discussoes/post/c6-carbon-ou-ultravioleta-qual-realmente-vale-mais-a-pena-no-fim-das-QaeftkCGwV8st9j)
- **Datas:** Publicado em outubro/2026 | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Nubank Ultravioleta / Alta Renda | Cliente com gastos mensais acima de R$ 8.000 e Open Finance.
- **Síntese:** Cliente do segmento Ultravioleta detalha decisão de migrar para o C6 Carbon motivado por dois atritos: falta de um canal humano direto (o C6 oferece gerente via WhatsApp em horário comercial) e rigidez opaca de limite (Nubank manteve limite travado em R$ 13 mil por meses e só ofertou R$ 60 mil no dia seguinte após o cliente abrir conta e concentrar gastos no concorrente).
- **O que sustenta:** Sustenta a hipótese de deterioração de NPS e retenção no segmento de maior rentabilidade quando a experiência de atendimento é percebida como impessoal ou dependente de algoritmos não transparentes.
- **O que NÃO permite concluir:** Não comprova evasão em massa de clientes Ultravioleta, por ser uma manifestação qualitativa em fórum aberto.

### **E05 — Falha de alocação de pagamento cruzado e rigidez de atendimento**
- **Fonte / Link direto:** [Reclame Aqui — Reclamação 200445495](https://www.reclameaqui.com.br/nubank/nubank-usou-meu-pagamento-de-emprestimo-para-pagar-fatura-e-me-fez-pagar-juros_dbuOVvHJeYy3Ll-K/)
- **Datas:** Publicado em 27/10/2026 às 12:32 | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Empréstimo Pessoal e Cartão de Crédito | Pessoa física.
- **Síntese:** Cliente solicitou boleto para antecipar parcelas de empréstimo. O valor pago foi alocado pelo sistema bancário para cobrir faturas futuras do cartão de crédito em vez de amortizar o saldo do empréstimo. Ao recorrer ao atendimento para corrigir a alocação, a atendente afirmou ser impossível reverter o lançamento, mantendo a cobrança de juros contratuais sobre o empréstimo.
- **O que sustenta:** Demonstra atrito severo de execução e continuidade operacional, revelando a incapacidade do atendimento de primeiro nível de corrigir desvios sistêmicos multisserviço.
- **O que NÃO permite concluir:** Não indica o volume total de ocorrências de liquidação incorreta de boletos na base de empréstimos do Nubank.

### **E06 — Desamparo ao vendedor PJ em fluxo de estorno comercial**
- **Fonte / Link direto:** [Reclame Aqui — Reclamação 200445695](https://www.reclameaqui.com.br/nubank/nubank-se-recusa-a-estornar-venda-feita-pelo-app-e-me-deixa-no-prejuizo_TT33Lt_SLhqEvzsp/)
- **Datas:** Publicado em 27/10/2026 às 12:35 | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Conta PJ / Tap to Pay | Microempreendedora.
- **Síntese:** Comerciante realizou venda pelo recurso Tap to Pay no app Nubank. O comprador desistiu da compra e pediu cancelamento. Ao tentar realizar o estorno pelo suporte oficial com comprovantes e protocolos, o atendimento negou a operação afirmando que o dinheiro "não havia caído na conta", inviabilizando o cancelamento e deixando a vendedora em vulnerabilidade comercial.
- **O que sustenta:** Evidencia atrito na jornada de microempreendedores que utilizam meios de pagamento do Nubank, onde a falta de um fluxo conversacional de mediação e estorno gera prejuízo percebido.
- **O que NÃO permite concluir:** Não permite concluir se houve falha no adquirente parceiro ou se o prazo de liquidação da bandeira ainda estava em curso.

### **E07 — Desencontro entre comunicação proativa e suporte de produto**
- **Fonte / Link direto:** [NuCommunity — Tópico público: Empréstimo Crédito Pessoal](https://comunidade.nubank.com.br/discussoes/post/emprestimo-credito-pessoal-bSiDshUZnD5B4IP)
- **Datas:** Publicado em outubro/2026 | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Empréstimo Pessoal | Cliente histórico com mais de 10 operações quitadas.
- **Síntese:** Cliente cancelou simulação de crédito de R$ 15 mil para solicitar R$ 8 mil. Após o cancelamento, a função desapareceu do aplicativo, embora o banco continuasse enviando e-mails e notificações push promovendo a contratação. Em contato com o suporte, os atendentes foram atenciosos, porém declararam que a liberação é puramente automática pelo sistema, sem conseguir diagnosticar a inconsistência ou reabrir o fluxo.
- **O que sustenta:** Demonstra que a cordialidade no atendimento humano não supre a carência de explicabilidade e diagnóstico técnico de produto, frustrando usuários assíduos.
- **O que NÃO permite concluir:** Não prova que todas as simulações canceladas gerem travamento permanente da funcionalidade.

### **E08 — Macroindicadores públicos de atendimento e volume de fricções**
- **Fonte / Link direto:** [Reclame Aqui — Página Oficial Nubank](https://www.reclameaqui.com.br/empresa/nubank/) e [Banco Central do Brasil — Ranking de Reclamações](https://www.bcb.gov.br/estabilidadefinanceira/rankingreclamacoes)
- **Datas:** Período de 01/04/2026 a 30/09/2026 (Reclame Aqui) e 3º Tri/2026 (Bacen) | Acesso em 27/10/2026.
- **Mercado / Produto / Perfil:** Brasil | Base geral de clientes.
- **Síntese:** No Bacen, o Nubank mantém um dos índices mais baixos de queixas procedentes por milhão de clientes (10,68 no 3º tri de 2026). No Reclame Aqui, ostenta selo RA1000 com nota média de 8,7/10 e índice de solução de 93,2%. Todavia, o volume absoluto reflete 56.616 reclamações em 6 meses, com tempo médio de resposta de 3 dias e 23 horas. Os principais tópicos históricos de atrito são: Cobrança indevida (89.198), Limite (53.592), Estorno de valores (47.573) e Cancelamento (44.250).
- **O que sustenta:** Sustenta que, a despeito da excelente reputação global da marca, há um volume expressivo de demandas complexas (estornos, cobranças e limites) que não encontram resolução imediata nos canais primários do aplicativo, levando dias para serem tratadas externamente.
- **O que NÃO permite concluir:** Não reflete as premissas hipotéticas do desafio (queda de métricas) nem equivale à experiência da maioria silenciosa dos mais de 100 milhões de clientes.

---

## D. Oportunidade Recomendada

### 1. Problema e usuário prioritário
- **Usuário prioritário:** Cliente pessoa física ou MEI que realizou transferência via Pix para golpista (golpe da falsa central, engenharia social, WhatsApp clonado) ou teve transação de cartão de crédito não reconhecida.
- **Momento:** Pós-fraude imediato (primeiras 2 horas), em que cada minuto é crítico para o bloqueio de fundos e a preservação patrimonial.
- **Problema:** O cliente enfrenta desamparo e ansiedade extrema. Ao buscar ajuda no aplicativo, depara-se com artigos estáticos da plataforma SOS Nu ou com um chat robótico que não faz triagem ativa de emergência. Quando o caso envolve o Mecanismo Especial de Devolução (MED) do Banco Central, o cliente é jogado em um vácuo informativo de semanas sem saber se a notificação foi enviada ao banco recebedor, se havia saldo para bloqueio cautelar ou quais documentos enviar.

### 2. Por que priorizá-la em relação às alternativas?
1. **Gravidade do atrito:** É o momento de maior vulnerabilidade na relação banco-cliente. A sensação de abandono durante um golpe financeiro destrói irremediavelmente a confiança.
2. **Excelente adequação conversacional:** Um cliente em pânico não assimila menus complexos nem lê artigos de ajuda de 15 minutos. A interface conversacional com escuta ativa, empatia e assertividade é o melhor meio de acalmar o usuário e extrair os dados necessários.
3. **Alinhamento com o Desafio:** Permite demonstração ao vivo funcional e interativa, aceitando novas mensagens do painel simulando diferentes tipos de golpes, sem necessidade de tocar em sistemas bancários reais.

### 3. Direcionamento do assistente
O assistente será **voltado diretamente ao cliente** no aplicativo (com modo híbrido de hand-off para o time de atendimento). O benefício direto é a resposta imediata em segundos, enquanto o benefício indireto é desafogar a mesa humana de segurança, que recebe dossiês de fraude já padronizados e enriquecidos.

### 4. Hipótese de intervenção conversacional e benefício esperado
- **Hipótese:** Se disponibilizarmos um **Agente Conversacional Especializado em Emergências de Segurança** no chat do app, capaz de acionar travas imediatas simuladas, estruturar o boletim de ocorrência e explicar passo a passo o rito do MED e da contestação de cartão:
- **Benefício específico:**
  - Redução do tempo de relato e triagem do golpe de horas/dias para menos de 3 minutos.
  - Mitigação do pânico cognitivo via comunicação empática e transparente.
  - Eliminação da assimetria de informação sobre prazos regulatórios (explicando os 7 dias de análise de fraude e os ritos de devolução do Bacen).

### 5. Escopo mínimo demonstrável gratuitamente (Zero Custo)
Um protótipo conversacional funcional (usando LLM sob camada gratuita, via interface web Streamlit, Gradio ou prompt estruturado reutilizável) capaz de:
1. Receber mensagens livres de um cliente desesperado (ex: *"Caí num golpe, mandei 500 reais por Pix para um cara que dizia ser da central do Nubank, me ajuda!"*).
2. Responder de imediato com acolhimento psicológico e instrução clara de calma.
3. Coletar os fatos em diálogo guiado: chave/banco de destino, horário aproximado, canal de contato do fraudador e existência de boletim de ocorrência.
4. Simular o acionamento de medidas de contenção (bloqueio preventivo de acessos em outros aparelhos e registro da notificação de infração MED).
5. Fornecer um **Protocolo de Transparência**, explicando exatamente o que acontecerá nas próximas 24h, 7 dias e 80 dias conforme as normas do Banco Central.

### 6. O que precisaria ser simulado e o que ficaria fora de escopo
- **Simulado no protótipo:** Consulta a extratos, status fictício de envio de notificação MED ao banco recebedor, protocolo de ocorrência e bloqueio simulado de credenciais.
- **Fora do escopo:** Integração real com o SPI/DICT do Banco Central, estorno monetário efetivo, liquidação bancária e integração com o Salesforce CRM ou sistemas produtivos do Nubank.

### 7. Relação esperada com métricas de negócio
- **CSAT (Satisfação com a Experiência):** Influência direta e imediata. Transforma uma experiência de atendimento caótica e frustrante em um fluxo acolhedor, rápido e claro, elevando a avaliação do atendimento no ponto de contato mais crítico.
- **NPS (Disposição de Recomendar):** Clientes acolhidos com sucesso em momentos de crise tornam-se os maiores promotores orgânicos da instituição (*"o banco foi rápido e me protegeu no pior momento"*), ao passo que a ausência de resposta gera os detratores mais vocais (como visto no Reclame Aqui e Reddit).
- **Retenção (Continuidade da Conta):** A maior causa de abandono de contas digitais após um incidente de segurança é o sentimento de desproteção e perda de confiança. A transparência e a assistência ativa estancam o esvaziamento de saldos e o cancelamento reflexo da conta.

### 8. Principal risco de a proposta não gerar o benefício esperado
O principal risco é o **descompasso entre a expectativa do cliente e a realidade do estorno**. Caso a IA crie a ilusão de que o dinheiro será garantidamente recuperado, a frustração do cliente será ainda mais severa se a conta de destino for esvaziada antes da notificação do MED (situação comum em fraudes bancárias). Portanto, a IA deve gerenciar expectativas de forma rigorosamente realista e pedagógica.

---

## E. Validação e Lacunas

### 1. Plano inicial de validação
- **Com quais usuários:** Amostra de 250 a 500 clientes que acionarem a seção "Segurança / SOS Nu" ou digitarem termos de fraude/golpe no chat do aplicativo.
- **Em qual situação:** No momento em que reportarem um golpe recente (menos de 24 horas de ocorrência).
- **Durante qual período:** Piloto controlado de 4 semanas.
- **Resultados e métricas a observar:**
  - *Taxa de conclusão da triagem:* % de usuários que chegam ao final do fluxo estruturado sem abandonar.
  - *Tempo médio de abertura da contestação:* Redução em minutos comparada ao fluxo atual de e-mail.
  - *CSAT específico do chamado:* Nota média pós-interação (meta de teste: $\ge 4.5/5.0$).
  - *Índice de recontato:* % de clientes que voltam a abrir chamado sobre o mesmo golpe em menos de 48h (mensuração da eficácia da explicação da timeline).

### 2. Diferenciação: Funcionamento/Utilidade do Protótipo vs. Impacto Real de Negócio
- **Testes do protótipo (demonstráveis ao vivo):** Avaliam se o assistente mantém o tom empático sob mensagens adversas da banca, se coleta todos os dados necessários sem alucinar regras inexistentes, se responde de maneira coerente e se aceita novas informações em tempo real.
- **Impacto real de negócio (hipótese a validar em produção):** O impacto em retenção a longo prazo (permanência do saldo após 6 meses) e no NPS geral da instituição não pode ser comprovado no protótipo nem inferido de dados sintéticos; trata-se de uma projeção estratégica a ser medida via teste A/B no ambiente operacional.

### 3. Lacunas de pesquisa
1. **Taxa de recuperação real do MED no Nubank:** Os dados públicos do Bacen não segregam a taxa de sucesso percentual de recuperação financeira de Pix devolvidos pelo MED especificamente por banco receptor/emissor.
2. **Capacidade operacional da mesa de segurança:** Não temos visibilidade de quantos analistas humanos compõem o time de prevenção a fraudes do Nubank e qual o gargalo interno entre o recebimento do relato e o envio da notificação interbancária.

### 4. Decisão que o responsável pelo projeto deverá revisar pessoalmente
> **Decisão a ser revisada:** *O assistente conversacional de segurança deve permitir que o cliente realize o bloqueio cautelar imediato de suas próprias chaves Pix e cartões diretamente pelo chat, ou deve limitar-se à orientação e coleta de informações, deixando o bloqueio como ação manual do usuário nas configurações do app?*
> 
> - **Argumento a favor do bloqueio automatizado no chat:** Reduz o tempo de resposta em minutos cruciais, evitando novos golpes em cadeia enquanto o cliente ainda está vulnerável.
> - **Argumento contrário (baseado nas evidências E01, E02 e E03):** Bloqueios automatizados são a principal fonte de atrito relatada quando mal calibrados; se o cliente acionar o comando por engano ou o bot interpretar erroneamente uma dúvida de rotina como incidente de fraude, a conta do usuário ficará retida, gerando o exato problema que motivou as maiores queixas identificadas na pesquisa.

---

## Roteiro Recomendado de Validação Empírica no App Nubank (Conta Ativa)

Para enriquecer a defesa ao vivo diante da banca avaliadora, recomendamos que o responsável pelo projeto execute as seguintes interações na sua conta ativa do Nubank:

1. **Teste no Chat:** Abrir o chat de suporte no app e digitar exatamente: *"Fui vítima de um golpe do Pix agora há pouco e mandei R$ 300, como funciona o MED?"*.
   - *O que observar:* O bot compreende o acrônimo "MED" e a urgência? Ele transfere para uma fila humana ou envia um link externo para o blog/SOS Nu?
2. **Teste no SOS Nu / Central de Proteção:** Navegar em *Perfil -> Segurança -> SOS Nu* e simular o reporte de uma transação.
   - *O que observar:* Quantos cliques e telas de texto estático são necessários para registrar a ocorrência? Há indicação clara dos prazos em dias úteis?
3. **Teste nas Caixinhas (Oportunidade secundária):** Entrar em uma Caixinha e clicar no botão "Resgatar".
   - *O que observar:* Antes de digitar a senha de confirmação, o app informa o valor líquido exato em reais descontados os tributos (IR/IOF) e o horário exato do crédito, ou apenas apresenta um aviso genérico?
