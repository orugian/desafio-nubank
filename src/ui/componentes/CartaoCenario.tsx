"use client";
import { useState } from 'react';
import { FIM_JANELA, formatarDiaMes, formatarReais, textos, type CartaoResposta } from '@/contratos';
import { AvisoFinanceiro, DetalhesFinanceiros } from './CartoesFinanceiros';
import { TabelaCompartilhada } from './TabelaCompartilhada';
import s from './Financeiro.styles';

export function CartaoCenario({ cartao }: { cartao: Extract<CartaoResposta, { tipo: 'comparacao' }> }) {
  const [eventos, setEventos] = useState(false);
  return <section className={s.card} aria-label="Comparação de cenários">
    <h2>Seu planejamento</h2>
    <p className={s.note}>Menor saldo previsto até {formatarDiaMes(FIM_JANELA)}</p>
    <div className={s.comparison} style={{marginTop:16}}>
      {cartao.cenarios.map(c=><div key={c.cenario_id} className={s.scenario}>
        <p>{c.nome}</p>
        {c.indicadores ? <>
          <div className={`${s.lead} ${c.indicadores.saldo_minimo_centavos < 0 ? s.negative : s.accent}`}>{formatarReais(c.indicadores.saldo_minimo_centavos)}</div>
          <p className={s.note}>em {formatarDiaMes(c.indicadores.data_saldo_minimo)}</p>
        </> : <p className={s.negative}>Cenário inconsistente</p>}
      </div>)}
    </div>
    {cartao.cenarios.map(c=>(c.indicadores?.primeira_falta || c.avisos.length > 0 || c.datas_ordem_relevante.length > 0) && <AvisoFinanceiro key={c.cenario_id}>
      <strong>{c.nome}</strong>
      {c.indicadores?.primeira_falta && <span className="block">Primeira falta de {formatarReais(c.indicadores.primeira_falta.valor_descoberto_centavos)} em {formatarDiaMes(c.indicadores.primeira_falta.data)}.</span>}
      {c.avisos.map(av=><span className="block" key={av}>{textos.rotulos.avisos_cenario[av]}</span>)}
      {c.datas_ordem_relevante.map(d=><span className="block" key={d}>{textos.rotulos.ordem_relevante(d)}</span>)}
    </AvisoFinanceiro>)}
    <p className={s.footnote}>Projeção com os compromissos informados. Não é autorização para gastar.</p>
    <DetalhesFinanceiros titulo="Entender os valores">
      <p className={s.note}>{textos.legenda_margem}</p>
      {cartao.cenarios.map(c=><div key={c.cenario_id}>
        <h3>{c.nome} ({c.cenario_id})</h3>
        <p className={s.note}>Status: {c.status}</p>
        {c.indicadores && <dl className={s.rows}>
          <div className={s.row}><dt>{textos.rotulos.margem}</dt><dd>{formatarReais(c.indicadores.margem_hoje_centavos)}</dd></div>
          <div className={s.row}><dt>{textos.rotulos.insuficiencia}</dt><dd>{formatarReais(c.indicadores.insuficiencia_centavos)}</dd></div>
          <div className={s.row}><dt>{textos.rotulos.saldo_final}</dt><dd>{formatarReais(c.indicadores.saldo_final_centavos)}</dd></div>
          {c.indicadores.primeira_falta && <div className={s.row}><dt>Saídas na primeira falta</dt><dd>{c.indicadores.primeira_falta.saidas_do_dia.join(', ')}</dd></div>}
          {c.indicadores.sem_recebimentos && <>
            <div className={s.row}><dt>Sem recebimentos previstos: falta</dt><dd>{formatarReais(c.indicadores.sem_recebimentos.insuficiencia_centavos)}</dd></div>
            <div className={s.row}><dt>Sem recebimentos: saldo final</dt><dd>{formatarReais(c.indicadores.sem_recebimentos.saldo_final_centavos)}</dd></div>
          </>}
        </dl>}
      </div>)}
      <h3>Premissas</h3><ul className={s.note}>{textos.premissas.map(p=><li key={p}>{p}</li>)}</ul>
    </DetalhesFinanceiros>
    <button type="button" className={s.button} aria-expanded={eventos} onClick={()=>setEventos(!eventos)}>{eventos ? 'Ocultar eventos da projeção' : 'Ver eventos da projeção'}</button>
    {eventos && cartao.cenarios.map(c=><div key={c.cenario_id}>
      <h3>{c.nome}</h3>
      <TabelaCompartilhada caption={`Eventos de ${c.nome}`} itens={c.linhas} obterChave={(l,i)=>`${l.evento_id}-${i}`} colunas={[
        {chave:'data',titulo:'Data',renderizar:l=>formatarDiaMes(l.data)},
        {chave:'evento',titulo:'Evento',renderizar:l=><div><div>{l.descricao} ({l.evento_id})</div><div>{textos.rotulos.origem[l.origem]}{l.previsto ? ` · ${textos.rotulos.previsto}` : ''}</div>{l.original && <div>{textos.rotulos.original_para_declarado(formatarReais(l.original.valor_centavos),formatarReais(l.valor_centavos))}</div>}{l.rotulo && <div className={s.negative}>{l.rotulo}</div>}</div>},
        {chave:'valor',titulo:'Valor',alinharDireita:true,renderizar:l=>`${l.tipo === 'saida' ? '−' : '+'}${formatarReais(l.valor_centavos)}`},
        {chave:'saldo',titulo:'Saldo após',alinharDireita:true,renderizar:l=>formatarReais(l.saldo_apos_centavos)},
      ]} />
    </div>)}
  </section>;
}
