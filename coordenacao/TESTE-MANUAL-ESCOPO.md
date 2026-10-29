# NewAI — Guia de escopo para testes manuais

Atualizado em **2026-10-29 12:57**.

## Aplicação disponível agora

- URL local: **http://localhost:3102** (servidor Next dev, S2).
- Provedor real usado nesta validação: **OpenRouter**, modelo `deepseek/deepseek-v4.1-flash-1017`.
- Validação realizada: página HTTP 200, personas P1/P2/P3 disponíveis e CV-01 com P1 concluído via API.
- Em CV-01, o modelo chamou `criar_hipotese`; o motor retornou falta de **R$ 200,00 em 15/11/2026** e o texto apresentou esse resultado corretamente, sem afirmar movimentação real.
- A aplicação simula a data de **30/10/2026** e usa séries de mercado gravadas, com últimas cotações de **27/10/2026**. Isso é intencional.

## O que já pode ser testado

- Seleção de P1, P2 e P3, Home, Conta/extrato, Cartão/faturas, Caixinhas/investimentos e Chat.
- Hipóteses e declarações, projeção de caixa, comparação de cenários, histórico, investimentos e cartão de crédito.
- Proposta, confirmação e cancelamento de movimentação **simulada**, inclusive proteção contra duplicação.
- Respostas com o modelo real e as regras vigentes em `newai/instrucoes.md`.

Se uma dessas funcionalidades apresentar comportamento incorreto, registrar persona, mensagem/ação, resultado obtido e esperado, e o rastro quando disponível.

## Pendências P1 — não tratar como defeito do P0

### S1 — B3c: mercado ao vivo sob demanda

Não esperar atualização automática para a cotação do dia real. O app usa snapshot gravado e rótulos de estimativa. Busca ao vivo com timeout/fallback não foi implementada.

### S1 — B8: extras

Os seguintes recursos completos não foram desenvolvidos como bloco:

- resgate hipotético (CR-47);
- rascunho para atendimento humano;
- G-01 (`aviso_valor` para valores fora do conjunto);
- resumo/encerramento formalizado de CV-23.

O caso CV-23 foi avaliado no fluxo atual, mas isso não equivale à entrega de todo o B8 nem exige uma tela/botão adicional.

### S1 + S2 — B10

RUNBOOK formal, ensaios finais e artefatos de encerramento ainda não foram produzidos. São pendências de processo/documentação, não defeitos da aplicação.

### S2 — B9/deploy/CV-27

Não há URL pública, QR, deploy na Vercel nem CV-27 em celular. Não testar como se já existissem.

## Fora do escopo — não abrir como bug

Não fazem parte do produto, nem são simples pendências de S1:

- transferência/Pix para terceiros, pagamento, resgate ou venda com dinheiro real;
- crédito, empréstimo, aumento/verificação de limite;
- recomendação de investimento ou projeção de preço de renda variável;
- edição de proteção/regras de produtos;
- login, Supabase, app nativo/PWA, outro idioma, métricas de uso ou telas além das fornecidas;
- projeção de caixa além de 29/11/2026;
- impostos/custos não embutidos e E2.

Se algum desses recursos for desejado, é necessário discutir mudança de escopo, não correção de defeito.

## Observações para o relato

- O modelo real pode variar entre execuções. Um erro de ferramenta, número, data, premissa ou afirmação proibida continua sendo um relato válido.
- A fidelidade visual de B5 não foi reavaliada nesta etapa; problemas visuais devem ser relatados com a tela e o ponto exato, sem dados pessoais.
- Não abrir `IMG_2112.PNG` e não usar mensagens com dados reais.
