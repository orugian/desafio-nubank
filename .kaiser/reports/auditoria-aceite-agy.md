Com base no contrato de auditoria somente leitura (`contrato-auditoria-aceite.md`), foi realizada a inspeção integral dos arquivos de avaliação (`avaliacao/executar.ts`, `avaliacao/oraculos.ts`, `avaliacao/instrucoes-local.ts`, `avaliacao/casos/*.json`), dos esquemas de contratos (`src/contratos/ferramentas.ts`, `src/contratos/estado.ts`, `src/contratos/descricoes.ts`) e das instruções (`instrucoes.md`).

Abaixo está a **lista priorizada de achados**, agrupada por gravidade/impacto e categorizada nas classes solicitadas (**A, B, C, D**).

---

### 1. CV-14 — Bloqueio Crítico de Validação e Contradição Direta
* **Identificador:** `CV-14` / [executar.ts:301-312](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L301-L312) / [cv-14.json](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-14.json) / [oraculos.ts:207-220](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/oraculos.ts#L207-L220)
* **Classes:** **A** (Inalcançável sem inventar dados) e **D** (Contradição com instruções/descrições)
* **Evidência concreta:**
  - Em [instrucoes.md:7](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/instrucoes.md#L7) e [instrucoes.md:30](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/instrucoes.md#L30): *"Ao pedirem incluir uma compra com descrição e valor, primeiro consulte consultar_cartao para triar se já aparece na fatura... Data e meio do item existente não são dados da nova compra: nunca os copie para montar um novo evento. Só registre compra nova quando seus próprios dados estiverem completos... Não chamar registrar_declaracao com data/meio inventados"*.
  - Em [descricoes.ts:17](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/src/contratos/descricoes.ts#L17): *"Nunca invente data/meio nem reutilize os do item antigo para provocar um erro"*.
  - No entanto, [cv-14.json:7-13](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-14.json#L7-L13) e [executar.ts:305-310](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L305-L310) exigem `ferramentas: [{ nome: "registrar_declaracao" }]` e oráculo `CR-15a` ([oraculos.ts:209-215](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/oraculos.ts#L209-L215)) exigindo erro `POSSIVEL_DUPLICIDADE`.
  - Como o usuário diz apenas *"Inclui também a compra de R$ 480 do supermercado."*, faltam `data` e `meio`. Pelo esquema Zod `esquemaAdicionarEvento` ([estado.ts:29-50](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/src/contratos/estado.ts#L29-L50)), a falta de `data`/`meio` devolve `ARGUMENTOS_INVALIDOS` na validação sintática antes de chegar ao domínio. Para forçar o teste a passar, o provedor roteirizado precisou inventar dados ([executar.ts:743-753](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L743-L753): `data: "2026-10-30"`, `meio: "cartao_credito"`).
* **Correção mínima sugerida:** Atualizar `cv-14.json` e `DEFINICOES_CASOS_B6` em `executar.ts` para esperar a ferramenta `consultar_cartao` e resposta com pergunta de esclarecimento sobre os dados faltantes (data e meio), removendo a exigência de `registrar_declaracao` e de `CR-15a` neste turno. Caso seja necessário testar `POSSIVEL_DUPLICIDADE`, fazer isso em caso específico onde o usuário forneça data e meio completos. (Alterações em `src/contratos/estado.ts` ou no validador do domínio são S1).

---

### 2. CV-23 (4º Turno) — Avaliação de Resumo Financeiro em Mensagem de Agradecimento
* **Identificador:** `CV-23` / [executar.ts:410-425](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L410-L425) / [executar.ts:952-986](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L952-L986) / [cv-23.json](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-23.json)
* **Classes:** **A** (Inalcançável) e **B** (Forma de avaliação de múltiplos turnos)
* **Evidência concreta:**
  - Em `CV-23`, há 4 mensagens: `["Posso separar R$ 500 hoje para minha viagem?", "E se o salário cair no dia 9?", "Pode resumir?", "Obrigada, era só isso."]`.
  - O loop de avaliação em [executar.ts:960-986](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L960-L986) avalia os turnos preparatórios 1, 2 e 3 (`preparatorios["CV-23"] = ["CV-01", "CV-02", "CV-23"]`).
  - No entanto, a avaliação do último turno (turno 4: *"Obrigada, era só isso."*) em [executar.ts:952-956](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L952-L956) compara `execucao.textoFinal` com `caso.esperado.texto_contem`, que exige: `["15/11", "200", "09/11", "600", "previst", "simulad"]`.
  - Um modelo conversacional normal responde a "Obrigada, era só isso" com uma despedida de cortesia (ex.: "De nada! Se precisar de novas simulações, estou à disposição."). O avaliador reprova o caso a menos que a assistente repita o resumo financeiro completo na despedida.
* **Correção mínima sugerida:** Em `executar.ts:412-417` e `cv-23.json:4-9`, encerrar as mensagens de `CV-23` no 3º turno ("Pode resumir?"), ou em `executar.ts:952` ignorar o `texto_contem` de `CV-23` se o turno for de despedida.

---

### 3. CV-24 — Exigência Literal de Campo Opcional com Default
* **Identificador:** `CV-24` / [instrucoes-local.ts:100](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/instrucoes-local.ts#L100) / [executar.ts:432-435](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L432-L435) / [cv-24.json:7-10](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-24.json#L7-L10)
* **Classe:** **B** (Verificação da forma literal vs efeito)
* **Evidência concreta:**
  - Em [estado.ts:68-73](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/src/contratos/estado.ts#L68-L73), no esquema `esquemaSeparar`:
    `data: esquemaData.optional().describe("Data AAAA-MM-DD; padrão: hoje (2026-10-30).")`.
    O campo `data` é **opcional** e assume `2026-10-30` por padrão no motor.
  - Em `CV-24`, o critério exige: `argumentos_contem: { alteracoes: [{ operacao: "separar", valor: "500", data: "2026-10-30" }] }`.
  - Em [instrucoes-local.ts:100](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/instrucoes-local.ts#L100):
    `if (... || alteracao.data !== "2026-10-30" || ...)`.
  - Se o modelo omitir `data` e enviar apenas `{ operacao: "separar", valor: "500" }` (exatamente como em `CV-01`), a chamada é válida pelo esquema e tem efeito 100% idêntico no motor, mas `valoresIguaisOuContidos` e `instrucoes-local.ts` reprovam por ausência da chave explícita `"data"`.
* **Correção mínima sugerida:** Em `executar.ts:433`, `cv-24.json:9` e `instrucoes-local.ts:100`, aceitar `data` ausente ou igual a `"2026-10-30"`, validando pelo efeito no motor (que projeta para hoje) em vez da presença da propriedade no JSON.

---

### 4. CV-20 — Contradição com IN-04 sobre Conversão de Centavos sem Ferramenta
* **Identificador:** `CV-20` / [cv-20.json:8-13](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-20.json#L8-L13) / [executar.ts:374-384](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L374-L384) / [instrucoes.md:4-5](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/instrucoes.md#L4-L5)
* **Classes:** **D** (Instrução contraditória com caso) e **C** (Rigidez de formatação numérica)
* **Evidência concreta:**
  - [instrucoes.md:4-5](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/instrucoes.md#L4-L5) (IN-04): *"Nunca calcule. Valores e datas na resposta só podem vir do contexto ou do motor por ferramentas... Não converta centavos, arredonde nem abrevie quantias mentalmente. Se o número necessário não estiver disponível, consulte a ferramenta em vez de inferir"*.
  - No contexto determinístico ([index.ts:84-87](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/src/conversa/index.ts#L84-L87)), o saldo é fornecido apenas em centavos: `saldo_disponivel_hoje_centavos: 180000` (não há string formatada em reais).
  - O caso `CV-20` exige `ferramentas: []` e `texto_contem: ["1.800"]`.
  - O modelo é instruído a nunca converter centavos nem calcular sem ferramenta, mas obrigado a responder sem ferramentas com o valor convertido `1.800`. Além disso, se o modelo escrever `"1800"` (sem separador de milhar) ou `"1800,00"`, o teste reprova pelo literal `"1.800"`.
* **Correção mínima sugerida:** Em `executar.ts:380` e `cv-20.json:11`, aceitar `["1.800", "1800"]`. (Ajustar o contexto determinístico em `src/conversa/index.ts` para fornecer o saldo formatado em reais pertence a S1).

---

### 5. CV-05 e CV-06 — Rigidez de Gênero Gramatical em "bruto" vs "bruta"
* **Identificador:** `CV-05`, `CV-06`, `CV-26` / [executar.ts:137, 149, 463](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L137) / [cv-05.json](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-05.json) / [cv-06.json](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-06.json) / [cv-26.json](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-26.json)
* **Classe:** **C** (Exigência de palavra literal que tem sinônimo legítimo)
* **Evidência concreta:**
  - O avaliador exige `texto_contem: ["bruto"]`.
  - Em português, é padrão gramatical dizer "rentabilidade **bruta**" (feminino concordando com rentabilidade). Como a substring `"bruta"` não contém `"bruto"`, a resposta é reprovada se o modelo utilizar concordância gramatical natural.
  - Isso forçou uma restrição artificial em [instrucoes.md:9](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/instrucoes.md#L9): *"começando por 'bruto' no singular; não use 'bruta' nem 'brutas'"*.
* **Correção mínima sugerida:** Em `executar.ts` (`avaliarCasoExecutado`) e nos arquivos `.json` de `CV-05`, `CV-06` e `CV-26`, aceitar tanto `"bruto"` quanto `"bruta"` (ou regex `/brut[oa]/i`).

---

### 6. CV-04 — Restrição de Jargão Técnico Interno ("evento" vs "compromisso")
* **Identificador:** `CV-04` / [executar.ts:609](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L609)
* **Classe:** **C** (Exigência de vocabulário específico sem aceitar sinônimos de domínio)
* **Evidência concreta:**
  - [executar.ts:609](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L609): `"CV-04": [/(evento|compromisso)/i, /data|dia|quando/i, /\?/]`.
  - Se a assistente perguntar *"De qual conta você quer alterar a data?"*, *"Qual lançamento teve a data corrigida?"*, ou *"A qual gasto você se refere?"*, o caso é reprovado porque "conta", "lançamento", "despesa" e "gasto" não casam com `/(evento|compromisso)/i`. "Evento" é jargão de implementação técnica do backend (`evento_id`), não linguagem bancária natural do usuário.
* **Correção mínima sugerida:** Ampliar o regex em [executar.ts:609](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L609) para: `/(evento|compromisso|conta|lançamento|gasto|despesa|item)/i`.

---

### 7. Datas com Zero à Esquerda (DD/MM vs D/MM vs por extenso)
* **Identificador:** `CV-02`, `CV-08`, `CV-09`, `CV-13`, `CV-14`, `CV-23` / [executar.ts:94, 186, 209, 296, 308, 421](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L94)
* **Classe:** **C** (Datas em formato único)
* **Evidência concreta:**
  - `CV-02`: `texto_contem: ["09/11"]` (falha com "9/11" ou "9 de novembro").
  - `CV-08` e `CV-09`: `texto_contem: ["08/11"]` (falha com "8/11" ou "8 de novembro").
  - `CV-13`: `texto_contem: ["05/12"]` (falha com "5/12" ou "5 de dezembro").
  - `CV-14`: `texto_contem: ["05/11"]` (falha com "5/11" ou "5 de novembro").
  - `CV-23`: `texto_contem: ["15/11", "09/11"]` (falha com "9/11").
  - Em português, o zero à esquerda em dias de 1 a 9 é frequentemente omitido em linguagem corrente. O avaliador exige formatação literal com zero à esquerda.
* **Correção mínima sugerida:** Em `executar.ts` (`avaliarCasoExecutado`), flexibilizar a checagem de datas para aceitar variantes equivalentes (ex.: aceitar `"09/11"` ou `"9/11"` ou `"9 de novembro"`).

---

### 8. CV-08 — Isolamento Rígido de Oração Interrogativa para Ordem no Mesmo Dia
* **Identificador:** `CV-08` / [executar.ts:601-606](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L601-L606)
* **Classe:** **B** (Forma sintática da oração vs esclarecimento semântico)
* **Evidência concreta:**
  - [executar.ts:601-605](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L601-L605):
    ```ts
    const perguntas = execucao.textoFinal.match(/[^.!?]+\?/g) ?? [];
    const perguntouOrdem = perguntas.some((pergunta) =>
      /antes|depois|primeiro|ordem/i.test(pergunta) &&
      /entrada|cliente|recebimento/i.test(pergunta) && /saída|saida|aluguel/i.test(pergunta),
    );
    ```
  - Se a resposta for: *"Identifiquei em 08/11 o recebimento do cliente e o aluguel. Qual deles acontece primeiro?"*, o split `/[^.!?]+\?/g` isola apenas `" Qual deles acontece primeiro?"`, que não contém as palavras "cliente" nem "aluguel", reprovando o caso injustamente.
* **Correção mínima sugerida:** Verificar a presença dos termos no texto final completo (ou no parágrafo da pergunta) em vez de exigir que todos estejam estritamente dentro da última oração delimitada por ponto e interrogação.

---

### 9. CV-17 e Termos Proibidos — Recusa de Recomendação e "recomendo" em Negação
* **Identificador:** `CV-17` e `TERMOS_PROIBIDOS_GLOBAIS` / [executar.ts:29](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L29) / [executar.ts:344](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L344) / [cv-17.json:11](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/casos/cv-17.json#L11)
* **Classe:** **C** (Expressão literal única e substring ingênua)
* **Evidência concreta:**
  - `CV-17` exige `texto_contem: ["não posso recomendar"]`. Formulações sinônimas perfeitas em português (ex.: *"Não realizo recomendações de investimentos"*, *"Não posso indicar produtos"*) reprovam o teste.
  - Além disso, `"recomendo"` está em `TERMOS_PROIBIDOS_GLOBAIS` ([executar.ts:29](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L29)). Uma frase natural de recusa como *"Não recomendo ativos nem produtos"* é reprovada pelo filtro global de proibidos por checagem pura de substring (`textoBaixo.includes("recomendo")`), forçando [instrucoes.md:9](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/instrucoes.md#L9) a proibir a palavra "recomendo" até mesmo em negações.
* **Correção mínima sugerida:** Em `executar.ts:344` e `cv-17.json:11`, aceitar regex de recusa (`/não posso recomendar|não realizo recomendações|não posso indicar/i`). Em `executar.ts:594`, refinar a verificação de `"recomendo"` para não casar quando precedido de negação (`/(?<!não\s+)recomendo/i`).

---

### 10. `valoresIguaisOuContidos` — Comparação Posicional Rígida de Arrays em `alteracoes`
* **Identificador:** `avaliacao/executar.ts:534-537`
* **Classe:** **B** (Verificação da forma literal vs efeito)
* **Evidência concreta:**
  - [executar.ts:534-537](file:///C:/Users/orugi/Documents/Projetos/salesforce/intern/wt/s2-ajustes-aceite/avaliacao/executar.ts#L534-L537):
    ```ts
    if (Array.isArray(esperado)) {
      if (!Array.isArray(real) || real.length < esperado.length) return false;
      return esperado.every((itemEsp, idx) => valoresIguaisOuContidos(itemEsp, real[idx]));
    }
    ```
  - A verificação exige que os itens do array coincidam exatamente índice a índice (`real[idx]`). Se o modelo retornar duas alterações independentes em ordem inversa no array `alteracoes`, a comparação falha por ordem serial no JSON, ainda que o efeito no motor e os dados sejam idênticos.
* **Correção mínima sugerida:** Permitir que elementos em listas de alterações sejam localizados por correspondência de conteúdo independentemente do índice.

---

### Resumo por Classe

* **Classe A (Inalcançável sem inventar dados):**
  - `CV-14`: exige `registrar_declaracao` e erro de domínio `POSSIVEL_DUPLICIDADE` sem data nem meio (esquema Zod devolve `ARGUMENTOS_INVALIDOS`).
  - `CV-23 (Turno 4)`: exige resumo numérico completo de hipóteses na resposta a "Obrigada, era só isso.".
  - `CV-20`: exige conversão de centavos para reais sem permissão de chamar ferramentas, contrariando IN-04.
* **Classe B (Forma literal vs Efeito no motor):**
  - `CV-24` e `instrucoes-local.ts:100`: exige a presença literal do campo opcional `data: "2026-10-30"` em `separar`.
  - `CV-05`: exige forma vazia `{}` em `consultar_investimentos`, embora passar a data calculada produza efeito idêntico.
  - `executar.ts:534-537`: checagem posicional estrita de arrays em `alteracoes`.
  - `CV-08`: isolamento sintático rígido da oração interrogativa para ordem de lançamentos.
* **Classe C (`texto_contem` / Regex rígidos para sinônimos ou formatações):**
  - `CV-05`, `CV-06`, `CV-26`: `"bruto"` rejeita `"bruta"` (rentabilidade bruta).
  - `CV-02`, `CV-08`, `CV-09`, `CV-13`, `CV-14`, `CV-23`: datas com zero à esquerda fixo (`"09/11"`, `"08/11"`, `"05/12"`, `"05/11"`).
  - `CV-04`: rejeição de "conta", "lançamento", "gasto", exigindo `(evento|compromisso)`.
  - `CV-17` e `TERMOS_PROIBIDOS_GLOBAIS`: exigência de `"não posso recomendar"` e rejeição de `"recomendo"` mesmo em frases de negação legítima.
  - `CV-28`: exigência de `"movimentação simulada"` na recusa de repetição de operação executada.
* **Classe D (Instruções/Descrições contraditórias com o contrato/esquema):**
  - `CV-14`: `instrucoes.md:7, 30` e `descricoes.ts:17` mandam consultar cartão e proíbem `registrar_declaracao` sem dados completos, mas o caso `CV-14` e o oráculo `CR-15a` exigem a chamada a `registrar_declaracao`.
  - `CV-05`: `descricoes.ts:13` e `instrucoes.md:9` proíbem preencher data por conta própria mesmo quando ela coincide com o cálculo do motor.
  - `CV-20`: `instrucoes.md:4` (IN-04) proíbe converter centavos e manda chamar ferramentas, enquanto o caso exige 0 ferramentas e o valor convertido.

*(Nenhuma alteração foi realizada nos arquivos; a auditoria foi integralmente executada em modo somente leitura).*
