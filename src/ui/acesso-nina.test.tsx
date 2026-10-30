// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,test} from 'vitest';
import {AppNewAI} from './AppNewAI';
import {criarClienteExemplos} from './cliente-api';
afterEach(()=>{cleanup();sessionStorage.clear()});
test('acesso Nina pertence aos cabeçalhos nativos, não à faixa técnica, e abre chat em cada tela',async()=>{
 const user=userEvent.setup();
 render(<AppNewAI cliente={criarClienteExemplos()} />);
 await user.click(await screen.findByRole('button',{name:/Bia \(fictícia\)/}));
 const verificar=async()=>{
  const abrir=screen.getByRole('button',{name:'Abrir chat com a Nina (NewAI)'});
  expect(abrir.closest('header')).not.toBeNull();
  expect(abrir.closest('.newai-topbar')).toBeNull();
  await user.click(abrir);
  expect(screen.getByRole('heading',{name:'Nina',level:1})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Fechar chat'}));
  expect(abrir).toHaveFocus();
 };
 await verificar();
 for(const aba of ['Investimentos','Conta e extrato','Início']){
  await user.click(screen.getByRole('button',{name:aba}));
  await verificar();
 }
 await user.click(screen.getByRole('button',{name:'Meus cartões'}));
 await verificar();
 await user.click(screen.getByRole('button',{name:'Como funciona'}));
 await verificar();
});
