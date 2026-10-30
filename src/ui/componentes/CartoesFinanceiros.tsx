import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { formatarData, formatarDiaMes, formatarPercentual, formatarReais, type CartaoResposta } from '@/contratos';
import s from './Financeiro.styles';

type TipoFinanceiro = 'simulacao_investimento' | 'pix_credito' | 'simulacao_parcelamento' | 'comparativo_investimento';
export type CartaoFinanceiro = Extract<CartaoResposta, { tipo: TipoFinanceiro }>;
export function AvisoFinanceiro({ children }: { children: ReactNode }) {
  return <div className={s.warning}><TriangleAlert size={16} aria-hidden="true" /><p>{children}</p></div>;
}
export function DetalhesFinanceiros({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <details className={s.disclosure}><summary>{titulo}</summary><div>{children}</div></details>;
}
function Linha({ nome, children }: { nome: ReactNode; children: ReactNode }) {
  return <div className={s.row}><dt>{nome}</dt><dd>{children}</dd></div>;
}

export function CartoesFinanceiros({ cartao }: { cartao: CartaoFinanceiro }) {
  if (cartao.tipo === 'simulacao_investimento') {
    const r = cartao.resultado;
    const taxa = r.indexador === 'cdi' ? `${r.cdi_pct}% do CDI` : `prefixado ${r.taxa_aa_pct?.replace('.', ',')}% a.a.`;
    return <section className={s.card} aria-label="Simulação de investimento">
      <h2>Simulação · {taxa}</h2>
      <p className={s.label}>Valor final líquido em {formatarData(r.fim)}</p>
      <div className={`${s.lead} ${s.accent}`}>{formatarReais(r.valor_final_liquido_centavos)}</div>
      <p className={s.note}>Sobre {formatarReais(r.valor_centavos)} aplicados em {formatarDiaMes(r.inicio)}.</p>
      <dl className={s.rows}>
        <Linha nome="Rendimento líquido">{formatarReais(r.rendimento_liquido_centavos)}</Linha>
        <Linha nome="Rentabilidade líquida">{formatarPercentual(r.rentabilidade_liquida_pct)}</Linha>
      </dl>
      <p className={s.note}>Projeção estimada, não garantia de retorno.</p>
      <DetalhesFinanceiros titulo="Ver impostos e premissas">
        <dl className={s.rows}>
          <Linha nome="Rendimento bruto">{formatarReais(r.rendimento_bruto_centavos)}</Linha>
          <Linha nome={`IOF (${formatarPercentual(r.aliquota_iof_pct)})`}>{formatarReais(r.iof_centavos)}</Linha>
          <Linha nome={`IR (${formatarPercentual(r.aliquota_ir_pct)})`}>{formatarReais(r.ir_centavos)}</Linha>
          <Linha nome="Prazo">{r.dias_corridos} dias<small>{r.dias_uteis} dias úteis</small></Linha>
          {r.cdi_data_ref && <Linha nome="Referência CDI">{formatarData(r.cdi_data_ref)}</Linha>}
        </dl>
        <p className={s.note}>{r.rotulo}</p>
      </DetalhesFinanceiros>
    </section>;
  }
  if (cartao.tipo === 'pix_credito') {
    const r = cartao.resultado;
    const ultima = r.cronograma.at(-1);
    return <section className={s.card} aria-label="Simulação de Pix no crédito">
      <h2>Pix no crédito · {formatarReais(r.valor_centavos)} em {r.parcelas}x</h2>
      <p className={s.label}>Parcela simulada</p>
      <div className={s.lead}>{r.parcelas}× {formatarReais(r.parcela_centavos)}</div>
      {ultima && ultima.valor_centavos !== r.parcela_centavos && <p className={s.note}>Última parcela: {formatarReais(ultima.valor_centavos)}.</p>}
      <dl className={s.rows}>
        <Linha nome="Total pago">{formatarReais(r.total_pago_centavos)}</Linha>
        <Linha nome="Custo do crédito"><span className={s.negative}>{formatarReais(r.custo_total_centavos)}</span></Linha>
      </dl>
      {!r.saldo_suficiente ? <AvisoFinanceiro>Saldo em conta insuficiente: faltam {formatarReais(r.falta_saldo_centavos)}.</AvisoFinanceiro> : <p className={s.note}>Há saldo em conta para este Pix; no crédito há juros.</p>}
      {r.excede_limite && <AvisoFinanceiro>O total passa do limite disponível do cartão ({formatarReais(r.limite_disponivel_centavos)}).</AvisoFinanceiro>}
      <p className={s.note}>Juros {r.juros_am_pct.replace('.', ',')}% a.m. ({r.juros_origem === 'premissa' ? 'premissa do protótipo' : 'informado'})</p>
      <p className={s.note}>CET {formatarPercentual(r.cet_am_pct)} a.m. · {formatarPercentual(r.cet_aa_pct)} a.a.</p>
      <DetalhesFinanceiros titulo="Ver parcelas e encargos">
        <dl className={s.rows}>
          <Linha nome="IOF">{formatarReais(r.iof_centavos)}</Linha>
          <Linha nome="Juros totais">{formatarReais(r.juros_total_centavos)}</Linha>
        </dl>
        <div className={s.tableWrap}><table className={s.table}>
          <caption className="sr-only">Cronograma de parcelas do Pix no crédito</caption>
          <thead><tr><th>Parcela</th><th>Vencimento</th><th className={s.number}>Valor</th></tr></thead>
          <tbody>{r.cronograma.map(p=><tr key={p.numero}><td>{p.numero}/{r.parcelas}</td><td>{formatarDiaMes(p.vencimento)}</td><td className={s.number}>{formatarReais(p.valor_centavos)}</td></tr>)}</tbody>
        </table></div>
        <p className={s.footnote}>{r.rotulo}</p>
      </DetalhesFinanceiros>
    </section>;
  }
  if (cartao.tipo === 'comparativo_investimento') {
    const r = cartao.resultado;
    const linhas = [{ id:'real', nome:'Seu investimento', ...r.real, diferenca_centavos:undefined as number | undefined }, ...r.alternativas];
    const maior = Math.max(0,...linhas.map(l=>l.valor_centavos));
    return <section className={s.card} aria-label="Comparativo de investimentos">
      <h2>Comparativo · {r.posicao.nome}</h2>
      <p className={s.note}>{formatarReais(r.aplicado_centavos)} aplicados desde {formatarDiaMes(r.inicio)} · {r.dias_corridos} dias</p>
      <div role="list" aria-label="Valores dos investimentos">{linhas.map(l=><div key={l.id} role="listitem" className={s.option}>
        <div>{l.nome}{r.melhor === l.id && <small>Maior valor na comparação</small>}</div>
        <div className={s.number}><strong>{formatarReais(l.valor_centavos)}</strong><small>{formatarReais(l.resultado_centavos)} · {formatarPercentual(l.rentabilidade_pct)}</small></div>
        {maior > 0 && <div className={s.bar} style={{gridColumn:'1 / -1'}} aria-hidden="true"><span style={{width:`${l.valor_centavos / maior * 100}%`}} /></div>}
      </div>)}</div>
      <p className={s.footnote}>{r.rotulo}</p>
      {r.real.rotulo_estimativa && <p className={s.footnote}>{r.real.rotulo_estimativa}</p>}
      <DetalhesFinanceiros titulo="Ver diferenças e referências">
        <dl className={s.rows}>{r.alternativas.map(a=><Linha key={a.id} nome={`${a.nome} × seu investimento`}>{a.diferenca_centavos > 0 ? '+' : ''}{formatarReais(a.diferenca_centavos)}</Linha>)}</dl>
        <p className={s.note}>CDI de {formatarData(r.cdi_data_ref)} · {r.dias_uteis} dias úteis.</p>
      </DetalhesFinanceiros>
    </section>;
  }
  const r=cartao.resultado;
  return <section className={s.card} aria-label="Comparação de pagamento à vista e parcelado">
    <h2>À vista ou parcelado · {formatarReais(r.valor_centavos)}</h2>
    <p className={s.note}>Juros {r.juros_am_pct.replace('.', ',')}% a.m. ({r.juros_origem === 'premissa' ? 'premissa do protótipo' : 'informado'}).</p>
    <div className={s.option}><div>À vista{r.a_vista_centavos !== r.valor_centavos && <small>Desconto de {formatarPercentual(r.desconto_a_vista_pct)}</small>}{r.menor_custo === 'a_vista' && <small className={s.accent}>Menor valor hoje (CDI)</small>}</div><strong className={s.number}>{formatarReais(r.a_vista_centavos)}</strong></div>
    <div role="list" aria-label="Opções de parcelamento simuladas">{r.opcoes.map(o=><div key={o.parcelas} role="listitem" className={s.option}>
      <div>{o.parcelas} parcelas{r.menor_custo === o.parcelas && <small className={s.accent}>Menor valor hoje (CDI)</small>}</div>
      <div className={s.number}><strong>{formatarReais(o.parcela_centavos)}</strong><small>Total {formatarReais(o.total_pago_centavos)}</small></div>
    </div>)}</div>
    {r.entrada_centavos > 0 && <p className={s.footnote}>Entrada no parcelado: {formatarReais(r.entrada_centavos)}.</p>}
    <p className={s.note}>A comparação de custo considera o CDI, não só o total pago.</p>
    <DetalhesFinanceiros titulo="Ver custos e premissas">
      {r.opcoes.map(o=><section key={o.parcelas} aria-label={`Detalhes de ${o.parcelas} parcelas`}>
        <h3>{o.parcelas} parcelas</h3><dl className={s.rows}>
          <Linha nome="Última parcela">{formatarReais(o.ultima_parcela_centavos)}</Linha>
          <Linha nome="Juros totais">{formatarReais(o.juros_total_centavos)}</Linha>
          <Linha nome="Valor hoje (CDI)">{formatarReais(o.valor_presente_centavos)}</Linha>
          <Linha nome="Custo vs. à vista">{formatarReais(o.custo_vs_a_vista_centavos)}</Linha>
          <Linha nome="Vantagem vs. à vista (CDI)">{formatarReais(o.vantagem_vs_a_vista_centavos)}</Linha>
          <Linha nome="CET mensal">{formatarPercentual(o.cet_am_pct)}</Linha>
          {o.comprometimento_renda_pct !== null && <Linha nome="Comprometimento da renda">{formatarPercentual(o.comprometimento_renda_pct)}</Linha>}
        </dl>
      </section>)}
      <p className={s.note}>Valor hoje (CDI): quanto as parcelas valem hoje a {formatarPercentual(r.cdi_mensal_pct)} a.m. (CDI de {formatarData(r.cdi_data_ref)}, bruto).</p>
      {r.renda_liquida_mensal_centavos !== null && <p className={s.footnote}>Renda líquida considerada: {formatarReais(r.renda_liquida_mensal_centavos)}.</p>}
      <ul className={s.footnote}>{r.premissas.map(p=><li key={p}>{p}</li>)}</ul>
      <p className={s.footnote}>{r.rotulo}</p>
    </DetalhesFinanceiros>
  </section>;
}
