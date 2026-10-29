# S2 — Inventário visual do B5

28/10/2026 · Preparação permitida enquanto falta M0. Somente layout; nenhuma implementação ou mudança de contrato.

## 1. Limites e procedência

- Foram abertas apenas as doze referências permitidas relacionadas abaixo, pelos nomes exatos.
- Não foram transcritos nomes de pessoas, estabelecimentos, atendentes, mensagens, saudações, quantias, limites, taxas, saldos, números de conta ou datas pessoais das imagens.
- Não foi aberta a captura proibida. A verificação de existência no caminho exato indicado retornou ausente.
- Nenhuma imagem foi copiada, recortada, derivada, incorporada ao projeto ou enviada como contexto ao modelo da aplicação.
- Medidas CSS e cores a seguir são **estimativas visuais iniciais**, não amostragem exata de pixels. Conferir lado a lado no B5, sem transformar conteúdo das imagens em dados de teste.
- Todo conteúdo financeiro, nomes fictícios, datas e mensagens exibidos virá da VisaoApp, de exemplos do contrato ou de textos. A referência não fornece conteúdo.

## 2. Referências efetivamente inspecionadas

| Tela | Referências | Evidência usada |
|---|---|---|
| Home | [Topo](<nuscore_app_mobile/IMG_2103.PNG>), [rolagem intermediária](<nuscore_app_mobile/IMG_2107.PNG>), [rolagem inferior](<nuscore_app_mobile/IMG_2108.PNG>) | Cabeçalho roxo, atalhos, blocos brancos, cartões neutros e barra flutuante |
| Conta/extrato | [Primeira aba](<nuscore_app_mobile/IMG_2105.PNG>), [segunda aba e histórico](<nuscore_app_mobile/IMG_2106.PNG>) | Navegação branca, controle segmentado, total central, círculos de ação, cartões com borda e linhas de histórico |
| Cartão/faturas | [Resumo](<nuscore_app_mobile/IMG_2104.PNG>), [composição da fatura](<nuscore_app_mobile/visao_fatura_fechada.PNG>), [lista de gastos](<nuscore_app_mobile/visao_gastos_fatura.PNG>) | Total à esquerda, barra vertical estreita à direita, botões pill, atalhos e lista agrupada |
| Caixinhas/investimentos | [Resumo centralizado](<nuscore_app_mobile/IMG_2106.PNG>), [carteira](<nuscore_app_mobile/IMG_2109.PNG>), [rolagem inferior](<nuscore_app_mobile/IMG_2110.PNG>) | Dois padrões de total, cartões largos, seção secundária, carrossel e item ativo da navegação |
| Chat | [Estrutura geral](<nuscore_app_mobile/IMG_2114.PNG>), [rolagem](<nuscore_app_mobile/IMG_2115.PNG>) | Cabeçalho branco, fechar à esquerda, fundo cinza, bolhas e compositor fixo |

Não foram abertas as referências de funções fora do escopo nem quaisquer outros arquivos de imagem.

## 3. Estrutura global

- Coluna móvel centralizada de até 430 px também no desktop. Fundo externo neutro e conteúdo com largura integral da coluna.
- Base visual branca; divisão de seções por linhas cinza muito claras, sem grade de dashboard desktop.
- Margens laterais dominantes de aproximadamente 24 px; em algumas listas e no chat, aproximadamente 16 px.
- Rolagem vertical contínua. Carrosséis e fileiras de atalhos mantêm rolagem horizontal dentro da coluna, sem provocar overflow da página.
- Espaço inferior suficiente para barra flutuante, NewAI e safe area. O último controle deve permanecer alcançável.
- Não desenhar um aparelho, relógio, bateria ou status bar fictícia. Usar safe-area-inset quando aplicável; preservar o fundo da região, não a interface do sistema operacional. **Suposição de apresentação**, sem mudança de aceite funcional.
- Não presumir que todas as telas tenham a navegação flutuante: ela está evidente na Home e em investimentos; detalhes de conta/cartão usam navegação de retorno. O botão NewAI é global por requisito.

## 4. Cores propostas

Valores iniciais CSS, a validar manualmente; não são quantias ou taxas das imagens.

| Token | Proposta | Uso |
|---|---|---|
| brand-primary | #820AD1 | Cabeçalhos, links, ícones ativos, botões de destaque |
| brand-deep | #5B168F | Superfícies roxas de destaque sem conteúdo promocional real |
| brand-soft | #F3E9FB | Fundo de item ativo, ícone e badge discretos |
| brand-panel | #E3DFFD | Bloco informativo de tom lavanda |
| surface | #FFFFFF | Telas, bolhas da assistente e cartões claros |
| surface-muted | #F0F0F0 | Atalhos, pílulas, campos e fundo do chat |
| border-subtle | #EEEEEE | Divisão de seção, tabela e contorno leve |
| text-primary | #111111 | Títulos e texto principal |
| text-secondary | #646464 | Metadados, subtítulos e controles secundários |
| chat-outgoing | #A6A6A6 | Bolha da pessoa, preservando contraste |
| chat-date | #BDBDBD | Pequeno separador central de conversa |
| semantic-green | #259E56 | Segmento visual e informação positiva, nunca autorização de gasto |
| semantic-red | #F65758 | Informação de fatura/alerta, nunca sugestão de operação real |
| semantic-blue | #459BCA | Segmento visual secundário |
| semantic-orange | #DB791C | Segmento visual secundário |
| neutral-banner | #F2E5C6 | Faixa neutra em lugar de benefício promocional real |

Não reutilizar automaticamente a cor de um indicador para sugerir que uma operação é segura. Restrições, insuficiência e proteção precisam de texto, não só cor.

## 5. Tipografia e ícones

- Família proposta: Inter, livre, com fallback system-ui e sans-serif. Não baixar fonte proprietária. Nenhuma fonte foi instalada ou baixada nesta preparação.
- Alternativa conservadora caso a fonte exija nova dependência: usar a fonte livre já prevista no projeto, com aprovação de dependência se necessária. Não instalar pacote adicional fora do processo.
- Estilo predominantemente sem serifa, baixo contraste, boa altura de x e títulos de peso médio/seminegrito.
- Escala inicial: metadados 12–14 px; corpo e controles 15–16 px; títulos de seção 20 px; destaque intermediário 24–28 px; total central 34–36 px.
- Pesos: 400 para corpo, 500 para controles/subtítulos, 600 para títulos e destaques. Entrelinha aproximada de 1,4–1,5 no chat e 1,2 em destaques.
- Quantias prontas do motor com alinhamento estável e tabular-nums quando apropriado; nenhuma reprodução de quantia da referência.
- Ícones de lucide-react: traço simples, aproximadamente 22–24 px, strokeWidth próximo de 2. Não extrair desenhos ou logos de prestadores das imagens.
- Candidatos visuais: UserRound, Eye, HelpCircle, Menu, ChevronLeft, ChevronRight, X, ArrowUpDown, DollarSign, Smartphone, Send, Search, ReceiptText, Wallet, PiggyBank, ShieldCheck, Link e Plus.

## 6. Espaçamento, geometria e elevação

| Elemento | Estimativa inicial CSS |
|---|---|
| Unidade de espaçamento | 4 px; usar passos de 8/12/16/24/32 px |
| Padding lateral de seção | 24 px |
| Padding interno de cartão | 16–24 px |
| Distância entre seções | 24–32 px, além do divisor |
| Círculo de atalho principal | 64–72 px |
| Avatar principal | 48 px |
| Avatar de linha/lista | 40–48 px |
| Raio de cartão amplo | 20–24 px |
| Raio de bolha | 16–20 px, com canto inferior do lado de origem menos arredondado |
| Botão/controle pill | Raio integral, altura aproximada 40–48 px |
| Área mínima interativa | 44 × 44 px, sem reduzir alvos para copiar aparência |
| Controle segmentado | Aproximadamente 48 px de altura; duas metades iguais |
| Barra inferior flutuante | Cerca de 204 px × 64 px, três itens; raio integral |
| Compositor de chat | Campo pill perto de 56 px de altura, dentro de rodapé branco |

- Sombras muito discretas: aba ativa, cabeçalho do chat e barra inferior. Evitar sombra em todos os cartões.
- Cartões podem ser planos cinza ou brancos com contorno fino; não misturar as variantes indiscriminadamente.
- Badge pequeno e pill, deslocado sobre a borda inferior do círculo quando a estrutura exige. Seu conteúdo será do contrato, nunca de promoção/quantia real.

## 7. Componentes reutilizáveis previstos

1. **Moldura móvel:** largura máxima, safe area e contenção das camadas flutuantes.
2. **Faixa de protótipo:** discreta e sempre visível em todas as telas, inclusive chat e operação simulada; conteúdo exclusivamente de textos.
3. **Cabeçalho de marca:** avatar à esquerda e conjunto de ícones à direita sobre roxo.
4. **Cabeçalho de detalhe:** branco, retorno à esquerda e ações à direita; controles com nomes acessíveis.
5. **Cabeçalho de seção:** título e chevron alinhados, corpo opcional abaixo; área tocável sem prometer função inexistente.
6. **Atalho circular:** ícone, círculo, rótulo curto abaixo, badge opcional; fileira horizontal.
7. **Botão pill:** primário, secundário e estado desabilitado claramente distinto.
8. **Cartão de conteúdo:** variante plana, variante com borda e variante lavanda; nenhuma arte promocional original.
9. **Controle segmentado:** duas abas, trilho cinza e seleção branca com sombra leve. Sem mudar medidas ao selecionar.
10. **Navegação flutuante:** três ícones; ativo sobre disco lavanda. Centralizada na coluna, não no desktop inteiro.
11. **Botão NewAI:** separado da navegação existente, flutua sem esconder ações. Abre camada sobre a tela atual; fechar preserva tela e rolagem.
12. **Tabela compartilhada:** uma base para histórico, faturas e investimentos, com alinhamento de metadados e valores; apresentação móvel pode usar linhas empilhadas. Não duplicar lógica financeira por tela.
13. **Linha de histórico:** ícone genérico à esquerda, texto/metadados no centro, destaque alinhado à direita; agrupamento e divisores leves.
14. **Bolha de conversa:** assistente branca à esquerda, pessoa cinza à direita; mensagem de sistema com aparência própria, não disfarçada de assistente.
15. **Compositor:** campo flexível, enviar à direita, foco e desabilitação perceptíveis; altura não invade conteúdo.
16. **Cartão de comparação/operação:** respeita tipografia e superfície das telas, mas não deriva números nem regras das imagens.

## 8. Receitas por tela — ordem do B5

### 8.1 Home

- Cabeçalho roxo, avatar e ícones em uma linha; região de texto da persona usa somente os dados fictícios.
- Abaixo: faixa neutra estreita, bloco de informação principal à esquerda com chevron, chips horizontais, atalhos circulares e cartão largo cinza.
- Seções seguintes em branco, separadas por divisores; destaque de cartão e avisos mantêm hierarquia sem copiar conteúdo.
- Blocos promocionais tornam-se superfícies neutras. Carrossel mantém tamanho, raio e espaçamento, não fotos, marcas ou chamadas comerciais da captura.
- Barra inferior flutuante com três ícones e espaço reservado no fim da página.
- Funções inexistentes preservam o lugar visual, mas mostram somente textos.nao_disponivel ao toque. Nenhuma promoção de crédito será transcrita.

### 8.2 Chat

- Camada dentro da moldura móvel. Cabeçalho branco fixo, título central e fechar à esquerda, com divisor/sombra discreta.
- Fundo cinza claro; mensagens roláveis; separador central opcional e bolhas com largura aproximada de 82–85% da área útil.
- Bolha da assistente alinhada à esquerda; da pessoa à direita; espaçamento externo próximo de 12 px. Rótulo do emissor e metadados só do estado fictício/textos.
- Composer branco fixo no fundo, com margem lateral de aproximadamente 24 px e campo cinza arredondado; ícone enviar roxo.
- Histórico preservado em sessionStorage; sugestões do contrato no estado vazio.
- Estado pendente bloqueia envio/ações; erro de sistema é distinto da prosa do modelo. Não copiar transcrição ou simular atendimento humano.

### 8.3 Caixinhas/investimentos

- Resumo de carteira com cabeçalho roxo: título e total à esquerda, ação pill à direita.
- Dois cartões largos cinza, depois fileira de atalhos; divisão para cartões com borda e outros produtos.
- Variante de resumo centralizado usa cabeçalho branco e o mesmo controle segmentado da Conta, destaque central e badge discreto abaixo.
- Caixinhas, carteira e outros produtos mantêm agrupamento visual, mas posições, proteção, fonte e disponibilidade vêm exclusivamente da VisaoApp.
- Cards promocionais de produto/taxa da captura não se tornam ofertas, posições fictícias extras ou sugestões de investimento.
- Barra flutuante evidencia o item central quando a tela corresponde a investimentos.

### 8.4 Conta/extrato

- Cabeçalho branco com retorno e ações; abaixo, controle segmentado com duas metades iguais.
- Total central grande e subtítulo secundário; ampla separação vertical antes da fileira de círculos.
- Cartões brancos com borda arredondada, seção de informação separada e cartões neutros informativos.
- Seção de pagamentos e histórico usa listas com iconografia genérica, alinhamento de valores e agrupamento por data do estado fictício.
- Campo de busca pill cinza, sem copiar lançamentos da referência. Filtros e dados apenas conforme o contrato.

### 8.5 Cartão/faturas

- Cabeçalho branco com retorno e ações. Bloco de resumo com subtítulo secundário, destaque à esquerda e metadados empilhados.
- Barra vertical segmentada muito estreita à direita, extremidades arredondadas e separadores claros. Não inventar proporções/indicadores financeiros; usar só dados disponíveis no contrato. Sem dados suficientes, registrar pendência em vez de simular número.
- Dois botões pill lado a lado; indicadores de página abaixo; fileira de círculos e cartões cinza na sequência.
- Lista de lançamentos agrupada, com divisores, ícones genéricos e a mesma base tabular do histórico/investimentos.
- Recursos de crédito fora do escopo são inertes com aviso do contrato; não oferecem crédito, alteração de limite ou pagamento real.

### 8.6 Como funciona

Não há referência visual própria autorizada. Reutilizar cabeçalho de detalhe, seções, cartões neutros e tipografia acima. Mostrar config, regras, fontes e rastro do contrato, sem inventar navegação/tela comercial além do escopo.

## 9. Marca, acessibilidade e segurança

- Marca da demonstração isolada na pasta prevista; modo neutro não importa logo nem nome da marca no pacote. Não recortar logos das imagens.
- Faixa de protótipo também acompanha a mensagem/cartão de operação simulada. Nunca simular operação real por aparência.
- Usar roles e nomes acessíveis para abas, botões, diálogo e campos. Foco visível, navegação por teclado e retorno do foco ao fechar o chat.
- Respeitar contraste de texto em cinza e bolhas; ajustar tons se necessário sem alterar hierarquia.
- NewAI e navegação não podem cobrir compositor, confirmar/cancelar ou última linha de tabela.
- Textos e números vindos do contrato; nenhum dado da captura vira fixture, literal de teste ou conteúdo de exemplo.
- Sem screenshot em src, public, documentação do app ou pacote publicado. As referências ficam somente no diretório externo autorizado.

## 10. Conferência prevista no B5

- [x] Inventário das cinco telas e dos estados de rolagem permitidos, sem conteúdo pessoal.
- [ ] Implementar um comportamento por ciclo TDD, na ordem Home → Chat → investimentos → Conta → Cartão → Como funciona.
- [ ] Comparar visualmente na mesma largura lógica; calibrar cores, escala, proporção e espaçamento sem transcrever dados.
- [ ] Conferir foco, rolagem, alvos interativos e ausência de sobreposição das camadas.
- [ ] Exercitar estados vazio, enviando, falha, proposta pendente e operação simulada usando os exemplos do contrato.
- [ ] Testar pela interface pública com Testing Library, por papel/texto; não testar classe CSS ou estado interno.
- [ ] Conferir o modo neutro no pacote e revisar src/public contra as referências antes de merge.

**Suposições registradas:** tokens estimados visualmente; fonte livre proposta sem download; não reproduzir chrome do sistema operacional; detalhe de conta/cartão sem navegação flutuante adicional quando não visível nas referências. Nenhuma delas altera números, contratos ou aceite funcional.
