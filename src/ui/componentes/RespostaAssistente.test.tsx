// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { CartaoResposta, EstadoSessao } from '@/contratos';
import sessao from '@/contratos/exemplos/api-sessao-p1.json';
import cenario from '@/contratos/exemplos/cartao-comparacao-cr02.json';
import proposta from '@/contratos/exemplos/cartao-operacao-pendente-cr40.json';
import { RespostaAssistente } from './RespostaAssistente';
const estado=sessao.dados.estado as EstadoSessao;
function resposta(texto:string,cartoes:CartaoResposta[]){return render(<RespostaAssistente texto={texto} cartoes={cartoes} estado={estado} ocupado={false} aoExecutarAcao={vi.fn()} />)}
afterEach(cleanup);
test('resposta estruturada prioriza números e mantém texto integral acessível sem mutar dados',async()=>{
  const texto='Explicação completa com R$ 500,00, datas e ressalvas que não podem sumir.';
  const snapshot=JSON.stringify(estado);
  resposta(texto,[cenario.dados as CartaoResposta]);
  expect(screen.getByRole('heading',{name:'Seu planejamento'})).toBeVisible();
  expect(screen.getByText(texto)).not.toBeVisible();
  expect(screen.getByText(/^Primeira falta de/)).toBeVisible();
  await userEvent.click(screen.getByText('Explicação da Nina'));
  expect(screen.getByText(texto)).toBeVisible();
  expect(JSON.stringify(estado)).toBe(snapshot);
});
test('mensagem natural sem cartão permanece integral e visível',()=>{
  resposta('Qual é a data da compra?',[]);
  expect(screen.getByText('Qual é a data da compra?')).toBeVisible();
  expect(screen.queryByText('Explicação da Nina')).toBeNull();
});
test('pergunta de acompanhamento com cartão não é escondida',()=>{
  resposta('É uma compra nova ou já consta na fatura?',[cenario.dados as CartaoResposta]);
  expect(screen.getByText('É uma compra nova ou já consta na fatura?')).toBeVisible();
});
test('proposta, consentimento e erros nunca são recolhidos como análise',()=>{
  const texto='Há risco de faltar dinheiro. Confirma a movimentação simulada?';
  resposta(texto,[proposta.dados as CartaoResposta]);
  expect(screen.getByText(texto)).toBeVisible();
  expect(screen.getByRole('button',{name:'Confirmar'})).toBeVisible();
  expect(screen.queryByText('Explicação da Nina')).toBeNull();
});
test('cenário inconsistente não recebe zero fictício e todos os cenários permanecem presentes',()=>{
  const cartao=structuredClone(cenario.dados) as Extract<CartaoResposta,{tipo:'comparacao'}>;
  cartao.cenarios.push({...cartao.cenarios[0]!,cenario_id:'H2',nome:'Outra hipótese',status:'inconsistente',indicadores:null});
  resposta('Veja a comparação.',[cartao]);
  expect(screen.getByText('Outra hipótese')).toBeVisible();
  expect(screen.getByText('Cenário inconsistente')).toBeVisible();
});
