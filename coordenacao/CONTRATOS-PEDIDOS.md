# Pedidos de coordenação e contratos

## PEDIDO 1 · 2026-10-28 16:50 (H4,3) · S1 · PENDENTE
- Tipo: autorização pontual para corrigir fixture de teste da S2; **não muda os contratos 1.0, esquemas, números da spec nem comportamento de produção da conversa**.
- Arquivo: [conversa.test.ts:588–594](<../newai/src/conversa/conversa.test.ts#L588-L594>), teste B4 “11 e 12”.
- Problema: `estadoComDados` começa em `estadoInicial` (`versao: 0`), mas sua pendente tem `criada_na_versao: 1`. O B1c exige revalidar `criada_na_versao <= versao`; ao implementar essa proteção, o teste da S2 falha antes de chamar o provedor (`leiturasInstrucoes`: esperado 2, obtido 0). A fixture é temporalmente inválida; não é divergência de cálculo.
- Mudança mínima proposta: nessa fixture somente, trocar `criada_na_versao: 1` por `criada_na_versao: 0`. Manter todas as asserções intactas; não relaxar o validador nem pular testes.
- Impacto na S2: apenas dado inicial de um teste; nenhum diretório de produção ou instrução é alterado.
- Opções: **(a) autorizar a S1 a fazer essa correção de uma linha no worktree do B1c (recomendado)**; (b) S2 corrige e integra na main, depois S1 faz rebase e repete os testes.
- Bloqueio: B1c não pode fechar/ser integrado com suíte vermelha. A S1 não editou o arquivo da S2. Worktree `wt/s1-B1c`, último GREEN `bba7061` (185/185); validação e teste CR-19 pendentes de commit. Última execução: 185/186, só esse teste da S2 falhando; typecheck ok. Main segue limpa em `d56ae37` com B1b integrado.
- Aprovação necessária: responsável registrar a autorização do PEDIDO 1 em MARCOS.md e mandar continuar; ou indicar correção pela S2.

### PEDIDO 1 · 2026-10-28 16:59 (H4,5) · AUTORIZADO NO CHAT
- O responsável autorizou explicitamente: “Autorizo a correção.”
- Escopo autorizado: corrigir somente a versão de criação dessa fixture (1 → 0), preservar todas as asserções, validar/fechar o B1c e encerrar esta sessão com documentação e handoff. Não iniciar B3b/B2 nesta sessão.
- Não é mudança de contrato. A autorização direta permite a correção pontual do teste da S2; MARCOS.md permanece intocado pela S1 (arquivo exclusivo do responsável).
- Aplicação: alteração pontual realizada no worktree s1/B1c; validação e hash serão acrescentados após o GREEN.

### PEDIDO 1 · 2026-10-28 17:09 (H4,7) · RESOLVIDO
- GREEN: `dfc38f1`, com a correção de uma linha na fixture da S2 e a validação/teste CR-19 do B1c. Nenhuma asserção alterada; nenhum arquivo de contrato alterado.
- Merge na main: `0b471d8` (B1c).
- Verificação: 186/186 testes e typecheck ok no worktree antes/depois do rebase e na main após `npm ci`; varreduras de segredos vazias.
- Recursos próprios removidos após integração: MERGE.lock da S1, worktree e branch s1/B1c, sem force. Main limpa.
- Pedido encerrado. O responsável pediu encerramento desta sessão com documentação e handoff; B3b/B2 ficam para o próximo agente. A autorização não libera outras edições da S2 nem mudanças de contrato.

## PEDIDO 2 · 2026-10-28 23:29 (H11,0) · S1 · PENDENTE
- Tipo: autorização pontual de correção no núcleo da conversa (dono S2); sem alteração de contratos 1.0 ou spec.
- Problema reproduzido: `src/conversa/index.ts:78–90` calcula saldo disponível subtraindo só operações, ignorando saídas declaradas hoje. P1 + declaração Pix de R$ 1.500 em 30/10: visão/executor informam R$ 300; contexto enviado ao modelo informa R$ 1.800. Pode induzir resposta financeira incorreta mesmo com domínio bloqueando a execução acima do saldo.
- Solução mínima proposta: em `montarContextoDeterministico`, reutilizar `saldoDisponivelHoje(persona, estado)` do caixa (importação + substituição do cálculo duplicado), com teste de regressão público em diretório da S1 cobrindo igualdade contexto/visão após declaração e operação.
- Impacto na S2: um ajuste localizado em `src/conversa/index.ts`; nenhuma mudança de interface, instruções, rotas ou frontend. S1 não editou esse arquivo.
- Opções: (a) autorizar S1 a corrigir somente esse cálculo (recomendado); (b) pedir à S2 a correção e integração.
- Parte afetada parada: correção do saldo do contexto. Demais correções S1 e B7 parte 2 seguem nos seus diretórios autorizados; este pedido não autoriza outras mudanças da S2.

### PEDIDO 2 · 2026-10-28 23:58 (H11,5) · AUTORIZADO NO CHAT
- Responsável selecionou explicitamente “Autorizar correção pontual”: S1 ajustará somente o cálculo do saldo disponível no contexto do modelo para reutilizar a função do domínio, com regressão no diretório da S1.
- Sem alterações de contratos, instruções, rotas ou frontend. MARCOS.md continua exclusivo do responsável.
- Na mesma resposta, autorizou nova tentativa NVIDIA e, se não funcionar, OpenRouter já configurado, inclusive pago. A S1 limita a validação OpenRouter a 12 chamadas, sem criar cobrança, mudar credenciais nem publicar segredos. Isso não autoriza ampliar orçamento de outros blocos.

### PEDIDO 2 · 2026-10-29 00:01 (H11,5) · APLICADO, merge pendente
- GREEN `730fb2e`: ajuste estritamente localizado em `src/conversa/index.ts` (importar/reutilizar saldoDisponivelHoje e remover cálculo duplicado). Regressão no diretório S1: declaração de 1.500 hoje → contexto/visão 300; confirmar 100 em INV9 → ambos 200. 215/215 testes e tipos ok. Nenhum outro arquivo S2 alterado.

## PEDIDO 3 · 2026-10-29 00:04 (H11,6) · S1 · PENDENTE
- Tipo: autorização pontual para reforçar IN-04/IN-07 em `instrucoes.md` (dono S2), sem mudar spec, casos ou contratos.
- Reprodução real preservada em `e2e/evidencias/b7-real-tentativa-4.json`: OpenRouter configurado `deepseek/deepseek-v4.1-flash-1017` confirmou OP1 uma vez e manteve saldo 1.300 no terceiro “sim”, mas não chamou confirmar_movimentacao de novo (rastro vazio). Portanto não cumpriu literalmente CR-48/CV-28, que exige erro OPERACAO_JA_EXECUTADA retornado pela ferramenta. A asserção foi preservada e segue falhando; não confundir segurança de idempotência com aceite completo do caso.
- Outro problema de texto no mesmo ensaio: em CV-01 o modelo escreveu salário de R$ 300 no dia 19/11, embora o motor/contexto informem R$ 3.000. Cálculos e estado corretos; texto não pode ser declarado íntegro.
- Solução mínima proposta: reforçar cópia literal dos valores retornados (sem truncar nem converter centavos mentalmente) e confirmação repetida deve chamar confirmar_movimentacao com o id anterior para devolver erro tipado, em vez de inferir sucesso pelo texto. Manter todas as cláusulas e asserts. Não introduzir G-01/P1 ou resposta pronta para mascarar o modelo.
- Impacto: somente instruções do modelo e regressão na área S1; revalidar CV-01/CV-07/CV-28 reais. B6 e reexecução do conjunto crítico completo seguem responsabilidade S2, não se presume gate aprovado.
- Autorização pedida: (a) S1 ajusta somente IN-04/IN-07 e executa até 12 chamadas OpenRouter adicionais (recomendado), ou (b) S2 faz ajuste e retorna relatório. A S1 ainda não alterou instruções.
- Chamadas já feitas: NVIDIA 17 (15 HTTP 200, 2 HTTP 429), OpenRouter 7 (todas HTTP 200), acumulado S1 24. Nenhuma outra credencial, conta ou provedor testado.

### PEDIDO 3 · 2026-10-29 00:05 (H11,6) · AUTORIZADO NO CHAT
- Responsável selecionou explicitamente “Autorizar ajuste e revalidação”: somente IN-04/IN-07 nas instruções S2, regressão na área S1 e até 12 chamadas OpenRouter adicionais às 7 já feitas. Sem alterações de contratos/casos nem relaxamento de asserts. MARCOS.md intocado.

### PEDIDOS 2 e 3 · 2026-10-29 00:18 (H11,8) · RESOLVIDOS
- PEDIDO 2: GREEN `730fb2e`, regressão pública de contexto/visão após declaração e confirmação; nenhuma alteração S2 além do cálculo autorizado.
- PEDIDO 3: somente IN-04/IN-07 em [instruções](<../newai/instrucoes.md>), GREEN final `5482266`, com [valores formatados determinísticos](<../newai/src/conversa/executores/index.ts>) gerados pela S1 (sem alterar números/cartões/contratos nem implantar G-01). Não se relaxou a asserção de confirmação repetida.
- Merge final `d7bb0f4` na main: 216/216 Vitest e tipos ok; Playwright roteirizado verde no worktree e na main, teste real opt-in verde no worktree.
- [Evidência final real](<../newai/e2e/evidencias/b7-real-tentativa-5.json>): OpenRouter configurado `deepseek/deepseek-v4.1-flash-1017`, CV-01/CR-02 e CV-07/CR-40 corretos; CV-28/CR-48 confirma uma vez e retorna OPERACAO_JA_EXECUTADA no terceiro “sim”, sem duplicar; Home com 1.300. Foram 8 chamadas adicionais autorizadas, abaixo do teto de 12.
- Acumulado S1: 32 chamadas tentadas (NVIDIA 17: 15 HTTP 200 + 2 HTTP 429; OpenRouter 15 HTTP 200). S2 conta separada. Sem compra, nova credencial ou alteração dos marcos. B6/M3 não são aprovados por esta validação.
- Sem pedidos S1 pendentes. Worktree/branch/trava próprios removidos sem force; main limpa.

## PEDIDO 4 · 2026-10-29 10:32 (H22,03) · S2 · PENDENTE — aceite/contrato da triagem CV-14
- Responsável aprovou no chat consultar a fatura antes de tratar como gasto novo, sem inventar meio/data e preservando a mensagem original. A S2 aplica apenas triagem somente leitura em instruções/descrições; essa aprovação não foi interpretada como mudança de contrato ou de aceite.
- Incompatibilidade reproduzida: CV-14 literal não fornece meio/data da nova compra, mas [adicionar_evento](<../newai/src/contratos/estado.ts#L29-L40>) exige ambos. O [executor](<../newai/src/conversa/executores/index.ts#L179-L188>) valida antes do domínio. Sem eles, resultado é ARGUMENTOS_INVALIDOS; copiando a data 03/10 do item existente, resultado é DATA_ANTES_DE_HOJE, antes da duplicidade. Não é legítimo reutilizar atributos do item antigo para preencher uma compra nova.
- A [consulta da fatura](<../newai/src/conversa/executores/index.ts#L99-L115>) retorna cartão e estado inalterado, não POSSIVEL_DUPLICIDADE tipado. A função [verificarDuplicidade](<../newai/src/dominio/cartao/index.ts#L62-L75>) já permite pré-checagem por valor, mas não está exposta ao modelo. O [caso/oráculo atual](<../newai/avaliacao/casos/cv-14.json>) ainda exige registrar_declaracao e erro tipado; ambos permanecem exigidos, sem relaxamento.
- Prova pública S2 no worktree `s2/ajustes-cv14`: consulta encontra Supermercado R$ 480 na fatura de 05/11, preserva todo o negócio e não satisfaz CR-15a. Testes adicionais provam os dois erros acima sem mock do domínio. Não foi alterado nenhum arquivo de contrato, domínio ou executor S1.
- **Opção A — decisão explícita de aceite, sem contrato:** manter consulta + evidência da fatura + pergunta se é outra compra no primeiro turno, sem mutação; reservar registro/erro tipado para tentativa com dados próprios completos da nova compra. Exige aprovação do responsável para atualizar a especificação/aceite, preservando a reprovação histórica; não pode ser contabilizada silenciosamente como CR-15a atual.
- **Opção B — se erro tipado no primeiro turno for obrigatório (recomendado para preservar essa exigência):** aprovar pré-checagem tipada somente leitura por valor, reaproveitando verificarDuplicidade e mantendo o registro estrito. Proposta mínima: argumento opcional de pré-checagem em consultar_cartao, com resultado/erro formalizado e comportamento anterior de `{}` preservado. É mudança aditiva de contrato e requer `CONTRATO 4 APROVADO`, exemplos/testes e coordenação com S1; também exige aprovação explícita da ferramenta esperada no caso. Alternativa de variante de triagem em registrar_declaracao também seria mudança de contrato, não ajuste de prompt.
- Impacto S1: escolher/implementar pré-checagem real e exemplos apenas se B for aprovada; nenhum pedido de afrouxar data/meio no registro, modificar números ou inventar informação. Impacto S2: instruções/descrições, caso e oráculo só no escopo aprovado.
- Parte afetada parada: considerar CV-14/CR-15a aprovado e qualquer mudança de contrato/aceite. Triagem narrativa aprovada e regressões seguem sem alterar esses critérios; B6/M3/M4, P1 e congelamento não são liberados por este pedido.

### PEDIDO 4 · 2026-10-29 11:40 (H23,2) · OPÇÃO A AUTORIZADA NO CHAT
- O responsável autorizou o "ajuste pontual identificado pertinente à sessão 2" e pediu que a mesma classe de problema fosse eliminada nos demais casos. Aplicada a **Opção A** (mudança de aceite, sem contrato): CV-14 passa a exigir `consultar_cartao` e o oráculo **CR-15a-triagem** (fatura com Supermercado R$ 480,00 venc. 05/11, pergunta se é outra compra, nenhum registro de nova compra sem data/meio, negócio inalterado). Nenhum arquivo de contrato, domínio ou executor S1 foi alterado; a Opção B não foi implementada.
- O oráculo CR-15a original (erro tipado) permanece no código; o registro com dados completos continua devolvendo POSSIVEL_DUPLICIDADE (teste de domínio da S1 intacto). Reprovações históricas preservadas nos relatórios.
- Mesma classe corrigida no avaliador S2 (aceite olhava forma, não efeito): CV-05 (data padrão verificada pelo efeito no cartão), CV-10 (setembro + total do motor, qualquer filtro equivalente), CV-24 (data opcional de `separar`), arrays de alterações sem ordem fixa, datas sem zero, "bruto/bruta", milhar com/sem ponto, sinônimos de pergunta (CV-04), recusa equivalente (CV-17), pergunta de ordem com contexto (CV-08) e resumo de CV-23 no turno 3. Termos proibidos e a frase "movimentação simulada" foram mantidos (regras de segurança).
- **Para a S1 (sem pedido de mudança agora):** (1) [real-b7.spec.ts:51–52,77–78](<../newai/e2e/real-b7.spec.ts#L51-L78>) usa `toContain("15/11")`/`toContain("200")` por substring: "200" também casa com "2.000" (falso positivo) e uma data escrita sem zero não casaria. Sugestão: reutilizar `textoContemEquivalente` de `avaliacao/executar.ts`, que tem esses limites testados. (2) O contexto determinístico só traz saldo em centavos (`saldo_disponivel_hoje_centavos`); CV-20 exige "1.800" sem ferramenta, o que força o modelo a converter. Sugestão: incluir no contexto o valor formatado, como já feito em `valores_formatados` das ferramentas.

### PEDIDO 4 · 2026-10-29 12:28 (H23,97) · IMPLEMENTADO PELA S2 / AGUARDANDO REVISÃO HUMANA
- Aceite por efeito integrado na main `3636091`; 256/256 testes e typecheck verdes. Evidência real vigente: críticos 24/24 e demais 16/16 em `avaliacao/resultados/confirmacao-final-4-20261029/`.
- Nenhum arquivo de contrato, domínio ou executor S1 foi alterado. A spec e os marcos não foram editados pela S2; a mudança de aceite da Opção A permanece documentada aqui e nos casos/oráculos da avaliação.
- Encerrada a parte S2 do pedido. Permanece somente a revisão humana do aceite/congelamento; sugestões à S1 não são pedidos de alteração.
