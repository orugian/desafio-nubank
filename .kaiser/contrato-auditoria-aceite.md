# Contrato — auditoria SOMENTE LEITURA (classe de problema de aceite B6)

Repositório: `C:\Users\orugi\Documents\Projetos\salesforce\intern\wt\s2-ajustes-aceite` (Next.js/TypeScript).
NÃO edite, crie nem apague arquivos. NÃO rode comandos que façam rede, instalem pacotes ou chamem modelos. NÃO abra `.env`, `.env.local`, `.segredos` nem a pasta `spikes`.

## Problema já identificado (2 instâncias)
O avaliador em `avaliacao/` (executar.ts, oraculos.ts, casos/*.json) exige do modelo algo que o CONTRATO das ferramentas não permite ou que não é necessário para o resultado correto:
1. CV-14 ("Inclui também a compra de R$ 480 do supermercado.", sem data nem meio): o caso exige `registrar_declaracao` + erro `POSSIVEL_DUPLICIDADE`. Mas `adicionar_evento` em `src/contratos/estado.ts` exige `data` e `meio`; sem eles a validação devolve `ARGUMENTOS_INVALIDOS` antes do domínio checar duplicidade. Ou seja: o aceite exige algo inalcançável sem inventar dados.
2. CV-05: o avaliador exige `consultar_investimentos` SEM `ate_data`, mas passar `ate_data` igual à data padrão que o motor usaria produz resultado idêntico. O critério olha a forma do argumento, não o efeito.

## O que procurar (mesma classe)
Para CADA caso em `avaliacao/casos/*.json` e nas definições `DEFINICOES_CASOS_B6` de `avaliacao/executar.ts`, e para cada ramo de `verificarOraculoB6` em `avaliacao/oraculos.ts`, e para os critérios especiais em `avaliarCasoExecutado`:
A. A ferramenta/argumento exigido é alcançável a partir SÓ da mensagem do usuário + contexto, respeitando os esquemas Zod de `src/contratos/ferramentas.ts` e `src/contratos/estado.ts` (campos obrigatórios, enums, refinements)? Liste qualquer caso onde o modelo precisaria inventar um campo obrigatório.
B. O critério verifica a FORMA literal de argumentos (ex.: string "500" vs "500.00", presença/ausência de campo opcional, ordem) em vez do EFEITO no estado/motor? Liste quando dois argumentos semanticamente equivalentes seriam tratados diferente.
C. `texto_contem` / regex exigem palavra literal que tem sinônimo legítimo (ex.: "bruto" vs "bruta"), ou datas em formato único (15/11 vs 15/11/2026)?
D. Instruções (`instrucoes.md`) ou descrições (`src/contratos/descricoes.ts`) que mandam o modelo fazer algo contraditório com o contrato/esquema (ex.: pedir campo que não existe, ou mandar perguntar algo e ao mesmo tempo chamar ferramenta).

## Formato da resposta
Lista priorizada. Para cada item: id do caso (ou arquivo:linha), classe (A/B/C/D), evidência concreta (trecho/linha), e correção mínima sugerida. Diga "nenhum" para classes sem achados. Não sugira mudar contratos/domínio (pasta src/contratos exceto descricoes.ts, src/dominio, src/conversa/executores): apenas aponte como "S1".
