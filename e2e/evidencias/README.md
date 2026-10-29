# B7 parte 2 — evidências reais de 28/10/2026

Modelo: NVIDIA `minimaxai/minimax-m3.1-flash`, no app Next local (porta 3101), cliente HTTP real, navegador Chromium/Playwright. Sem rede de mercado (snapshot gravado P0). Credenciais copiadas do arquivo autorizado para arquivo ignorado pelo Git, sem leitura/exibição.

## Resultado real (não equivale à suíte B6 da S2)

- **CV-01:** CR-02 confirmado por indicadores do cartão: primeira falta em 15/11, 20.000 centavos, saída C; saldo final 280.000; texto cita 15/11 e 200.
- **CV-07:** proposta OP1 de 50.000 em INV9, pendente, nenhuma operação executada; impacto com insuficiência 20.000, saldo disponível preservado em 180.000, texto pede confirmação e alerta 15/11/200.
- **CV-28:** **não concluído**. Na confirmação por “sim”, o provedor respondeu HTTP 429, traduzido pelo app para F-02/COTA. O teste falhou, como deve; não foi pulado nem declarado verde. Não houve terceira mensagem concluída. Não se trocou de provedor ou credencial, nem se repetiu às cegas após a cota.

## Tentativas e contagem exata

1. `b7-real-tentativa-1.json` / `b7-contagem-tentativa-1.jsonl`: 4 chamadas, todas HTTP 200. CV-01 correto. A execução parou no teste de versão de CV-07 porque o harness enviou a mensagem antes de o reset da sessão terminar (versão 2 em vez de 1). Corrigida só a sincronização do teste: esperar `/api/sessao` e versão 0 no armazenamento; o expected permaneceu versão 1.
2. `b7-real-tentativa-2.json` / `b7-contagem-tentativa-2.jsonl`: 6 chamadas, 5 HTTP 200 e 1 HTTP 429. CV-01 e CV-07 corretos em sessões novas. CV-28 interrompido por cota.

**Acumulado S1: 10 chamadas tentadas, 9 HTTP 200, 1 HTTP 429.** A contagem é instrumentada na fronteira `fetch` do servidor, e não inferida do número de ferramentas. Os JSONL registram apenas evento, id local e status HTTP; nunca corpo, cabeçalho ou credencial.

## Reexecutar somente mediante liberação da cota

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

A suíte real é opt-in e fica explicitamente ignorada quando `B7_REAL` não é `1`. A suíte roteirizada é separada e continua sem chamadas reais. Preservar estas evidências antes de qualquer nova execução: Playwright limpa `test-results` ao iniciar.

## Limites observados

Na primeira tentativa, houve texto real de CV-07 com explicação causal imprecisa da falta (“caso o salário previsto não entre”, embora a falta seja antes dele) e interpretação indevida de proteção da caixinha como proteção de capital. A segunda tentativa descreveu a falta sem essa condicional. São observações para B6/S2, não autorização para a S1 mudar instruções e não evidência de que todo texto do modelo está correto.

O resultado antigo “27/27” do roteiro B6 **não comprova igualdade numérica dos oráculos reais**: o avaliador atual usa status `ok` como `oraculoOk`. Os testes novos de integração conferem explicitamente o estado e os números citados acima.
