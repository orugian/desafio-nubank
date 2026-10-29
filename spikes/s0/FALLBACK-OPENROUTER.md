# OpenRouter temporário — escolhido e chamado no spike; gate pendente

Escolha direta mais recente do responsável: usar `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, com uso pago autorizado e sem exigir teto monetário adicional. A escolha gratuita definitiva fica para depois. Não trocar silenciosamente por MiniMax ou outro modelo.

## Estado

- O [cliente exploratório](<spikes/s0/s0.mjs>) já suporta OpenRouter por fetch compatível com OpenAI e recebe provedor/modelo pela linha de comando. Não precisa de SDK ou dependência nova para esse id.
- [Configuração pública de referência](<spikes/s0/openrouter-temporario.env.example>): `LLM_PROVEDOR=openrouter` e `OPENROUTER_MODELO=deepseek/deepseek-v4.1-flash-1017`. Sem chave; nenhum arquivo de segredos foi editado ou copiado.
- Isso **não é integração no app nem implantação**. B4 exige M0 APROVADO e os contratos 1.0; nenhuma edição foi feita no repositório da S1.
- Os cinco casos foram executados no OpenRouter escolhido. Houve 1/5 acertos no verificador literal e 3/5 na revisão considerando equivalência decimal: CV-01 removeu evento inventado e CV-11 presumiu o meio de pagamento. Essas duas falhas não são de formatação. O gate permanece não atingido, sem alterar o verificador; veja o [relatório](<spikes/RESULTADO.md>).

## Compatibilidade conferida sem chamadas extras

O id indicado existe no [catálogo já gravado](<spikes/s0/respostas/openrouter-modelos.json#L598-L817>), originado da [API pública OpenRouter](https://openrouter.ai/api/v1/models).

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`.
- Ferramentas e `tool_choice` suportados; `tools` e `tool_choice: auto` continuam obrigatórios.
- Raciocínio é opcional, com esforço `none` suportado; o cliente S0 já envia `reasoning.enabled=false` no OpenRouter, conforme a [documentação](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).
- Preservar os cinco casos, o contexto e os esquemas; não inventar saída do motor nem usar resposta pronta para simular sucesso.

## Custo autorizado e controle de execução

O id **não é gratuito** no catálogo consultado. Preço-base: US$ 0,15 por milhão de tokens de entrada e US$ 0,60 por milhão de saída. As faixas horárias gravadas chegam a US$ 0,30 / US$ 1,20 por milhão. Não se garantiu preço futuro nem acesso a saldo/crédito pessoal.

O responsável autorizou explicitamente seguir no modelo pago e informou limite alto de desenvolvimento e delimitadores da própria API. Não pedir novamente teto de gasto para esta escolha. Não houve compra de créditos, cadastro de faturamento ou alteração de segredo: apenas uso da chave já disponibilizada no fluxo autorizado.

OpenRouter chegou a 16 requisições S0, contando uma listagem e 15 chat completions. A autorização para seguir foi interpretada como permitindo completar os cinco casos adicionais apesar do antigo teto exploratório 15; isso foi registrado no status. O limite local do cliente para esta rodada é 16 e agora conta a listagem. Ele não é um novo teto monetário nem autorização para contornar os limites do serviço. Nenhuma retentativa foi feita.

Recomendação de continuidade: manter o OpenRouter escolhido e replanejar ajustes de instruções/roteamento antes de nova validação do gate; não declarar sucesso a partir de latência baixa. B4/M1/B6 continuam sujeitos ao gate, e B4 também exige M0. B3a e B5 seguem independentes do modelo, dentro de seus próprios pré-requisitos.
