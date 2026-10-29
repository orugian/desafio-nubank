# B7 parte 2 — evidências reais de 28–29/10/2026

App Next local (porta 3101), cliente HTTP real, navegador Chromium/Playwright. Sem rede de mercado (snapshot gravado P0). Credenciais copiadas do arquivo autorizado para arquivo ignorado pelo Git, sem leitura/exibição.

## Resultado final — 29/10/2026: CV-01, CV-07 e CV-28 aprovados

Após autorização dos PEDIDOS 2 e 3, correção do contexto, valores em reais formatados pelo código no payload e reforço somente de IN-04/IN-07:

- Provedor real: **OpenRouter `deepseek/deepseek-v4.1-flash-1017`**, modelo já configurado no ambiente. Uso pago autorizado explicitamente pelo responsável; nenhuma compra, conta nova ou mudança de credenciais. Não houve troca silenciosa: fallback ao NVIDIA foi autorizado após HTTP 429. O modelo escolhido nos marcos segue NVIDIA; esta validação não altera o gate S0 ou aprova B6/M3.
- CV-01: primeira falta 15/11, 20.000 centavos; saldo final 280.000. Texto final cita corretamente salário de **R$ 3.000,00** e não reproduz a omissão de zero da tentativa 4.
- CV-07: proposta OP1/INV9 de 50.000, alerta 15/11/20.000, nenhuma operação executada antes da confirmação.
- CV-28: primeiro “sim” chama confirmar_movimentacao e executa OP1 uma vez; segundo “sim” chama a mesma ferramenta e recebe **OPERACAO_JA_EXECUTADA**. Versões 1 → 2 → 3, uma única operação, saldo 130.000; Home no navegador mostra R$ 1.300,00. A asserção original do rastro foi mantida, não relaxada.
- Playwright real: **1/1 verde**, 8 chamadas adicionais OpenRouter HTTP 200, abaixo do limite de 12 autorizado no PEDIDO 3. Arquivos `b7-real-tentativa-5.json` e `b7-contagem-tentativa-5.jsonl`.
- **Total acumulado S1: 32 chamadas tentadas, 30 HTTP 200 e 2 HTTP 429.** NVIDIA: 17 tentadas (15 HTTP 200, 2 HTTP 429); OpenRouter: 15 HTTP 200 (7 antes + 8 após PEDIDO 3). Contagem S2 separada. Custo efetivo da conta não foi consultado.

## Tentativas anteriores — histórico, não resultado final

Modelo inicial: NVIDIA `minimaxai/minimax-m3.1-flash`.

### Resultado das tentativas 1–2 (não equivale à suíte B6 da S2)

- **CV-01:** CR-02 confirmado por indicadores do cartão: primeira falta em 15/11, 20.000 centavos, saída C; saldo final 280.000; texto cita 15/11 e 200.
- **CV-07:** proposta OP1 de 50.000 em INV9, pendente, nenhuma operação executada; impacto com insuficiência 20.000, saldo disponível preservado em 180.000, texto pede confirmação e alerta 15/11/200.
- **CV-28:** **não concluído**. Na confirmação por “sim”, o provedor respondeu HTTP 429, traduzido pelo app para F-02/COTA. O teste falhou, como deve; não foi pulado nem declarado verde. Não houve terceira mensagem concluída. Não se trocou de provedor ou credencial, nem se repetiu às cegas após a cota.

## Tentativas e contagem exata

1. `b7-real-tentativa-1.json` / `b7-contagem-tentativa-1.jsonl`: 4 chamadas, todas HTTP 200. CV-01 correto. A execução parou no teste de versão de CV-07 porque o harness enviou a mensagem antes de o reset da sessão terminar (versão 2 em vez de 1). Corrigida só a sincronização do teste: esperar `/api/sessao` e versão 0 no armazenamento; o expected permaneceu versão 1.
2. `b7-real-tentativa-2.json` / `b7-contagem-tentativa-2.jsonl`: 6 chamadas, 5 HTTP 200 e 1 HTTP 429. CV-01 e CV-07 corretos em sessões novas. CV-28 interrompido por cota.

Subtotal histórico das tentativas 1–2: 10 chamadas tentadas, 9 HTTP 200, 1 HTTP 429.

3. `b7-real-tentativa-3.json` / `b7-contagem-tentativa-3.jsonl`: nova tentativa NVIDIA autorizada; 7 chamadas (6 HTTP 200, 1 HTTP 429). Confirmou OP1, mas a repetição final do CV-28 recebeu cota. Preservada a falha.
4. `b7-real-tentativa-4.json` / `b7-contagem-tentativa-4.jsonl`: fallback OpenRouter autorizado, `deepseek/deepseek-v4.1-flash-1017`, 7 chamadas HTTP 200. Uma operação somente e saldo correto, mas rastro vazio na repetição e salário incorreto no texto CV-01. Teste real mantido vermelho; motivou PEDIDO 3.
5. `b7-real-tentativa-5.json` / `b7-contagem-tentativa-5.jsonl`: após ajustes autorizados, 8 chamadas OpenRouter HTTP 200; CV-01/CV-07/CV-28 completos e teste real verde.

A contagem é instrumentada na fronteira `fetch` do servidor, e não inferida do número de ferramentas. Os JSONL registram apenas evento, id local, provedor e status HTTP; nunca corpo, cabeçalho ou credencial. O runner faz quatro turnos, até três chamadas por turno e sem retries automáticos. Nenhuma chamada adicional após o ensaio verde.

## Reexecutar somente com autorização de cota/provedor

Em PowerShell, no worktree da S1 com `.env.local` já autorizado e ignorado:

```powershell
$env:B7_REAL='1'
$env:LLM_PROVEDOR='nvidia'
$env:NVIDIA_MODELO='minimaxai/minimax-m3.1-flash'
$env:MODO='local'
$env:NEXT_PUBLIC_API_EXEMPLOS='0'
# Ajustar URL de arquivo ao caminho absoluto do worktree em uso.
$env:NODE_OPTIONS='--import=file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s1-B7-p2/e2e/contar-modelo.mjs'
npm run e2e -- e2e/real-b7.spec.ts
```

Para OpenRouter, trocar apenas `LLM_PROVEDOR` para `openrouter`, definir `B7_PROVEDOR_REAL=openrouter` e manter o modelo OpenRouter configurado no arquivo ignorado. Não copiar credenciais para os comandos. O fallback pode gerar custo e exige autorização específica.

A suíte real é opt-in e fica explicitamente ignorada quando `B7_REAL` não é `1`. A suíte roteirizada é separada e continua sem chamadas reais. Preservar estas evidências antes de qualquer nova execução: Playwright limpa `test-results` ao iniciar.

## Limites observados

Na primeira tentativa, houve texto real de CV-07 com explicação causal imprecisa da falta (“caso o salário previsto não entre”, embora a falta seja antes dele) e interpretação indevida de proteção da caixinha como proteção de capital. A segunda tentativa descreveu a falta sem essa condicional. São observações para B6/S2, não autorização para a S1 mudar instruções e não evidência de que todo texto do modelo está correto.

O resultado antigo “27/27” do roteiro B6 **não comprova igualdade numérica dos oráculos reais**: o avaliador atual usa status `ok` como `oraculoOk`. Os testes novos de integração conferem explicitamente o estado e os números citados acima.
