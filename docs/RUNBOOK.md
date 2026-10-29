# NewAI — execução local e contingências

**B10 · 29/10/2026.** Operação local em Windows/PowerShell, Node 24 e npm. O domínio mantém **hoje = 30/10/2026**, histórico de 30/07 a 29/10 e projeção até 29/11; a data do computador não altera isso.

## 1. O que está validado e o que ainda depende de ensaio

- Base de entrada deste documento: `main 3636091`, 256 testes; execução local integrada e E2E roteirizado. A confirmação dos comandos deste bloco fica no [status S1](<../../coordenacao/S1-STATUS.md>), com hash de entrega e resultados após o merge.
- B6 tem respostas **reais OpenRouter**, com revisão manual e reavaliação offline: [24/24 críticos](<../avaliacao/resultados/confirmacao-final-4-20261029/avaliacao-reavaliada-critico.md>) e [16/16 demais](<../avaliacao/resultados/confirmacao-final-4-20261029/avaliacao-reavaliada-demais.md>). Leia os limites no [resumo B6](<../avaliacao/resultados/RESUMO-B6-ACEITE-EFEITO.md>). Isso não garante qualquer mensagem futura nem homologa automaticamente outro modelo.
- `CONGELADO` foi registrado pelo responsável nos [marcos](<../../coordenacao/MARCOS.md>). Depois disso, só corrigir defeitos com regressão; não incluir extras. O registro não libera gastos, deploy ou mudança de provedor.
- O **ensaio 1 da S1** só pode ser declarado concluído após receber as mensagens da S2 e executá-las no modelo real autorizado. Roteiro determinístico e relatórios anteriores não substituem esse ensaio.
- Mercado ao vivo, resgate hipotético, rascunho, guarda G-01, bloco completo de resumo e deploy/QR **não estão entregues como P1**. CV-23 ter evidência conversacional não significa B8 completo. Veja o [guia de escopo](<../../coordenacao/TESTE-MANUAL-ESCOPO.md>).
- Não há movimentação real, pagamento/Pix a terceiros, recomendação, crédito ou projeção de preço de renda variável. Números são do motor sobre personas fictícias; o modelo não é oráculo de cálculo.

## 2. Preparar a execução sem tocar em segredos

Confira o diretório e a branch, sem listar variáveis de ambiente. A main recebe merges, não alterações manuais de código. Servidores da S1 usam **3101**; S2 usa **3102**. Não encerre processo de outra sessão.

```powershell
$raiz = 'C:\Users\orugi\Documents\Projetos\salesforce\intern'
$repo = Join-Path $raiz 'newai'
Get-Location
node -v
npm -v
git -C $repo status --short
git -C $repo worktree list
Test-Path (Join-Path $raiz 'coordenacao\MERGE.lock')
```

Para instalar ou testar, prefira um **worktree próprio novo**, criado da main congelada, para não sobrescrever relatórios nem disputar dependências de um servidor em uso. Exemplo para o operador S1; se o caminho/branch já existir, confira sua propriedade e estado em vez de reutilizar/apagar automaticamente:

```powershell
$app = Join-Path $raiz 'wt\s1-validacao-demo'
if (Test-Path $app) { throw 'Worktree já existe: confira antes de continuar.' }
git -C $repo worktree add $app -b s1/validacao-demo main
if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar worktree.' }
Set-Location $app
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Instalação falhou; não prossiga.' }
```

Não rode `npm ci` enquanto o Next desse mesmo diretório estiver ativo: no Windows, bibliotecas nativas podem estar bloqueadas. Se for preciso pausar servidor do responsável, peça autorização; não mate processos por nome. Não é preciso instalar pacotes globais nem atualizar dependências.

## 3. Caminho seguro: testes e demonstração roteirizada

No mesmo PowerShell e diretório `$app`, defina explicitamente o modo sem modelo real:

```powershell
$env:LLM_PROVEDOR = 'roteirizado'
$env:LLM_ROTEIRO = 'e2e/roteiro-b7-e2e.json'
$env:NEXT_PUBLIC_API_EXEMPLOS = '0'
$env:NEXT_PUBLIC_MARCA = 'neutra'
$env:MODO = 'local'
$env:B7_REAL = '0'
$env:PORTA_E2E = '3101'
$env:NEXT_TELEMETRY_DISABLED = '1'

npm test
if ($LASTEXITCODE -ne 0) { throw 'Testes falharam.' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Tipos falharam.' }
npm run e2e
if ($LASTEXITCODE -ne 0) { throw 'E2E falhou.' }
```

O Playwright inicia e encerra o Next na porta 3101, **sem reutilizar servidor existente**. Deixe a porta livre antes do comando; não suba um segundo `dev` ao mesmo tempo. O esperado é E2E roteirizado verde e **um skip explícito do teste real**. Esse skip evita custo e não é nova aprovação do modelo real. Os testes Vitest também exercitam os casos B6 com provedor dublê.

Para ver o fluxo no navegador, depois de os testes terminarem:

```powershell
npm run dev -- -p 3101 -H 127.0.0.1
```

Abra **http://127.0.0.1:3101**. Esse modo é uma **demonstração declarada com dublê**, não chat livre. Escolha Bia e use exatamente, nesta ordem:

1. “Posso separar R$ 500 hoje para minha viagem?”
2. “Guarda R$ 500 na caixinha da viagem.”
3. Clique **Confirmar** no cartão; não use “sim” nesse roteiro.

A hipótese mostra falta de R$ 200,00 em 15/11; a confirmação executa uma movimentação **simulada** de R$ 500,00, descarta hipóteses e a Home mostra R$ 1.300,00. O [roteiro B7](<../e2e/roteiro-b7-e2e.json>) contém somente as duas mensagens: mensagens diferentes podem cair no primeiro turno do dublê e não servem para avaliar linguagem. Encerre apenas esse servidor com `Ctrl+C` no terminal que o iniciou.

## 4. Modelo real: somente após decisão explícita

### Credenciais

A fonte prevista pelo [guia do responsável](<../../docs/prompts/README.md>) é `intern\.segredos\newai.env`. O responsável a mantém; agentes **não abrem, exibem, fazem hash, versionam ou despejam** seu conteúdo. A exceção antiga para um arquivo da raiz não autoriza novas cópias automaticamente. Se a fonte não existir, peça o caminho autorizado atual.

Só depois da autorização para essa execução e para usar as credenciais, copie sem abrir. Exemplo de **primeira cópia**, que se recusa a sobrescrever destino existente:

```powershell
$segredo = Join-Path $raiz '.segredos\newai.env'
$destino = Join-Path $app '.env.local'
if (-not (Test-Path $segredo)) { throw 'Fonte ausente: peça o caminho autorizado.' }
if (Test-Path $destino) { throw 'Cópia local já existe: peça autorização antes de substituí-la.' }
Copy-Item -LiteralPath $segredo -Destination $destino -ErrorAction Stop
git -C $app check-ignore .env.local
if ($LASTEXITCODE -ne 0) { throw 'Cópia não está ignorada; não prossiga.' }
```

A cópia é ignorada pelas [regras Git](<../.gitignore>). Isso não torna seguro publicar dumps, headers ou respostas brutas de erro. Nunca inclua a cópia em pacote de backup, evidência ou commit. Ao encerrar, remova somente a cópia descartável criada para essa execução, com a verificação/autorização pertinente; preserve o original. Não use remoção forçada de worktrees.

### Provedor e modelo

Os [marcos](<../../coordenacao/MARCOS.md>) ainda indicam **NVIDIA `minimaxai/minimax-m3.1-flash`**. B6 passou com **OpenRouter `deepseek/deepseek-v4.1-flash-1017` pago autorizado à S2**; isso não transfere autorização à S1 nem muda a escolha da demo. Antes do ensaio/painel, o responsável precisa confirmar o provedor efetivo, disponibilidade/cota e eventual gasto. Não há fallback automático de produção.

Para trocar: o responsável ajusta somente os seletores/modelos na fonte segura, autoriza recópia se já existir destino e o operador reinicia o Next. Valores definidos no processo prevalecem sobre os da cópia: sobrescreva explicitamente os seletores não secretos usados abaixo, inclusive se o terminal antes rodava o dublê. Não liste nem altere chaves.

```powershell
# Só execute após a escolha/autorização do responsável.
# Exemplo NVIDIA; para OpenRouter, a decisão paga deve ser explícita.
$env:LLM_PROVEDOR = 'nvidia'
$env:NVIDIA_MODELO = 'minimaxai/minimax-m3.1-flash'
$env:NEXT_PUBLIC_API_EXEMPLOS = '0'
$env:NEXT_PUBLIC_MARCA = 'neutra'
$env:MODO = 'local'
$env:B7_REAL = '0'
$env:NEXT_TELEMETRY_DISABLED = '1'
npm run dev -- -p 3101 -H 127.0.0.1
```

Para OpenRouter **autorizado**, use `LLM_PROVEDOR=openrouter` e `OPENROUTER_MODELO=deepseek/deepseek-v4.1-flash-1017` no lugar dos seletores NVIDIA. Não deduza gratuidade do nome do modelo ou da mensagem de cota. O modelo e a chave vêm de campos diferentes por provedor.

Antes de enviar mensagens, abra **Como funciona** e confira provedor/modelo, instruções, fontes e data. Abra uma sessão nova da persona desejada. Cada turno pode consumir até 3 chamadas ao modelo; uma mensagem não equivale a uma chamada HTTP. Registre tentativas/sucessos/falhas por provedor, separadas da contagem S2. Não faça rodadas extras só para obter outro placar.

### Variáveis e controles

O [modelo público de variáveis](<../.env.example>) é a referência dos nomes, **não uma fonte de credenciais**.

| Controle | Uso e cuidado |
|---|---|
| `LLM_PROVEDOR` | `roteirizado`, `nvidia` ou `openrouter`; selecionar explicitamente |
| `NVIDIA_MODELO`, `OPENROUTER_MODELO` | Modelo do respectivo provedor, confirmado em Como funciona |
| `NVIDIA_API_KEY`, `OPENROUTER_API_KEY` | Somente servidor/fonte segura; nunca exibir |
| `LLM_ROTEIRO` | Caminho absoluto ou relativo ao diretório do app; só no dublê |
| `MODO` | `local` no fluxo deste documento; `publico` não significa deploy pronto |
| `NEXT_PUBLIC_API_EXEMPLOS` | `0` usa as rotas reais; `1` usa exemplos, inadequado ao ensaio integrado |
| `NEXT_PUBLIC_MARCA` | `neutra` por padrão aqui; não habilita publicação |
| `CODIGO_ACESSO` | Restrito ao fluxo público P1; não imprimir nem publicar |
| `BRAPI_TOKEN`, `COINGECKO_API_KEY` | Coleta/mercado; não necessários aos testes com gravados; não refazer coletas |
| `B7_REAL` | `0` mantém o teste real pulado; `1` pode gerar custo e exige autorização específica |
| `B7_PROVEDOR_REAL` | `openrouter` no teste real desse provedor; sem isso, o teste espera NVIDIA |
| `PORTA_E2E` | `3101` S1; não ocupar `3102` da S2 |
| `NEXT_TELEMETRY_DISABLED` | `1` desativa telemetria Next nos comandos deste guia |

Os controles `NEXT_PUBLIC_*` afetam o cliente: reinicie o processo e, se optar por produção local, gere novo build com a configuração escolhida. Nenhum build de produção ou deploy é declarado validado por um E2E em `dev`. Para produção local, `npm run build` precede `npm start -- -p 3101 -H 127.0.0.1`; isso não autoriza Vercel, QR ou publicação.

## 5. Falhas e recuperação conservadora

| Sintoma | Ação do operador |
|---|---|
| F-01: timeout | Nada deve mudar no negócio; conferir estado/versão, registrar e tentar novamente só se houver disponibilidade/autorização. O botão reutiliza a mesma mensagem |
| F-02: cota/429 | Parar novas chamadas; respeitar espera informada, pedir decisão humana. Não trocar conta, chave ou provedor automaticamente |
| F-03: rede/5xx/chave recusada | Telas continuam acessíveis. Registrar só código público; chave recusada se resolve com o responsável, sem investigar arquivo secreto |
| F-04: resposta inválida | Registrar mensagem fictícia, código público e rastro disponível; não apresentar texto pronto como se fosse resposta do modelo |
| F-05: ferramentas além do limite | Nenhuma mudança deve ser aplicada; registrar e reproduzir com teste antes de corrigir |
| F-06: sessão inválida/inconsistente | Preservar relato e pedir confirmação antes de Recomeçar, pois reset descarta a sessão simulada |
| Cotação antiga | Esperado no P0: snapshot gravado, normalmente 27/10, com fonte/data e rótulo estimado. B3c/F-07 ao vivo não está implementado; não coletar nem mudar a data para “corrigir” |
| Porta ocupada | Identificar o dono; não encerrar servidor alheio. Playwright não reutiliza servidor existente |
| Instalação EPERM | Confirmar se há Next do mesmo diretório com biblioteca nativa em uso; só pausar processo próprio ou autorizado. Não apagar dependências/locks à força |

Sem rede/cota, pode-se apresentar **explicitamente** a demonstração roteirizada da §3 ou o backup preparado pelo responsável. Nunca trocar silenciosamente o modelo real por respostas gravadas.

O estado é da aba/origem em `sessionStorage`; trocar telas mantém o chat, abrir outra aba/origem não deve ser usado para continuar a mesma sessão. Use **Recomeçar** para voltar aos dados-base, após registrar a evidência e concordar com o descarte. Repetir confirmação não pode criar outra operação; verificar o estado e o rastro, não apenas o texto.

## 6. Ensaios, evidências e dia do painel

- S1 prepara 8 mensagens em [ENSAIO-S2](<../../coordenacao/ENSAIO-S2.md>); a S2 executa o ensaio 2. A S2 entrega o conjunto do ensaio 1 em `coordenacao/ENSAIO-S1.md` (ausente na entrada deste B10). Não escrever o próprio conjunto fingindo que veio da outra sessão.
- Para cada ensaio real, registrar data, hash, persona/reset, mensagem ou ação, provedor/modelo, resposta, rastro, estado/versão, cartões/visão versus motor, latência e contagem de chamadas. Não gravar segredos/capturas reais. Os critérios incluem valores/datas **exatos ou equivalentes**, ausência de termos proibidos e negócio inalterado onde exigido.
- O [teste E2E real B7](<../e2e/real-b7.spec.ts>) é opt-in e cobre CV-01, CV-07 e CV-28. **Não execute `B7_REAL=1` por rotina**. Exige servidor de teste separado, `LLM_PROVEDOR` real/modelo correspondente, `B7_PROVEDOR_REAL` correto e autorização/cota atual. O Playwright gerencia o servidor; não deixe `dev` rodando junto na porta. Ele não substitui o ensaio de mensagens inéditas. Seus asserts textuais ainda usam substring para alguns valores/datas; complemente a leitura manual exata, pois, por exemplo, `200,90` pode satisfazer uma busca por `200` mesmo com o estado correto.
- O [E2E roteirizado](<../e2e/fluxo-b7.spec.ts>) valida interface/HTTP/estado sem modelo real. O [executor B6](<../avaliacao/executar.ts>) e o [revisor offline](<../avaliacao/revisar.ts>) são da S2. O comando `npm run avaliar` carrega a cópia local e pode fazer chamadas reais; não incluí-lo em checagens automáticas. Revisões offline devem usar novas saídas, preservando originais.
- Antes do painel: conferir a cota/disponibilidade no canal autorizado do provedor sem expor credenciais; rodar CV-01 **uma vez, só com autorização para o provedor efetivo**. Confirmar 15/11 e falta de R$ 200 no motor/cartão/texto; não tomar `status: ok` como prova de igualdade. Se falhar, registrar e acionar a contingência, sem gastar rodadas indiscriminadamente.
- Responsável: revisão de fidelidade visual, até 5 slides, roteiro de apresentação e gravação de backup. S2: relatório final da avaliação e ensaio 2. Este documento não declara essas entregas concluídas.
- Deploy/QR/CV-27 continuam fora desta execução local; dependem de decisão P1 e DEPLOY APROVADO. Não publicar só porque há congelamento.

### Isolar o E2E real antes de qualquer execução autorizada

**Não rode `npm run e2e` sem filtro com um provedor real.** A suíte descobre os dois arquivos e usa um único servidor: o fluxo escrito para o dublê também chamaria o modelo real, consumindo cota extra e podendo falhar por esperar texto fixo. Isso não é execução paralela dos testes (há um worker), mas compartilhamento da mesma configuração de servidor.

É seguro conferir a seleção **sem executar testes, iniciar servidor ou chamar modelo**:

```powershell
npm run e2e -- e2e/real-b7.spec.ts --list
if ($LASTEXITCODE -ne 0) { throw 'Falha na descoberta do teste real.' }
```

O resultado esperado é **1 teste em 1 arquivo**. Para efetivamente executá-lo, só após a autorização específica, configuração real da §4, credenciais copiadas pelo fluxo autorizado e porta 3101 livre:

```powershell
# ATENÇÃO: este bloco pode gerar chamadas pagas. Não é checagem de rotina.
if ($env:LLM_PROVEDOR -notin @('nvidia', 'openrouter')) {
    throw 'Selecione explicitamente o provedor real autorizado antes de prosseguir.'
}
$env:B7_PROVEDOR_REAL = $env:LLM_PROVEDOR
$env:B7_REAL = '1'
try {
    npm run e2e -- e2e/real-b7.spec.ts
    if ($LASTEXITCODE -ne 0) { throw 'E2E real falhou; registre sem repetir automaticamente.' }
} finally {
    $env:B7_REAL = '0'
}
```

O filtro explícito seleciona somente o teste real; o `finally` desativa seu opt-in ao final, inclusive em falha. Para retornar à suíte padrão da §3, reconfigure também `LLM_PROVEDOR=roteirizado` e o roteiro; mudar apenas `B7_REAL=0` não impede o fluxo determinístico de chamar um provedor real que ficou selecionado no processo. **Os blocos reais não foram executados nesta revisão documental; somente a descoberta `--list` foi conferida.**

## 7. Onde consultar e como encerrar

- Regras e números: [spec](<../../docs/NEWAI-SPECS.md>), [plano TDD](<../../docs/NEWAI-PLANO-TDD.md>) e [contrato S1](<../../docs/prompts/PROMPT-SESSAO-1.md>).
- Instruções editáveis do modelo: [instrucoes.md](<../instrucoes.md>); descrições: [descricoes.ts](<../src/contratos/descricoes.ts>); dados fictícios/snapshot: [carregador](<../src/dados/index.ts>) e [mercado](<../src/mercado/index.ts>).
- Evidências anteriores de integração: [B7](<../e2e/evidencias/README.md>); evidências finais B6 e suas limitações: [resumo](<../avaliacao/resultados/RESUMO-B6-ACEITE-EFEITO.md>).
- Coordenação: [S1](<../../coordenacao/S1-STATUS.md>), [S2](<../../coordenacao/S2-STATUS.md>), [pedidos](<../../coordenacao/CONTRATOS-PEDIDOS.md>) e [marcos](<../../coordenacao/MARCOS.md>). Sessões só escrevem o próprio status; marcos são do responsável.

Depois de validar: parar apenas servidor próprio, conferir Git limpo e pendências, preservar evidências não secretas e remover apenas worktree/branch próprios já integrados, sem force. Nunca apagar trava de outra sessão, estado do responsável ou credenciais originais. Mudança de comportamento após congelamento exige defeito reproduzido e ciclo RED → GREEN; mudanças S2/contratos seguem a autorização pertinente. Atualizar status e não declarar B10 completo enquanto faltar ensaio ou entrega externa.
