# Dicionário Completo e Mapa Arquitetural do Workspace `intern`

**Localização:** `C:\Users\orugi\Documents\Projetos\salesforce\intern`  
**Última atualização:** 29 de outubro de 2026 (H28+)  
**Finalidade:** Guia exaustivo, confiável e inquestionável para agentes de IA e engenheiros que atuam no workspace. Explica a localização, finalidade, relação de propriedade (*ownership*), contratos e regras de cada diretório e arquivo.

---

## 1. Visão Geral e Arquitetura Global do Projeto

O workspace abriga o desenvolvimento do **NewAI**, um protótipo funcional de assistente financeiro conversacional criado para o desafio oficial **AI Builder Interns (Salesforce & Nubank)**.

### Pilares Arquiteturais:
1. **O Modelo de IA Nunca Calcula:** Nenhum valor monetário ou data projetada é calculado por raciocínio aritmético da LLM. Toda a matemática financeira, projeção de fluxo de caixa, alocação de compras e cálculo de rendimentos é executada pelo **motor determinístico em TypeScript** utilizando [decimal.js](<newai/package.json#L18>) com precisão exata em centavos inteiros.
2. **Contexto Determinístico Injetado:** Em cada turno, o sistema reconstrói o estado financeiro da persona e injeta no prompt do modelo um retrato exato e imutável de saldo, compromissos futuros, limites e faturas.
3. **Data Fixa de Simulação:** O tempo do sistema é estritamente ancorado em **30/10/2026** (`HOJE`), com janela de projeção até **29/11/2026** e histórico de 90 dias (30/07/2026 a 29/10/2026). Não se utiliza a data do relógio do sistema operacional.
4. **Movimentações São Apenas Simuladas:** O assistente nunca executa transferências bancárias ou resgates reais; toda proposta de guardar dinheiro gera uma pendência que requer confirmação explícita do usuário.

### Hierarquia de Autoridade das Fontes:
1. [Desafio Oficial](<challenge/Challenge_AI_Builder_Interns_Nu_BR.md>)
2. [Emendas da Especificação (§0)](<docs/NEWAI-SPECS.md#L10-L24>)
3. [Especificação Técnica Oficial (NEWAI-SPECS.md)](<docs/NEWAI-SPECS.md>)
4. [Plano de Implementação TDD (NEWAI-PLANO-TDD.md)](<docs/NEWAI-PLANO-TDD.md>)
5. [Decisões Humanas e Gates (coordenacao/MARCOS.md)](<coordenacao/MARCOS.md>)
6. [Handoff Operacional Consolidado (coordenacao/HANDOFF.md)](<coordenacao/HANDOFF.md>)

---

## 2. Divisão de Sessões e Modelo de Governança (*Ownership*)

O desenvolvimento é dividido entre duas sessões de trabalho paralelas que atuam em worktrees Git isolados para evitar conflitos concorrentes:

| Sessão / Papel | Portas | Diretórios e Arquivos sob sua Responsabilidade | Atribuições Principais |
| :--- | :--- | :--- | :--- |
| **S1 (Sessão 1)**<br>*Domínio & Integração* | `3101` | • [newai/src/contratos/](<newai/src/contratos>) (exceto `descricoes.ts`)<br>• [newai/src/dominio/](<newai/src/dominio>) (todos os submódulos)<br>• [newai/src/dados/](<newai/src/dados>) e [newai/dados/](<newai/dados>)<br>• [newai/src/mercado/](<newai/src/mercado>)<br>• [newai/src/visao/](<newai/src/visao>)<br>• [newai/src/conversa/executores/](<newai/src/conversa/executores>)<br>• [newai/scripts/](<newai/scripts>)<br>• [newai/docs/RUNBOOK.md](<newai/docs/RUNBOOK.md>) | Motor de caixa, calendário de dias úteis, faturas e cartão, posições de investimentos e CDI, histórico de 90 dias, geração/conferência de personas, executores de ferramentas, montagem de `VisaoApp` e testes unitários/E2E de domínio. |
| **S2 (Sessão 2)**<br>*Conversa, UI & Avaliação* | `3102` | • [newai/src/conversa/index.ts](<newai/src/conversa/index.ts>), [provedor.ts](<newai/src/conversa/provedor.ts>), [config.ts](<newai/src/conversa/config.ts>)<br>• [newai/src/contratos/descricoes.ts](<newai/src/contratos/descricoes.ts>)<br>• [newai/instrucoes.md](<newai/instrucoes.md>)<br>• [newai/src/ui/](<newai/src/ui>) (telas e componentes)<br>• [newai/src/app/](<newai/src/app>) (App Router e rotas `/api/*`)<br>• [newai/avaliacao/](<newai/avaliacao>) (casos e runner B6) | Orquestração do turno da LLM, filtro de dados pessoais (PII), montagem do prompt e contexto determinístico, interface do usuário em React 19/Tailwind v4, suíte de avaliação B6 contra casos formais. |
| **Responsável**<br>*Supervisor Humano* | N/A | • [coordenacao/MARCOS.md](<coordenacao/MARCOS.md>)<br>• Aprovação em [coordenacao/CONTRATOS-PEDIDOS.md](<coordenacao/CONTRATOS-PEDIDOS.md>)<br>• Arquivo [.env](<.env>) na raiz | Dono exclusivo de aprovações de marcos, liberação de gastos de API e autorização de alterações que cruzem a fronteira entre sessões. |

---

## 3. Arquivos na Raiz do Workspace (`/`)

- [DICIONARIO-WORKSPACE.md](<DICIONARIO-WORKSPACE.md>): Este documento. Mapa e dicionário completo do workspace para agentes de IA e desenvolvedores.
- [.env](<.env>): Arquivo de segredos locais contendo tokens de provedores de IA (NVIDIA, OpenRouter) e APIs de mercado.
  - **REGRA DE OURO:** **NUNCA** ler, exibir, logar ou commitar este arquivo. Quando uma sessão precisa de credenciais reais, ele é copiado sem inspeção para `.env.local` dentro do worktree correspondente.
- [AGENTS_TOOLS_GUIDE.md](<AGENTS_TOOLS_GUIDE.md>): Guia de ferramentas nativas instaladas na máquina:
  - *Agent-Reach*: Roteador e extrator multiplataforma para redes sociais e fontes públicas.
  - *Obscura*: Navegador headless ultraleve em Rust com motor V8 (consumo ~30MB de RAM, sem necessidade de Chromium), com suporte a modo stealth e extração limpa de HTML/Markdown.
  - *fetch_social.py*: Script auxiliar Python para consultas a redes sociais.
- [SUBAGENT-INSTRUCTIONS.md](<SUBAGENT-INSTRUCTIONS.md>): Protocolo de operação de subagentes via Antigravity CLI (`agy`) na máquina local (`gemini-3.8-flash-high`, execução em `--mode plan`, regras de isolamento e salvaguardas).
- [o](<o>): Arquivo temporário de despejo JSON de buscas preliminares na web sobre o Nubank.
- **Relatórios de Pesquisa Prévia do Desafio:**
  - [PESQUISA_OPORTUNIDADES_NUBANK.md](<PESQUISA_OPORTUNIDADES_NUBANK.md>): Levantamento qualitativo inicial de atritos em fontes públicas (Reclame Aqui, Reddit, NuCommunity, Bacen) e comparação de 5 oportunidades de atendimento.
  - [relatorio-oportunidades-ia-nubank.md](<relatorio-oportunidades-ia-nubank.md>): Estudo focado em bloqueios cautelares de conta e dados estatísticos do Reclame Aqui.
  - [Relatorio-Oportunidades-IA-Conversacional-Nubank.md](<Relatorio-Oportunidades-IA-Conversacional-Nubank.md>): Relatório analítico final detalhando o método de pesquisa, limites de scraping e a escolha da oportunidade do produto (previsibilidade de crédito e limites).

---

## 4. Diretório `coordenacao/` — Governança Concorrente e Sincronização

Diretório estrategicamente posicionado **fora do repositório Git `newai/`** para servir de canal de sincronização entre as sessões S1 e S2 sem poluir o histórico de commits.

- [coordenacao/MARCOS.md](<coordenacao/MARCOS.md>): Painel soberano de aprovações do supervisor humano. **Nenhum agente edita este arquivo.**
  - *Marcos registrados*: `H0: 2026-10-28 12:30`, `M0 APROVADO`, `MODELO ESCOLHIDO (NVIDIA): minimaxai/minimax-m3.1-flash`, `INSTRUCOES REVISADAS`, `PERSONAS CONFERIDAS` e `CONGELADO`.
- [coordenacao/S1-STATUS.md](<coordenacao/S1-STATUS.md>): Diário de bordo detalhado da Sessão 1 (Domínio, Motor de Caixa e Integração). Registra cronologicamente ações, testes, commits, chamadas de IA e pendências.
- [coordenacao/S2-STATUS.md](<coordenacao/S2-STATUS.md>): Diário de bordo detalhado da Sessão 2 (Conversa, Frontend Mobile e Avaliação B6).
- [coordenacao/CONTRATOS-PEDIDOS.md](<coordenacao/CONTRATOS-PEDIDOS.md>): Registro formal cumulativo de solicitações de mudança em contratos ou arquivos da outra sessão:
  - *PEDIDO 1 (S1)*: Correção temporal em fixture de teste da S2 (`criada_na_versao: 1 -> 0`). Resolvido.
  - *PEDIDO 2 (S1)*: Sincronização do cálculo de saldo disponível no contexto com o domínio (`saldoDisponivelHoje`). Resolvido.
  - *PEDIDO 3 (S1)*: Reforço em `instrucoes.md` para cópia literal de strings formatadas e idempotência de confirmações. Resolvido.
  - *PEDIDO 4 (S2)*: Triagem do caso CV-14 de fatura de cartão sem mutação de contratos (Opção A). Resolvido.
- `coordenacao/MERGE.lock`: Arquivo efêmero de trava exclusiva de concorrência. Adquirido antes de qualquer rebase/merge na `main` e removido após a verificação dos testes. Quando ausente, a `main` está livre para integração.
- [coordenacao/HANDOFF.md](<coordenacao/HANDOFF.md>): Handoff consolidado contendo checklist seguro de comandos, estado das branches e regras de continuidade operacional.
- [coordenacao/TESTE-MANUAL-ESCOPO.md](<coordenacao/TESTE-MANUAL-ESCOPO.md>): Guia para testes humanos na interface (`http://localhost:3102`), delimitando o que é escopo do P0 e o que é P1 opcional.
- [coordenacao/S2-DESIGN.md](<coordenacao/S2-DESIGN.md>): Inventário de tokens visuais e estrutura de layout mobile baseados nas capturas autorizadas.
- [coordenacao/S1-REVISAO-B10-20261029.md](<coordenacao/S1-REVISAO-B10-20261029.md>): Parecer da auditoria externa adversarial sobre as rotinas do bloco B10.
- [coordenacao/ENSAIO-S1.md](<coordenacao/ENSAIO-S1.md>) e [coordenacao/ENSAIO-S1-RESULTADOS.md](<coordenacao/ENSAIO-S1-RESULTADOS.md>): Roteiro de 20 mensagens inéditas elaborado pela S2 e executado/auditado pela S1 no Ensaio 1.
- [coordenacao/ENSAIO-S2.md](<coordenacao/ENSAIO-S2.md>) e [coordenacao/ENSAIO-S2-RESULTADOS.md](<coordenacao/ENSAIO-S2-RESULTADOS.md>): Roteiro de 20 mensagens inéditas preparado pela S1 e executado pela S2 via interface gráfica no Ensaio 2.
- [coordenacao/ENSAIO-S1-ORACULOS.ts](<coordenacao/ENSAIO-S1-ORACULOS.ts>): Script de conferência mecânica dos critérios numéricos e estados do Ensaio 1.
- `coordenacao/ENSAIO-S1-EVIDENCIAS-20261029/`: Diretório com 42 arquivos contendo os payloads de cada turno, resumos e logs HTTP do Ensaio 1.
- `coordenacao/ENSAIO-S2-EVIDENCIAS-20261029/`: Diretório contendo os relatórios estruturados e transcrições de turnos do Ensaio 2.

---

## 5. Diretório `docs/` — Especificações, Planejamento e Prompts

- [docs/NEWAI-SPECS.md](<docs/NEWAI-SPECS.md>): **A Bíblia do Projeto (v0.4).** Contém todas as regras matemáticas e operacionais:
  - *§0 Emendas Aprovadas (E-01 a E-08)*: Movimentações simuladas, proteção de ativos, séries públicas, 5 telas mobile e persistência determinística.
  - *§1 Decisões de Arquitetura (D-01 a D-24)*: Ancoragem de data em 30/10/2026, precisão decimal em centavos, LLM proibida de calcular.
  - *§2 a §5 Regras de Negócio*: Fórmulas R-01 a R-25 para fluxo de caixa, primeira falta, saldo mínimo e cenários "e se".
  - *§6 a §10 Contratos de Ferramentas*: Assinaturas das 12 ferramentas e códigos tipados de erro.
  - *§11 e §12 Personas e Casos de Validação*: Fichas das personas (P1 a P5) e oráculos formais (CV-01 a CV-28 / CR-01 a CR-48).
- [docs/NEWAI-PLANO-TDD.md](<docs/NEWAI-PLANO-TDD.md>): Plano de engenharia guiado por testes (TDD). Define os blocos B0 a B10, priorização P0/P1, cronograma de 24 horas e critérios de pronto.
- [docs/NEWAI-MVP.md](<docs/NEWAI-MVP.md>): Documento de concepção conceitual prévia com a delimitação de produto do MVP.
- `docs/prompts/`:
  - [docs/prompts/README.md](<docs/prompts/README.md>): Guia de início do supervisor humano e padrão oficial do Prompt de Retomada.
  - [docs/prompts/PROMPT-SESSAO-1.md](<docs/prompts/PROMPT-SESSAO-1.md>): Contrato de trabalho da Sessão 1.
  - [docs/prompts/PROMPT-SESSAO-2.md](<docs/prompts/PROMPT-SESSAO-2.md>): Contrato de trabalho inicial da Sessão 2.
  - [docs/prompts/PROMPT-SESSAO-2-CONTINUACAO.md](<docs/prompts/PROMPT-SESSAO-2-CONTINUACAO.md>): Contrato de continuidade da Sessão 2 pós-M0.

---

## 6. Diretório `challenge/` — O Desafio Oficial

- [challenge/Challenge_AI_Builder_Interns_Nu_BR.md](<challenge/Challenge_AI_Builder_Interns_Nu_BR.md>): Briefing oficial da Salesforce e Nubank. Descreve o problema de negócio (queda consecutiva de NPS/CSAT), a missão de construir um protótipo de IA conversacional e o formato da banca de avaliação de 45 minutos.

---

## 7. Diretório `spikes/` — Experimentos Preliminares

Reúne experimentos exploratórios preliminares realizados fora do repositório da aplicação antes da aprovação do M0:
- [spikes/RESULTADO.md](<spikes/RESULTADO.md>): Relatório consolidado do spike S0 e B3a.
- `spikes/s0/`: Benchmarking comparativo de modelos LLM (MiniMax, DeepSeek, Mistral, Nemotron, Gemma) avaliando conformidade a Function Calling e latência.
- `spikes/mercado/`: Testes de extração de dados públicos (BCB SGS 12, cotações brapi de ações da B3, CoinGecko para Bitcoin e feriados ANBIMA). Homologou **PETR4** como o ticker da persona P1.

---

## 8. Diretório `visualizador/` — Hub Técnico & Simulador Interativo

- [visualizador/index.html](<visualizador/index.html>): Aplicação web independente e interativa em HTML/CSS/JS com estética Nubank.
  - *Finalidade*: Demonstração didática da arquitetura ("Onde a IA pensa e o Motor em TypeScript calcula") para a banca avaliadora. Apresenta o simulador de payloads TOML, o ciclo de vida das 12 ferramentas, os guardrails IN-01 a IN-16 e o glossário de domínio.
- [visualizador/assets/banner-arquitetura.png](<visualizador/assets/banner-arquitetura.png>): Diagrama visual de arquitetura em camadas.

---

## 9. Diretório `nuscore_app_mobile/` — Capturas de Referência Visual

Contém 31 capturas de tela do aplicativo real do Nubank utilizadas exclusivamente pela S2 como referência de layout mobile para o Bloco B5 (Home, Conta, Cartão, Caixinhas e Chat).
- **Proteção de Privacidade Bancária:** O arquivo `IMG_2112.PNG` (que continha o número real de conta corrente do desenvolvedor sem tarja) foi **permanentemente removido do workspace**. Permanece apenas a versão com tarja protetora: [nuscore_app_mobile/IMG_E2112.JPG](<nuscore_app_mobile/IMG_E2112.JPG>).

---

## 10. Diretórios de Infraestrutura: `.kaiser/` e `wt/`

- `.kaiser/`: Configurações e relatórios do harness de auditoria automatizada via subagentes Antigravity CLI (`agy`). Contém contratos de leitura (`contrato-auditoria-aceite.md`, `contrato-auditoria-falsos-positivos.md`) e relatórios em `reports/`.
- `wt/`: Diretório reservado para abrigar os `git worktree` criados para desenvolvimento isolado (ex.: `wt/s1-B7-p2`, `wt/s2-B6`, `wt/s1-ensaio1`). Mantido limpo após o merge de cada bloco.

---

## 11. Diretório `newai/` — A Aplicação Next.js

O repositório principal da aplicação localiza-se em `newai/`. Desenvolvido com Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript estrito e Vitest.

### 11.1 Configurações e Raiz de `newai/`
- [newai/package.json](<newai/package.json>): Dependências (`decimal.js`, `lucide-react`, `next`, `react`, `zod`) e scripts de execução (`dev`, `build`, `test`, `typecheck`, `e2e`, `avaliar`, `mercado:coletar`, `personas:gerar`).
- [newai/tsconfig.json](<newai/tsconfig.json>): Configuração do TypeScript (`strict: true`, path alias `@/*` apontando para `./src/*`).
- [newai/vitest.config.ts](<newai/vitest.config.ts>) e [newai/vitest.setup.ts](<newai/vitest.setup.ts>): Configuração de testes unitários e de integração (256 testes passando na `main`).
- [newai/playwright.config.ts](<newai/playwright.config.ts>): Configuração de testes de navegador E2E Playwright.
- [newai/instrucoes.md](<newai/instrucoes.md>): O System Prompt da assistente NewAI contendo os guardrails invioláveis IN-01 a IN-16.
- [newai/.env.example](<newai/.env.example>): Exemplo de variáveis de ambiente do app.
- [newai/next.config.ts](<newai/next.config.ts>): Configurações do framework Next.js 16.
- [newai/docs/RUNBOOK.md](<newai/docs/RUNBOOK.md>): Guia operacional completo de execução local, testes, contingências de cota e troca de provedores.

### 11.2 `newai/src/contratos/` — Contratos Congelados
- [src/contratos/index.ts](<newai/src/contratos/index.ts>): Ponto central de exportação e registro dos 23 esquemas Zod.
- [src/contratos/comum.ts](<newai/src/contratos/comum.ts>): Constantes de data (`HOJE = "2026-10-30"`), limites operacionais, feriados e tipos primitivos.
- [src/contratos/erros.ts](<newai/src/contratos/erros.ts>): 19 códigos padronizados de erro de domínio (`ErroDominio`).
- [src/contratos/cenario.ts](<newai/src/contratos/cenario.ts>): Estruturas de projeção financeira (`LinhaCenario`, `Indicadores`, `ResultadoCenario`, `OQueMudou`).
- [src/contratos/consultas.ts](<newai/src/contratos/consultas.ts>): Contratos de investimentos, histórico de extrato, faturas de cartão e propostas de movimentação.
- [src/contratos/estado.ts](<newai/src/contratos/estado.ts>): Estrutura imutável de `EstadoSessao` e tipos de `Alteracao`.
- [src/contratos/ferramentas.ts](<newai/src/contratos/ferramentas.ts>): Esquemas Zod das 12 ferramentas e gerador de Function Calling.
- [src/contratos/descricoes.ts](<newai/src/contratos/descricoes.ts>): Textos descritivos das ferramentas fornecidos à LLM (ajustável pela S2).
- [src/contratos/http.ts](<newai/src/contratos/http.ts>): Contratos das rotas `/api/*` e catálogo de falhas técnicas (`F-01` a `F-07`).
- [src/contratos/mercado.ts](<newai/src/contratos/mercado.ts>): Schemas de séries financeiras (`SerieCdi`, `SerieFechamentos`, `SnapshotMercado`).
- [src/contratos/persona.ts](<newai/src/contratos/persona.ts>): Schema estrito `esquemaPersona` que valida as personas e rejeita campos extras.
- [src/contratos/conversa.ts](<newai/src/contratos/conversa.ts>): Tipos para o ciclo de turnos e interface do provedor.
- [src/contratos/textos.ts](<newai/src/contratos/textos.ts>): Catálogo de mensagens estáticas e textos de interface.
- [src/contratos/formatar.ts](<newai/src/contratos/formatar.ts>): Funções puras de formatação determinística de moeda e data.
- [src/contratos/visao.ts](<newai/src/contratos/visao.ts>): Estrutura de `VisaoApp` e união discriminada dos 11 cartões de resposta.
- `src/contratos/exemplos/`: 38+ arquivos JSON com envelopes de exemplo validados em testes.
- `src/contratos/roteiros/cv-01.json`: Roteiro gravado para execução determinística offline do caso CV-01.

### 11.3 `newai/src/dominio/` — Motor Determinístico Financeiro (Dono S1)
- [src/dominio/calendario/index.ts](<newai/src/dominio/calendario/index.ts>): Algoritmo civil puro de dias úteis e feriados nacionais.
- [src/dominio/caixa/projecao.ts](<newai/src/dominio/caixa/projecao.ts>): Projeção cronológica diária de fluxo de caixa, detecção de primeira falta e cálculo de saldo mínimo.
- [src/dominio/caixa/comparacao.ts](<newai/src/dominio/caixa/comparacao.ts>): Cálculo delta de indicadores gerando `OQueMudou`.
- [src/dominio/caixa/index.ts](<newai/src/dominio/caixa/index.ts>): `saldoDisponivelHoje`, `calcularCenarios`, `registrarDeclaracao`, `criarHipotese`, `desfazer` e `validarEstado`.
- [src/dominio/cartao/index.ts](<newai/src/dominio/cartao/index.ts>): Alocação de compras em faturas (C-02/C-03), verificação de duplicidade e consulta de cartão.
- [src/dominio/historico/index.ts](<newai/src/dominio/historico/index.ts>): Consulta de extrato de 90 dias com filtros por período, categoria e texto.
- [src/dominio/investimentos/index.ts](<newai/src/dominio/investimentos/index.ts>): Avaliação de renda fixa/variável via Decimal.js, classificação de proteção/liquidez e projeção CDI.
- [src/dominio/operacoes/index.ts](<newai/src/dominio/operacoes/index.ts>): Ciclo de propostas simuladas de movimentação com idempotência estrita (`proporMovimentacao`, `confirmarMovimentacao`, `cancelarMovimentacao`).

### 11.4 `newai/src/dados/` e `newai/dados/` — Personas e Séries
- `dados/personas/`: Arquivos JSON com os dados completos das personas fictícias:
  - `p1.json`: Bia (fictícia), CLT, viagem, cartão com parcelas, Caixinhas e ações PETR4.
  - `p2.json`: Caio (fictício), autônomo PJ, sem cartão, conta de luz estimada e Bitcoin.
  - `p3.json`: Duda (fictícia), compras parceladas, financiamentos, reserva e liquidez diária.
  - `p1-minima.json`: Baseline mínimo para testes de carga e inicialização.
- `dados/mercado/`: Séries históricas gravadas e congeladas:
  - `cdi.json`: Série histórica diária do CDI (BCB SGS 12) com 248 registros.
  - `fechamentos-PETR4.json`: Fechamentos diários de PETR4 coletados da brapi.
  - `fechamentos-BTC.json`: Fechamentos diários de Bitcoin em BRL via CoinGecko.
- [src/dados/index.ts](<newai/src/dados/index.ts>): Carregador estrito `carregarPersona` com validação mecânica dos 11 invariantes da spec §4.2.

### 11.5 `newai/src/mercado/` — Provedor de Mercado
- [src/mercado/index.ts](<newai/src/mercado/index.ts>): `snapshotGravado()` carrega os dados congelados; `buscarAoVivo()` é o stub do P1 que emite o aviso F-07 ao falhar.

### 11.6 `newai/src/conversa/` — Orquestração de Turno e Provedores
- [src/conversa/index.ts](<newai/src/conversa/index.ts>): Orquestrador `processarTurno` (filtro PII, injeção de contexto determinístico, chamada LLM, execução de ferramentas, emissão de avisos F-07) e `processarAcao` (ações rápidas da UI).
- [src/conversa/provedor.ts](<newai/src/conversa/provedor.ts>): Adaptador de provedores LLM: `roteirizado` (offline determinístico), `nvidia` (MiniMax m3.1 Flash) e `openrouter` (DeepSeek v4.1 Flash). Mapeamento de falhas técnicas F-01 a F-04.
- [src/conversa/config.ts](<newai/src/conversa/config.ts>): Fábrica de dependências padrão e leitor assíncrono de `instrucoes.md`.
- [src/conversa/executores/index.ts](<newai/src/conversa/executores/index.ts>): Implementação real das 12 ferramentas de Function Calling conectadas ao domínio. Decora resultados com `valores_formatados` e bloqueia confirmações no mesmo turno sem confirmação humana.

### 11.7 `newai/src/visao/` — Montagem da Visão da Interface
- [src/visao/index.ts](<newai/src/visao/index.ts>): Função pura `montarVisao` que constrói a `VisaoApp` (Home, Conta/Extrato unificado, Cartão/Faturas e Investimentos).

### 11.8 `newai/src/ui/` — Interface Mobile React 19 / Tailwind
- [src/ui/AppNewAI.tsx](<newai/src/ui/AppNewAI.tsx>): Shell móvel principal com persistência em `sessionStorage` e controle de abas.
- [src/ui/cliente-api.ts](<newai/src/ui/cliente-api.ts>): Transporte HTTP (`fetch` para `/api/*`) e mock local por contratos (`NEXT_PUBLIC_API_EXEMPLOS=1`).
- [src/ui/componentes/TelasDetalhe.tsx](<newai/src/ui/componentes/TelasDetalhe.tsx>): Componentes de visualização: `TelaHome`, `TelaConta`, `TelaCartao`, `TelaInvestimentos` e `TelaComoFunciona`.
- [src/ui/componentes/CamadaChat.tsx](<newai/src/ui/componentes/CamadaChat.tsx>): Modal de diálogo do chat NewAI.
- [src/ui/componentes/CartaoChat.tsx](<newai/src/ui/componentes/CartaoChat.tsx>): Renderizador dos 11 cartões de resposta.
- [src/ui/componentes/TabelaCompartilhada.tsx](<newai/src/ui/componentes/TabelaCompartilhada.tsx>): Componente de tabela reutilizável para extrato, faturas e investimentos.

### 11.9 `newai/src/app/` — Rotas Next.js App Router
- [src/app/layout.tsx](<newai/src/app/layout.tsx>) e [src/app/page.tsx](<newai/src/app/page.tsx>): Ponto de entrada Next.js 16.
- [src/app/api/personas/route.ts](<newai/src/app/api/personas/route.ts>): `GET /api/personas`
- [src/app/api/sessao/route.ts](<newai/src/app/api/sessao/route.ts>): `POST /api/sessao`
- [src/app/api/turno/route.ts](<newai/src/app/api/turno/route.ts>): `POST /api/turno`
- [src/app/api/acao/route.ts](<newai/src/app/api/acao/route.ts>): `POST /api/acao`

### 11.10 `newai/avaliacao/` — Suíte de Avaliação B6
- `avaliacao/casos/`: 28 arquivos declarativos em JSON definindo os casos de teste CV-01 a CV-29.
- [avaliacao/executar.ts](<newai/avaliacao/executar.ts>): Runner principal B6 (`npm run avaliar`).
- [avaliacao/oraculos.ts](<newai/avaliacao/oraculos.ts>): Verificadores matemáticos de oráculo de estado final.
- `avaliacao/resultados/`: Relatórios de avaliação consolidada com provedores reais.

### 11.11 `newai/e2e/` — Testes End-to-End Playwright
- [e2e/fluxo-b7.spec.ts](<newai/e2e/fluxo-b7.spec.ts>): Teste automatizado determinístico no Chromium navegando e confirmando movimentações com provedor roteirizado.
- [e2e/real-b7.spec.ts](<newai/e2e/real-b7.spec.ts>): Teste E2E opt-in com modelo real (`B7_REAL=1`).
- [e2e/contar-modelo.mjs](<newai/e2e/contar-modelo.mjs>): Interceptador de auditoria HTTP que registra chamadas sem expor segredos.
- `e2e/evidencias/`: Relatórios de execução e contagem de chamadas gravadas.

### 11.12 `newai/scripts/` — Scripts Utilitários
- [scripts/mercado/coletar.ts](<newai/scripts/mercado/coletar.ts>): Coletor de dados de mercado (offline por fixtures ou ao vivo por `--rede`).
- [scripts/personas/gerar.ts](<newai/scripts/personas/gerar.ts>): Gerador determinístico dos JSONs das personas.
- [scripts/personas/conferir.py](<newai/scripts/personas/conferir.py>): Validador matemático independente em Python 3 que confere os 11 invariantes das personas sem depender de código TypeScript.

---

## 12. Tabela de Navegação Rápida para Agentes de IA

| Se você precisa... | Consulte ou edite... | Sessão Proprietária |
| :--- | :--- | :--- |
| Consultar tipos, enums, schemas Zod ou códigos de erro | [newai/src/contratos/](<newai/src/contratos>) | **S1** (exceto `descricoes.ts`) |
| Ajustar descrições de ferramentas ou prompt do sistema | [newai/instrucoes.md](<newai/instrucoes.md>) e [src/contratos/descricoes.ts](<newai/src/contratos/descricoes.ts>) | **S2** |
| Entender ou corrigir regras de projeção de fluxo de caixa | [newai/src/dominio/caixa/](<newai/src/dominio/caixa>) | **S1** |
| Consultar lógica de faturas e compras parceladas no cartão | [newai/src/dominio/cartao/](<newai/src/dominio/cartao>) | **S1** |
| Consultar regras de rendimento CDI, ativos e liquidez | [newai/src/dominio/investimentos/](<newai/src/dominio/investimentos>) | **S1** |
| Verificar o ciclo de vida de propostas e confirmações | [newai/src/dominio/operacoes/](<newai/src/dominio/operacoes>) | **S1** |
| Inspecionar as carteiras e dados fictícios das personas | [newai/dados/personas/](<newai/dados/personas>) e [newai/src/dados/](<newai/src/dados>) | **S1** |
| Inspecionar as séries históricas congeladas de mercado | [newai/dados/mercado/](<newai/dados/mercado>) | **S1** |
| Verificar como ferramentas são executadas pelo backend | [newai/src/conversa/executores/](<newai/src/conversa/executores>) | **S1** |
| Entender o loop conversacional, filtro de PII e provedor LLM | [newai/src/conversa/index.ts](<newai/src/conversa/index.ts>) e [provedor.ts](<newai/src/conversa/provedor.ts>) | **S2** |
| Inspecionar ou corrigir telas e componentes da interface | [newai/src/ui/](<newai/src/ui>) | **S2** |
| Verificar rotas de API HTTP do App Router Next.js | [newai/src/app/api/](<newai/src/app/api>) | **S2** |
| Rodar a suíte de avaliação formal B6 | [newai/avaliacao/](<newai/avaliacao>) (`npm run avaliar`) | **S2** |
| Rodar testes E2E do navegador Playwright | [newai/e2e/](<newai/e2e>) (`npm run e2e`) | **S1 / S2** |
| Instruções de execução local e contingências | [newai/docs/RUNBOOK.md](<newai/docs/RUNBOOK.md>) | **S1 / S2** |
| Verificar aprovações humanas de marcos e gates | [coordenacao/MARCOS.md](<coordenacao/MARCOS.md>) | **Responsável** |
| Solicitar mudanças em contratos ou arquivos de outra sessão | [coordenacao/CONTRATOS-PEDIDOS.md](<coordenacao/CONTRATOS-PEDIDOS.md>) | **S1 / S2** |

---

## 13. Checklist de Regras Invioláveis de Operação

1. **Segredos e Credenciais:** Nunca leia, exiba, logue ou versione o arquivo [.env](<.env>).
2. **Separação de Domínio e Modelo:** A LLM nunca calcula. Números em centavos e datas emanarão sempre de [newai/src/dominio/](<newai/src/dominio>).
3. **Data Ancorada:** Não utilize a data real do sistema; a aplicação opera fixada em **30/10/2026**.
4. **Isolamento Concorrente:** Agentes da S1 não editam arquivos da S2 e vice-versa sem aprovação de pedido em [coordenacao/CONTRATOS-PEDIDOS.md](<coordenacao/CONTRATOS-PEDIDOS.md>).
5. **Integração com Trava:** Antes de qualquer merge na `main`, adquira [coordenacao/MERGE.lock](<coordenacao/MERGE.lock>), rode os 256 testes e o typecheck, faça rebase e remova a trava após a validação completa.
6. **Controle Humano dos Gates:** Nunca edite [coordenacao/MARCOS.md](<coordenacao/MARCOS.md>); aprovações são exclusivas do supervisor humano.
