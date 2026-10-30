// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { formatarPercentual, formatarReais, type CartaoResposta, type EstadoSessao } from '@/contratos';
import exemplo from '@/contratos/exemplos/cartao-simulacao-parcelamento.json';
import sessao from '@/contratos/exemplos/api-sessao-p1.json';
import { CartaoChat } from './componentes/CartaoChat';
type CartaoParcelamento = Extract<CartaoResposta,{tipo:'simulacao_parcelamento'}>;
function renderizar(cartao:CartaoParcelamento) { return render(<CartaoChat cartao={cartao} estado={sessao.dados.estado as EstadoSessao} ocupado={false} aoExecutarAcao={vi.fn()} />); }
afterEach(cleanup);
describe('cartão simulacao_parcelamento',()=>{
  test('todas as opções mostram parcela e total; custos e renda permanecem acessíveis na expansão',async()=>{
    const cartao=exemplo.dados as CartaoParcelamento;
    const r=cartao.resultado;
    renderizar(cartao);
    expect(screen.getByRole('heading',{name:`À vista ou parcelado · ${formatarReais(r.valor_centavos)}`})).toBeVisible();
    const lista=screen.getByRole('list',{name:'Opções de parcelamento simuladas'});
    const linhas=within(lista).getAllByRole('listitem');
    expect(linhas).toHaveLength(r.opcoes.length);
    r.opcoes.forEach((o,i)=>{
      expect(within(linhas[i]!).getByText(`${o.parcelas} parcelas`)).toBeVisible();
      expect(within(linhas[i]!).getByText(formatarReais(o.parcela_centavos))).toBeVisible();
      expect(within(linhas[i]!).getByText(`Total ${formatarReais(o.total_pago_centavos)}`)).toBeVisible();
    });
    expect(screen.getAllByText('Menor valor hoje (CDI)')).toHaveLength(1);
    expect(within(lista).queryByText('Menor valor hoje (CDI)')).toBeNull();
    expect(screen.getByText(r.rotulo)).not.toBeVisible();
    await userEvent.click(screen.getByText('Ver custos e premissas'));
    expect(screen.getByText(r.rotulo)).toBeVisible();
    for(const o of r.opcoes){
      const detalhes=screen.getByRole('region',{name:`Detalhes de ${o.parcelas} parcelas`});
      expect(within(detalhes).getByText(formatarReais(o.valor_presente_centavos))).toBeVisible();
      expect(within(detalhes).getByText(formatarReais(o.ultima_parcela_centavos))).toBeVisible();
      if(o.comprometimento_renda_pct !== null) expect(within(detalhes).getByText(formatarPercentual(o.comprometimento_renda_pct))).toBeVisible();
    }
    expect(screen.queryByText(/recomend/i)).toBeNull();
  });
  test('destaca só a opção do motor e não inventa comprometimento sem renda',async()=>{
    const base=exemplo.dados as CartaoParcelamento;
    renderizar({...base,resultado:{...base.resultado,menor_custo:12,renda_liquida_mensal_centavos:null,opcoes:base.resultado.opcoes.map(o=>({...o,comprometimento_renda_pct:null}))}});
    const lista=screen.getByRole('list',{name:'Opções de parcelamento simuladas'});
    const linha12=within(lista).getByText('12 parcelas').closest('[role=listitem]') as HTMLElement;
    expect(within(linha12).getByText('Menor valor hoje (CDI)')).toBeVisible();
    expect(screen.getAllByText('Menor valor hoje (CDI)')).toHaveLength(1);
    await userEvent.click(screen.getByText('Ver custos e premissas'));
    expect(screen.queryByText('Comprometimento da renda')).toBeNull();
    expect(screen.queryByText(/Renda líquida considerada/)).toBeNull();
    expect(screen.queryByText(/Desconto de 0,00%/)).toBeNull();
  });
});
