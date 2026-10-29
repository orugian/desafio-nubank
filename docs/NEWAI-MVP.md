# NewAI — Base de produto do MVP

**Atualizado:** 28/10/2026 · **Mercado:** Brasil, pessoa física.  
**Estado:** recorte de produto aceito; specs, plano TDD e implementação ainda pendentes.  
**Entrega:** manhã de 30/10/2026, America/Sao_Paulo. Nome NewAI provisório.

> **Entender antes de agir:** uma conversa para relacionar saldo, compromissos, recebimentos e liquidez antes de separar dinheiro.

## 1. Problema e decisão

**Pergunta central:** “Considerando meus compromissos até o próximo recebimento, o que acontece se eu separar este valor hoje?”

Saldo em conta não é necessariamente dinheiro descomprometido; investimentos não são necessariamente recursos disponíveis no período; sobra no fim do mês não impede insuficiência antes de um vencimento.

**Decisão:** uma interface conversacional com capacidades de consulta, simulação de caixa e interpretação limitada de liquidez. Um modelo e ferramentas específicas, sem plataforma multiagente.

**Base exploratória:** na conta do responsável, o chat respondeu sobre crédito e faturas, mas encaminhou para humano pedidos de planejamento, inclusive um cenário fictício delimitado. O responsável relatou cerca de 20 minutos sem retorno. Era exploração, não dificuldade financeira pessoal. Isso não comprova prevalência, descumprimento de SLA ou ausência de funcionalidade equivalente em todo o aplicativo.

**Diferencial a validar:** compreender consequências, corrigir premissas e comparar cenários com menos esforço que uma tela estática. Não é a novidade do chat nem a quantidade de agentes.

## 2. Usuário e jornada prioritária

**Usuário:** cliente PF que quer separar dinheiro para um objetivo, mas precisa compreender o efeito sobre compromissos próximos.

1. Entra na NewAI pela home conceitual.
2. Informa o objetivo; a conversa usa um cenário inteiramente fictício.
3. A assistente consulta os dados disponíveis e pergunta o que falta.
4. Apresenta a projeção cronológica e eventuais compromissos sem cobertura.
5. O usuário altera uma despesa ou data; a simulação é atualizada.
6. Se perguntar sobre investimentos, a assistente explica somente a liquidez informada e respeita a reserva protegida.
7. Encerra com resultado verificável, premissas, pendências e limites de atuação.

## 3. Escopo do MVP

| Capacidade | Comportamento esperado |
|---|---|
| Entrada e conversa | Home mínima, chat em português, mensagens novas e histórico preservado. |
| Contexto financeiro | Consultar saldo, compromissos, recebimentos, objetivo e restrições do cenário fictício. |
| Projeção de caixa | Calcular a evolução por datas, primeiro compromisso sem cobertura e insuficiência acumulada. |
| Simulação incremental | Acrescentar ou corrigir valores e datas sem perder o contexto; mostrar o que mudou. |
| Liquidez de investimentos | Consultar posições fictícias e condições fornecidas; distinguir patrimônio de recursos utilizáveis. |
| Explicação verificável | Exibir tabela ou linha do tempo, origem dos dados, premissas e informação faltante. |
| Saída de segurança | Reconhecer limites, priorizar relatos urgentes e preparar resumo para atendimento, sem afirmar envio real. |

**Sugestões de entrada:** “Posso separar dinheiro?”, “Simular um imprevisto” e “Entender meus recursos disponíveis”. O usuário não escolhe agentes.

**Fora do MVP:** recomendação individualizada de ativos, cálculo histórico completo de rentabilidade, rebalanceamento, tributos, vendedor autônomo, renegociação, concessão de crédito, pagamentos, resgates, aplicações, integrações bancárias reais, autenticação bancária e suporte completo.

## 4. Regras de domínio e confiança

- **Saldo atual:** caixa liquidado no estado fictício; não inclui limite de cartão nem investimento ainda não resgatado.
- **Recebimento futuro:** continua sendo previsão, mesmo quando informado com convicção; não integra o saldo já disponível.
- **Projeção:** representa as entradas e saídas fornecidas, ordenadas no tempo. Valor negativo significa falta de cobertura no cenário, não cheque especial ou operação autorizada.
- **Margem do cenário:** é condicional aos compromissos informados; nunca equivale a autorização ou garantia de que se pode gastar ou investir.
- **Dados faltantes:** perguntar por valor, data ou condição necessária; não completar com suposições ocultas.
- **Estados separados:** preservar dados-base, declarações do usuário e hipóteses alternativas. Uma simulação não reescreve fatos do cenário-base.
- **Investimentos:** não inferir disponibilidade pelo nome do produto ou saldo. Usar a condição e a data de disponibilização fornecidas; informar quando forem desconhecidas.
- **Reserva protegida:** não tratar como recurso livre nem sugerir seu comprometimento contra a restrição declarada. Exibir a restrição no resultado.
- **Dupla contagem:** uma compra incluída na fatura não pode virar outra saída de caixa além do pagamento dessa fatura.
- **Cálculos:** valores monetários em centavos ou decimal exato; resultados produzidos e verificados por ferramentas determinísticas, não pela geração textual.
- **Segurança:** não pedir dados reais ou credenciais; não inferir renda, segmento ou perfil de investidor pela conversa. Suspender abordagem comercial em situações urgentes.
- **Transparência:** sinalização permanente de protótipo e dados fictícios. Nunca afirmar consulta bancária, operação executada ou encaminhamento enviado.
- **Falha técnica:** preservar o histórico e declarar a indisponibilidade; não substituir a conversa ao vivo por respostas prontas disfarçadas.

## 5. Cenário de referência — totalmente fictício

| Evento | Data do cenário | Valor |
|---|---|---:|
| Saldo inicial | Dia 1 | R$ 1.800 |
| Compromisso A | Dia 5 | R$ 700 |
| Compromisso B | Dia 10 | R$ 600 |
| Despesa essencial C | Dia 15 | R$ 200 |
| Recebimento previsto | Dia 20 | R$ 3.000 |

**Pedido:** separar R$ 500 no dia 1.

- Sem separar: o saldo mínimo antes do recebimento é R$ 300.
- Separando: no dia 10 o saldo chega a zero; no dia 15 faltam R$ 200.
- Se o recebimento ocorrer no dia 9, a insuficiência desaparece neste conjunto de eventos. Se isso for apenas uma possibilidade, manter e distinguir os dois cenários.
- Pergunta adicional: “Tenho dinheiro aplicado. Posso contar com ele?” A resposta depende dos metadados fictícios de liquidez e da restrição de reserva; sem esses dados, pedir esclarecimento.

Esses números são referência de validação, não respostas pré-roteirizadas. Mensagens novas devem produzir resultados coerentes.

## 6. Arquitetura de referência

```text
Home conceitual → Chat → Um LLM
                           ↕
                Contexto fictício compartilhado
                Consulta + cálculo determinístico
                Histórico + registro de alterações
                           ↓
                   Resultado verificável
```

**Diretrizes:** execução local, provedor/modelo com opção gratuita e sem ativação de faturamento, instruções visíveis e editáveis, funções financeiras pequenas e testáveis. Sem RAG, banco vetorial ou agentes independentes.

| Real no protótipo pretendido | Simulado | Evolução, não integração prometida |
|---|---|---|
| Conversa, continuidade, consultas aos dados de teste, cálculo e atualização de cenários. | Home bancária, cliente, saldos, compromissos, investimentos e liquidez. | Acesso autorizado a sistemas bancários e carteira real. |

Escolha de stack, provedor, modelo, persistência e contrato das ferramentas será fechada nas specs/plano após verificar disponibilidade gratuita. Chaves não ficam no navegador nem nos registros apresentados.

## 7. Critérios de aceite para as specs

| ID | Resultado observável |
|---|---|
| AC-01 | Recebe mensagens novas, mantém o contexto e responde em português. |
| AC-02 | Identifica corretamente a data e a insuficiência do cenário de referência. |
| AC-03 | Recalcula após uma alteração e distingue hipótese de informação confirmada no cenário. |
| AC-04 | Solicita dados necessários ausentes; não inventa saldo, datas, condições ou elegibilidade. |
| AC-05 | Preserva a reserva protegida e não considera investimento indisponível como caixa imediato. |
| AC-06 | Não duplica compras e fatura nem trata saldo projetado negativo como crédito disponível. |
| AC-07 | Mostra premissas e números verificáveis; não promete recomendação de ativo ou operação real. |
| AC-08 | Em falha ou pedido fora do escopo, informa o limite, preserva o histórico e não simula sucesso. |

**Gate de validação:** todos os critérios aprovados, conversa ao vivo com variações não ensaiadas, acesso gratuito verificado e ausência de dados reais. Vídeo de backup não substitui a conversa ao vivo.

## 8. Valor e validação

- **Utilidade:** comparar conversa e visualização estática com os mesmos dados fictícios; observar compreensão, conclusão da tarefa, esforço, tempo e capacidade de corrigir premissas.
- **Segurança:** o participante deve distinguir projeção de garantia financeira. Interpretar a margem como autorização irrestrita é falha a corrigir.
- **CSAT:** hipótese de menor esforço e maior clareza na interação; impacto potencial médio, confiança baixa.
- **NPS e retenção:** hipóteses indiretas, ainda sem efeito medido; exigem piloto e acompanhamento posteriores.
- **Limite da avaliação:** teste pequeno ou demonstração bem-sucedida não comprova melhoria dos indicadores do banco.

## 9. Evoluções condicionais — não fazem parte do aceite do MVP

**Regra de entrada:** só especificar ou implementar após validar o MVP, preservar tempo de ensaio/backup e confirmar disponibilidade restante. Não incluir antecipadamente dependências, telas ou código dessas evoluções.

### E1. Analista de investimentos: consulta e cenários

- Consultar posições e movimentos fictícios de uma carteira; numa evolução real, acesso autorizado e dados completos seriam necessários.
- Explicar resultado desde o aporte, distinguindo capital, aportes adicionais, retiradas, proventos, custos e resultado bruto/líquido conforme os dados disponíveis.
- Projetar cenários de produtos como Tesouro Selic e fundos, com hipóteses explícitas de prazo, liquidez, retorno, custos e riscos. Não pressupor que essas categorias sejam isentas de risco ou universalmente adequadas.
- Para “guardar ou investir?”, comparar consequências sobre caixa, objetivo e horizonte; não escolher automaticamente um produto ou percentual.
- Não emitir recomendação individualizada, indicar tickers/criptoativos, prometer retorno, executar operações ou usar um aviso legal para disfarçar recomendação efetiva. Perfil de investidor não substitui dados e adequação necessários.

**Gate próprio:** metodologia de rentabilidade definida, dados suficientes, cenários conferidos, fontes atualizadas e limites de orientação explícitos.

### E2. Assistente contábil/tributário: estimativas explicáveis

- Estimar possíveis obrigações tributárias apenas para tipos de operação e regras explicitamente suportados, sempre com dados fictícios no desafio.
- Identificar residência fiscal, período/ano de referência, categoria do rendimento, custo de aquisição, movimentos e retenções já realizadas.
- Distinguir entrada em conta de renda tributável, aporte de rendimento e resgate de principal de ganho. Não tributar automaticamente toda movimentação.
- Separar imposto estimado, imposto retido, eventual valor a recolher e obrigação de declarar. Nem todo tributo é apurado somente ao fim do ano.
- Usar regras oficiais vigentes e versionadas; informar dados ausentes e situações não cobertas. Não entregar declaração, gerar/recolher guias ou apresentar estimativa como apuração fiscal definitiva.

**Gate próprio:** escopo fiscal restrito, regras e periodicidades verificadas, cálculos de referência independentes e revisão especializada antes de qualquer uso real. Não substituir profissional contábil/tributário.

## 10. Sequência de trabalho

1. **Documento-base:** este arquivo registra o recorte aceito e separa MVP de evolução.
2. **Specs:** detalhar comportamentos, termos do domínio, contratos de dados/ferramentas, mensagens, cenários e critérios de aceite.
3. **Plano via TDD:** priorizar comportamentos e interfaces observáveis; obter aprovação antes de implementar.
4. **Implementação:** fatias verticais com um ciclo **RED → GREEN → REFACTOR por comportamento**, não todos os testes primeiro e todo o código depois.
5. **Validação:** testes de domínio/integração, avaliação do LLM com mensagens novas, ensaio, até cinco slides e gravação de backup.
6. **Expansão:** avaliar E1 e depois E2 somente se o gate do MVP e o prazo permitirem.

**A fechar nas specs:** horizonte e referência de datas; eventos no mesmo dia; estados de recebimentos e hipóteses; semântica de separação de dinheiro; representação mínima de liquidez; persistência/reset de cenários; indisponibilidade do modelo. O plano deverá considerar horas efetivamente disponíveis, não apenas tempo corrido até a entrega.

## Referências

- [Desafio oficial](../challenge/Challenge_AI_Builder_Interns_Nu_BR.md) — regras e avaliação.
- [Capturas do aplicativo](../nuscore_app_mobile/) — descoberta; dados reais não serão reutilizados no protótipo.
- [Pesquisa de oportunidades](../pesquisa/Relatorio-Oportunidades-IA-Conversacional-Nubank.md), [pesquisa de bloqueios](../relatorio-oportunidades-ia-nubank.md) e [pesquisa de golpes](../PESQUISA_OPORTUNIDADES_NUBANK.md) — insumos históricos, não autoridade sobre o recorte aceito.
- [Assistente de Pagamentos do Nubank](https://nubank.com.br/nu/conta/assistente-de-pagamentos) — oferta existente a distinguir da simulação proposta.
- [CVM: suitability](https://www.gov.br/investidor/pt-br/investir/antes-de-investir/respeite-o-seu-perfil-de-investidor/entenda-o-suitability) — referência para os limites da evolução de investimentos.
