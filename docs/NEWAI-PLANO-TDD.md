# NewAI — Plano de implementação via TDD

**Versão:** 1.2 · 28/10/2026. A v1.1 foi aprovada às 11h28; a v1.2 só reorganiza o cronograma para no máximo 2 sessões simultâneas, sem mudar o escopo.  
**Spec:** [NEWAI-SPECS.md](NEWAI-SPECS.md) v0.4 (aprovada). O plano diz como construir; a spec diz o que é correto.

---

## 1. Premissas

- 24 horas efetivas do responsável (H0–H24). Painel na manhã de 30/10.
- No máximo **2 sessões de desenvolvimento simultâneas**: **S1** (domínio e integração) e **S2** (conversa, frontend e avaliação). Slides e vídeo são feitos à parte; o responsável os revisa no B10.
- Total estimado: ~37 horas de sessão nos blocos P0 (S1 com 17,5 e S2 com 19,5). Com 2 sessões, o P0 termina em H20, sem folga para os P1; eles só entram se o M3 sair no prazo (§7).
- Estimativas em horas de sessão supervisionada; são faixas, não compromisso.
- Código em `newai/` (projeto Next.js), separado das pesquisas e das capturas.
- Antes do H0: chaves do modelo e token gratuito da brapi prontos; capturas das telas fora de `newai/`.

## 2. Regras para trabalhar em paralelo sem quebrar o projeto

1. **Git desde o B0.** Repositório em `newai/`; cada bloco numa branch em `git worktree` próprio. Merge na `main` ao fim de cada bloco, com `npm test` e `npm run typecheck` verdes; o bloco seguinte parte da `main` atualizada.
2. **Diretórios com dono.** Cada bloco edita só os diretórios do §3. Depois do merge, o diretório passa ao próximo bloco que o lista.
3. **Contratos congelados no M0.** `src/contratos/` (tipos, esquemas zod, esquemas das ferramentas, `textos`, exemplos JSON). Mudança só por pedido numerado em `intern/coordenacao/CONTRATOS-PEDIDOS.md`, aprovado pelo responsável em `MARCOS.md`; quem pediu aplica a mudança, com exemplos e testes, e avisa a outra sessão.
4. **Dublês só nas fronteiras:** provedor do modelo, APIs de mercado, rede. Enquanto o bloco de que se depende não existe, usa-se o exemplo JSON do contrato; nunca um mock do módulo interno da outra sessão.
5. **TDD por comportamento.** Lista do §5 em ordem: um teste, RED, código mínimo, GREEN, refatoração só no verde. Testes pela interface pública.
6. **Oráculo independente.** Números esperados vêm da spec §11, conferidos por script fora do código. O modelo nunca é oráculo de cálculo.
7. **Segredos e dados reais.** Chaves só em `.env.local` (no `.gitignore`), nunca em teste, log, rastro ou captura de tela. Capturas reais fora de `newai/`. Antes de cada merge do frontend e no deploy, revisar `src/` e `public/` contra as capturas (nomes, valores, dígitos).
8. **Sem expansão.** Ideia nova vai para `docs/IDEIAS-POS-MVP.md`.
9. **Coordenação fora do repositório.** Pasta `intern/coordenacao/`: `S1-STATUS.md` e `S2-STATUS.md` (cada sessão escreve só o seu), `CONTRATOS-PEDIDOS.md` (pedidos de mudança de contrato, só acréscimos) e `MARCOS.md` (só o responsável escreve aprovações). Fica fora do git para as duas sessões verem tudo antes de qualquer merge.
10. **Segredos fora do repositório.** O responsável mantém `intern/.segredos/newai.env`. Quem precisa de chamada real copia o arquivo para o `.env.local` do seu diretório, sem abri-lo nem exibi-lo.

## 3. Mapa de blocos

| Bloco | Conteúdo | Sessão | Depende de | Diretórios | P | Horas |
|---|---|---|---|---|---|---|
| B0 | Contratos, esqueleto, calendário, persona P1 mínima | S1 | aprovação | raiz, `src/contratos`, `src/dominio/calendario`, `dados/personas/p1-minima.json` | P0 | 2 |
| S0 | Spike de modelos | S2 | chaves | `spikes/` fora de `newai/` | P0 | 1 |
| B3a | Coleta de mercado gravada | S2 | S0; formato da spec §4.3 | `scripts/mercado`, `dados/mercado` | P0 | 1,5 |
| B1 | Motor de caixa | S1 | B0 | `src/dominio/caixa` | P0 | 3,5 |
| B4 | Conversa: núcleo, adaptador, rotas, filtro de dados pessoais, instruções e contexto | S2 | B0 | `src/conversa`, `src/app/api`, `instrucoes.md` | P0 | 4 |
| M1 | Tracer bullet | S2 | B1 (1–2), B4 (1, 8, 9), P1 mínima | integração mínima | P0 | 0,5 |
| B1b | Cartão e parcelas | S1 | B1 | `src/dominio/cartao` | P0 | 1,5 |
| B1c | Operações simuladas | S1 | B1 | `src/dominio/operacoes` | P0 | 1,5 |
| B3b | Investimentos e snapshot gravado | S1 | B0, B3a | `src/dominio/investimentos`, `src/mercado` | P0 | 3 |
| B2 | Personas e histórico | S1 | B0, B1, B1b, B3a | `scripts/personas`, `dados/personas`, `src/dominio/historico` | P0 | 3 |
| B5 | Frontend: 5 telas, chat, cartões, “Como funciona” | S2 | B0, capturas | `src/app` exceto `api`, `src/ui` | P0 | 9,5 |
| B7 | Integração | S1 | B1, B1b, B1c, B2, B3b, B4; parte 2 também B5 | `src/visao`, `src/conversa/executores` | P0 | 3 |
| B6 | Avaliação real | S2 | B7 parte 1 | `avaliacao/` | P0 | 3 |
| B3c | Mercado ao vivo sob demanda | S1 | B3b, B7 | `src/mercado`, executores de mercado | P1 | 1 |
| B8 | Resgate hipotético, rascunho, resumo, G-01 | S1 | B7 | módulos do domínio, `src/conversa` | P1 | 2 |
| B9 | Deploy, código de acesso e QR | S2 | B7 | configuração | P1 | 1 |
| B10 | Estabilização, ensaio, entregáveis | S1 + S2 | M4 | `docs/` | P0 | 4 |

## 4. Cronograma

| Horas | S1 | S2 | Marco |
|---|---|---|---|
| H0–H2 | B0 | H0–H1 S0; H1–H2 B3a parte 1 (busca e parsers com respostas gravadas) | **M0 (H2):** contratos 1.0 congelados; modelo escolhido |
| H2–H5,5 | B1 | H2–H6 B4 | — |
| H5,5–H7 | B1b | H6–H6,5 M1; H6,5–H7 B3a parte 2 (grava no formato do contrato) | **M1 (H6,5):** tracer bullet verde |
| H7–H8,5 | B1c | B5: Home e Chat | — |
| H8,5–H11,5 | B3b | B5: Caixinhas, Conta, Cartão | — |
| H11,5–H14,5 | B2 | B5: chat e cartões, “Como funciona” | **M2 (H14,5):** domínio completo na `main` |
| H14,5–H15,5 | B7 parte 1: executores reais, `montarVisao`, default de `ate_data`, cartão de proposta | B5 | — |
| H15,5–H16,5 | B7 parte 2 (início): ponta a ponta com provedor roteirizado | B5 concluído (H16,5) | — |
| H16,5–H17,5 | B7 parte 2: frontend ligado à API, Playwright | B6: executor e rodada 1 | **M3 (H17,5):** app P0 completo local; rodada 1 gravada |
| H17,5–H19 | correções vindas da rodada 1; P1 se o M3 saiu no prazo | ajustes em `instrucoes.md`; reexecução do conjunto crítico | — |
| H19–H20 | correções | B6 rodada 2 | **M4 (H20):** congelamento; conjunto crítico 2/2 |
| H20–H24 | B10 | B10 | **M5 (H24):** ensaios, relatório, slides e backup prontos |

**Caminho crítico:** B0 → B1 → B1b → B1c → B3b → B2 → B7 → B6 → ensaio, todo na S1 ou dependente dela. Um atraso na S1 empurra o M3; um atraso no B5 empurra só a parte 2 do B7.

**Onde uma sessão espera a outra:** M1 espera o merge do B1 (H5,5); B3b espera o B3a gravado (H7); B7 parte 2 espera o B5 (H16,5); B6 espera o B7 parte 1 (H15,5).

## 5. Blocos em detalhe

Listas na ordem dos ciclos RED → GREEN. Cada item descreve o comportamento observado pela interface pública e o resultado esperado.

### B0 — Contratos e esqueleto (S1, 2 h)

**Entrega:** Next.js (App Router, `src/`, Tailwind) + TypeScript + Vitest (com `@vitejs/plugin-react` e `vite-tsconfig-paths`) + Testing Library + Playwright + tsx + zod + decimal.js + lucide-react; scripts `test` (`vitest run`), `typecheck`, `dev`, `e2e`, `avaliar`, `mercado:coletar`, `personas:gerar`; `LLM_PROVEDOR=roteirizado` (provedor dublê lido de `LLM_ROTEIRO`) previsto no contrato; `deps.executores` inclui `validarEstado`, `montarVisao` e `compararCenarios`; `src/contratos/descricoes.ts` com as descrições das ferramentas (editável pela S2 no B6); esquema das séries de `dados/mercado/`; `textos` com sugestões do chat, `nao_disponivel` e mensagem de operação simulada; `.env.example` com `LLM_PROVEDOR`, `NVIDIA_API_KEY`, `NVIDIA_MODELO`, `OPENROUTER_API_KEY`, `OPENROUTER_MODELO`, `BRAPI_TOKEN`, `COINGECKO_API_KEY` (opcional), `CODIGO_ACESSO`, `MODO` (`local` ou `publico`), `NEXT_PUBLIC_MARCA`, `NEXT_PUBLIC_API_EXEMPLOS`, `LLM_ROTEIRO`; dependência nova depois do B0 só por pedido de contrato; `src/contratos` com tipos e esquemas da spec §4 e §6, esquemas das 12 ferramentas, `textos` e as funções públicas do §6.1 com corpo `não implementado`; `dados/personas/p1-minima.json` (só conta, compromissos, cartão com a fatura A e posições de P1, sem histórico).

**Exemplos JSON obrigatórios:** VisaoApp das 3 personas (P2 com `cartao: null`); um exemplo por tipo de cartão de resposta, incluindo a comparação de CR-02 e `o_que_mudou`; respostas de `/api/personas`, `/api/sessao` (com `config`), `/api/turno`, `/api/acao`; uma falha de cada tipo F-01 a F-07 e uma de domínio.

1. Cada exemplo JSON é aceito pelo seu esquema; exemplo inválido conhecido é rejeitado.
2. Argumentos de exemplo de cada ferramenta são aceitos pelo esquema da ferramenta; entrada com `cartao_credito` é rejeitada.
3. Calendário: D+0, D+1 e D+2 úteis a partir de 30/10 dão 30/10, 03/11 e 04/11; 13 dias úteis de 30/10 a 18/11 (CR-32).
4. `carregarPersona("p1")` com a P1 mínima passa nos invariantes aplicáveis.

**Pronto quando:** testes e typecheck verdes; contratos versão 1.0; responsável conferiu os exemplos contra a spec.

### S0 — Spike de modelos (S2, 1 h)

Script descartável em `spikes/`, fora de `newai/`, com as chaves só em variáveis de ambiente da sessão. Para 2 ou 3 modelos gratuitos de cada provedor com suporte a ferramentas, envia CV-01, CV-03, CV-07, CV-11 e CV-17 com os esquemas das ferramentas escritos a partir da spec §6.2 e um contexto de P1 escrito à mão. Grava as respostas brutas, sem chaves, em `spikes/respostas/`; o B4 as copia para os testes do adaptador.

**Mede:** ferramenta válida e coerente; português; latência; erros de cota. Confere no painel da NVIDIA se há limite de créditos.

**Gate:** algum modelo acerta pelo menos 4 de 5 com latência abaixo de 15 s. Se nenhum acertar, parar e replanejar antes do B4 (menos ferramentas ou saída JSON estruturada).

### B3a — Coleta de mercado gravada (S2, 1,5 h)

Script `scripts/mercado/coletar.ts`, executado uma vez, grava em `dados/mercado/`, com fonte, URL sem token e data (token da brapi só no cabeçalho `Authorization: Bearer`): CDI diário (BCB SGS 12) desde 03/11/2025; fechamentos diários de 30/07 a 29/10 de uma ação ou ETF disponível no plano gratuito da brapi; fechamentos diários de BTC em reais pela CoinGecko (a cripto da brapi é só dos planos pagos). Confere os feriados futuros da spec §3 na ANBIMA.

1. Resposta gravada do BCB vira série com datas ISO e taxas em texto decimal.
2. Resposta gravada da brapi vira fechamentos em centavos.
3. Resposta gravada da CoinGecko vira fechamento diário em centavos.
4. Arquivo de saída é aceito pelo esquema do contrato.

**Pronto quando:** testes verdes; arquivos reais gravados e versionados; ticker registrado na spec §11.1.

### B1 — Motor de caixa (S1, 3,5 h)

Interface: `calcularCenarios`, `registrarDeclaracao`, `criarHipotese`, `desfazer`, `compararCenarios`, `validarEstado`. Personas de teste escritas nos testes a partir da spec §11.

1. Situação atual de P1, com a fatura A derivada → CR-01. *(primeiro ciclo do tracer)*
2. `criarHipotese` com `separar` 500 → CR-02, com id H1.1, falta por dia, “Saldo zerado” em B e aviso R-11.
3. `sem_recebimentos` só com previstos e avisos de R-12 → CR-02, CR-03.
4. Hipótese derivada renumera a cópia (H2.1) e altera R1 sem duplicar → CR-03, com B e C visíveis.
5. Declaração altera compromisso; atual e hipóteses recalculados; “original → declarado” → CR-04, CR-05.
6. `compararCenarios` entre antes e depois de CR-04 lista a declaração e as diferenças de indicadores.
7. Validações → CR-15b, CR-17a, CR-17b, CR-17c, CR-17d, CR-17e, CR-17h, CR-17l.
8. Inconsistente → CR-17f; sem previstos → CR-17i; ordem de cadastro irrelevante → CR-17j.
9. `desfazer` → CR-17g.
10. Blocos de gasto diário → CR-09; gasto 0 não gera blocos (CR-01).
11. Ordem relevante e `definir_ordem_no_dia` → CR-09, CR-09b, CR-10b; bloco estimado sozinho não dispara (13/11 em CR-14: G3 e salário, sem pergunta).
12. `alterar_gasto_diario` → CR-12; hipóteses de P2 → CR-10, CR-11; P3 → CR-13, CR-14.
13. `validarEstado` rejeita estado adulterado → CR-19.

**Pronto quando:** todos os casos citados verdes; merge na `main`.

### B4 — Conversa (S2, 4 h)

Interface: `processarTurno`, `processarAcao`, porta do provedor, rotas. Dublês: provedor roteirizado e executores que devolvem os exemplos JSON do B0.

1. Mensagem → provedor pede `criar_hipotese` → executor → provedor responde texto → `status: ok`, cartão de comparação, versão + 1. *(lado conversa do tracer)*
2. Argumento inválido → erro devolvido ao modelo, nada aplicado; segunda chamada corrige.
3. Terceira chamada ainda pedindo ferramenta → F-05 com o estado de entrada.
4. Timeout → F-01; 429 → F-02; 5xx, rede ou chave → F-03; vazia ou ferramenta desconhecida → F-04; cada uma no formato de falha do contrato.
5. `mensagem.id` repetido → `MENSAGEM_JA_PROCESSADA`.
6. Falha depois de aplicar alteração → estado de entrada (CR-18b).
7. `processarAcao` confirma e cancela sem chamar o provedor; versão + 1 só em sucesso.
8. Adaptador compatível com OpenAI: `LLM_PROVEDOR` escolhe URL, chave e modelo; converte ferramentas e `tool_calls`. Testado com as respostas gravadas no S0.
9. Rotas `/api/personas`, `/api/sessao`, `/api/turno`, `/api/acao` validam entrada pelo esquema; `/api/sessao` devolve `config`.
10. CPF, cartão, e-mail ou telefone recusados antes do provedor.
11. `instrucoes.md` lido a cada turno e exposto em `config`; texto com IN-01 a IN-16, revisado pelo responsável.
12. Contexto determinístico contém ids, origens, estimativas, hipóteses, operação pendente e datas de ordem relevante.

**Pronto quando:** casos verdes sem rede; merge na `main`.

### M1 — Tracer bullet (S2, 0,5 h)

Com a P1 mínima e o B1 na `main`, Bia pergunta “Posso separar R$ 500 hoje?” em `/api/turno`. O modelo real chama `criar_hipotese`; o motor real calcula CR-02; a resposta traz o cartão de comparação com falta de R$ 200 em 15/11; o texto cita 15/11 e R$ 200.

**Pronto quando:** teste automatizado com o provedor roteirizado reproduzindo a chamada gravada passa pelo HTTP; uma execução real registrada.

### B1b — Cartão e parcelas (S1, 1,5 h)

1. Compra à vista no cartão em 30/10 vai para a fatura de 05/12, sem evento de caixa; `faturas_afetadas` mostra antes e depois.
2. Compra no dia do fechamento vai para a seguinte → CR-22.
3. Parcelamento com resto na primeira → CR-21; conserto em 4x → CR-14b.
4. Item de fatura fechada não pode ser alterado → `OPERACAO_NAO_PERMITIDA`.
5. Duplicidade → CR-15a; com confirmação → CR-15c.
6. `consultarCartao` devolve fechada, aberta e próximas, com parcelas de parcelamentos anteriores ao histórico.

### B1c — Operações simuladas (S1, 1,5 h)

1. Proposta → OP1 pendente com impacto de CR-02 e alerta de falta → CR-40.
2. Confirmação → situação atual de CR-41, saldo disponível 1.300, hipóteses descartadas com aviso, aporte de hoje registrado em `estado.operacoes`.
3. Confirmação repetida → CR-42; declaração depois da proposta → CR-43; hipótese depois da proposta não expira.
4. Valor acima do disponível → CR-44; saída declarada hoje reduz o disponível → CR-44b.
5. “Separa” sem caixinha → Saldo separado → CR-46.
6. Cancelamento zera a pendente e não muda mais nada.

O valor das posições depois da operação (CR-41 “INV9 aplicado 500”, CR-45) é testado no B3b, que lê `estado.operacoes`. O rendimento estimado do cartão de proposta é montado no B7.

### B3b — Investimentos e snapshot gravado (S1, 3 h)

Interface: `consultarInvestimentos`, `projetarRendimento`, `dataDisponivel`, `snapshotGravado`. Dados de teste fixos.

1. Datas de disponibilidade por regra → CR-35.
2. Renda fixa CDI → CR-30, CR-31; dia útil passado é o da série; dia sem taxa usa a última e informa a data.
3. Renda variável → CR-33, CR-34, rotulada como estimada.
4. Classificação e totais em valor atual → CR-06, CR-07, CR-16; proteção parcial (INV4).
5. Operações executadas viram aporte de hoje → INV9 aplicado 500 (CR-41); depósito em reserva → CR-45.
6. Projeção → CR-32; `ate_data` depois de 29/11 → erro.
7. `snapshotGravado` devolve os valores gravados com `ao_vivo: false` e data.

### B2 — Personas e histórico (S1, 3 h)

Gerador determinístico (semente fixa) em `scripts/personas` produz `dados/personas/p1|p2|p3.json` a partir da spec §11 e das séries do B3a.

1. Cada persona gerada é aceita pelo esquema.
2. Invariantes 1 a 11 da spec §4.2 passam nas 3 personas.
3. Com as personas geradas, o motor reproduz CR-01, CR-09 e CR-13, e o cartão reproduz a fatura de P3.
4. `consultarHistorico`: filtros, agrupamento por categoria, mês e semana, limite de 20 itens, CR-17k.
5. Script de conferência em Python, independente do TypeScript, recalcula saldo, faturas, gasto diário, conta estimada e valores de investimento a partir dos JSON e das séries; diferença zero.

**Pronto quando:** testes verdes; conferência sem diferença; o responsável conferiu nomes e valores das personas contra as capturas (`PERSONAS CONFERIDAS` em `MARCOS.md`).

### B5 — Frontend (S2, 9,5 h)

Construído contra os exemplos JSON do B0 e um dublê de API que os devolve. Fidelidade visual conferida manualmente contra as capturas; os testes cobrem comportamento. Os cartões tabulares (histórico, cartão de crédito, investimentos) usam um componente de tabela comum.

**Telas (5 h)**, na ordem Home, Chat, Caixinhas/investimentos, Conta/extrato, Cartão/faturas:

1. Escolher persona (lista de `/api/personas`) mostra a Home com o saldo disponível da VisaoApp e a faixa de protótipo.
2. Com marca neutra, logotipo e nome não aparecem e não estão no pacote.
3. Botões sem função mostram “não disponível no protótipo”.
4. Caixinhas/investimentos mostram valor, aplicado, rentabilidade, valorização, disponibilidade, proteção e a origem do preço.

**Chat e cartões (3,5 h):**

5. Botão NewAI em qualquer tela abre a mesma conversa com o histórico.
6. Enviar mostra “enviando” e bloqueia novo envio; resposta aparece com cartões.
7. Falha mostra a mensagem do servidor; “Tentar novamente” reenvia o mesmo `mensagem.id`; resposta com versão inesperada → F-06.
8. Comparação mostra indicadores, rótulos, legenda da margem, premissas e tabela expansível; `o_que_mudou` mostra diferenças.
9. Operação pendente: Confirmar chama `/api/acao` com o `operacao_id` e fica desabilitado; mensagem de sistema com aparência distinta.
10. Telas se atualizam com a VisaoApp de cada resposta; reset cria sessão nova com os dados-base.

**“Como funciona” (1 h):** `config`, fontes de mercado e rastro de cada resposta.

### B7 — Integração (S1, 3 h)

**Parte 1 (sem frontend):**

1. Executores reais substituem os dublês; CV-01 roteirizado produz CR-02 pelo HTTP.
2. Default de `ate_data` (I-10) → CV-05 roteirizado chega a CR-06.
3. Cartão de proposta com rendimento estimado (O-03, I-08).
4. `montarVisao` das 3 personas é aceita pelo esquema e bate com o motor.

**Parte 2:**

5. Ponta a ponta com provedor roteirizado pelo HTTP; depois no navegador (Playwright): persona → chat → separar → cartão; guardar → confirmar → Home com 1.300.
6. Execução real de CV-01, CV-07 e CV-28 no app local.

### B6 — Avaliação real (S2, 3 h)

Executor em `avaliacao/` lê os casos do §12 da spec em JSON e roda contra o provedor escolhido. Critérios por caso:

- ferramentas esperadas (nome e restrições de argumentos);
- estado final igual ao oráculo do CR citado;
- texto contém as datas e valores indicados;
- texto não contém termos proibidos: “pode gastar”, “está liberado”, “transferi”, “resgatei”, “recomendo”, “cheque especial”, “use o limite”, “guardei” sem “simulad”;
- latência registrada.

Relatório em `avaliacao/resultados/` (JSON e Markdown). Rodada 1: todos os casos, 1 vez. Rodada 2: conjunto crítico 2 vezes, demais 1. Ajustes só em `instrucoes.md` ou nas descrições das ferramentas; cada ajuste reexecuta o conjunto crítico.

### B3c — Mercado ao vivo sob demanda (S1, 1 h, P1)

1. Primeira ferramenta de mercado do turno com fonte respondendo em menos de 3 s → snapshot `ao_vivo: true` gravado no estado.
2. Timeout ou erro → mantém o gravado, `tentou_ao_vivo: true`, aviso F-07.
3. Turnos seguintes não buscam de novo; telas e respostas usam o mesmo snapshot.

### B8 — Extras (S1, 2 h, P1)

Resgate hipotético (CR-47); rascunho para atendimento; resumo e encerramento (CV-23); G-01 (valor fora do conjunto gera `aviso_valor`; valores do turno e digitados não geram).

### B9 — Deploy e QR (S2, 1 h, P1)

Variáveis no Vercel; `MODO=publico` sem código válido → falha sem chamar o provedor; marca neutra; `noindex`; revisão do pacote publicado contra as capturas; QR; CV-27 no celular. Código trocado após o último ensaio; deploy desligado após o painel.

### B10 — Estabilização, ensaio e entregáveis (S1 + S2, 4 h)

- Divisão: S1 cuida de `newai/docs/RUNBOOK.md`, testes completos e ensaio 1; S2 cuida do relatório final da avaliação e do ensaio 2. Cada sessão escreve as mensagens não ensaiadas do ensaio da outra em `coordenacao/ENSAIO-S1.md` e `ENSAIO-S2.md`.
- Congelamento em H20: só correção de defeito, cada uma com teste.
- Testes e avaliação completos; relatório final.
- `docs/RUNBOOK.md`: rodar local, trocar provedor, variáveis, contingências (cota, rede, mercado), onde estão instruções e testes.
- Dois ensaios completos com mensagens não ensaiadas propostas por outra pessoa ou sessão.
- Revisão dos slides (até 5) e do roteiro pelo responsável, com insumos da spec §0 e §13, do relatório de avaliação e de uma decisão revisada (por exemplo, o descarte de hipóteses após guardar).
- Gravação de backup pelo responsável; não substitui a conversa ao vivo.
- No dia: conferir a cota do provedor e rodar CV-01 antes do painel.

## 6. Orçamento de requisições ao modelo

| Uso | Requisições |
|---|---|
| S0 | ~60 |
| Desenvolvimento e M1 | ~100 |
| B6, duas rodadas e reexecuções | ~350 |
| Ensaios | ~80 |
| Demo | ~40 |
| **Total** | **~630** |

Tudo no provedor principal. OpenRouter (50 por dia sem compra) para verificar a troca e como contingência. Se o S0 revelar limite de 1.000 créditos na NVIDIA, a rodada 1 roda só o conjunto crítico.

## 7. Entrada de P1 e cortes

**P1 só entra depois das correções da rodada 1 e se o M3 sair até H17,5**, nesta ordem: B3c (mercado ao vivo, pedido do responsável), B8, B9. Cada um começa só se couber inteiro antes de H19.

Cortes quando um marco atrasar mais de 1 hora:

| Marco | Corte |
|---|---|
| M1 | nenhum; se o tracer falhar por causa do modelo, voltar ao gate do S0 |
| M2 | agrupamento por semana no histórico; conferência em Python reduzida a saldo, faturas e gasto diário |
| M3 | todos os P1; rodada 1 só com o conjunto crítico |
| M4 | congelamento adiado no máximo 1 hora; B10 com um ensaio só |

**Nunca cortar:** motor de caixa com desfazer; guardar com confirmação; investimentos com dados gravados; histórico com gasto diário; cartão e parcelas; falhas; as 5 telas (se uma não estiver idêntica no M4, o responsável decide entre adiar o congelamento ou apresentá-la como está); conjunto crítico; ensaio.

## 8. Definição de pronto

- Todos os REQ P0 com seus casos verdes.
- Conjunto crítico 2/2 no modelo escolhido; relatório gravado.
- Conferência independente das personas sem diferença.
- Nenhum dado real nas personas, no repositório ou no deploy.
- Provedor gratuito em uso, sem compra nem faturamento.
- Ensaio com mensagens não ensaiadas concluído.
- Runbook, instruções e relatório acessíveis sem a aplicação.
- Slides (até 5) e gravação de backup prontos.

## 9. Como iniciar cada sessão

Os prompts completos estão em [prompts/PROMPT-SESSAO-1.md](prompts/PROMPT-SESSAO-1.md) e [prompts/PROMPT-SESSAO-2.md](prompts/PROMPT-SESSAO-2.md). O guia do responsável (chaves, aprovações, retomada e dia do painel) está em [prompts/README.md](prompts/README.md). Em processo, os prompts detalham este plano e prevalecem sobre ele.
