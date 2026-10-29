# NewAI — Handoff para a próxima sessão

Atualizado em **2026-10-29 12:37 (H24,12)**. Este arquivo é o ponto de entrada operacional atual. Ele **não substitui** o prompt da sessão, o plano, a spec nem os marcos; em caso de divergência, vale a hierarquia do prompt da sessão.

## 1. Estado verificado do projeto

- Raiz do workspace: `C:\Users\orugi\Documents\Projetos\salesforce\intern`.
- Repositório/worktree principal: `C:\Users\orugi\Documents\Projetos\salesforce\intern\newai`, branch `main`.
- **HEAD: `3636091` — Merge branch `s2/ajustes-aceite`**.
- `git status --short`: limpo. Único worktree: a `main`. `coordenacao/MERGE.lock`: ausente.
- Última validação na `main`, após `npm ci`: **256/256 testes em 23 arquivos** e `npm run typecheck` verdes.
- B6: evidência real OpenRouter + revisão manual + reavaliação offline:
  - [críticos 24/24](../newai/avaliacao/resultados/confirmacao-final-4-20261029/avaliacao-reavaliada-critico.md);
  - [demais 16/16](../newai/avaliacao/resultados/confirmacao-final-4-20261029/avaliacao-reavaliada-demais.md);
  - [relatório consolidado](../newai/avaliacao/resultados/RESUMO-B6-ACEITE-EFEITO.md).
- Na última rodada, o placar automático inicial foi 23/24 nos críticos; após corrigir o avaliador para medir o efeito da repetição idempotente de CV-28, a reavaliação das mesmas respostas gravadas ficou em 24/24, **sem novas chamadas ao modelo**. Não houve afrouxamento dos números nem dos oráculos.
- Revisão manual dos textos encontrou premissa incorreta em CV-03; IN-16 foi corrigida, a rodada foi repetida e CV-03 passou nas duas repetições.

## 2. O que acabou de ser entregue pela S2

- Ajuste autorizado de aceite da S2, sem alterar contratos, domínio ou executores da S1:
  - CV-14 usa `consultar_cartao` e `CR-15a-triagem` (PEDIDO 4, **Opção A**): evidência da fatura, pergunta se é outra compra, nenhum registro sem dados completos e negócio inalterado.
  - CV-05 aceita `ate_data` ausente **ou igual à data padrão calculada pelo motor**; o efeito é o mesmo.
- A mesma classe de problema (forma literal versus efeito) foi revista nos demais casos, com auditorias `agy` e subagentes. Foram adicionados testes para equivalentes válidos e falsos positivos.
- Arquivos de código/comportamento alterados na entrega: `newai/avaliacao/**`, `newai/instrucoes.md` e `newai/src/contratos/descricoes.ts`.
- **Não houve mudança de contrato 1.0, spec, domínio, personas ou executores da S1.**
- PEDIDO 4 está implementado pela S2 e aguarda apenas revisão humana; sugestões à S1 ficaram registradas como sugestões, não como autorização de alteração.

## 3. Marcos e gates — não presumir aprovação

Em [MARCOS.md](MARCOS.md) constam `M0 APROVADO`, `MODELO ESCOLHIDO (NVIDIA): minimaxai/minimax-m3.1-flash`, `INSTRUCOES REVISADAS` e `PERSONAS CONFERIDAS`.

**Não constam** `P1 LIBERADO`, `CONGELADO`, aprovação de M3/M4, deploy ou B10. Portanto:

- **Não iniciar B9 ou B10 ainda.** B10 só começa depois de `CONGELADO` ser registrado pelo responsável.
- B3c/B8 são extras P1 e a janela prevista até H19 já passou. Não os inicie sem uma decisão explícita do responsável revendo essa prioridade.
- CV-27 continua condicionado ao deploy P1 e não foi executado.
- A revisão visual/manual de B5 não foi repetida nesta etapa; incluí-la na revisão humana de M3 se for exigida, sem declarar nova falha sem reprodução.
- O modelo OpenRouter pago foi autorizado somente para as avaliações da S2, por override nos comandos. Não alterar o modelo dos marcos nem a configuração normal da demo sem nova decisão.

## 4. Leitura obrigatória para o próximo agente

Leia nesta ordem, substituindo `<N>` por 1 ou 2:

1. Este handoff.
2. `docs/prompts/PROMPT-SESSAO-<N>.md` inteiro, ignorando apenas `<primeira_acao>`.
3. As três últimas entradas de `coordenacao/S<N>-STATUS.md`.
4. `coordenacao/MARCOS.md` e `coordenacao/CONTRATOS-PEDIDOS.md`.
5. O status da outra sessão (`S1-STATUS.md` ou `S2-STATUS.md`).
6. [RESUMO-B6-ACEITE-EFEITO.md](../newai/avaliacao/resultados/RESUMO-B6-ACEITE-EFEITO.md) e as duas evidências finais linkadas acima.
7. `docs/NEWAI-PLANO-TDD.md`, especialmente B3c/B8/B9/B10 conforme a tarefa; `docs/NEWAI-SPECS.md` para comportamento e números.
8. Se for auditar com subagentes `agy`, siga `SUBAGENT-INSTRUCTIONS.md`, inclusive contratos somente leitura e snapshots antes/depois.

## 5. Próximas ações por sessão

### Se você for o próximo agente da S1

1. **Triar, sem duplicar B6:** revisar a evidência final e as sugestões do PEDIDO 4. Só corrigir domínio/integração se houver defeito reproduzido. No estado atual, não há defeito S1 confirmado pendente.
2. Revalidar a `main` atual com testes, typecheck e E2E pertinentes. O verde anterior de B7 não substitui a revisão da integração atual.
3. Avaliar as duas sugestões registradas no PEDIDO 4 sem aplicá-las automaticamente:
   - `e2e/real-b7.spec.ts`: asserções por substring podem aceitar valores errados;
   - o contexto do modelo só traz saldo em centavos; avaliar formatação para evitar conversões indevidas.
4. Com `CONGELADO` registrado, iniciar **B10** em worktree próprio (`wt/s1-B10`, branch `s1/B10`):
   - criar `newai/docs/RUNBOOK.md` com execução local, troca de provedor, variáveis, contingências e localização de instruções/testes;
   - rodar testes completos e conduzir o ensaio 1 com as mensagens de `coordenacao/ENSAIO-S1.md` quando a S2 as escrever;
   - escrever 8 mensagens não ensaiadas para a S2 em `coordenacao/ENSAIO-S2.md`, cobrindo P1, P2 e P3;
   - apoiar revisão de slides/roteiro e, no dia do painel, conferir cota e rodar CV-01.

### Se você for o próximo agente da S2

**Se a sessão for para corrigir demandas dos testes manuais, comece por [NEWAI-HANDOFF-S2-TESTES-20261029.md](<C:/Users/orugi/AppData/Local/Temp/NEWAI-HANDOFF-S2-TESTES-20261029.md>)**, que traz o fluxo de reprodução, área de atuação e suggested skills.

1. Preservar o avaliador e as evidências atuais. **Nenhuma nova chamada paga é necessária agora.** Não repetir rodadas apenas para obter outro placar.
2. Com `CONGELADO`, iniciar **B10** em `wt/s2-B10`, branch `s2/B10`:
   - consolidar o relatório final da avaliação;
   - escrever 8 mensagens não ensaiadas para a S1 em `coordenacao/ENSAIO-S1.md`, cobrindo as três personas;
   - executar o ensaio 2 com as mensagens que a S1 escrever em `coordenacao/ENSAIO-S2.md`.
3. Só iniciar B9/deploy se houver `P1 LIBERADO` e depois `DEPLOY APROVADO`; CV-27 só depois do deploy.

## 6. Regras operacionais que não podem ser perdidas

- A `main` recebe merges; novos trabalhos usam worktree próprio da sessão. Antes de merge, conferir `MERGE.lock`, rebase, testes, varredura de segredos e testes novamente na `main`.
- Não abrir, exibir ou commitar segredos. Não listar variáveis de ambiente. Não alterar arquivos de segredos ou credenciais.
- Não fazer novas coletas de mercado; os testes usam snapshots gravados. Não ler ou reabrir catálogos/medições S0 proibidos.
- Modelo nunca calcula: números e datas vêm do motor. Não inventar meio/data de compras, não afirmar operações reais, não recomendar produtos/crédito e não duplicar operações.
- Não modificar `MARCOS.md` em nome do responsável. Aprovações humanas são registradas pelo responsável e seguidas de um novo `continue`.
- Não editar área da outra sessão sem autorização explícita. `CONTRATOS-PEDIDOS.md` só recebe acréscimos.
- Capturas reais servem apenas para layout. Não abrir `IMG_2112.PNG`; não copiar imagens para o app nem transcrever dados pessoais.
- Se uma instrução nova contradizer o handoff, o pedido humano atual tem precedência, mas gates e restrições de segurança continuam exigindo autorização explícita.

## 7. Comandos iniciais seguros

```powershell
git -C C:\Users\orugi\Documents\Projetos\salesforce\intern\newai worktree list
git -C C:\Users\orugi\Documents\Projetos\salesforce\intern\newai status --short
git -C C:\Users\orugi\Documents\Projetos\salesforce\intern\newai log main --oneline -10
Test-Path C:\Users\orugi\Documents\Projetos\salesforce\intern\coordenacao\MERGE.lock
Set-Location C:\Users\orugi\Documents\Projetos\salesforce\intern\newai
npm test
npm run typecheck
```

## 8. Contagem de chamadas e orçamento

- Nesta última etapa da S2: **512 chamadas OpenRouter**; total na autorização atual da S2: **947**.
- Histórico anterior da S2: 52 chat completions registradas, além de um trecho NVIDIA de 71 execuções de casos sem total HTTP confiável. Não somar execuções de casos como se fossem requisições.
- S1 informa 32 chamadas acumuladas em seu status. Mercado: 0 novas chamadas nesta etapa.
- Não consultar custo, criar compras ou ampliar orçamento sem decisão explícita do responsável.

## 9. Resposta inicial esperada do próximo agente

Em até 8 linhas, informar: sessão/bloco atual, último comportamento verde, próxima ação permitida, bloqueios e o que precisa do responsável. Se não houver `CONGELADO`, a resposta correta é **AGUARDANDO CONGELADO**, sem iniciar B10/P1.
