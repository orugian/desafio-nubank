# Oportunidades de IA conversacional para a experiência do cliente Nubank
### Pesquisa de evidências e priorização — insumo para o desafio AI Builder Interns (Salesforce)

**Data da pesquisa:** 27 de outubro de 2026
**Escopo:** mercado brasileiro (pessoa física), com verificação pontual de concorrentes
**Natureza:** pesquisa de fontes públicas. A queda de NPS/CSAT descrita no documento do desafio é **premissa do exercício** e não é tratada aqui como fato público comprovado.

---

## 0. Método, acesso às fontes e limitações

### 0.1 Como a busca foi feita

| Etapa | O que foi feito |
|---|---|
| A — Delimitar | Leitura integral de `Challenge_AI_Builder_Interns_Nu_BR.md`; recorte no mercado brasileiro, clientes pessoa física, jornada de cartão de crédito, conta e atendimento; janela prioritária de 12 meses (out/2025 → out/2026). |
| B — Explorar | Varredura aberta sem antecipar solução: avaliações do app (App Store BR), Reddit (via arquivo PullPush), imprensa, comunidade oficial do Nubank, páginas oficiais de produto/ajuda, concorrentes. Temas agrupados por problema e momento da jornada. |
| C — Verificar | Cada achado recebeu identificador (E01…), data, link direto e limite de interpretação. Relatos do mesmo episódio foram tratados como uma única evidência. |
| D — Confrontar com a oferta | Busca ativa por funcionalidade/procedimento oficial correspondente antes de classificar qualquer lacuna. |
| E — Priorizar | Comparação qualitativa justificada de 5 oportunidades, sem pontuação com aparência de precisão. |

### 0.2 Ferramentas usadas e substituições

- **AgentReach** (`agent-reach doctor`) foi executado para diagnóstico de canais. Resultado: `web` (Jina Reader), `rss`, `github`, `v2ex`, `bilibili` = **ok**; `twitter` = **warn** (nenhum backend instalado); `reddit` = **off** (nenhum backend instalado); `exa_search` = **off**.
- **Redes sociais — 1ª tentativa (falhou) e 2ª tentativa (recuperação parcial):**
  - **Reddit — recuperado por caminho alternativo.** Pela via padrão falhou: `fetch_social.py` recebeu redirecionamento/403; `old.reddit.com` devolveu a página “Boas-vindas ao Reddit” (deslogado); o feed `/r/nubankbr/.rss` respondeu 429 e `.json` respondia 403; instâncias Redlib/SafeReddit responderam 429/403 ou desafio de navegador; `r.jina.ai` retornou “blocked by network security”. **Solução encontrada: API pública PullPush** (arquivo do Reddit), que respondeu com dados. Varredura efetiva: **143 posts de r/nubank** (07/10/2025–02/10/2026; `r/nubankbr` não retornou dados) e **393 comentários recentes** em r/nubank, r/investimentos, r/farialimabets, r/CartoeseClubes, r/financaspessoais, r/golpe, r/Conquistas e outros.
  - **X/Twitter — recuperação apenas parcial.** Para *buscar* posts recentes, não houve caminho: `fetch_social.py` depende de `twitter-cli`/OpenCLI (ausentes); a renderização de `x.com/search` via Obscura devolveu página vazia (SPA não renderizada); a instância alternativa `xcancel.com` está suspensa; a API GraphQL exige credencial de aplicação. **Solução encontrada apenas para tweets individuais:** API de syndication (`cdn.syndication.twimg.com/tweet-result`) e oEmbed funcionaram em **39 de 39 IDs** testados, com texto e data. **Limitação persistente:** sem mecanismo de busca no X, os IDs só puderam ser descobertos por indexação de terceiros, o que privilegia posts antigos e a própria conta @nubank. → **Varredura do X permanece não realizada.**
- **Obscura** foi usado como navegador headless para páginas web (extração em markdown/HTML, com e sem `--stealth`), incluindo páginas oficiais e imprensa.
- **Substituições adotadas:** como o canal de busca nativo e o Google estavam indisponíveis (CAPTCHA), a descoberta de URLs foi feita por **índices de busca acessíveis via Obscura/HTTP** (Bing e Brave). Nesses casos o trecho do resultado é tratado como **excerto indexado, não como leitura integral da fonte** — e está sinalizado assim na tabela.
- **Fontes bloqueadas por proteção anti-bot (limitação registrada):** **Reclame Aqui** (Cloudflare, mesmo em modo stealth), **Google** (CAPTCHA), **Revolut** (Cloudflare).

### 0.3 Fontes efetivamente lidas por inteiro

Avaliações públicas do app Nubank na App Store BR (500 avaliações recentes + 500 “mais úteis”); posts e comentários do Reddit via API de arquivo PullPush (143 posts de r/nubank + 393 comentários recentes em múltiplos subreddits); páginas oficiais `nubank.com.br` (limite, NuScore, contatos, contas canceladas); blog oficial `blog.nubank.com.br`; estudo de caso público OpenAI × Nubank; artigo do blog do Banco Inter; artigo do Tecnoblog; threads públicas da NuCommunity.

### 0.4 Cuidados de interpretação

- Avaliações e reclamações públicas são **amostra com viés de autosseleção**: quem escreve tende a estar insatisfeito. **A quantidade de relatos não mede prevalência.**
- Intenção declarada de trocar de banco **não comprova** troca efetiva.
- Ao longo do texto, três rótulos são usados de forma explícita: **[Evidência observada]**, **[Inferência da pesquisa]** e **[Hipótese a validar]**.

---

## A. Síntese executiva

A oportunidade mais promissora está em **entender e agir sobre a decisão de limite de crédito e do NuScore**, para o cliente pessoa física do cartão Nubank que pediu aumento, recebeu negativa ou viu o score cair. As avaliações do app (ago–out/2026) mostram metas que “mudam” (“precisava chegar a 900… agora precisa ser 901”); um fórum do Reddit (07/10/2026) reúne clientes que comparam limites com outros bancos, inventam contornos (compartilhar dados via Open Finance) e relatam troca efetiva de banco. O próprio Nubank documenta que **“um NuScore alto não é garantia de aumento de limite”** e já oferece NuScore, Evolução de Limite, Missão Limite e Nu Limite Garantido — logo, o atrito é de **diagnóstico, caminho e previsibilidade**, não de ausência de oferta. A principal incerteza é decisiva: parte dos relatos indica frustração com o **valor** do limite, não com a explicação — nesse caso, explicar melhor não eleva CSAT, e o único ganho defensável é entregar um caminho acionável, com data. [Hipótese a validar]

*(165 palavras)*

---

## B. Comparação das oportunidades

| Oportunidade e mercado | Usuário e momento da jornada | Atrito identificado | Evidências | Oferta atual do Nubank | Contribuição possível da IA conversacional | Prioridade e justificativa | Concorrente já faz e tem resultado comprovado |
|---|---|---|---|---|---|---|---|
| **O1. Entender a decisão de limite / NuScore** — Brasil, cartão de crédito PF | Cliente do cartão que pediu aumento, teve negativa, ou viu o NuScore cair; momento imediatamente após a negativa ou a notificação de queda | Critério percebido como opaco e mutável; crença “score alto = limite alto”; não sabe qual caminho se aplica a ele (garantia, missões, pedido mensal); repete o pedido sem retorno | E01 (3 avaliações datadas), **E12**, E04, E05, E08 | **Sim, ampla:** NuScore, Evolução de Limite com datas de análise, Missão Limite, Nu Limite Garantido, Cartão para Construir Limite (E04, E05) | Alta: traduzir a decisão com os dados do próprio cliente; corrigir a crença errada; indicar o caminho aplicável; explicar o que **não** depende dele; passar ao humano com resumo pronto | **1ª** — necessidade clara, dor recorrente, fit conversacional alto, oferta existente sem resposta personalizada, concorrente com proposta equivalente (E07) | Inter: **“Meu Crédito Inter”** — status, pendências, data da próxima análise e roteiro de evolução (E07). **Resultado comprovado não verificado** (é anúncio do próprio Inter) |
| **O2. Entender o bloqueio de conta / “análise de segurança”** — Brasil, conta PF e PJ | Cliente com conta bloqueada, saldo retido e pagamentos travados | Não entender o motivo, o prazo, o que enviar, nem como falar com alguém; sensação de arbitrariedade | E01 (ocorrências pontuais), **E13**, E10, E11 | **Parcial:** comunicação por e-mail, desbloqueio por e-mail, página explicativa (E10) | Média-alta: explicar a categoria do bloqueio, o que enviar, prazo estimado, o que fazer enquanto isso; e registrar expectativa | **4ª** — gravidade máxima, mas **a própria página oficial diz que “todas as atividades no app ficam indisponíveis”** durante o bloqueio (E10): o canal do chat pode não estar disponível justamente quando é necessário. Depende de política/compliance, não de conversa | Não verificado |
| **O3. Continuidade durante indisponibilidade (PIX, login, fatura)** — Brasil | Cliente que precisa concluir uma tarefa urgente e o app falha | Não sabe se a falha é geral ou só dele, se a operação foi concluída, o que fazer agora; soluções alternativas circulam de forma improvisada | E03, E09, E01 | **Parcial:** blog “app fora do ar”, status e confirmações à imprensa (E09) | Média: confirmar se é incidente geral; dizer o que está e o que não está afetado; oferecer caminho alternativo verificado; evitar pagamento duplicado | **2ª** — evidência mais forte e mais atual do período, impacto agudo; porém **boa parte do valor é entregável sem conversa** (aviso na tela + status), o que enfraquece a justificativa de IA | Inter/Tecnoblog: workaround (PIX agendado) foi descoberto por usuários, não pelo banco (E09). Resultado não comprovado |
| **O4. Entender a fatura (rotativo, IOF, estorno, fatura vencida)** — Brasil | Cliente ao abrir a fatura, percebendo valor maior do que esperava | Detalhamento pouco claro; regra “fatura vencida entra na fatura atual” não evidente; estornos mal detalhados | E01 (2 avaliações datadas) | **Parcial:** detalhamento na tela da fatura e suporte via chat (E05, contatos) | Alta: “me explica esta cobrança” é um caso de conversa por excelência, com dado estruturado | **3ª** — fit conversacional altíssimo e protótipo fácil, mas a base de evidências coletada é mais estreita e parte do ganho é de design de tela, não de conversa | Não verificado |
| **O5. Contestação / estorno de compra não reconhecida** — Brasil | Vítima de fraude ou compra desconhecida, após registrar a contestação | Falta de visibilidade de status e prazo; sensação de “mesma coisa de nada” | E01 (2 avaliações datadas) | **Sim:** fluxo de contestação no app (mencionado nos relatos) | Alta: acompanhamento guiado de status e prazos | **5ª** — depende de regras de bandeira/chargeback e do time de risco; escopo mais sensível e menos “conversável” no que decide o resultado | Não verificado |

> **Nota sobre a coluna de concorrentes:** só a linha O1 tem evidência **lida diretamente** (blog do Inter). “Resultado comprovado” não foi encontrado para nenhum concorrente; toda afirmação de benefício é institucional.

---

## C. Evidências essenciais

> Datas = publicação/registro. Acesso = 27/10/2026 para todas.

### E01 — Avaliações do app Nubank na App Store BR (mercado BR, produto: app de conta/cartão, usuários: clientes PF)
- **Fonte:** API pública de avaliações da App Store (país BR, app Nubank, id 814456780) — [feed JSON](https://itunes.apple.com/br/rss/customerreviews/page=1/id=814456780/sortby=mostrecent/json) · página do app: <https://apps.apple.com/br/app/id814456780>
- **Data:** avaliações de **24/08/2026 a 26/10/2026** (500 avaliações coletadas; 320 com nota ≤ 3).
- **Síntese:** pedidos de limite frustrados e percepção de critério mutável. Exemplos datados (texto público, autor omitido):
  - 01/10/2026, 3★, v8.0.12 — *“Sou cliente do Nubank desde 2019 e nunca tive um aumento significativo de limite. No mês passado, informaram que meu Score Nubank precisava chegar a 900; consegui atingir os 900 e, agora, dizem que precisa ser 901. […] esperava mais transparência e valorização.”*
  - 15/09/2026, 3★, v8.0.10 — *“Nubank é meu banco principal […] nunca saiu dos 200 de limite, mesmo sempre pagando em dias e fazendo o que pedem pra subir, já li vários comentários sobre esse mesmo problema.”*
  - 22/10/2026, 1★, v8.0.16 — *“Eles simplesmente acordam num dia (no que você mais precisa) e decidem tirar a opção de converter limite em crédito.”*
- **O que sustenta:** existência e atualidade do atrito; associação espontânea entre NuScore, limite e frustração; menção a intenção de trocar de banco.
- **O que não permite concluir:** prevalência do problema; que a negativa seja indevida; que a opção citada em 22/10/2026 tenha de fato sido removida (o relato pode refletir mudança de elegibilidade — ver E04).
- **Outros exemplos do mesmo corpus usados nas linhas O3–O5 da tabela:**
  - 29/09/2026, 1★ — *“Estornos mal detalhados […] o detalhamento da fatura regrediu e não está nada claro.”* (O4)
  - 16/09/2026, 1★ — *“tive que entrar em contato com o suporte só pra CHEGAR na informação de que o valor da fatura vencida entra automaticamente na fatura atual.”* (O4)
  - 27/08/2026, 1★ — *“sofri um golpe e contestei no nubank, mesma coisa de nada.”* (O5)
  - 20/09/2026, 1★ — relato de vítima de golpe cuja conta foi cancelada, com prejuízo financeiro (O5)
  - 24/10/2026, 1★ — *“vocês liberam um valor pra empréstimo, a gente tentar pegar, vcs colocam em análise e a opção simplesmente some.”* (previsibilidade — reforça O1)
- **Contraponto no mesmo corpus:** o tema dominante numericamente nas últimas semanas **não** é limite, e sim **instabilidade do app** (~25% das avaliações negativas do período mencionam app que não abre/trava, PIX que falha ou notificação ausente).

### E02 — Avaliação contrária ao uso de IA no fluxo de PIX
- **Fonte:** App Store BR, avaliação de 05/09/2026, 1★, v8.0.9, título *“IA no pix?? Sério mesmo??”* (mesmo feed de E01).
- **Síntese:** *“Qual o problema de vcs pra meterem IA em tudo? Tem chat pra mandar pix? […] Por favor, parem com isso!!!!”*
- **O que sustenta:** parte dos clientes percebe IA embutida em fluxos transacionais como atrito, não como ajuda.
- **O que não permite concluir:** rejeição geral a IA; trata-se de **um** relato, sobre um fluxo específico (PIX), e pode refletir problemas de UX daquela implementação.
- **Uso no relatório:** evidência contrária — a proposta precisa explicar **onde** a conversa agrega e onde ela atrapalha.

### E03 — “PIX descontado e não chegou” (mercado BR, conta / PIX)
- **Fonte:** App Store BR, 20/10/2026, 2★, v8.0.16 (mesmo feed de E01).
- **Síntese:** *“duas vezes seguidas fui fazer pix a nubank fala que deu erro e tentar novamente mais tarde, sem senha de transferência mesmo assim descontar o dinheiro da minha conta, mas para a pessoa não cai e eu tenho q me vira pra conseguir novamente o dinheiro.”*
- **O que sustenta:** ansiedade sobre “o dinheiro saiu e não chegou” é um atrito real e de alta urgência.
- **O que não permite concluir:** que o débito sem destinatário seja sistemático; um único relato não descreve o comportamento do sistema.

### E04 — Página oficial “Como aumentar o limite do Cartão Nubank?”
- **Fonte:** <https://blog.nubank.com.br/como-aumentar-limite-cartao-nubank/> — **publicado em 18/11/2025, atualizado em 19/10/2026** (uma semana antes desta pesquisa).
- **Síntese (citações literais):**
  - *“um NuScore alto não é garantia de aumento de limite, mas favorece sua avaliação”*;
  - *“Você pode acompanhar as datas de cada análise mensal no app, na tela de ‘Evolução de Limite’”*;
  - *“No app, toque em Meus limites […] clique em Informar na tela de Evolução de Limite e responda o objetivo e o valor desejado”*;
  - *“Algumas soluções estão sendo liberadas de forma gradual para os clientes elegíveis.”*
- **O que sustenta:** a oferta existe e é **rica** (NuScore 0–1000, análise mensal com datas, Missão Limite, Nu Limite Garantido com Caixinhas/Tesouro, Cartão para Construir Limite). Sustenta também que o próprio Nubank reconhece a confusão entre score e limite.
- **O que não permite concluir:** que o cliente compreenda ou encontre essas peças no app; que a experiência funcione na prática. A existência da página **não comprova** resolução do atrito.

### E05 — Páginas oficiais de produto (limite e NuScore)
- **Fonte:** <https://nubank.com.br/nu/cartao/limite> e <https://nubank.com.br/nu/cartao/nuscore> — sem data editorial; acesso em 27/10/2026.
- **Síntese:** o NuScore é apresentado como pontuação que *“indica o que tem influenciado positivamente e negativamente no seu perfil”*, com *“recomendações práticas e personalizadas”*; a página de limite descreve critérios gerais (*“renda, score de crédito e histórico de pagamentos”*).
- **Inconsistência observada (não conclusão):** o caminho de acesso ao NuScore aparece diferente nas duas páginas oficiais — em uma, “Cartão de Crédito → NuScore”; na outra, “toque na sua foto de perfil”. Pode ser atualização ou segmentação, mas é indício de custo de descoberta.
- **O que sustenta:** existe orientação oficial, porém genérica e não personalizada; não há, nas fontes lidas, um lugar único que responda “por que **o meu** limite é este e o que acontece com **o meu** pedido”.

### E06 — Estudo de caso público OpenAI × Nubank (contexto de maturidade em IA)
- **Fonte:** <https://openai.com/pt-BR/index/nubank/> — sem data no corpo; acesso em 27/10/2026.
- **Síntese (literal):** *“Assistente com IA: resolve 55% das consultas de nível 1, gerencia mais de 2 milhões de chats ao mês e reduz em 70% o tempo de resposta nos chats”*; há também *“Copiloto para central de atendimento”* que *“cria resumos de conversas e recomenda respostas aos atendentes humanos”*.
- **O que sustenta:** o Nubank **já opera IA conversacional em escala no atendimento**. Logo, “um chatbot que responde dúvidas” não é diferencial — a oportunidade tem de estar no que a triagem de nível 1 **não** resolve.
- **O que não permite concluir:** nada sobre a qualidade percebida pelo cliente; são métricas de eficiência divulgadas em estudo de caso do fornecedor.

### E07 — Concorrente: “Meu Crédito Inter” (Banco Inter)
- **Fonte:** <https://blog.bancointer.com.br/meu-credito-inter-o-caminho-claro-para-conquistar-seu-limite/> — **publicado em 03/12/2025**.
- **Síntese (literal):** reúne em um só lugar a nota de crédito, o envio/atualização de informações e *“a data da sua próxima análise”*; oferece *“roteiro de evolução: o app orienta o que fazer para melhorar sua nota e aumentar o limite”*; e afirma que a centralização *“poupa tempo, evita múltiplas tentativas desnecessárias”*, reconhecendo que *“muita gente sente que solicitar crédito é navegar no escuro”*.
- **O que sustenta:** existe no mercado brasileiro um posicionamento explícito de **transparência + próximo passo + data de reavaliação** para crédito — exatamente o eixo em que os relatos de E01 apontam atrito no Nubank.
- **O que não permite concluir:** que o Inter obtenha resultado superior. **Não há resultado comprovado**; é comunicação institucional. Também não foi verificado que o Inter faça isso **conversacionalmente** (a descrição é de funcionalidade de app).

### E08 — Reclame Aqui: NuScore e limite (evidência secundária — leitura direta indisponível)
- **Fonte:** reclamações públicas localizadas por índice de busca. Excertos indexados de reclamações de 12/08/2025, 14/12/2025 e 26/01/2026 sobre NuScore/limite, além de lista de reclamações por problema de “limite de crédito”.
- **Status de acesso:** o site **bloqueou o acesso automatizado** (verificação Cloudflare) em duas tentativas, inclusive em modo stealth. **As páginas não foram lidas na íntegra.**
- **Síntese do excerto indexado (inclui texto atribuído à resposta da empresa):** *“Embora influencie sua visualização sobre a evolução de seu histórico, o NuScore não garante, por si só, um aumento de limite.”*
- **O que sustenta:** há reclamações sobre o mesmo tema fora da App Store, ao longo de 2025–2026, e a explicação oficial repete a distinção score ≠ limite.
- **O que não permite concluir:** qualquer número, taxa de resolução ou prevalência — e a resposta atribuída à empresa **não foi confirmada na fonte original**. Tratar como indício, não como prova.

### E09 — Imprensa: indisponibilidade de PIX e solução improvisada pelos clientes
- **Fonte:** Tecnoblog, *“Nubank fora do ar: Pix volta a funcionar após instabilidade nesta sexta (4)”* — <https://tecnoblog.net/noticias/nubank-fora-do-ar-aplicativo-tem-instabilidade-nesta-sexta-4/> — **04–05/09/2026**.
- **Síntese (literal):** *“Clientes reclamaram que não era possível fazer Pix”*; *“o app do Nubank não passava da tela de digitar a chave de quem vai receber o Pix”*; o Nubank *“afirmou que a instabilidade estava integralmente solucionada”*; e o subtítulo *“Agendamento de Pix era solução improvisada”*, com usuários no X ensinando o contorno.
- **O que sustenta:** (a) a indisponibilidade é episódica mas recorrente no período (o veículo lista incidentes correlatos em 14/08, 27/05 e outros); (b) **o contorno existia e não foi comunicado pelo banco** — o cliente o descobriu em rede social.
- **O que não permite concluir:** extensão do impacto, número de clientes afetados e se houve reembolso de prejuízos.

### E10 — Página oficial “O Nubank está cancelando contas? Entenda quando acontece”
- **Fonte:** <https://nubank.com.br/nubank-cancelando-contas-entenda-quando-acontece> — sem data editorial; acesso em 27/10/2026.
- **Síntese (literal):** *“Normalmente, após identificarmos algo que gera o bloqueio da conta do Nubank, todas as atividades no app ficam indisponíveis.”* E: *“nós comunicamos o desbloqueio da conta por e-mail […] Em todas as situações, o e-mail será a principal ferramenta de contato do Nubank com o cliente.”*
- **O que sustenta:** existe procedimento e comunicação oficial; o desbloqueio se dá por e-mail, em prazo não especificado publicamente.
- **O que não permite concluir:** prazos praticados. **Consequência metodológica:** se o app pode ficar integralmente indisponível, a premissa de um assistente **dentro do chat do app** não se sustenta para todo caso de bloqueio — o que pesa contra essa oportunidade.

### E11 — NuCommunity: relatos de bloqueio (evidência complementar)
- **Fonte:** *“Bloqueio temporário de segurança”* (post público registrado como “há 2 meses”, cliente PJ) — <https://comunidade.nubank.com.br/duvidas/post/bloqueio-temporario-de-seguranca-JfEjaDvVQFx80VC>; e o guia comunitário sobre conta bloqueada (05/01/2026, **conteúdo de membro, não oficial**) — <https://comunidade.nubank.com.br/vida-financeira/post/guia-tecnico-minha-conta-foi-bloqueada-e-agora-prazos-e-direitos-JW4YlU1cZ5Ciccn>
- **Síntese:** cliente relata bloqueio após receber por boleto, com pagamentos importantes pendentes e sem conseguir movimentar; pede orientação sobre “como proceder” e não há resposta oficial na thread.
- **O que sustenta:** o atrito de O2 é real e a busca por orientação transborda para canais comunitários.
- **O que não permite concluir:** quantidade de casos; o guia da comunidade é de autor externo e **não** representa posição do Nubank.

### E12 — Reddit (recuperada via API PullPush): limite percebido como incompatível com o relacionamento
- **Fonte:** arquivo público do Reddit via API PullPush — varredura de **143 posts de r/nubank** (07/10/2025–02/10/2026) e **393 comentários recentes** em múltiplos subreddits. Acesso em 27/10/2026.
- **Caso principal — r/investimentos, thread “Nubank Ultravioleta ainda decepciona nisso...”, 07/10/2026** (<https://reddit.com/r/investimentos/comments/1wzjl6x/>). Post original: *“fui comprar uma máquina de lavar e não tinha limite […] o nubank dá um cartão desses com 20k de limite e tu tem que se virar, **não tem opção de aumentar além de ter que colocar dinheiro em caixinha**; tenho um visa click no itau com 80k de limite”*. Nos comentários, relatos independentes:
  - *“Tenho 80k nas caixinhas do nubank, conta ultravioleta […] e o limite do cartão continua 12k. No santander tenho 60k de limite, btg 32.”*
  - *“Eu tenho 120k em caixinhas no Nubank e meu limite é só 15k. Recebo salário lá e nunca atrasei faturas. O BB me dá 80k de limite no cartão basicão deles.”*
  - **Contorno inventado pelos usuários:** *“Compartilha as informações do Itaú com a nubank, e depois de uns 20 dias você faz a solicitação lá de aumentar crédito, depois chama no atendimento ultravioleta. Geralmente quando veem o limite alto em outros bancos, eles aumentam sim.”*
  - **Outro contorno:** *“cancelei meu cartão do outro banco com limite alto e uns 2 meses depois o nubank deixou meu limite mais alto ainda.”*
  - **Troca efetiva (não apenas intenção):** *“migrei do nubank pro itaú personnalité faz uns 2 anos e não me arrependo, atendimento resolve mesmo e nunca passei sufoco com limite.”*
  - **Contraexemplos no mesmo fio:** *“pegaram o ultravioleta no ano passado com 41k de limite e esse ano subiram pra 110k”*; *“criei conta no nubank com 0 reais, dizendo que minha renda é 1500 reais e me deram 12k de limite”*; e a crítica à reclamação: *“Se ele tem o limite de 80k no outro banco usa o outro banco.”*
- **O que sustenta:** o atrito de limite é real, recente e articulado; **a informação que destrava o caso (Open Finance + pedido + data) existe, mas circula entre usuários, não no atendimento**; há relato de troca efetiva, não só de intenção.
- **O que não permite concluir:** prevalência; que o limite seja indevido; **e, sobretudo, que a dor seja de informação** — vários relatos demonstram que o usuário **conhece** os caminhos e os rejeita (“ter que colocar dinheiro em caixinha”). O fio contém também casos de aumento generoso, o que aponta **inconsistência**, não regra única.
- **Resposta da empresa:** não há participação oficial no fio; os comentários citam o “atendimento ultravioleta” como instância de escalonamento informal.

### E13 — Reddit (complementar): bloqueio de conta e hesitação em continuar
- **Fonte:** r/farialimabets, *“Loss: Nubank cancelando conta por usar concorrente.”*, **29/09/2026** (<https://reddit.com/r/farialimabets/comments/1wt5pq7/>); e r/investimentos, *“Nubank é um lixo”*, 06/10/2026 (<https://reddit.com/r/investimentos/comments/1wz7atc/>).
- **Síntese:** o autor relata tentativa de transferir R$ 31 mil para outra instituição em nome do mesmo titular, bloqueio da transação, e-mail de encerramento no dia seguinte e saldo retido. Em comentário no mesmo fio: *“Venho observando bastante gente reclamando do mesmo problema […] já tive algumas vezes a conta bloqueada temporariamente após fazer depósito via boleto. Estou com um pé atrás, inclusive, em utilizar o Nubank por conta disso.”* No outro fio, o autor relata ser solicitado repetidamente a reenviar comprovante de endereço, com bloqueio de transações por três dias úteis.
- **O que sustenta:** O2 é grave e, em pelo menos um relato, converte-se em **hesitação declarada de continuar usando** — o elo mais próximo de retenção que a pesquisa encontrou.
- **O que não permite concluir:** correção do relato; motivos reais do bloqueio (pode haver risco legítimo não relatado); trata-se de relato unilateral.

### E14 — X/Twitter (parcial): respostas oficiais recuperadas, busca não realizada
- **Fonte:** API de syndication/oEmbed do X, recuperando tweets individuais. Acesso em 27/10/2026.
- **Síntese:** os tweets recuperados são majoritariamente **respostas oficiais antigas** da @nubank, não queixas recentes de clientes. Exemplos: *“Infelizmente nós não conseguimos liberar todos os pedidos. Vamos torcer para que no próximo a resposta seja positiva! Se quiser entender como funciona a análise é só acessar o vídeo…”* (10/04/2018); *“Twitter inventa nova forma pra vocês pedirem aumento de limite pra gente”* (04/03/2020); *“O atendimento do Nu é exclusivo pelo chat (direto no seu app), telefone ou email”* (17/01/2024).
- **O que sustenta:** o padrão de resposta oficial para pedido de limite é genérico e remete a conteúdo externo (vídeo/explicação), sem personalização; e há demanda recorrente por aumento de limite manifestada publicamente.
- **O que não permite concluir:** **nada sobre o período recente** — os tweets encontrados são de 2018 a 2026 isolados e não constituem varredura. Não usar como medida de volume ou de sentimento atual.

---

## D. Oportunidade recomendada

### D.1 Problema e usuário prioritário
**Usuário:** cliente pessoa física do Cartão Nubank, com uso recorrente, que **pediu aumento de limite** ou **recebeu notificação de queda do NuScore** e não entendeu a decisão.
**Momento da jornada:** imediatamente após a negativa de aumento, após a atualização mensal do NuScore, ou quando abre o chat escrevendo “por que meu limite não aumenta?”.
**Necessidade principal:** entender por que a decisão foi aquela, o que depende dele e o que não depende, qual é o próximo passo e quando ele acontece.

### D.2 Por que priorizar em relação às alternativas
1. **A necessidade é inequívoca nos relatos** (E01): o cliente não pede produto novo, pede **explicação e próximo passo**.
2. **A oferta existe e é fragmentada** (E04, E05): NuScore, Evolução de Limite, Missão Limite, Nu Limite Garantido, Cartão para Construir Limite — o cliente precisa saber **qual se aplica a ele**. É o tipo de problema em que a conversa vence a página.
3. **Há uma crença errada confirmada pela própria empresa** (E04: score alto não garante limite). Corrigi-la é ganho de experiência de baixo risco.
4. **O nível 1 já está automatizado** (E06) — o valor não está em responder FAQ, e sim em responder **personalizadamente** o que a triagem genérica não responde.
5. **O concorrente já posicionou o território** (E07), sinal de demanda reconhecida no mercado.
6. **A informação que destrava o caso circula entre usuários, não no atendimento** (E12): o contorno “compartilhe os dados de outro banco via Open Finance, espere ~20 dias e peça a análise” foi ensinado por um cliente a outro em fórum público. Quando usuários viram professores de um processo interno, é sinal de que a empresa não o entrega no momento da dúvida — e é exatamente esse tipo de orientação acionável que uma conversa pode padronizar.

**Limite reconhecido:** a evidência de maior volume no período (E01, E09) aponta **indisponibilidade do app** como tema dominante — mas é problema operacional, não conversacional (ver O3 na tabela).

### D.3 Cliente ou equipe de atendimento?
**Assistente voltado ao cliente, no chat do app**, como especialista em limite e crédito — com o mesmo motor reutilizável como **copiloto do atendente** (segundo uso, dentro do escopo). O copiloto elimina o risco de inconsistência entre o que o cliente vê e o que o atendente diz; a demonstração ao vivo, porém, é mais convincente na ponta do cliente.

### D.4 Hipótese de intervenção conversacional
[Hipótese a validar] Ao receber “meu limite não aumenta”, o assistente: (1) identifica o **estado real** do cliente em dados fictícios (limite atual, data da última análise, NuScore e fatores, pedidos anteriores, garantia disponível); (2) explica a decisão em linguagem simples, separando “o que depende de você”, “o que é análise interna do Nu” e “o que você não controla”; (3) corrige explicitamente a crença “score alto = limite alto”; (4) apresenta **o caminho aplicável** (pedido na próxima análise / Nu Limite Garantido / Missão Limite / Cartão para Construir Limite) com **o que acontece e quando**; (5) escala para humano **com resumo do caso** quando houver contestação ou dificuldade financeira.
**Ajuste após a evidência do Reddit (E12):** o foco deixa de ser apenas “explicar” e passa a ser **diagnosticar e dar um caminho acionável com data**. Muitos clientes do fórum já conhecem os caminhos e os rejeitam; o que lhes falta é saber **por que o caso deles é o que é** (dado desatualizado? renda não reconhecida? ausência de relacionamento considerado?) e **o que precisa mudar antes da próxima análise**. Por isso o assistente deve incluir: (i) checagem de dados cadastrais/renda desatualizados; (ii) menção ao compartilhamento de informações entre instituições (Open Finance), **a validar com o time de crédito antes de prometer qualquer efeito**; (iii) a data da próxima análise como compromisso verificável.
**Benefício esperado:** substituir “repetir o pedido e receber resposta genérica” por “entender a decisão, corrigir o que estiver corrigível e sair com próximo passo e data”. Isso é ganho de **clareza e de ação possível**, não de concessão de crédito.

### D.5 Escopo mínimo demonstrável gratuitamente
- Chat escrito com histórico persistente na sessão, aceitando mensagens novas digitadas pelo painel.
- **Base fictícia explícita** (3 perfis: negado por análise interna; com garantia disponível; com score caindo por dívida externa), rotulada na tela como **“dados simulados”**.
- Instruções do agente visíveis e editáveis (persona, limites, o que nunca prometer, quando escalar).
- Caminho de escalonamento que gera um resumo de caso.
- Opcional: saída estruturada (JSON) com o plano de ação, evidenciando o que seria integrável.
- Custo: apenas inferência de modelo em camada gratuita; nenhuma assinatura paga é necessária para a demonstração.

### D.6 O que é simulado e o que fica fora do escopo
**Simulado:** todos os dados do cliente, elegibilidade, NuScore, datas de análise, valores e resultados de pedidos.
**Fora do escopo:** decidir ou conceder limite; acessar sistemas reais; executar operações; prometer prazos; avaliar crédito; substituir análise de risco. O assistente **não altera a política de crédito** — e isso deve estar explícito na demonstração.

### D.7 Relação com as três métricas (separadamente)
- **CSAT (satisfação com a experiência):** relação mais direta. O ganho é sobre **a interação** (clareza, tempo até entender, ausência de repetição) e pode ocorrer **mesmo com a negativa mantida**. Não se presume alta automática: explicar uma negativa pode reduzir a satisfação momentânea de quem esperava aprovação.
- **NPS (disposição de recomendar):** relação plausível por **percepção de transparência e de processo justo** — quem entende o critério tende a atribuir a negativa a mérito, não a arbitrariedade. NPS, porém, é influenciado por preço, limite e conveniência; a explicação não é alavanca isolada.
- **Retenção (continuidade ao longo do tempo):** relação **mais fraca**. Há intenção declarada de troca associada a limite (E01), mas intenção não é abandono. O efeito plausível é reduzir o atrito que **precede** a troca — não impedir a troca por si.

### D.8 Principal risco de não gerar o benefício
**O cliente quer limite maior, não melhor explicação.** E a evidência do Reddit (E12) torna esse risco **mais concreto, não apenas teórico**: há relatos de quem já conhece o caminho (“colocar dinheiro em caixinha”) e o rejeita justamente porque não quer imobilizar o próprio dinheiro para ter limite. Para esse subgrupo, mais informação não muda nada — só um aumento de limite mudaria. Se esse for o padrão dominante, o assistente melhora o CSAT da *conversa* e piora a percepção de valor do produto, ao deixar explícito que as únicas saídas exigem dar algo em troca.

Consequência prática: o protótipo precisa ser **honesto sobre o custo de cada caminho** (Caixinhas/Tesouro imobilizam recursos que seguem rendendo, mas ficam em garantia) em vez de vender “mais limite na hora” como se fosse gratuito. É o primeiro ponto a testar, antes de investir no protótipo.

---

## E. Validação e lacunas

### E.1 Rodada 0 — Validar a premissa (antes de construir)
- **Com quem:** 8–12 clientes PF com cartão ativo que tiveram pedido de aumento negado ou queda de NuScore nos últimos 90 dias, em dois grupos: nunca teve aumento; teve aumento e depois perdeu.
- **Situação:** entrevista de 20–30 min sobre a última negativa, **sem mostrar protótipo**; pedir que o cliente explique com as próprias palavras por que o limite não subiu.
- **Período:** 2 semanas.
- **O que observar:** (a) consegue explicar o motivo? (b) o que fez depois (desistiu, repetiu o pedido, procurou o chat, abriu concorrente)? (c) a demanda dominante é *entender* ou *reverter*? (d) usa NuScore e limite como sinônimos?
- **Critério de decisão [hipótese, não meta comprometida]:** avançar se a dor dominante for “não entendo/não sei o que fazer” e se o cliente **não** exigir que a única resposta aceitável seja aprovar o aumento.

### E.2 Teste de funcionamento do protótipo (não é teste de impacto)
- **Com quem:** 5–8 clientes reais + 3–5 atendentes, em ambiente controlado.
- **Situação:** 4–6 roteiros fixos — negativa mantida; score caindo; cliente com garantia disponível; cliente que contesta o critério; cliente que relata dificuldade financeira; pergunta fora do escopo.
- **O que observar:** funcionamento ao vivo; continuidade da conversa; aderência às instruções; **capacidade de dizer “não sei”**; escalonamento correto; ausência de promessa indevida.
- **Resultado esperado:** lista de falhas e ajustes nas instruções. **Isso mede utilidade e segurança, não impacto de negócio.**

### E.3 Teste de utilidade percebida (ainda não é impacto)
- **Com quem:** 30–50 clientes em teste A/B conceitual (resposta atual × resposta assistida), em cenários fictícios idênticos.
- **O que observar:** clareza autorrelatada, tempo até entender, esforço percebido, intenção de repetir o pedido, tomada de ação recomendada (ex.: abrir Nu Limite Garantido), e **satisfação com a interação separada de satisfação com o resultado**.
- **Duração sugerida:** 3–4 semanas.

### E.4 Avaliação de impacto nas métricas de negócio (fase posterior, não coberta aqui)
- **Desenho:** experimento randomizado no chat real, com grupo de controle, mínimo de 6–8 semanas — cobertura suficiente para capturar ciclo de fatura e atualização mensal do NuScore.
- **Métricas:** CSAT **pós-interação** (experiência), NPS **em coorte trimestral** (disposição a recomendar), retenção **por continuidade observada** (saldo/movimentação/cancelamento) — cada uma com sua janela e seu confundidor.
- **Advertência metodológica:** nenhum dos testes anteriores comprova impacto em CSAT, NPS ou retenção. Teste com dados simulados **não** é evidência de resultado real.

### E.5 Lacunas de pesquisa (o que não foi possível estabelecer)
1. **X/Twitter não pôde ser varrido.** Tweets individuais são recuperáveis (E14), mas sem busca não há como levantar queixas recentes. Consequência: **nenhuma evidência desta pesquisa vem de queixa de cliente no X**; a única evidência de X é de resposta oficial antiga — e o relato de usuários ensinando o contorno de PIX no X (E09) chegou de forma indireta, via imprensa.
2. **Reddit foi recuperado, mas com cobertura limitada ao arquivo do PullPush**: 143 posts de r/nubank e 393 comentários. O volume é pequeno, o `r/nubankbr` não retornou dados e a filtragem por palavra-chave é imprecisa. **Não há base para inferir prevalência.**
3. **Reclame Aqui não pôde ser lido** (Cloudflare) — a base mais usada no Brasil para atendimento ficou apenas como excerto indexado. Consequência direta: **não há medida de volume, taxa de solução ou tempo de resposta** para nenhuma das oportunidades.
4. **Nenhum indicador oficial foi usado** (Banco Central — índice de reclamações — e dados de NPS/CSAT do Nubank não foram acessados).
5. **A experiência real do app não foi observada** — se o fluxo “Evolução de Limite” existe, onde fica e o que mostra é, hoje, **inferência a partir de documentação oficial**.
6. **Concorrentes além do Inter não verificados** (Revolut bloqueado; C6, PagBank e XP não checados). Nenhum concorrente tem resultado comprovado publicamente para os cenários avaliados.
7. **Não se sabe** quantos clientes recebem explicação humana consistente após negativa — se hoje já existe um bom roteiro de atendimento, o ganho incremental do assistente é menor.

### E.6 Decisão que o responsável pelo projeto deve revisar pessoalmente
> **Escolher entre atacar o atrito crônico ou o atrito agudo — com o trade-off explícito.**
>
> - **Caminho A (recomendado aqui): O1 — limite/NuScore.** Melhor encaixe conversacional, jornada clara, protótipo convincente e baixo risco de execução. **Argumento contrário:** não muda o resultado, e a frustração pode ser de crédito, não de informação; nenhuma fonte pública mede prevalência. Se o cliente só aceitar “aumentou o limite” como resposta, o investimento não move CSAT.
> - **Caminho B: O3 — continuidade durante indisponibilidade.** **Evidência mais forte e mais recente** (imprensa + avaliações do app), impacto agudo no momento da necessidade, e há precedente concreto de informação faltante (E09: o contorno existia e não foi comunicado). **Argumento contrário:** a maior parte do valor é entrega de status e alternativa, que se resolve com aviso contextual — um chatbot pode ser apenas o formato do desafio, não a melhor solução.
> - **Caminho C: O2 — conta bloqueada.** Maior gravidade e maior risco reputacional. **Argumento contrário decisivo:** a própria documentação oficial indica que, no bloqueio, “todas as atividades no app ficam indisponíveis” (E10) — o canal de conversa pode não existir exatamente no momento em que seria mais necessário, e a resolução depende de política e compliance.
>
> A recomendação é **A**, com a decisão final do responsável condicionada a uma leitura pessoal de dois pontos: (i) a empresa aceita investir em uma experiência que pode **não** mudar a concessão de crédito? (ii) a liderança prioriza o pico de insatisfação recente (indisponibilidade) ou o atrito estrutural (crédito)? Se a resposta a (i) for negativa, migrar para **B**.

---

## Anexo 1 — Roteiro de validação empírica no app (para o titular da conta)

O objetivo é **substituir inferência por observação** em 6 pontos que hoje só posso afirmar a partir de documentação oficial. Em nenhum passo peça para compartilhar nome, número de conta, agência, CPF, senha, código, saldo ou qualquer dado de terceiro. Se enviar capturas de tela, mascare valores, nomes e números.

| # | O que fazer no app | O que registrar (sem dados pessoais) |
|---|---|---|
| 1 | Menu do perfil → localizar **NuScore** | Existe? Qual o caminho exato (toques)? Mostra pontuação, fatores positivos/negativos, dica de ação? Mostra data da próxima atualização? |
| 2 | Cartão de crédito → **Meus limites** / **Evolução de Limite** | Existe essa tela? Mostra **data da próxima análise**? Permite informar “objetivo e valor desejado”? |
| 3 | Procurar **Missão Limite**, **Nu Limite Garantido** (Caixinhas/Tesouro) e **Cartão para Construir Limite** | Quais aparecem para você e quais não? Há explicação de **por que** aparece ou não? |
| 4 | No **chat**, escrever exatamente: *“por que meu limite não aumenta?”* | Quantas mensagens até a primeira resposta útil? A resposta é genérica ou cita seus dados? O bot menciona NuScore × limite? Oferece caminho concreto (garantia/missões/análise mensal)? Oferece **data**? Permite falar com humano? Em quanto tempo? |
| 5 | No **chat**, escrever: *“meu NuScore caiu, quero entender”* | Mesmo roteiro do item 4. Registrar se a resposta contradiz o item 1. |
| 6 | Verificar na área de cartão se há histórico/status dos **pedidos de aumento** | Existe registro do pedido anterior, com data e resultado? |
| 7 | *(Opcional, se já vivenciou)* Em caso de bloqueio ou falha do app: o **chat continuou acessível**? | Sim/Não e o que a tela dizia. Isso valida ou refuta o limite apontado em E10. |
| 8 | *(Opcional)* No **chat**, pedir: *“quero mais limites por garantia”* | O bot conduz ao fluxo correto ou gera loop? |

**Como isso altera a recomendação:** se o item 4 mostrar que o chat **já** entrega explicação personalizada com data e próximo passo, o atrito da oportunidade O1 deixa de ser de oferta e passa a ser de **percepção/descoberta** — e o argumento muda de “falta explicação” para “falta a explicação certa no momento certo”, o que reduz (mas não elimina) o valor do assistente. Se o item 7 mostrar que o chat permanece acessível durante bloqueios, a oportunidade O2 volta a ser viável e passa a competir de igual para igual com O1.

---

## Anexo 2 — Números usados e o que eles **não** significam

| Número | Origem | O que **não** significa |
|---|---|---|
| 500 avaliações recentes; 320 com nota ≤ 3 | App Store BR, 24/08–26/10/2026 (E01) | Não é amostra representativa da base de clientes. |
| ~25% das avaliações negativas citam app que não abre/trava/falha | E01 | Não mede incidência de falha; mede o que se decide escrever numa avaliação. |
| ~6,6% das avaliações negativas mencionam limite | E01 | Não mede prevalência da insatisfação com limite. |
| 143 posts de r/nubank e 393 comentários recentes | Reddit via PullPush (E12, E13) | Não mede prevalência; um fórum técnico-financeiro não representa a base de clientes. |
| 55% de resolução de nível 1; 2 milhões de chats/mês; 70% menos tempo de resposta | Estudo de caso OpenAI × Nubank (E06) | São métricas de eficiência divulgadas pelo fornecedor; não são CSAT nem NPS. |
| Nenhuma queda de NPS/CSAT do Nubank é medida aqui | — | A queda descrita no desafio é **premissa do exercício**; nenhuma fonte pública consultada a comprova. |

---

## Anexo 3 — Registro de acesso às fontes

| Fonte | Situação | Observação |
|---|---|---|
| App Store BR (feed público de avaliações) | ✔ Acessada | 1.000 avaliações coletadas (500 recentes + 500 “mais úteis”); análise feita sobre as recentes |
| `nubank.com.br` (limite, NuScore, contatos, contas canceladas) | ✔ Acessada | Conteúdo lido integralmente em markdown |
| `blog.nubank.com.br` (como aumentar o limite; app fora do ar; SOS Nu) | ✔ Acessada | Datas de publicação/atualização capturadas |
| OpenAI — estudo de caso Nubank | ✔ Acessada | |
| Blog do Banco Inter — “Meu Crédito Inter” | ✔ Acessada | Data de publicação capturada |
| Tecnoblog — indisponibilidade de PIX (04–05/09/2026) | ✔ Acessada | Citações verificadas no corpo do artigo |
| NuCommunity | ✔ Acessada | Posts de membros; não são posição oficial |
| **Reddit** | ✔ Acessada (via PullPush) | Via padrão bloqueada (403/429/desafio); recuperada pela API de arquivo PullPush — 143 posts + 393 comentários recentes |
| **X/Twitter** | ◐ Parcial | Busca indisponível (SPA, sem backend, `xcancel` suspenso); tweets individuais recuperados via syndication/oEmbed (39/39 IDs), majoritariamente respostas oficiais antigas |
| **Reclame Aqui** | ✘ Não acessada | Cloudflare (2 tentativas, incluindo stealth) |
| **Google** | ✘ Não acessada | CAPTCHA; descoberta feita por Bing/Brave |
| **Revolut** | ✘ Não acessada | Cloudflare |
| C6, PagBank, XP | ✘ Não verificados | Fora do orçamento de tempo desta rodada |
| Banco Central (índice de reclamações) | ✘ Não acessado | URL não localizada por busca; página respondeu 404 |