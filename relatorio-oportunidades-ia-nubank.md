# Pesquisa de oportunidades — IA conversacional para a experiência do cliente Nubank

**Relatório de investigação (etapa de escolha de oportunidade — sem protótipo)**
Mercado principal: **Brasil** · Data da pesquisa: **27/10/2026** · Janela prioritária de evidências: **out/2025 – out/2026**
Fontes consultadas nesta pesquisa e limitações registradas na seção **F**.

> **Premissa do exercício:** a queda de NPS e CSAT descrita em `Challenge_AI_Builder_Interns_Nu_BR.md` é **premissa do desafio, não um fato público comprovado** sobre o Nubank. Nada nesta pesquisa quantifica essa queda ou comprova melhorias. Metas numéricas aparecem sempre como hipótese.

---

## A. Síntese executiva

**Oportunidade mais promissora: cliente com conta ou saldo bloqueado/retido para "análise de segurança" (ou conta encerrada sem explicação), no Brasil, nos primeiros momentos após o evento.** Relatos independentes e recentes descrevem acesso ao dinheiro suspenso, motivo não informado, prazos incertos, espera longa no chat e recontato da história entre canais (E01, E02, E06, E09). O contexto regulatório amplia a relevância: a Resolução BCB nº 501/2025 tende a aumentar bloqueios por "fundada suspeita" (E08) e o Decreto nº 13.135/2026 (vigência 02/11/2026) exige continuidade de histórico e acesso a humano, admitindo IA para triagem (E10). A oferta atual existe (chat 24h, telefones, Ouvidoria — E15); o atrito está em clareza, continuidade e gestão de expectativa. Um assistente de acolhimento e acompanhamento — que explica, coleta documentos, abre protocolo, comunica prazos e encaminha com resumo — é demonstrável gratuitamente e conversa com CSAT, NPS e retenção de forma plausível e separada. **Principal incerteza:** a dor pode ser predominantemente operacional (tempo real de análise de compliance); volume e "falsos positivos" são inferências de amostras públicas enviesadas.

---

## B. Comparação das oportunidades

| Oportunidade e mercado | Usuário e momento da jornada | Atrito identificado | Evidências | Oferta atual do Nubank | Contribuição possível da IA conversacional | Prioridade e justificativa | Concorrente já faz e tem resultado comprovado |
|---|---|---|---|---|---|---|---|
| **O1. Conta/saldo bloqueado para "análise de segurança" ou conta encerrada sem explicação — BR** | Cliente PF, pós-evento crítico: descobriu o bloqueio ao tentar usar o dinheiro (Pix, cartão, saque) | Acesso ao dinheiro suspenso sem motivo informado; prazos incertos; espera longa no chat; repetição da história entre canais; e-mail sem resposta; ansiedade e busca por respostas fora dos canais oficiais | E01, E02, E06, E08, E09, E16, E17, E18 (+E03: categoria "Conta" com 31.140 reclamações históricas) | Chat no app 24h, telefones, Ouvidoria como 2ª instância (E15); "Me Roubaram" para roubo; não foi possível verificar conteúdo específico de "análise de segurança" na central de ajuda | Triagem do tipo de evento; explicação clara do que é a análise e o que esperar; checklist de documentos; abertura e rastreio de protocolo único; comunicação proativa de status; encaminhamento a humano com resumo (fim do recontato) | **Alta (recomendada).** Maior severidade (acesso ao dinheiro), evidência independente e recente em Reddit, RA, NuCommunity e X, usuário e momento precisos, encaixe conversacional claro e demo viável. Risco: depende de prazos operacionais que o assistente não controla | Inter: Babi→"Seven", agente de IA com meta declarada de reduzir índice de reclamações; 11 mi de clientes e 20 mi de acessos em 2026 (E11). Revolut: unidade de IA para risco/fraude (ago/2026) (apoio) |
| **O2. Vítima de golpe Pix/cartão — primeiros passos, MED e contestação — BR** | Vítima de golpe (Pix, Pix parcelado, cartão), nos primeiros minutos/horas após perceber | Pânico e desconhecimento do MED; janela de 80 dias e prazos difíceis de encontrar; expectativa irreal de devolução integral; risco de novo golpe ("falso suporte"); contestação dispersa em canais | E03 ("Estorno do valor pago": 47.573 reclamações históricas), E07 (MED), E19 (golpe com deepfake em idoso; orientação entre usuários no X), relato de golpe por Pix parcelado na comunidade oficial (apoio) | **MED 2.0 existe** e é operado pelo Nubank desde maio/2026; pedido em até 80 dias por app/chat/telefone; devolução de 72h a 11 dias; parcialidade possível (E07). Conteúdo educativo no blog | Triagem de urgência; checklist imediato ("o que fazer agora"); abertura guiada do MED com expectativas de prazo; alertas de segurança; encaminhamento com dossiê do caso | **Alta (2ª escolha).** Oferta já existe — a IA agiria sobre clareza, velocidade de entrada e expectativa. Momento de maior sensibilidade do cliente; demo muito forte. Risco: recuperação depende de saldo do golpista e de terceiros | Revolut: detecção de golpe com IA antes do envio do dinheiro e chamadas no app contra falsificação de suporte (apoio). PagBank: IA no atendimento com resultados publicados (E12) |
| **O3. Dívida de cartão: entender encargos, negociar e quitar — BR** | Cliente em atraso/inadimplente, tentando entender juros, negociar parcelamento ou quitar à vista | Composição de juros difusa; propostas do app pouco explicadas; dificuldade relatada para obter valor justo de quitação à vista; vergonça/evitação do contato | E03 ("Cobrança indevida": 89.198 históricas; "Limite": 53.592), Reddit "Fatura atrasada e juros" (2026-08-29), reclamações recentes de negociação no RA (2026-10-27) | Renegociação no app, Desenrola Brasil 2026, integração com Serasa Limpa Nome (oferta verificada em busca; páginas não aprofundadas) | Explicar a fatura e os encargos em linguagem simples; simular cenários de negociação; preparar o cliente para a oferta real; responder dúvidas de juros compostos | **Média-alta.** Volume grande e recorrência; mas parte do atrito é de produto/preço (política de crédito), não conversacional | C6: "converse com a fatura do cartão" com IA (E13) — compreensão de fatura; resultado não quantificado publicamente |
| **O4. Continuidade do atendimento: espera, handoff e recontato — BR** | Cliente que já contatou o suporte e foi transferido, repetiu a história ou não obteve resposta | Espera de horas no chat; múltiplos atendentes sem resolução; robô com respostas repetitivas; transferência para Ouvidoria recontando tudo; e-mail como "único canal" | E06 (2h de espera, 4+ atendentes, sucessivos canais), E05 (IA não resolveu dúvida simples), E10 (Decreto exige continuidade e humano), E04 (FCR de 2ª instância era 16% antes da internalização) | Chat 24h, telefones, Ouvidoria (E15); "Ouvidoria 2.0" e FCR elevado a 49% em 2S25 (E04) | Resumo automático do histórico com protocolo único; triagem inteligente; handoff a humano com contexto; preenchimento de formulários | **Média-alta, porém mais difícil de demonstrar com valor.** O benefício depende de integração com CRM/processos (no protótipo, simulada) | Inter: meta declarada de reduzir reclamações com agente de IA (E11). PagBank: −27% de custo e maior satisfação com IA no atendimento (E12) |
| **O5. Descoberta de funções existentes / dúvidas de produto — BR** | Cliente ativo tentando achar funções (Lista de Confiança, limites, isenção de anuidade) ou entender regras | IA de atendimento atual não respondeu a dúvida simples de produto; funções com baixa descoberta; posts repetidos de dúvidas | E05 (+ Reddit: isenção de anuidade Ultravioleta 2026-09-25; dúvida de extrato 2026-10-02) | FAQ/central de ajuda + assistente de IA já existente no atendimento | Respostas com passo a passo contextual; navegação guiada "onde está a função" | **Média.** Boa adequação conversacional, mas baixa gravidade e menor relação com retenção | Inter: Seven cobre 180+ produtos (E11). C6 Assistant: transações e alertas (E13) |

Notas de leitura da tabela: "Evidências" usa os identificadores da seção C; relatos públicos são amostra enviesada e não indicam prevalência; "concorrente já faz" refere-se a resultados públicos/declarados, muitas vezes auto-reportados.

---

## C. Evidências essenciais

Todas acessadas em **27/10/2026**. Relatos pessoais anonimizados (sem nomes, CPFs, contas ou saldos).

**E01 — Reddit r/nubank: "Nubank vai encerrar minha conta e não sei o motivo" (03/08/2026)**
URL: https://www.reddit.com/r/nubank/comments/1vejwb4/nubank_vai_encerrar_minha_conta_e_n%C3%A3o_sei_o_motivo/
Síntese: após receber uma transferência de valor relevante, o cliente teve o acesso suspenso (sem Pix, sem cartão físico, saldo imobilizado); foi orientado a aguardar 3 dias para análise; um atendente afirmou que a conta seria encerrada após esse prazo, sem informar o motivo; contato por e-mail sem resposta. Comentários especulam risco de lavagem de dinheiro.
Sustenta: opacidade de motivo e prazos + falha de continuidade entre canais em evento crítico. **Não permite concluir:** prevalência; ilegitimidade do bloqueio (análise de compliance pode ser devida); desfecho do caso.

**E02 — Reclame Aqui: "Conta encerrada" (listada em 27/10/2026, publicada minutos antes do acesso)**
URL: https://www.reclameaqui.com.br/nubank/conta-encerrada_logRxWVjZ17u5XB9/
Síntese: "Minha conta foi encerrada e eles não me passaram o motivo e eu queria entender o porquê" (reclamação sem resposta no momento do acesso).
Sustenta: mesma jornada de opacidade em canal independente do E01. **Não permite concluir:** representatividade; tratamento posterior (RA tem 93,2% de resolução — E03).

**E03 — Reclame Aqui: estatísticas oficiais da página da Nubank (dados de 01/04/2026 a 30/09/2026)**
URLs: https://www.reclameaqui.com.br/empresa/nubank/ e https://www.reclameaqui.com.br/empresa/nubank/lista-reclamacoes/
Síntese: 56.616 reclamações/6 meses; 99,9% respondidas; **93,2% resolvidas**; 81,2% "voltariam a fazer negócio"; nota média do consumidor 7,76; **tempo médio de resposta 3 dias e 23 horas**; reputação RA1000 (8,7/10). Distribuição histórica por problema: Cobrança indevida 89.198, Limite 53.592, Estorno do valor pago 47.573, Cancelamento 44.250, Problema com o cartão 26.469; por produto: Cartão de crédito 240.194, Conta 31.140.
Sustenta: onde o atrito se concentra (cartão/cobrança/estorno/conta) e que a dor é mais de **experiência de resolução/tempo** do que de resolução final. **Não permite concluir:** CSAT/NPS (81,2% não é NPS); prevalência na base de clientes.

**E04 — Nubank: Relatório Semestral de Ouvidoria 2S25 (publicado ~abr/2026; fonte oficial)**
URL: https://www.datocms-assets.com/120597/1775569138-relatorio-semestral-de-ouvidoria-2s25.pdf (linkado em https://nubank.com.br/contatos)
Síntese: 131 mi de clientes (BR/MX/CO). Volume de 2ª instância em 2S25: Consumidor.gov 120,5 mil (35,8%), RDR 79,8 mil, Reclame Aqui 59,8 mil, Ouvidoria 58,5 mil, Procon 16,6 mil; índice de 44,66 manifestações diretas/100 mil clientes (257,25 somando toda a 2ª instância). Tempo médio de resposta da Ouvidoria: 7,2 dias úteis (limite regulatório de 10). Pesquisa de satisfação pós-resposta (escala 1–5): **solução 3,0** e qualidade do atendimento 3,1. FCR da Ouvidoria subiu de 16% para 49% após internalização (out/2025). 2ª colocação no Ranking de Reclamações do Banco Central (3T/4T-2025).
Sustenta: baseline oficial de escalonamento e de satisfação com a **solução** de 2ª instância. **Não permite concluir:** experiência do chat de 1ª linha; causas da satisfação 3,0/5.

**E05 — Reddit r/nubank: "Adicionar CPF como favorito no PIX" (09/09/2026)**
URL: https://www.reddit.com/r/nubank/comments/1wbui5d/adicionar_cpf_como_favorito_no_pix/
Síntese: cliente não achou como adicionar chave CPF aos favoritos do Pix; relata: "Tentei conversar com a IA de atendimento mas ela não conseguiu ajudar". Comentário posterior (gerado com ajuda de IA) explica que a "Lista de Confiança" do Nubank se baseia em histórico de transações, não em digitação manual de chave.
Sustenta: (a) falha pontual do assistente atual em dúvida de produto; (b) atrito de descoberta de função existente. **Não permite concluir:** desempenho geral do assistente; se a resposta do comentário está correta.

**E06 — Reclame Aqui: "Protocolo Atendimento — Transferências não executadas" (publicada há mais de 1 ano — fora da janela; usada como contexto de persistência)**
URL: https://www.reclameaqui.com.br/nubank/protocolo-atendimento-transferencias-nao-executadas_kKjkksZlFH7ZudIM/
Síntese: transferências rejeitadas por valor, conta bloqueada; chat com quase 2h de espera e mais de 4 atendentes sem resolução; passagem à Ouvidoria e depois a um e-mail como "único canal"; novo bloqueio após orientação de fazer transferências menores; recontato da história a cada canal.
Sustenta: dor de **handoff/continuidade** e repetição da história, coerente com E01 e com o que o Decreto 13.135 passa a exigir (E10). **Não permite concluir:** situação atual (época anterior a out/2025).

**E07 — Blog Nubank: "Como funciona o Mecanismo Especial de Devolução do Pix" (publicado 2021; conteúdo atualizado com MED 2.0, em vigor desde mai/2026)**
URL: https://blog.nubank.com.br/mecanismo-especial-de-devolucao-pix-como-funciona/
Síntese: MED existe desde 2021; MED 2.0 (mai/2026) rastreia recursos entre contas; pedido em até 80 dias pelo app/chat/telefone; devolução de 72h a 11 dias; devolução pode ser parcial; teto de 90 dias; Nubank opera o MED 2.0.
Sustenta: para golpe Pix a **oferta existe** — o atrito restante é de clareza, timing e expectativa. **Não permite concluir:** como é, na prática, abrir o MED no app; taxa de sucesso de devoluções.

**E08 — Banco Central/DOU: Resolução BCB nº 501, de 11/09/2025 (altera a Res. BCB nº 142/2021)**
URLs: https://www.in.gov.br/en/web/dou/-/resolucao-bcb-n-501-de-11-de-setembro-de-2025-655219412 e https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=501&tipo=Resolução BCB
Síntese: instituições devem **rejeitar transações** destinadas a contas com "fundada suspeita" de envolvimento em fraude; critérios a cargo de cada instituição; dever de informar o titular quando a rejeição ocorre na instituição destinatária (Comunicado BCB nº 44.253/2025).
Sustenta: contexto que **aumenta a ocorrência** de jornadas de bloqueio/rejeição (e potenciais falsos positivos). **Não permite concluir:** critérios internos do Nubank; taxa de falsos positivos.

**E09 — NuCommunity (comunidade oficial hospedada pelo Nubank): guia "Minha conta foi bloqueada, e agora?" (05/01/2026 — post de usuário, não conteúdo oficial do Nubank)**
URL: https://comunidade.nubank.com.br/vida-financeira/post/guia-tecnico-minha-conta-foi-bloqueada-e-agora-prazos-e-direitos-JW4YlU1cZ5Ciccn
Síntese: autoria de membro (advogado); descreve que "muitos membros da comunidade enfrentam o desespero de ter o saldo retido para 'análise de segurança'"; menciona prazo de 72h para bloqueio cautelar (Res. BCB nº 147), risco de "falsos positivos" pela Res. 501/2025 e recomenda exigir protocolo e fundamento, usar Consumidor.gov/BCB e, se necessário, via judicial.
Sustenta: demanda real por **clareza de prazos, motivos e próximos passos** nessa jornada. **Não permite concluir:** precisão jurídica das afirmações; posição oficial do Nubank.

**E10 — Decreto nº 13.135, de 09/10/2026 (Planalto) + resumo do Blog RA (19/10/2026)**
URLs: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13135.htm e https://blog.reclameaqui.com.br/novas-regras-do-sac/
Síntese: novo marco do SAC, **vigência 02/11/2026**, aplicável a serviços financeiros digitais supervisionados pelo Banco Central (art. 1º, § único, II — texto do Planalto consultado). Entre as exigências: atendimento humano em tempo real das 8h às 20h, 7 dias/semana (imediato em casos urgentes); aproveitamento do histórico e dos dados já informados, com manutenção do mesmo protocolo entre contatos; no máximo 5 níveis de navegação; vedação de transferir o cliente entre canais; IA admitida para triagem, roteamento e autosserviço **desde que assegurada a opção de pessoa humana**; cancelamento sem barreiras; 48h para suspender cobranças indevidas; resposta a demandas gerais em até 7 dias (resumo do Blog RA).
Sustenta: desenho obrigatório da solução (IA como camada de triagem/continuidade, humano garantido) e atualidade do tema. **Não permite concluir:** como será a fiscalização; adequação atual de cada canal do Nubank.

### Evidências de apoio (concorrentes e risco)

- **E11 — Inter (Seven/Babi).** Época Negócios (fev/2026): o chatbot "Babi" foi transformado em agente de IA com o objetivo declarado de **reduzir o índice de reclamações** (https://epocanegocios.globo.com/inteligencia-artificial/ia-na-pratica/noticia/2026/02/inter-transforma-chatbot-babi-em-agente-de-ia-para-reduzir-indice-de-reclamacoes-de-clientes.ghtml). InforChannel (06/05/2026): desde 2025 a assistente atuava como agente conversacional para 180+ produtos; **11 mi de clientes** já usaram e **20 mi de acessos só em 2026** (https://inforchannel.com.br/2026/05/06/banco-inter-lanca-assistente-seven-e-entra-na-era-dos-agentes-de-ia/). Limites: números auto-reportados.
- **E12 — PagBank (IA no atendimento, caso AWS, 2024 — fora da janela; benchmark).** Redução de **27%** de custos e aumento de satisfação do cliente (https://inovativos.com.br/2024/07/03/ia-no-atendimento-reduz-custos-do-pagbank-em-27/ e https://tiinside.com.br/28/06/2024/pagbank-observa-reducao-de-27-em-custos-ao-implementar-ia-no-atendimento-ao-cliente/). Limites: caso publicitário; foco em eficiência.
- **E13 — C6 Bank (C6 Assistant).** Lançado em 2024 com foco transacional (Pix/boletos); evolução para "conversar com a fatura do cartão" (PDF institucional do C6: https://cms-assets-p.c6bank.com.br/uploads/c6-bank-lanca-ferramenta-de-ia-para-cliente-conversar-com-a-fatura-do-cartao.pdf) e alertas de rotina financeira (ago/2026: https://tiinside.com.br/28/08/2026/assistente-de-ia-do-c6-bank-emite-alertas-de-rotina-financeira/).
- **E14 — Risco de comunicação automatizada (contexto).** Metro 1 (jun/2026): clientes receberam e-mail equivocado informando "liquidação extrajudicial" do Nubank; o banco admitiu "falha operacional pontual" e investigação interna (https://www.metro1.com.br/noticias/economia/183849,nubank-admite-falha-apos-mensagem-informar-falsa-liquidacao-da-instituicao). Limites: causas (inclusive eventual envolvimento de IA, como especulado na imprensa regional) não confirmadas.
- **E15 — Oferta atual de atendimento (Nubank).** Página oficial de contatos (https://nubank.com.br/contatos): chat no app 24h com atendentes, telefones 4020 0185/0800 591 2117, "Me Roubaram", Ouvidoria (0800 887 0463, dias úteis 8h–18h) como 2ª instância, atendimento em Libras. Confirmado por UAI/TV Foco (02/07/2026): https://tvfoco.uai.com.br/nada-de-ia-nubank-confirma-atendimento-humano-para-clientes-veja-como/.

### Voz do cliente no X/Twitter (E16–E19)

Textos e datas recuperados das páginas individuais de tweet (sessão autenticada via `fetch_social.py`); engajamento conforme exibido na data do acesso.

- **E16 — X, @momentosjec, 23/03/2026 (64,6 mil visualizações).** Relato de que a conta do pai, senhor idoso, foi bloqueada retenindo a rescisão trabalhista inteira; a devolução estaria sendo dificultada; o e-mail cadastrado era inacessível e, mesmo após a família alterar o e-mail no perfil, as comunicações continuavam indo para o antigo. URL: https://x.com/momentosjec/status/2036075751263424523. Sustenta: O1 — evento crítico + falha de canal de comunicação + usuário vulnerável. Não permite concluir: legitimidade do bloqueio; desfecho.
- **E17 — X, @luisamcn, 15/08/2026 (170,2 mil visualizações).** Pix para pagar músicos do casamento bloqueado como "transação suspeita"; após contato, explicação do caso e envio de contrato, a operação foi autorizada; o cliente voltou ao X para **elogiar** o banco ("O relacionamento com o cliente me fazendo vir aqui elogiar"). URL: https://x.com/luisamcn/status/2088576253179695162. Sustenta: (a) a liberação depende de contexto que hoje é coletado manualmente; (b) a experiência de resolução de bloqueio pode converter detrator em promotor (relevante para NPS). Contraponto valioso: bloqueios podem ser resolvidos bem quando o cliente consegue fornecer contexto.
- **E18 — X, @defiremora, 07/08/2025 (453,8 mil visualizações — fora da janela de 12 meses; contexto de persistência).** Thread com 275 respostas sobre conta bloqueada sem movimentação de valor elevado ("Seu dinheiro não é seu"). URL: https://x.com/defiremora/status/1953516135787221020. Sustenta: percepção pública de insegurança patrimonial quando o bloqueio ocorre; narrativa que circula amplamente. Limites: fora da janela; caso único; valor omitido aqui por anonimização.
- **E19 — X, 2026 (fraude).** (a) @ludovisuence, 20/04/2026 (160,5 mil visualizações): golpe com clonagem de rosto e voz (deepfake) em chamada rápida contra pai idoso, com Pix e cartões de múltiplos bancos (https://x.com/ludovisuence/status/2046277617318330510); (b) usuários se orientando mutuamente sobre "pedir estorno do Pix e denunciar a chave" e variantes de "Pix errado" (postagens diversas, mai/2025–set/2026 na indexação). Sustenta: O2 — sofisticação dos golpes atingindo famílias e demanda por orientação imediata no momento do evento. Limites: amostra pequena de indexação, sem busca sistemática via API.

---

## D. Oportunidade recomendada

### Problema e usuário prioritário
Cliente pessoa física no Brasil que teve a **conta ou o saldo bloqueado/retido para "análise de segurança" — ou a conta encerrada — sem explicação clara**, e precisa de orientação imediata para entender o que está acontecendo, o que fazer e quando terá uma resposta. Momento da jornada: primeiras horas após o evento crítico.

### Por que priorizá-la em relação às alternativas
1. **Severidade e emoção:** o acesso ao próprio dinheiro está suspenso — o momento de maior impacto em confiança de todas as jornadas analisadas (E01, E02, E09).
2. **Evidência independente e atual:** quatro fontes independentes (Reddit, Reclame Aqui, NuCommunity, contexto regulatório) dentro/ao redor da janela de 12 meses (E01, E02, E08, E09).
3. **Janela regulatória:** a Res. BCB 501/2025 tende a ampliar bloqueios/rejeições (E08) e o Decreto 13.135/2026 (vigência 02/11/2026) torna continuidade e acesso humano uma exigência — a proposta nasce calibrada a ela (E10).
4. **Encaixe conversacional real:** o problema é de **informação, expectativa e continuidade** — exatamente o que conversa resolve melhor; ao contrário de O3 (política de crédito) e O4 (integração de sistemas).
5. **Comparação com O2 (golpe/MED):** a oferta de O2 já existe e funciona por app (MED 2.0 — E07); em O1 não foi possível encontrar orientação equivalente para "análise de segurança" na central de ajuda, e os relatos descrevem falhas de comunicação do próprio atendimento. O2 permanece como segunda escolha, com demo igualmente forte.

### Assistente voltado a quem?
**Ao cliente**, com um componente explícito de **encaminhamento à equipe de atendimento** (resumo do caso + protocolo único). O Decreto 13.135/2026 exige humano garantido; a proposta cumpre a regra usando IA como acolhimento e triagem, nunca como barreira (E10).

### Hipótese de intervenção conversacional e benefício específico
Assistente de **acolhimento e acompanhamento de bloqueio** que:
1. identifica o tipo de evento (bloqueio de saldo, bloqueio de cartão, encerramento) e o impacto percebido;
2. explica em linguagem simples o que é uma análise de segurança, o que ela **não** significa (ex.: não é necessariamente cancelamento) e o que esperar;
3. entrega checklist personalizado de documentos/informações que a análise costuma solicitar;
4. abre **protocolo único**, registra a narrativa do cliente uma única vez e comunica prazos e próximos passos com expectativas realistas;
5. encaminha a humano com resumo, sem que o cliente repita a história.

**Benefício específico esperado (hipótese):** reduzir a incerteza e o recontato — primeira resposta útil em minutos, com caminho claro; diminuir a sensação de "abandono" relatada em E01/E06.

### Escopo mínimo demonstrável gratuitamente
Conversa escrita funcional (ChatGPT/Gemini com instruções reutilizáveis, ou app web simples), com: dados **fictícios identificados como simulação**; histórico mantido entre mensagens; aceitação de **novas mensagens do painel** durante a demo; instruções/configuração apresentáveis e editáveis ao vivo; cenário-realista: cliente descobre bloqueio ao fazer Pix → acolhimento → checklist → protocolo → status → handoff com resumo. Custo zero além de inferência em plano gratuito.

### O que seria simulado e o que ficaria fora do escopo
- **Simulado:** consulta a sistemas antifraude, status reais de análise, abertura de chamado em CRM, notificações proativas, histórico do cliente.
- **Fora do escopo:** decidir/apressar bloqueios; prometer prazos legais ou liberação de saldo; executar operações bancárias; dados pessoais/financeiros reais; análise jurídica (o assistente informa fontes públicas, não assessora).
- **Limites declaráveis na demo:** a decisão sobre a conta é de compliance/antifraude; o assistente melhora a experiência do processo, não o processo em si.

### Relação esperada com as métricas (separadamente)
- **CSAT** (satisfação com uma experiência): o ato de acolher, explicar e dar próximos passos impacta diretamente a satisfação **com o atendimento desta jornada**. Hipótese: melhora CSAT do canal em casos de bloqueio. Medível rapidamente (pesquisa pós-conversa).
- **NPS** (disposição de recomendar): eventos críticos geram promotores/detratores fortes. Há precedente público observado (E17): cliente teve Pix bloqueado como suspeito, forneceu contexto, foi atendido — e voltou ao X para **elogiar** o banco (170 mil visualizações). Hipótese: transparência e coleta rápida de contexto convertem o evento em recomendação; mas se a análise continuar lenta, o assistente pode apenas "explicar melhor o atraso" sem mover NPS. Impacto mais lento e indireto que CSAT.
- **Retenção** (continuidade no tempo): clientes que passam por bloqueio/encerramento têm risco elevado de rompimento do relacionamento. Hipótese: experiência transparente reduz encerramentos voluntários e reforça a permanência de clientes cujo caso foi resolvido. **Sem coortes internas não há como comprovar**; e clientes tiveram a conta encerrada pelo banco (como em E02) já estão fora da base — nesses casos, a retenção se aplica ao entorno (família/contatos) e à marca.
- Nenhuma métrica implica automaticamente as outras.

### Principal risco de não gerar o benefício esperado
A dor pode ser **predominantemente operacional** (tempo real de análise e critérios de compliance): se o bloqueio continuar sem comunicação proativa e sem prazos cumpridos, o assistente vira "explicador de atraso" e não resolve o atrito — podendo até ampliar a frustração se prometer prazos que a operação não cumpre. Mitigação: escopo de comunicação/expectativa (não de decisão), disclaimers e validação com usuários antes de qualquer meta.

---

## E. Validação e lacunas

### 1) Validação empírica no app real (o usuário do projeto tem conta ativa e se disponibilizou)
Roteiro de **30–40 minutos**, sem risco (não executar operações; apenas navegar/conversar):
1. Abrir o chat do app e perguntar: *"minha conta foi bloqueada para análise de segurança, o que faço?"* — anotar: resposta dada, prazos informados, se há checklist de documentos, se e como é oferecido humano; print + tempo até resposta útil.
2. Perguntar como **falar com atendente humano** — contar etapas/transferências até uma pessoa (ou até desistir em X minutos).
3. Repetir a dúvida do E05 (adicionar chave **CPF** aos favoritos do Pix) e comparar com a resposta do assistente atual — verifica-se se a falha de E05 persiste.
4. Navegar em "Me ajuda"/segurança procurando orientação sobre **"análise de segurança"/bloqueio de saldo** — registrar se existe conteúdo equivalente ao do MED (E07).
5. (Opcional, O2) Simular a pergunta *"caí em um golpe do Pix, o que faço agora?"* — verificar se o fluxo apresenta MED, prazos e encaminhamento.
Resultado esperado: confirmar/refutar os atritos de clareza, continuidade e descoberta com observação direta.

### 2) Testes de funcionamento e utilidade do protótipo (não comprovam impacto de negócio)
- **Público:** 5–8 clientes Nubank (diversidade de idade/renda), recrutados por conveniência; sessões de 20–30 min, remotas.
- **Tarefa:** roteiro de cenário (bloqueio ao fazer Pix; golpe Pix; dúvida de produto), comparando o assistente proposto com o fluxo atual do app (comparação qualitativa A/B).
- **Observar:** sucesso na tarefa sem ajuda; tempo até a primeira resposta útil; percepção de clareza e confiança (escala simples); nº de vezes que a pessoa pediria humano; compreensão dos prazos; sensação de "não precisar repetir a história".
- **Período:** 2 semanas de testes; correções iterativas a cada 2–3 sessões.
- **Funcionamento:** continuidade da conversa, aceitação de novas mensagens do painel, estabilidade das respostas, aderência às instruções configuradas.

### 3) Futura avaliação de impacto (diferente dos testes acima)
Só seria possível com dados internos: baseline de CSAT/NPS por jornada (pós-atendimento de bloqueio), coortes de clientes que passaram por bloqueio (retenção em 30/90 dias), taxa de recontato, tempo até primeira resposta útil e taxa de escalonamento. Um teste simulado **não** comprova impacto real em CSAT/NPS/retenção; qualquer meta numérica é hipótese.

### Lacunas de pesquisa
- **X/Twitter coberto apenas parcialmente** (E16–E19, amostra de 5 tweets via indexação do buscador + páginas individuais) — sem busca sistemática via API; o volume de reclamações no X permanece desconhecido.
- Reddit coberto apenas no r/nubank (busca interna bloqueada por 403); outros subs e fóruns (ex.: r/brasil, Reclame AQUI fora da janela da lista) não varridos sistematicamente.
- Sem dados internos de volume de bloqueios, análises de segurança, MED abertos e "falsos positivos"; a inferência de E08/E09 é indireta.
- Reclame Aqui e Reddit são amostras enviesadas (viés de reclamação, usuários mais digitais); não indicam prevalência.
- O comportamento atual do chat do app não foi verificado de dentro (passo 1 da validação empírica resolve isso).
- Não aprofundei páginas oficiais de renegociação/Desenrola (O3) e não encontrei evidência robusta de NuCel como oportunidade distinta (apenas 1 relato de onboarding na amostra).
- Evidências de concorrentes são majoritariamente auto-reportadas; E12/E13 sem métricas de CSAT/NPS comparáveis.

### Ferramentas utilizadas e limitações (registro de substituições)
- **AgentReach** (skill carregada): `agent-reach doctor` executado — GitHub/web/RSS/Bilibili ok; **twitter: warn (CLI não instalada)** e **reddit: off (sem backend CLI)**. Reddit foi acessado por **`fetch_social.py`** (sessão salva) — listagens (hot/new/top do ano) e threads completas OK; o endpoint de busca do Reddit retornou **403**; usei listagens do r/nubank + busca web por `site:reddit.com` (outros subs não foram varridos).
- **X/Twitter — coberto por rota derivada, com ressalvas.** As três rotas diretas falharam: `x_search` indisponível (assinatura não logada); navegador Obscura com cookies salvos redirecionou para login (sessão do perfil expirada); o HTML bruto da busca do X via `fetch_social.py` carrega autenticado, mas renderiza os tweets por JavaScript (sem textos no HTML). **Substituição utilizada:** (1) busca de tweets indexados via DuckDuckGo (`site:x.com`); (2) extração de texto, data e visualizações das **páginas individuais de tweet** via `fetch_social.py` (meta tags renderizadas no servidor); a API pública de syndication (`cdn.syndication.twimg.com`) responde `{}`. Cobertura: 2 consultas de busca + 5 tweets confirmados (E16–E19) — **amostra, não varredura sistemática**; viés de indexação do buscador.
- **Obscura** (instruções lidas em `skills/obscura/SKILL.md`): usado para busca web (DuckDuckGo) e páginas dinâmicas; **Reclame Aqui bloqueado por Cloudflare mesmo em modo stealth** → conteúdo obtido via **Jina Reader** (`r.jina.ai`), substituição registrada.
- `web_search` nativo indisponível (erro de autenticação do endpoint de busca) → substituído por Obscura/DuckDuckGo + Jina Reader.
- Documento do desafio `Challenge_AI_Builder_Interns_Nu_BR.md` lido integralmente antes da pesquisa.

### Decisão que o responsável pelo projeto deve revisar pessoalmente
**Priorizar O1 (conta/saldo bloqueado para análise de segurança) — com O2 (golpe Pix/MED) como segunda escolha.**
Argumentos **a favor**: maior severidade, evidência independente recente, janela regulatória e demo forte. **Argumentos contrários que exigem revisão pessoal:** (a) a recuperação do dinheiro/conta depende de operação de compliance — o assistente só melhora a comunicação; se a operação estiver lenta, o impacto em NPS/retention pode ser pequeno; (b) parte do "problema" pode ser legítima (análise antifraude exigida por regra — E08), e prometer prazos pode gerar risco; (c) a amostra pública pode superestimar a frequência; (d) O2 tem evidência de volume ainda maior (47.573 reclamações de estorno — E03) e momento mais dramático, mas com oferta já existente (MED 2.0).
**Recomendação prática:** antes de fechar a escolha, rodar o **roteiro da seção E.1** no app real; se o chat atual já responder bem ao cenário de bloqueio (e mal ao de golpe), inverter a prioridade para O2. A decisão final é do responsável pelo projeto.
