import type { CodigoErro } from "./erros";
import { formatarDiaMes, formatarDiaMesHora, formatarReais } from "./formatar";

// Textos fixos da interface e do servidor. Nunca exibir texto daqui como se
// fosse da assistente: mensagens de sistema têm aparência própria (spec §8).

export const textos = {
  faixa_prototipo: "Protótipo · dados fictícios",

  /** R-10: sempre junto da margem. */
  legenda_margem:
    "Margem é o menor saldo previsto até 29/11 com os compromissos e estimativas listados. Não é autorização para gastar.",

  /** Spec §9: junto da comparação. */
  premissas: [
    "Dados fictícios.",
    "Hoje é 30/10/2026; a projeção vai até 29/11/2026.",
    "No mesmo dia, saídas antes de entradas.",
    "Recebimentos futuros são previstos; o resultado sem eles aparece junto.",
    "Gastos do dia a dia estimados pelo histórico.",
    "Investimentos ficam fora da projeção.",
    "Movimentações são simuladas.",
  ],

  /** Regras fixas exibidas em "Como funciona" (`config.regras_fixas`). */
  regras_fixas: [
    "Hoje é sexta, 30/10/2026; o relógio do computador não entra no cálculo.",
    "A projeção vai de 30/10 a 29/11/2026, igual para todos os cenários.",
    "No mesmo dia, saídas antes de entradas, salvo se você disser o contrário.",
    "Todo número vem do código; o modelo de linguagem não calcula.",
    "Investimentos não entram na projeção de caixa.",
    "Guardar dinheiro é movimentação simulada, sempre com confirmação.",
    "Até 3 chamadas ao modelo por mensagem.",
    "CPF, cartão, e-mail e telefone são recusados antes do modelo.",
  ],

  sugestoes_chat: ["Posso separar dinheiro?", "Simular um imprevisto", "Entender meus recursos disponíveis"],

  nao_disponivel: "não disponível no protótipo",

  rotulos: {
    saldo_zerado: "Saldo zerado",
    saldo_insuficiente: (faltam_centavos: number) => `Saldo insuficiente (faltam ${formatarReais(faltam_centavos)})`,
    situacao_atual: "Situação atual",
    margem: "Margem",
    saldo_minimo: "Menor saldo",
    primeira_falta: "Primeira falta",
    insuficiencia: "Falta de cobertura",
    saldo_final: "Saldo em 29/11",
    sem_recebimentos: "Sem os recebimentos previstos",
    previsto: "previsto",
    original_para_declarado: (original: string, declarado: string) => `${original} → ${declarado}`,
    origem: {
      dados_base: "Do app",
      estimado: "Estimado",
      declaracao: "Informado por você",
      operacao: "Movimentação simulada",
      hipotese: "Simulação",
    },
    avisos_cenario: {
      saldo_final_positivo_com_falta: "O saldo termina positivo, mas falta dinheiro antes disso.",
      cobertura_depende_de_recebimento: "A cobertura depende de um recebimento previsto.",
      falta_maior_sem_recebimento: "Sem o recebimento previsto, a falta seria maior.",
    },
    ordem_relevante: (data: string) => `Em ${formatarDiaMes(data)}, a ordem entre entrada e saída muda o resultado.`,
    classificacao: {
      protegida: "protegida",
      nao_resgatavel_ate_data: "não resgatável até a data",
      resgatavel_ate_data: "resgatável até a data",
    },
    /** I-05. */
    rentabilidade: "bruto, antes de IR, IOF e custos; não anualizado",
    /** I-08, CV-26. */
    projecao: "bruto, CDI constante",
    /** I-04. */
    estimado_com_cotacao: (data_hora: string, fonte: string) =>
      `estimado com cotação de ${formatarDiaMesHora(data_hora)} (${fonte})`,
    /** H-05. */
    estimado_media: (valores_centavos: [number, number, number]) =>
      `estimado: média de ${formatarReais(valores_centavos[0])}, ${formatarReais(valores_centavos[1])} e ${formatarReais(valores_centavos[2])}`,
    /** R-21. */
    estimado_gasto_diario: (por_dia_centavos: number, dias: number) =>
      `estimado: ${formatarReais(por_dia_centavos)} por dia × ${dias} dias, pela média do histórico`,
    rascunho_nao_enviado: "Rascunho não enviado",
  },

  /** O-05: descrição da saída de caixa da operação executada. */
  descricao_movimentacao: (destino_nome: string) => `Movimentação simulada para ${destino_nome}`,

  /** Mensagem de sistema depois de confirmar (O-10: nunca afirmar operação real). */
  mensagem_operacao_simulada: (valor_centavos: number, destino_nome: string) =>
    `Movimentação simulada: ${formatarReais(valor_centavos)} para ${destino_nome}. Nenhum dinheiro real foi movimentado.`,

  mensagem_operacao_cancelada: (valor_centavos: number, destino_nome: string) =>
    `Proposta cancelada: ${formatarReais(valor_centavos)} para ${destino_nome}. Nada foi alterado.`,

  aviso_hipoteses_descartadas: (ids: string[]) =>
    `As simulações ${ids.join(", ")} foram descartadas porque a situação atual mudou.`,

  /** O-03: alerta da proposta quando há falta. */
  alerta_falta: (valor_centavos: number, data: string) =>
    `Com essa movimentação, faltariam ${formatarReais(valor_centavos)} em ${formatarDiaMes(data)}.`,

  /** Spec §8. */
  falhas: {
    "F-01": "A assistente não respondeu a tempo. Nada foi alterado.",
    "F-02": "O limite gratuito do modelo foi atingido. Nada foi alterado.",
    "F-03": "A assistente está indisponível no momento.",
    "F-04": "A assistente está indisponível no momento.",
    "F-05": "Não consegui concluir esta etapa.",
    "F-06": "A sessão ficou inconsistente.",
  },
  /** F-02: complemento com a espera informada. */
  falha_f02_espera: (segundos: number | undefined, provedor: string) =>
    segundos !== undefined
      ? `Tente de novo em cerca de ${Math.ceil(segundos / 60)} min.`
      : provedor === "openrouter"
        ? "O OpenRouter renova o limite às 21h de Brasília."
        : "Tente de novo em alguns minutos.",
  /** F-07: aviso, não falha. */
  aviso_f07: (data_hora: string) => `cotação de ${formatarDiaMes(data_hora.slice(0, 10))} (consulta ao vivo indisponível)`,

  acoes: {
    tentar_novamente: "Tentar novamente",
    recomecar: "Recomeçar",
    confirmar: "Confirmar",
    cancelar: "Cancelar",
  },

  /** Mensagem padrão de cada erro de domínio (o domínio pode detalhar). */
  erros: {
    ARGUMENTOS_INVALIDOS: "Argumentos inválidos.",
    VALOR_INVALIDO: "Valor inválido: use texto com ponto decimal, maior que zero (ex.: \"500\" ou \"12.50\").",
    DATA_ANTES_DE_HOJE: "A data é anterior a hoje (30/10/2026).",
    DATA_FORA_DA_JANELA: "A data passa de 29/11/2026, fim da projeção.",
    DATA_FORA_DO_HISTORICO: "O histórico vai de 30/07 a 29/10/2026.",
    EVENTO_INEXISTENTE: "Não existe evento com esse id na situação atual.",
    POSICAO_INEXISTENTE: "Não existe posição com esse id.",
    OPERACAO_NAO_PERMITIDA: "Essa alteração não é permitida.",
    POSSIVEL_DUPLICIDADE: "Esse gasto pode já estar registrado.",
    LIMITE_HIPOTESES: "Já existem 3 simulações ativas.",
    LIMITE_ALTERACOES: "Uma simulação aceita até 5 alterações.",
    HIPOTESE_INEXISTENTE: "Não existe simulação com esse id.",
    ALTERACAO_INEXISTENTE: "Não existe alteração com esse id.",
    SALDO_INSUFICIENTE_HOJE: "O valor passa do saldo disponível hoje.",
    OPERACAO_EXPIRADA: "Essa proposta expirou porque a situação mudou depois dela.",
    OPERACAO_JA_EXECUTADA: "Essa movimentação simulada já foi feita.",
    DISPONIVEL_FORA_DA_JANELA: "O valor só fica disponível depois de 29/11/2026.",
    ESTADO_INVALIDO: "A sessão ficou inconsistente.",
    MENSAGEM_JA_PROCESSADA: "Essa mensagem já foi processada.",
  } satisfies Record<CodigoErro, string>,

  /** Recusa de dados pessoais antes do modelo (D-20). */
  dados_pessoais_recusados:
    "Por segurança, não envie CPF, número de cartão, e-mail ou telefone. Este protótipo usa só dados fictícios.",
} as const;
