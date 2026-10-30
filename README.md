# NewAI — assistente financeira (desafio Nubank)

Protótipo de uma assistente conversacional que responde sobre dinheiro com números
calculados por um motor determinístico em TypeScript: o modelo conversa, o motor
calcula. Todos os dados de persona são fictícios.

**Demo no ar:** https://desafio-nubank.vercel.app
(QR code para a apresentação em `../apresentacao/qr-desafio-nubank.png`.)

## Como a demo funciona

1. Abra a URL e escolha uma persona (Bia, Caio ou Duda).
2. Toque em **Nina** para abrir o chat e pergunte em linguagem livre
   ("quanto tenho disponível hoje?", "cabe uma parcela de 300?", "e se eu guardar 200 por mês?").

O app é um Next.js (App Router) com rotas de API que chamam o provedor de modelo
(`LLM_PROVEDOR`) e as ferramentas do motor. Em `MODO=local` não há código de acesso;
`MODO=publico` exige `CODIGO_ACESSO` nas requisições.

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as chaves do provedor escolhido
npm run dev                  # http://localhost:3000
```

Variáveis (ver `.env.example`):

| Variável | Uso |
| --- | --- |
| `LLM_PROVEDOR` | `openrouter`, `nvidia` ou `roteirizado` (sem modelo real) |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODELO` | provedor OpenRouter |
| `NVIDIA_API_KEY` / `NVIDIA_MODELO` | provedor NVIDIA |
| `LLM_ROTEIRO` | roteiro JSON quando `LLM_PROVEDOR=roteirizado` |
| `MERCADO_AO_VIVO` | `1` = cotações ao vivo com fallback gravado; `0` = só gravado |
| `BRAPI_TOKEN`, `COINGECKO_API_KEY` | opcionais, elevam limites das fontes de mercado |
| `NEXT_PUBLIC_MARCA` | `nubank` ou `neutra` |
| `NEXT_PUBLIC_API_EXEMPLOS` | `1` usa exemplos do contrato no lugar das rotas `/api/*` |
| `MODO` / `CODIGO_ACESSO` | `local` (livre) ou `publico` (exige código) |

## Testes

```bash
npm test          # Vitest (unitários e de integração)
npm run e2e       # Playwright (sobe o dev server)
npm run typecheck
npm run verifica-prod   # smoke da produção: persona -> Nina -> resposta (Playwright)
```

## Deploy (Vercel)

Projeto `desafio-nubank` em `guilherme-orugians-projects`, com o repositório
conectado à branch `main` (push em `main` = deploy de produção).

```bash
vercel env ls production     # variáveis de produção já configuradas
vercel deploy --prod
```

Variáveis necessárias em produção: `LLM_PROVEDOR`, `OPENROUTER_API_KEY`,
`OPENROUTER_MODELO`, `MERCADO_AO_VIVO`, `BRAPI_TOKEN`, `COINGECKO_API_KEY`,
`NEXT_PUBLIC_MARCA=nubank`, `NEXT_PUBLIC_API_EXEMPLOS=0`, `MODO=local`.

`.vercelignore` exclui apenas artefatos volumosos (`avaliacao/`, `test-results/`).
Nada dentro de `src/` pode ser excluído: o `tsc` do `next build` compila o projeto
inteiro (inclui testes e fixtures) e o build falha se um arquivo referenciado faltar.

## Onde ler mais

- `instrucoes.md` — instruções da Nina (é o texto que vai no prompt).
- `docs/RUNBOOK.md` — passo a passo de demonstração e operação local.
- `src/contratos/` — contratos HTTP, visão e ferramentas (fonte da verdade dos tipos).
- `avaliacao/` — harness e resultados da avaliação de conversas.
