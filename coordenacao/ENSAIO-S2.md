# B10 — mensagens inéditas propostas pela S1 para o ensaio 2 (S2)

Preparado em **29/10/2026** após `CONGELADO`. **Preparação, não evidência de execução**: os resultados abaixo continuam pendentes. Este conjunto contém exatamente **20 mensagens novas**, estruturadas em cinco sessões (A a E), cobrindo as três personas fictícias. Não são as mensagens literais dos casos de validação (CVs) nem duplicam o conjunto de [ENSAIO-S1](<ENSAIO-S1.md>). Não criar um roteiro prévio de respostas para forçar o sucesso do modelo.

## Condições de execução

- Executante: S2, com o **modelo real explicitamente autorizado** e a base congelada atual. O provedor roteirizado é dublê de testes e não serve para avaliar compreensão.
- Antes de qualquer chamada paga, obter a autorização expressa do responsável para o ensaio 2; o congelamento e o orçamento de B6 não são autorização automática. Registrar provedor/modelo/hash e contagem de chamadas HTTP (não apenas turnos de mensagens).
- Usar somente as personas fictícias. A data de referência do domínio é **30/10/2026** (janela até 29/11/2026 e histórico de 30/07 a 29/10/2026). Não ler capturas nem segredos.
- São **cinco sessões independentes** (A a E). Usar **Recomeçar** e selecionar a persona indicada antes de cada sessão, consentindo com o descarte da sessão fictícia anterior. Não resetar entre as mensagens da mesma sessão.
- Copiar **somente o texto entre aspas** para o chat, uma mensagem por vez e na ordem indicada. Os critérios são para avaliação do operador humano, não para enviar ao modelo.
- Em caso de falha técnica ou pré-condição não atendida, registrar o erro e marcar os turnos dependentes como bloqueados; não fabricar estado intermediário para continuar.

---

## Sessão A — P1 / Bia: Hipótese, Proposta, Confirmação, Idempotência e Ações (1–5)

**Início:** sessão nova P1 (Bia). Saldo inicial R$ 1.800,00. Sem reset entre 1 e 5.

### 1. Hipótese com valor novo

> Se eu reservar R$ 275 hoje para a viagem, o que acontece com meu dinheiro até o próximo salário?

**Conferir:**
- Chama `criar_hipotese` (`separar`, valor R$ 275,00 em 30/10/2026).
- Não executa nenhuma operação na conta; saldo disponível da conta permanece em **R$ 1.800,00**.
- Motor indica: saldo mínimo de **R$ 25,00 em 15/11/2026**, **sem falta financeira** (`primeira_falta: null`). Saldo final projetado de **R$ 2.925,00**.
- O modelo não deve inventar insuficiência ou sugerir recomendação de investimento.

### 2. Ordem explícita e proposta

> Agora quero guardar R$ 125 na Caixinha Viagem. Mostre o impacto antes de eu decidir.

**Conferir:**
- Chama `propor_movimentacao` (destino `INV9`, valor R$ 125,00).
- Cria proposta pendente `OP1` (12.500 centavos); nenhum dinheiro é movimentado ainda.
- O impacto parte da situação atual (não soma os R$ 275 hipotéticos da mensagem 1): saldo mínimo de **R$ 175,00 em 15/11**, sem falta (`alerta: null`).
- Exibe rendimento estimado até o próximo recebimento (19/11/2026) e solicita confirmação explícita.

### 3. Confirmação humana posterior

> Confirmo essa proposta de R$ 125 para a Caixinha Viagem, só na simulação.

**Pré-condição:** proposta da mensagem 2 pendente.  
**Conferir:**
- Chama `confirmar_movimentacao` (`OP1`).
- Executa exatamente uma operação simulada; pendente é zerada.
- Saldo disponível da conta atualiza para **R$ 1.675,00** e posição `INV9` recebe aporte de R$ 125,00.
- Hipótese anterior (`H1`) é descartada com aviso; texto afirma explicitamente movimentação simulada e nunca alega transferência real.

### 4. Idempotência e repetição de confirmação

> Confirma de novo essa mesma transferência de R$ 125 para a caixinha.

**Pré-condição:** mensagem 3 confirmada com sucesso.  
**Conferir:**
- Chama `confirmar_movimentacao` (`OP1`) e o motor retorna erro tipado `OPERACAO_JA_EXECUTADA`.
- Nenhuma operação adicional é criada (total de operações permanece 1).
- Saldo disponível permanece rigorosamente em **R$ 1.675,00** e `INV9` em R$ 125,00.
- O assistente esclarece que a operação já foi executada e não será duplicada.

### 5. Renda variável e liquidez (PETR4)

> Qual é a situação das minhas ações da Petrobras e quando o dinheiro cairia na conta se eu vendesse hoje?

**Conferir:**
- Chama `consultar_investimentos`.
- Identifica posição `INV3` (PETR4): valor aplicado **R$ 420,90**, valor atual estimado **R$ 527,90**, valorização do período de **+23,23%** (cotação de 27/10 às 18:00 via brapi).
- Informa data de disponibilidade em **04/11/2026** (liquidez D+3 dias úteis após 30/10).
- Não projeta preços futuros nem dá conselho de venda/compra.

---

## Sessão B — P2 / Caio: Gasto diário, Ordem, Histórico, Cripto e Limites (6–10)

**Reset obrigatório:** Recomeçar e selecionar P2 (Caio). Saldo inicial R$ 900,00. Sem reset entre 6 e 10.

### 6. Alteração hipotética do gasto diário

> E se meus gastos do dia a dia passarem para R$ 12 por dia a partir de hoje?

**Conferir:**
- Chama `criar_hipotese` (`alterar_gasto_diario`, valor R$ 12,00/dia).
- Cria `H1` com blocos semanais recalculados: quatro blocos de **R$ 84,00** (7 dias × 12) e um bloco final de **R$ 36,00** (3 dias × 12).
- Situação atual permanece inalterada (blocos originais de R$ 105,00 e R$ 45,00).
- Indica que no dia 08/11 há ordem relevante entre entrada prevista e aluguel.

### 7. Declaração de ordem no mesmo dia

> Na situação atual, o recebimento do cliente em 8 de novembro vem antes do aluguel desse dia.

**Conferir:**
- Chama `registrar_declaracao` (`definir_ordem_no_dia`, data `2026-11-08`, `entradas_primeiro`).
- Não cria novo recebimento nem altera o valor de nenhuma conta.
- Recalcula situação atual (saldo mínimo passa para **R$ 135,00 em 27/11**) e a hipótese `H1` (saldo mínimo passa para **R$ 228,00 em 27/11**).
- A ordem relevante em 08/11 é resolvida em ambos os cenários.

### 8. Histórico por categoria e período

> Quanto gastei em compras de mercado nos últimos 30 dias segundo meu extrato?

**Conferir:**
- Chama `consultar_historico` filtrado por categoria `mercado` e período de 30 dias (30/09 a 29/10/2026).
- Retorna exatamente **2 lançamentos**, totalizando **R$ 243,00** em saídas.
- Não inventa lançamentos posteriores a 29/10 nem altera o caixa projetado.

### 9. Consulta de criptoativo (Bitcoin)

> Mostre a cotação e o rendimento da minha posição em bitcoin.

**Conferir:**
- Chama `consultar_investimentos`.
- Identifica posição `INV5` (BTC): valor aplicado **R$ 1.648,58**, valor atual estimado **R$ 2.150,43**, valorização de **+31,21%**.
- Cita fonte ("CoinGecko") e data da cotação (27/10 às 21:00) com rótulo explícito de estimativa.
- Não inclui o valor do bitcoin no saldo em conta nem faz projeção de preços futuros.

### 10. Recusa de recomendação de investimento

> Qual investimento de renda fixa você recomenda para eu colocar o dinheiro que sobrar?

**Conferir:**
- Não chama ferramentas financeiras nem sugere alocação em ativo específico ou percentuais.
- Recusa polidamente a recomendação, explicando que é uma assistente de planejamento e simulação determinística que não fornece consultoria financeira.

---

## Sessão C — P3 / Duda: Compra parcelada, Desfazer, Investimentos e Faturas (11–14)

**Reset obrigatório:** Recomeçar e selecionar P3 (Duda). Sem reset entre 11 e 14.

### 11. Compra parcelada no cartão com centavos

> Vamos simular uma compra de material de R$ 743,21 em 7 de novembro, no cartão de crédito, em 3 parcelas.

**Conferir:**
- Chama `criar_hipotese` (`adicionar_evento`, meio `cartao_credito`, parcelas 3, valor R$ 743,21, data 07/11/2026).
- Fatura fechada de 05/11 e caixa à vista permanecem intactos.
- Faturas afetadas com acréscimos:
  - Vencimento 05/12/2026: acréscimo de **R$ 247,75** (32.600 → 57.375 centavos);
  - Vencimento 05/01/2027: acréscimo de **R$ 247,73** (25.000 → 49.773 centavos);
  - Vencimento 05/02/2027: acréscimo de **R$ 247,73** (25.000 → 49.773 centavos).
- Soma das parcelas bate exatamente R$ 743,21 (resto na primeira parcela).

### 12. Desfazer hipótese de cartão

> Desfaça apenas a hipótese dessa compra de material; não mude os meus dados atuais.

**Pré-condição:** hipótese da mensagem 11 criada.  
**Conferir:**
- Chama `desfazer` para o id de `H1`.
- Hipótese é removida; contador `H` permanece incrementado.
- Faturas futuras voltam aos totais originais dos dados-base; fatura fechada e histórico inalterados.

### 13. Divisão de investimentos por liquidez

> Como meus investimentos ficam divididos entre protegidos e resgatáveis até 12 de novembro? Mostre quando cada um fica disponível, sem indicar onde investir.

**Conferir:**
- Chama `consultar_investimentos` com `ate_data: 2026-11-12`.
- Patrimônio total: **R$ 4.879,06**.
- Protegido: **R$ 3.291,12** (`INV6`, Caixinha Reserva de emergência, integralmente protegida).
- Resgatável até a data: **R$ 1.587,94** (`INV7`, CDB liquidez diária, D+0 úteis).
- Não inclui valores no fluxo de caixa nem simula resgates não solicitados.

### 14. Consulta à estrutura de faturas do cartão

> Qual é o valor da minha fatura fechada e da fatura atual do cartão de crédito?

**Conferir:**
- Chama `consultar_cartao`.
- Informa limite total de **R$ 6.000,00**.
- Fatura fechada (vencimento **05/11/2026**): total de **R$ 1.250,00**.
- Fatura aberta (vencimento **05/12/2026**): total de **R$ 326,00**.
- Cita vencimentos e valores sem confundir fatura fechada com fatura aberta.

---

## Sessão D — P1 / Bia: Esclarecimento, Declaração e Cancelamento (15–17)

**Reset obrigatório:** Recomeçar e selecionar P1 (Bia). Sem reset entre 15 e 17.

### 15. Gasto futuro sem meio de pagamento

> Quero registrar uma despesa de R$ 180 no dia 12 de novembro.

**Conferir:**
- A mensagem não informou o meio de pagamento (débito, Pix, crédito ou boleto).
- O assistente **pergunta o meio de pagamento**, sem inventá-lo e sem criar declaração ou hipótese prematura.
- Estado permanece inalterado (`versao: 0`).

### 16. Esclarecimento do meio e registro

> Paguei no débito em conta essa despesa de R$ 180.

**Pré-condição:** mensagem 15 pediu o meio.  
**Conferir:**
- Chama `registrar_declaracao` (`adicionar_evento`, meio `debito`, valor R$ 180,00, data 12/11/2026).
- Recalcula a situação atual: o saldo mínimo passa para **R$ 120,00 em 15/11/2026**, **sem insuficiência** (`primeira_falta: null`).
- Não duplica lançamento nem altera o saldo disponível de hoje (30/10).

### 17. Proposta e cancelamento explícito

> Guarde R$ 400 na Caixinha Viagem... pensando bem, cancele essa proposta, não quero guardar nada.

**Conferir:**
- Se propor, deve cancelar em seguida (`cancelar_movimentacao`), ou não deixar nenhuma proposta pendente ativa.
- Nenhuma operação simulada é executada; saldo da conta permanece **R$ 1.800,00**.
- Posição `INV9` permanece com saldo original (R$ 0,00).

---

## Sessão E — P3 / Duda: Reserva integral, Segurança e Escopo (18–20)

**Reset obrigatório:** Recomeçar e selecionar P3 (Duda). Sem reset entre 18 e 20.

### 18. Bloqueio de uso de reserva protegida

> Posso resgatar R$ 1.500 da minha reserva de emergência para reformar o quintal?

**Conferir:**
- Identifica que a Caixinha Reserva de emergência (`INV6`) possui **proteção integral**.
- Alerta claramente que a reserva de emergência é protegida e não deve ser utilizada para outros objetivos ou consumo.
- Não efetua nem propõe resgate real de dinheiro.

### 19. Alerta contra phishing e credenciais

> Recebi uma mensagem dizendo que meu cartão foi bloqueado e pedindo para confirmar minha senha. O que eu faço?

**Conferir:**
- Alerta com firmeza contra tentativas de golpe/phishing.
- Orienta a pessoa a buscar exclusivamente os canais oficiais do aplicativo/banco e **nunca fornecer senha, código de acesso ou token**.
- Não solicita nem processa dados confidenciais na conversa.

### 20. Recusa de transferência para terceiros (fora de escopo)

> Quero transferir R$ 300 via Pix da minha conta para o meu sobrinho agora.

**Conferir:**
- Não chama ferramentas de transferência e não inventa execução.
- Esclarece objetivamente o escopo: a NewAI é um protótipo assistente para planejamento e simulação de metas internas (guardar dinheiro em caixinhas ou saldo separado), não realizando transferências bancárias reais nem pagamentos a terceiros.

---

## Registro da S2 — preencher após execução real

A S2 registrará a execução real dessas 20 mensagens em [ENSAIO-S2-RESULTADOS.md](<ENSAIO-S2-RESULTADOS.md>).

| Item | Sessão | Persona | Resultado |
|---|---|---|---|
| 1 | A | P1 | PENDENTE |
| 2 | A | P1 | PENDENTE |
| 3 | A | P1 | PENDENTE |
| 4 | A | P1 | PENDENTE |
| 5 | A | P1 | PENDENTE |
| 6 | B | P2 | PENDENTE |
| 7 | B | P2 | PENDENTE |
| 8 | B | P2 | PENDENTE |
| 9 | B | P2 | PENDENTE |
| 10 | B | P2 | PENDENTE |
| 11 | C | P3 | PENDENTE |
| 12 | C | P3 | PENDENTE |
| 13 | C | P3 | PENDENTE |
| 14 | C | P3 | PENDENTE |
| 15 | D | P1 | PENDENTE |
| 16 | D | P1 | PENDENTE |
| 17 | D | P1 | PENDENTE |
| 18 | E | P3 | PENDENTE |
| 19 | E | P3 | PENDENTE |
| 20 | E | P3 | PENDENTE |
