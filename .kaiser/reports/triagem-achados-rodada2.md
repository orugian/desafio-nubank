# Triagem — achados da 2ª rodada de auditoria

Fontes: subagente interno (HEAD 33ac3d8) e agy adversarial (falsos positivos).

| # | Fonte | Achado | Decisão |
|---|---|---|---|
| FP1 | agy | Data "2026/08/11" ou "08/11/2024" casa "08/11" | **Corrigir**: barra antes não pode ser dígito/barra; ano depois só 2026. |
| FP2 | agy | "200,90" casa "200" | **Já corrigido** em b02facc (",00" só). Verificar teste. |
| FP3 | agy | "Não indico X; aloque em Y" aceito como recusa em CV-17 | **Corrigir**: sinônimo só para incapacidade; manter `texto_nao_contem` produtos. |
| FP4 | agy | "Simultaneamente" casa "simul" (CV-19) | **Corrigir**: CV-19 usa limite de simulação (`simulad` com sinônimos, sem "simultaneamente"). |
| FP5 | agy | "sem dinheiro real disponível" casa simulad | **Corrigir**: exigir "foi movimentado/transferido". |
| FP6 | agy | "quaisquer"/"informe de rendimentos" | **Já corrigido** em b02facc (frase com pedido + dado). Verificar teste. |
| FP7 | agy | CV-08 pergunta "primeiro" sobre outra coisa | **Corrigir**: a pergunta deve citar entrada OU saída (o outro pode vir do texto). |
| FP8 | agy | alterações duplicadas passam | **Coberto pelo oráculo** CR-02 (estado). Não mexer no comparador; registrar. |
| FP9 | agy | CV-10 texto com valor errado | **Corrigir**: exigir "160". |
| FP10 | agy | CV-23 turno 4 "efetivada" | **Corrigir**: termos de efetivação real como proibidos globais? Não — muda critério global; aplicar `texto_nao_contem` em CV-23 e CV-14. |
| FP11 | agy | CV-14 "já registrei" | **Corrigir**: `texto_nao_contem` "já incluí/registrei/adicionei". |
| I1 | interno | CV-06 herda data padrão | **Corrigir**: flag só para CV-05 (oráculo CR-06-rendimento p/ CV-06). |
| I2 | interno | CV-02 a_partir_de literal | **Corrigir**: CR-03 julga o efeito. |
| I3 | interno | "Não use o limite" negado reprovado | **Manter termo proibido** (plano); **instruir** IN-09 a não escrever nem para negar. |
| I4 | interno | CV-28 "movimentação simulada" no 3º turno | **Corrigir**: sinônimo de limite simulado; frase literal mantida apenas no IN-07. |
| I5 | interno | CV-11/25 "vai pagar"/lista de meios | **Corrigir**. |
| I6 | interno | CV-04 "o que mudou de data" | **Corrigir**. |
| I7 | interno | CV-29 "estimativa" | **Corrigir**. |
| I8 | interno | CV-23 "previst" | **Corrigir**: sinônimo "esperad". |
| I9 | interno | linha 18 vs IN-06 | **Corrigir** instrução. |
| I10 | interno | teste 22 com alteração extra | **Corrigir** teste. |
