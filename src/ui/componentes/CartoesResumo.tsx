import { formatarData, formatarDiaMes, formatarPercentual, formatarReais, textos, type CartaoResposta } from '@/contratos';
import { DetalhesFinanceiros } from './CartoesFinanceiros';
import s from './Financeiro.styles';
type Resumo = Extract<CartaoResposta,{tipo:'investimentos'|'imposto_renda'|'o_que_mudou'}>;
const NOMES: Record<string,string> = {status:'Situação',saldo_minimo_centavos:'Menor saldo',data_saldo_minimo:'Data do menor saldo',primeira_falta_data:'Primeira falta',primeira_falta_valor_centavos:'Valor da primeira falta',insuficiencia_centavos:'Falta de cobertura',margem_hoje_centavos:'Margem',saldo_final_centavos:'Saldo final',sem_recebimentos_insuficiencia_centavos:'Falta sem recebimentos',sem_recebimentos_saldo_final_centavos:'Saldo final sem recebimentos'};
function valorIndicador(chave:string, valor:number|string|null) {
  if(valor === null) return '—';
  if(chave.endsWith('_centavos') && typeof valor==='number') return formatarReais(valor);
  if(typeof valor==='string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return formatarDiaMes(valor);
  return String(valor);
}
export function CartoesResumo({cartao}:{cartao:Resumo}) {
  if(cartao.tipo==='o_que_mudou') return <section className={s.card} aria-label="O que mudou">
    <h2>O que mudou</h2>
    {cartao.alteracoes.map(a=><p key={a.id}>{a.descricao} <span className={s.note}>({a.id})</span></p>)}
    <DetalhesFinanceiros titulo="Ver alterações nos cenários">
      {cartao.cenarios.map(c=><div key={c.cenario_id}><h3>{c.nome} ({c.situacao})</h3>
        <dl className={s.rows}>{c.diferencas.map(d=><div className={s.row} key={d.indicador}><dt>{NOMES[d.indicador] ?? d.indicador}</dt><dd>{valorIndicador(d.indicador,d.antes)}<small>para {valorIndicador(d.indicador,d.depois)}</small></dd></div>)}</dl>
      </div>)}
    </DetalhesFinanceiros>
  </section>;
  if(cartao.tipo==='investimentos') {
    const r=cartao.resultado;
    return <section className={s.card} aria-label="Carteira de investimentos">
      <h2>Seus investimentos</h2>
      <p className={s.label}>Valor total até {formatarDiaMes(r.ate_data)}</p>
      <div className={`${s.lead} ${s.accent}`}>{formatarReais(r.totais.valor_total_centavos)}</div>
      <div role="list" aria-label="Posições de investimento">{r.posicoes.map(p=><div role="listitem" className={s.option} key={p.posicao_id}>
        <div>{p.nome}<small>{textos.rotulos.classificacao[p.classificacao]} · disp. {formatarDiaMes(p.data_disponibilidade)}</small></div>
        <strong className={s.number}>{formatarReais(p.valor_atual_centavos)}</strong>
        {p.restricao && <small style={{gridColumn:'1 / -1'}}>{p.restricao}</small>}
      </div>)}</div>
      <p className={s.footnote}>{r.rotulo_rentabilidade}</p>
      <DetalhesFinanceiros titulo="Ver aplicações e fontes">
        {r.posicoes.map(p=><div key={p.posicao_id}><h3>{p.nome} ({p.posicao_id})</h3><dl className={s.rows}>
          <div className={s.row}><dt>Aplicado</dt><dd>{formatarReais(p.aplicado_centavos)}</dd></div>
          <div className={s.row}><dt>Rentabilidade</dt><dd>{formatarPercentual(p.rentabilidade_pct)}</dd></div>
        </dl>{p.rotulo_estimativa && <p className={s.note}>{p.rotulo_estimativa}</p>}<p className={s.note}>Fonte: {p.fonte}</p></div>)}
      </DetalhesFinanceiros>
    </section>;
  }
  const r=cartao.resultado;
  const ir=r.irpf;
  return <section className={s.card} aria-label="Imposto de renda estimado">
    <h2>Imposto de renda · ano-calendário {r.ano_calendario}</h2>
    {ir && <>
      <p className={s.label}>{ir.a_pagar_centavos > 0 ? 'A pagar' : ir.a_restituir_centavos > 0 ? 'A restituir' : 'Sem imposto a pagar'}</p>
      <div className={s.lead}>{formatarReais(ir.a_pagar_centavos > 0 ? ir.a_pagar_centavos : ir.a_restituir_centavos)}</div>
      <p className={s.note}>IRPF (declaração {r.exercicio}) · prazo {formatarData(ir.prazo_declaracao)}</p>
    </>}
    {r.investimentos && <div className={s.rows}><div className={s.row}><h3>Investimentos</h3><strong className={s.number}>Total estimado: {formatarReais(r.investimentos.total_ir_estimado_centavos)}</strong></div></div>}
    <p className={s.note}>{r.rotulo}</p>
    <DetalhesFinanceiros titulo="Ver cálculo e fontes">
      {ir && <><h3>IRPF (declaração {r.exercicio})</h3><dl className={s.rows}>
        <div className={s.row}><dt>Renda mensal considerada<small>{ir.origem === 'historico' ? 'Média do histórico' : ir.origem === 'cadastro' ? 'Cadastro da persona' : 'Informada'}</small></dt><dd>{formatarReais(ir.rendimento_mensal_centavos)}</dd></div>
        <div className={s.row}><dt>Imposto mensal<small>{ir.forma_mensal}</small></dt><dd>{formatarReais(ir.mensal.imposto_centavos)}</dd></div>
        <div className={s.row}><dt>Imposto anual devido</dt><dd>{formatarReais(ir.imposto_devido_centavos)}</dd></div>
        <div className={s.row}><dt>Já retido/recolhido no ano</dt><dd>{formatarReais(ir.retido_ou_recolhido_anual_centavos)}</dd></div>
      </dl>{ir.premissas.length>0 && <><h3>Premissas</h3><ul className={s.note}>{ir.premissas.map(p=><li key={p}>{p}</li>)}</ul></>}</>}
      {r.investimentos && <><h3>IR sobre investimentos</h3><div className={s.tableWrap}><table className={s.table}><caption className="sr-only">IR sobre investimentos</caption><thead><tr><th>Posição</th><th className={s.number}>IR estimado</th></tr></thead><tbody>{r.investimentos.itens.map(i=><tr key={i.posicao_id}><td>{i.nome}<div className={s.note}>{i.isento ? 'Isento' : formatarPercentual(i.aliquota_pct)} · {i.data_pagamento ? `pagamento ${formatarDiaMes(i.data_pagamento)}` : i.forma}</div></td><td className={s.number}>{formatarReais(i.ir_estimado_centavos)}</td></tr>)}</tbody></table></div></>}
      <p className={s.footnote}>{r.fontes.join(' · ')}</p>
    </DetalhesFinanceiros>
  </section>;
}
