# Revisão do M0 pela S2

28/10/2026 13:50 · H1,33 · commit da main conferido: ffda30b.

## Autorização e conclusão

O responsável autorizou expressamente a S2 a conferir o B0 e registrar o M0 se aprovado. A auditoria não alterou código, contratos, dependências ou exemplos da S1.

**M0 aprovado e registrado em [MARCOS](<coordenacao/MARCOS.md>).** Aprovação restrita ao B0/M0: não libera o gate do modelo, M1, B6 ou mudanças futuras nos contratos.

## Evidências

- Main limpa antes e depois da verificação; commit permaneceu ffda30b. Nenhum merge foi realizado pela S2.
- `npm test`: **82 testes verdes em 5 arquivos**.
- `npm run typecheck`: **ok**.
- Varredura de segredos na main, incluindo arquivos não rastreados e excluindo ignorados pelo git: **vazia**. Somente caminhos seriam exibidos em caso de achado, nunca linhas potencialmente sensíveis.
- Avisos não impeditivos do Vite sobre carregamento futuro de configuração e resolução de caminhos foram observados. Não foram ocultados nem provocaram falha; a configuração compartilhada não foi alterada.

## Critérios conferidos

1. [Scripts e dependências](<newai/package.json>): Next.js, React, TypeScript, Vitest, Testing Library, Playwright, tsx, zod, decimal.js, lucide-react e comandos previstos no plano.
2. [Contratos comuns](<newai/src/contratos/comum.ts>): versão 1.0, calendário fixo, feriados, limites, centavos inteiros e formato monetário decimal em texto.
3. [Registro de esquemas](<newai/src/contratos/index.ts>) e [testes de exemplos](<newai/src/contratos/exemplos.test.ts>): exemplos das três visões (P2 sem cartão), onze cartões, quatro rotas, falhas F-01 a F-06, domínio e aviso F-07. Exemplos inválidos rejeitados.
4. [Ferramentas](<newai/src/contratos/ferramentas.ts>) e [testes](<newai/src/contratos/ferramentas.test.ts>): doze esquemas, doze argumentos de exemplo, onze ferramentas P0 por padrão e P1 opt-in; valor inválido e entrada com cartão rejeitados.
5. [Porta de conversa](<newai/src/contratos/conversa.ts>): provedor NVIDIA/OpenRouter/roteirizado, roteiro por turno, executores, validarEstado, montarVisao e compararCenarios. Nenhuma implementação de domínio foi fingida.
6. [HTTP](<newai/src/contratos/http.ts>): requisições e respostas das rotas, sessão versão zero com config, ação por operacao_id, falhas tipadas e F-07 como aviso.
7. [Mercado](<newai/src/contratos/mercado.ts>): esquemas de CDI, fechamentos e snapshot; URLs de fonte sem chave na query.
8. [Textos](<newai/src/contratos/textos.ts>): faixa de protótipo, premissas, sugestões, indisponibilidade, confirmações/cancelamentos e operação explicitamente simulada.
9. [Calendário](<newai/src/dominio/calendario/calendario.test.ts>): D+0/D+1/D+2, treze dias úteis de CR-32 e vinte dias de CR-30 sem o feriado passado, pela interface pública.
10. [Dados de P1](<newai/src/dados/dados.test.ts>): saldo, compromissos, fatura A derivada, posições, carga e invariantes aplicáveis à persona mínima, sem mock do motor.

## Conferência semântica dos exemplos críticos

- [CR-01 e CR-02](<newai/src/contratos/exemplos/cartao-comparacao-cr02.json>): situação atual e hipótese de separação; saldo zerado, falta de 20000 centavos em 15/11, final e contrapartida sem recebimentos coerentes com a spec.
- [CR-04](<newai/src/contratos/exemplos/cartao-o-que-mudou-cr04.json>): correção de C, com diferenças nos cenários atual e H1 conforme a spec.
- [CR-06](<newai/src/contratos/exemplos/cartao-investimentos-cr06.json>): valor total de teste 183000 centavos; protegido 100000, não resgatável 50000, resgatável 33000; disponibilidade e rótulos coerentes com o caso de teste.
- [CR-32](<newai/src/contratos/exemplos/cartao-rendimento-cr32.json>): treze dias úteis e rendimento bruto de teste 326 centavos, sem cálculo pelo modelo.
- [CR-41](<newai/src/contratos/exemplos/cartao-operacao-concluida-cr41.json>): movimento explicitamente simulado, descarte de H1/H2 e saldo disponível 130000 centavos; resposta de ação com pendente zerada e hipóteses vazias.
- Valores de mercado nos exemplos estão identificados como dados de teste; não foram confundidos com as respostas públicas coletadas no B3a.

## Limites desta aprovação

- B0 entrega contratos, calendário, dados mínimos e corpos de funções ainda não implementados. Não é aprovação dos motores futuros, de idempotência em B4/B1c ou da avaliação real B6.
- Histórico completo e invariantes dependentes dele continuam para o B2, conforme o escopo e o status da S1.
- ITUB4 nos exemplos é provisório/de teste. A coleta da brapi escolheu PETR4; o responsável atualiza a spec, e a S1 ajusta a persona real no B2 conforme o processo.
- O modelo OpenRouter escolhido continua com o gate S0 pendente; essa condição não bloqueia a S1 de iniciar B1 após M0.
