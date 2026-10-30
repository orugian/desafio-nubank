import type { CartaoResposta, EstadoSessao } from '@/contratos';
import { CartaoChat } from './CartaoChat';
import { TextoMarkdown } from './TextoMarkdown';
import styles from './Conversa.styles';

// Somente respostas consultivas com evidência estruturada têm leitura por camadas.
// Perguntas, consentimento e erros nunca ficam escondidos por esta regra.
const CONSULTIVOS = new Set<CartaoResposta['tipo']>([
  'comparacao', 'investimentos', 'cotacao', 'comparativo_investimento',
  'simulacao_investimento', 'pix_credito', 'imposto_renda', 'simulacao_parcelamento',
  'historico', 'cartao_credito', 'rendimento', 'o_que_mudou',
]);

export function RespostaAssistente({ texto, cartoes, estado, ocupado, aoExecutarAcao }: {
  texto: string;
  cartoes: CartaoResposta[];
  estado: EstadoSessao;
  ocupado: boolean;
  aoExecutarAcao: (tipo: 'confirmar' | 'cancelar', id: string) => void;
}) {
  const leituraVisual = cartoes.length > 0 && !texto.includes('?') && cartoes.every(c => CONSULTIVOS.has(c.tipo));
  const conteudo = cartoes.map((cartao, i) => (
    <CartaoChat key={i} cartao={cartao} estado={estado} ocupado={ocupado} aoExecutarAcao={aoExecutarAcao} />
  ));
  return <div className={styles.answer}>
    {!leituraVisual && texto && <div className={styles.prose}><TextoMarkdown texto={texto} /></div>}
    {conteudo}
    {leituraVisual && texto && <details className={styles.explanation}>
      <summary>Explicação da Nina</summary>
      <div className={styles.prose}><TextoMarkdown texto={texto} /></div>
    </details>}
  </div>;
}
