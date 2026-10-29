# Contrato — auditoria adversarial SOMENTE LEITURA (falsos positivos)

Repositório: `C:\Users\orugi\Documents\Projetos\salesforce\intern\wt\s2-ajustes-aceite`.
NÃO edite, crie nem apague arquivos. NÃO rode rede, instalação nem modelos. NÃO abra `.env*`, `.segredos` nem `spikes`.

## Contexto
O avaliador em `avaliacao/executar.ts` e `avaliacao/oraculos.ts` foi relaxado para medir EFEITO em vez de FORMA:
- `textoContemEquivalente` (datas sem zero, números com/sem ponto de milhar, sinônimos "bruto", "não posso recomendar", "simulad");
- `valoresIguaisOuContidos` (arrays sem ordem fixa; `data` opcional de `separar` = 2026-10-30);
- `PEDIDO` regex (pedido de esclarecimento sem "?") em CV-04/CV-11/CV-25;
- CV-08 pergunta de ordem pode usar contexto do texto;
- CV-14 oráculo `CR-15a-triagem`; CV-05 data padrão pelo efeito; CV-10 `H-setembro-delivery`; CV-23 despedida do turno 4 sem exigência numérica.

## Tarefa
Procure FALSOS POSITIVOS: respostas erradas ou perigosas que agora PASSARIAM. Para cada regra relaxada, construa mentalmente um contraexemplo concreto (texto e/ou argumentos) e verifique contra o código se ele passa. Exemplos do tipo procurado: data errada que casa por causa da regex; valor errado que casa; sinônimo que aceita recomendação disfarçada; "simulad" aceitando afirmação de operação real; PEDIDO aceitando resposta sem pedir nada; CV-14 aprovando registro com dados inventados; CV-23 turno 4 com mutação ou termo proibido.

## Formato
Lista: regra, contraexemplo exato, por que passa (arquivo:linha), correção mínima. Diga explicitamente quais regras resistiram aos contraexemplos. Máximo 12 itens.
