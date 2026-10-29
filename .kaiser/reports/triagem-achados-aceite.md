# Triagem dos achados da auditoria agy (classe: aceite exige forma em vez de efeito)

| # | Achado | Decisão | Motivo |
|---|---|---|---|
| 1 | CV-14 exige registrar_declaracao | **Corrigido** (4ce13e2) | Opção A do PEDIDO 4, autorizada. |
| 2 | CV-23 turno 4 exige resumo na despedida | **Corrigir** | Spec §12: "Comparação final, premissas e limites" para "Pode resumir?" / "Obrigada". Avaliar o resumo no turno 3 e só exigir encerramento sem mutação/termos no turno 4. |
| 3 | CV-24 exige `data` literal em separar | **Corrigir** | `data` é opcional (default hoje). Mesma classe que CV-05. |
| 4 | CV-20 "1.800" sem ferramenta vs IN-04 | **Corrigir parcial** | Aceitar "1.800" ou "1800" (efeito). Contexto só traz centavos: registrar para S1 (contexto formatado), não mudar contrato. |
| 5 | "bruto" vs "bruta" | **Corrigir** | Spec CV-06/CV-26 citam "bruto" como rótulo; concordância "bruta" tem o mesmo efeito. Aceitar /brut[oa]/. |
| 6 | CV-04 regex só evento/compromisso | **Corrigir** | Sinônimos legítimos (conta, lançamento, gasto, despesa, pagamento, item). |
| 7 | Datas com zero à esquerda | **Corrigir** | "9/11" e "09/11" são a mesma data. |
| 8 | CV-08 pergunta isolada | **Corrigir** | Aceitar contexto do parágrafo da pergunta; manter exigência de pergunta. |
| 9 | "recomendo" em negação / "não posso recomendar" literal | **Parcial** | Termo proibido é critério explícito do plano B6 e do prompt S2: **mantido**. CV-17 `texto_contem` aceita recusas equivalentes (efeito: recusar sem citar produto). |
| 10 | Arrays posicionais em argumentos | **Corrigir** | Ordem de alterações independentes não muda efeito. |
| — | CV-28 "movimentação simulada" | **Manter** | A frase exigida é regra de segurança (IN-07/§seguranca), não variação estilística. |
