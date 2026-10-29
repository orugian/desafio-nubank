# Guia do responsável para as duas sessões

## 1. Antes de abrir as sessões

**Chaves.** Crie o arquivo `C:\Users\orugi\Documents\Projetos\salesforce\intern\.segredos\newai.env` com o conteúdo abaixo. Preencha os valores sem aspas e sem espaços em volta do `=`. O arquivo fica fora do repositório, e os agentes o usam sem abri-lo.

```
LLM_PROVEDOR=nvidia
NVIDIA_API_KEY=
NVIDIA_MODELO=
OPENROUTER_API_KEY=
OPENROUTER_MODELO=
BRAPI_TOKEN=
COINGECKO_API_KEY=
CODIGO_ACESSO=
MODO=local
NEXT_PUBLIC_MARCA=nubank
```

- `NVIDIA_MODELO` e `OPENROUTER_MODELO` ficam vazios até o resultado do S0.
- `COINGECKO_API_KEY` é opcional. Sem ela, a CoinGecko responde com limite menor.
- `CODIGO_ACESSO` só é usado no deploy (P1).
- O BCB não pede chave.

**Captura sensível.** Mova `nuscore_app_mobile\IMG_2112.PNG` para fora da pasta `intern\` (renomear não basta) e confira com `Test-Path`. Ela mostra o número da sua conta sem tarja. A versão com tarja, `IMG_E2112.JPG`, basta para os agentes.

**Coordenação.** Crie `C:\Users\orugi\Documents\Projetos\salesforce\intern\coordenacao\MARCOS.md` com uma linha `H0: 2026-10-28 HH:mm`, usando a hora em que você abrir as sessões. Os agentes contam o cronograma a partir dela. Você é o único que escreve nesse arquivo. O resto da pasta é criado pelos agentes.

## 2. Ordem de início

1. Abra as duas sessões ao mesmo tempo:
   - Sessão 1 com [PROMPT-SESSAO-1.md](PROMPT-SESSAO-1.md);
   - Sessão 2 com [PROMPT-SESSAO-2.md](PROMPT-SESSAO-2.md).
2. A Sessão 1 cria `newai\` e para no M0.
3. A Sessão 2 roda o S0 e a coleta de mercado, e para com a tabela de modelos.

## 3. Como as paradas funcionam

O agente não fica vigiando `MARCOS.md`. Quando ele para, encerra o turno com um relatório. Para retomar:

1. Escreva a aprovação em `MARCOS.md`.
2. Mande `continue` no chat daquela sessão.

Quando uma sessão espera a outra, ela escreve `AGUARDANDO <o quê>` no próprio status e encerra o turno. Assim que a outra sessão entregar, mande `continue` para a que esperava.

## 4. O que você aprova e como

Uma linha por aprovação em `coordenacao\MARCOS.md`.

| Quando | O que conferir | Linha a escrever |
|---|---|---|
| Relatório do S0 (~H2) | tabela em `spikes\RESULTADO.md`; limite de créditos no painel da NVIDIA | `MODELO ESCOLHIDO: <provedor>/<modelo>` e `NVIDIA: <limite ou "sem limite">`; preencha o modelo em `.segredos` |
| Relatório do B0 (~H2) | exemplos JSON em `newai\src\contratos\exemplos\` contra a spec | `M0 APROVADO` |
| `PEDIDO <n>` em `CONTRATOS-PEDIDOS.md` | impacto descrito para a outra sessão | `CONTRATO <n> APROVADO` ou `CONTRATO <n> NEGADO: <motivo>`; quem pediu aplica a mudança |
| Relatório do B4 (~H6) | `newai\instrucoes.md` | `INSTRUCOES REVISADAS`; ajustes vão em `coordenacao\INSTRUCOES-AJUSTES.md`, nunca editados direto em `newai\` |
| Relatório do B2 (~H14,5) | nomes e valores das personas contra as capturas | `PERSONAS CONFERIDAS` |
| App completo local até H17,5 (M3) | relatórios das duas sessões | `P1 LIBERADO`, ou nada se estiver atrasado |
| Relatório do B9 com o pacote revisado | ausência de capturas, logotipo e chaves no pacote | `DEPLOY APROVADO`; depois você faz o login na Vercel e publica |
| H20 | conjunto crítico 2/2 no relatório do B6 | `CONGELADO` |

`CONTRATOS-PEDIDOS.md`, na pasta de coordenação, substitui o arquivo de pedidos citado na versão anterior do plano.

## 5. Prompt de retomada

Use quando a conversa de um agente ficar longa demais ou for reiniciada. Troque `<N>` por 1 ou 2. Se existir [coordenacao/HANDOFF.md](../../coordenacao/HANDOFF.md), ele é o snapshot operacional mais recente: leia-o antes do prompt da sessão e depois confirme os marcos/status, que podem ter avançado.

```
Você é o agente da Sessão <N> do projeto NewAI. Continue o trabalho de onde ele parou.

1. Leia, nesta ordem:
   - C:\Users\orugi\Documents\Projetos\salesforce\intern\coordenacao\HANDOFF.md, se existir (estado atual, evidências, gates e próximas ações; não substitui o contrato da sessão);
   - C:\Users\orugi\Documents\Projetos\salesforce\intern\docs\prompts\PROMPT-SESSAO-<N>.md (inteiro; é o seu contrato de trabalho; ignore o bloco <primeira_acao>);
   - C:\Users\orugi\Documents\Projetos\salesforce\intern\coordenacao\S<N>-STATUS.md (as últimas 3 entradas);
   - C:\Users\orugi\Documents\Projetos\salesforce\intern\coordenacao\MARCOS.md;
   - C:\Users\orugi\Documents\Projetos\salesforce\intern\coordenacao\CONTRATOS-PEDIDOS.md;
   - a seção do bloco atual em C:\Users\orugi\Documents\Projetos\salesforce\intern\docs\NEWAI-PLANO-TDD.md.
2. Rode git -C C:\Users\orugi\Documents\Projetos\salesforce\intern\newai worktree list e, no worktree do bloco atual, git log --oneline -10 e npm test.
3. Confira se C:\Users\orugi\Documents\Projetos\salesforce\intern\coordenacao\MERGE.lock existe e de quem é; não a apague se for da outra sessão.
4. Responda em até 8 linhas: bloco atual, último comportamento verde, próximo comportamento, bloqueios e o que precisa de mim.
5. Se nada depender de mim, continue pelo próximo comportamento, um por vez, seguindo todas as regras do prompt da sessão.
```

## 6. Se algo sair do plano

- **Sessão substituída no meio do trabalho.** Para a S2 a partir de 28/10 às 14h, use [PROMPT-SESSAO-2-CONTINUACAO.md](PROMPT-SESSAO-2-CONTINUACAO.md). Para outros casos, use o prompt de retomada do §5.
- **Modelo falha no S0 ou no M1.** A Sessão 2 para só a conversa e a avaliação; coleta e frontend continuam. Decida entre testar outro modelo, reduzir ferramentas ou usar saída JSON estruturada, e registre em `MARCOS.md`.
- **Bloco passa de 1,5 vez a estimativa.** O agente para e propõe cortes do plano §7. Responda com a opção escolhida.
- **Cota esgotada.**
  - Troque `LLM_PROVEDOR` em `.segredos`.
  - Peça às sessões que copiem o arquivo de novo para os `.env.local` e reiniciem os servidores.
  - O OpenRouter renova às 21h de Brasília.
- **Trava de merge presa.** Se `MERGE.lock` tiver mais de 30 minutos e nenhuma sessão estiver fazendo merge, apague o arquivo e mande `continue`.

## 7. Dia do painel

- Antes: confira a cota do provedor e rode CV-01 no app local.
- Se houver deploy, troque `CODIGO_ACESSO` depois do último ensaio e desligue o deploy depois do painel.
- Slides (até 5) e vídeo de backup ficam com você, a partir do relatório de avaliação e da spec §0 e §13.
