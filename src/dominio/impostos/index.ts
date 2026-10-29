import Decimal from "decimal.js";
import {
  HOJE,
  erro,
  textos,
  type Contexto,
  type DataISO,
  type EstadoSessao,
  type ItemImposto,
  type Irpf,
  type Persona,
  type ResultadoDominio,
  type ResultadoImpostoRenda,
} from "@/contratos";
import { diaJuliano, somarDias } from "@/dominio/calendario";
import { indiceTaxasCdi, consultarInvestimentos } from "@/dominio/investimentos";
import {
  ALIQUOTA_COME_COTAS,
  DESCONTO_SIMPLIFICADO_ANUAL_MAX,
  DESCONTO_SIMPLIFICADO_MENSAL,
  ISENCAO_ACOES_MES,
  ISENCAO_CRIPTO_MES,
  aliquotaIrRendaFixaPct,
  impostoTabelaAnual,
  impostoTabelaMensal,
  reducaoAnual,
  reducaoMensal,
} from "./tabelas";

export * from "./tabelas";

const DecimalCalc = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcula o valor de um aporte em uma data D conforme a spec §2.2:
 * - Se D ≤ HOJE: produto de (1 + taxa_dia × cdi_pct/100) sobre os dias úteis d em [aporte.data, D)
 *   usando a taxa da série (taxaNoDia);
 * - Se D > HOJE: valor em HOJE × (1 + taxa_snapshot × cdi_pct/100)^du(HOJE, D),
 *   com taxa_snapshot do mercado e dias úteis entre HOJE e D.
 * Mantém Decimal sem arredondar até o valor final do aporte.
 */
function calcularValorAporteEmData(
  aporte: { data: DataISO; valor_centavos: number },
  cdiPct: number,
  dataD: DataISO,
  estado: EstadoSessao,
  contexto: Contexto,
  taxaNoDia: (d: DataISO) => { taxa: string; dataRef: DataISO },
): Decimal {
  const pct = new DecimalCalc(cdiPct).div(100);
  if (dataD <= HOJE) {
    let fator = new DecimalCalc(1);
    for (let d = aporte.data; d < dataD; d = somarDias(d, 1)) {
      if (!contexto.calendario.ehDiaUtil(d)) continue;
      const { taxa } = taxaNoDia(d);
      const taxaDia = new DecimalCalc(taxa).div(100);
      fator = fator.mul(new DecimalCalc(1).add(taxaDia.mul(pct)));
    }
    return new DecimalCalc(aporte.valor_centavos).mul(fator);
  } else {
    let fatorAteHoje = new DecimalCalc(1);
    for (let d = aporte.data; d < HOJE; d = somarDias(d, 1)) {
      if (!contexto.calendario.ehDiaUtil(d)) continue;
      const { taxa } = taxaNoDia(d);
      const taxaDia = new DecimalCalc(taxa).div(100);
      fatorAteHoje = fatorAteHoje.mul(new DecimalCalc(1).add(taxaDia.mul(pct)));
    }
    const valorEmHoje = new DecimalCalc(aporte.valor_centavos).mul(fatorAteHoje);
    const du = contexto.calendario.diasUteisEntre(HOJE, dataD);
    const taxaSnapshot = new DecimalCalc(estado.mercado.cdi.taxa_diaria_pct).div(100);
    const fatorFuturo = new DecimalCalc(1).add(taxaSnapshot.mul(pct)).pow(du);
    return valorEmHoje.mul(fatorFuturo);
  }
}

/**
 * Estima imposto de renda sobre investimentos e/ou IRPF anual (spec §2.2).
 */
export function estimarImpostoRenda(
  persona: Persona,
  estado: EstadoSessao,
  contexto: Contexto,
  pedido: { escopo?: "tudo" | "investimentos" | "irpf"; rendimento_mensal_centavos?: number } = {},
): ResultadoDominio<ResultadoImpostoRenda> {
  if (pedido.rendimento_mensal_centavos !== undefined) {
    if (
      typeof pedido.rendimento_mensal_centavos !== "number" ||
      !Number.isInteger(pedido.rendimento_mensal_centavos) ||
      pedido.rendimento_mensal_centavos <= 0
    ) {
      return erro("VALOR_INVALIDO", textos.erros.VALOR_INVALIDO, ["rendimento_mensal"]);
    }
  }

  const escopo = pedido.escopo ?? "tudo";
  if (escopo !== "tudo" && escopo !== "investimentos" && escopo !== "irpf") {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["escopo"]);
  }

  const entradasReceita = persona.historico.filter(
    (l) => l.tipo === "entrada" && l.categoria === "receitas",
  );
  const temReceitaHistorico = entradasReceita.length > 0;
  const temRendaInformada = pedido.rendimento_mensal_centavos !== undefined;

  if (escopo === "irpf" && !temReceitaHistorico && !temRendaInformada) {
    return erro("ARGUMENTOS_INVALIDOS", textos.erros.ARGUMENTOS_INVALIDOS, ["rendimento_mensal"]);
  }

  // -------------------------------------------------------------------------
  // Investimentos
  // -------------------------------------------------------------------------
  let investimentosObj: ResultadoImpostoRenda["investimentos"] = null;

  if (escopo !== "irpf") {
    const resInvest = consultarInvestimentos(persona, estado, contexto, {});
    if (!resInvest.ok) return resInvest;
    const posicoesAvaliadasMap = new Map(resInvest.posicoes.map((p) => [p.posicao_id, p]));
    const { taxaNoDia } = indiceTaxasCdi(contexto);

    const itens: ItemImposto[] = persona.posicoes.map((pos): ItemImposto => {
      if (pos.categoria === "saldo_separado") {
        return {
          posicao_id: pos.id,
          nome: pos.nome,
          categoria: pos.categoria,
          regime: "sem_rendimento",
          base_centavos: 0,
          aliquota_pct: "0.00",
          ir_estimado_centavos: 0,
          isento: false,
          motivo: "não rende",
          data_referencia: HOJE,
          data_pagamento: null,
          forma: "não se aplica",
        };
      }

      if (pos.categoria === "caixinha" || pos.categoria === "cdb_liquidez_diaria") {
        const aportesOperacoes = estado.operacoes
          .filter((op) => op.destino === pos.id)
          .map((op) => ({ data: op.data, valor_centavos: op.valor_centavos }));
        const todosAportes = [...pos.aportes, ...aportesOperacoes];

        let baseTotal = 0;
        let irTotal = 0;

        for (const ap of todosAportes) {
          const vHojeDecimal = calcularValorAporteEmData(
            ap,
            pos.cdi_pct,
            HOJE,
            estado,
            contexto,
            taxaNoDia,
          );
          const vHojeRound = vHojeDecimal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
          const rend_i = vHojeRound - ap.valor_centavos;
          const diasCorridos = diaJuliano(HOJE) - diaJuliano(ap.data);
          const aliqStr = aliquotaIrRendaFixaPct(diasCorridos);
          const ir_i =
            rend_i > 0
              ? new DecimalCalc(rend_i)
                  .mul(new DecimalCalc(aliqStr))
                  .div(100)
                  .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
                  .toNumber()
              : 0;
          baseTotal += rend_i;
          irTotal += ir_i;
        }

        const aliquota_pct =
          baseTotal <= 0
            ? "0.00"
            : new DecimalCalc(irTotal)
                .mul(100)
                .div(baseTotal)
                .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                .toFixed(2);

        return {
          posicao_id: pos.id,
          nome: pos.nome,
          categoria: pos.categoria,
          regime: "renda_fixa_resgate",
          base_centavos: baseTotal,
          aliquota_pct,
          ir_estimado_centavos: irTotal,
          isento: false,
          motivo: null,
          data_referencia: HOJE,
          data_pagamento: null,
          forma: "retido na fonte pelo banco no resgate",
        };
      }

      if (pos.categoria === "cdb_vencimento") {
        const aportesOperacoes = estado.operacoes
          .filter((op) => op.destino === pos.id)
          .map((op) => ({ data: op.data, valor_centavos: op.valor_centavos }));
        const todosAportes = [...pos.aportes, ...aportesOperacoes];

        let baseTotal = 0;
        let irTotal = 0;

        for (const ap of todosAportes) {
          const vVencDecimal = calcularValorAporteEmData(
            ap,
            pos.cdi_pct,
            pos.vencimento,
            estado,
            contexto,
            taxaNoDia,
          );
          const vVencRound = vVencDecimal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
          const rend_i = vVencRound - ap.valor_centavos;
          const diasCorridos = diaJuliano(pos.vencimento) - diaJuliano(ap.data);
          const aliqStr = aliquotaIrRendaFixaPct(diasCorridos);
          const ir_i =
            rend_i > 0
              ? new DecimalCalc(rend_i)
                  .mul(new DecimalCalc(aliqStr))
                  .div(100)
                  .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
                  .toNumber()
              : 0;
          baseTotal += rend_i;
          irTotal += ir_i;
        }

        const aliquota_pct =
          baseTotal <= 0
            ? "0.00"
            : new DecimalCalc(irTotal)
                .mul(100)
                .div(baseTotal)
                .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
                .toFixed(2);

        return {
          posicao_id: pos.id,
          nome: pos.nome,
          categoria: pos.categoria,
          regime: "renda_fixa_vencimento",
          base_centavos: baseTotal,
          aliquota_pct,
          ir_estimado_centavos: irTotal,
          isento: false,
          motivo: null,
          data_referencia: pos.vencimento,
          data_pagamento: pos.vencimento,
          forma: "retido na fonte no vencimento",
        };
      }

      if (pos.categoria === "fundo") {
        const aportesOperacoes = estado.operacoes
          .filter((op) => op.destino === pos.id)
          .map((op) => ({ data: op.data, valor_centavos: op.valor_centavos }));
        const todosAportes = [...pos.aportes, ...aportesOperacoes];

        let baseTotal = 0;

        for (const ap of todosAportes) {
          const vFimDecimal = calcularValorAporteEmData(
            ap,
            pos.cdi_pct,
            "2026-11-30",
            estado,
            contexto,
            taxaNoDia,
          );
          const vFimRound = vFimDecimal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

          let vAnterior: number;
          if (ap.data > "2026-05-29") {
            vAnterior = ap.valor_centavos;
          } else {
            const vAntDecimal = calcularValorAporteEmData(
              ap,
              pos.cdi_pct,
              "2026-05-29",
              estado,
              contexto,
              taxaNoDia,
            );
            vAnterior = vAntDecimal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
          }

          const base_i = vFimRound - vAnterior;
          baseTotal += base_i;
        }

        const irTotal =
          baseTotal > 0
            ? new DecimalCalc(baseTotal)
                .mul(new DecimalCalc(ALIQUOTA_COME_COTAS))
                .div(100)
                .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
                .toNumber()
            : 0;

        const aliquota_pct = baseTotal > 0 ? ALIQUOTA_COME_COTAS : "0.00";

        return {
          posicao_id: pos.id,
          nome: pos.nome,
          categoria: pos.categoria,
          regime: "come_cotas",
          base_centavos: baseTotal,
          aliquota_pct,
          ir_estimado_centavos: irTotal,
          isento: false,
          motivo: null,
          data_referencia: "2026-11-30",
          data_pagamento: "2026-11-30",
          forma: "come-cotas: descontado automaticamente em cotas",
        };
      }

      // acao ou cripto
      const avaliada = posicoesAvaliadasMap.get(pos.id);
      const valor_atual_centavos = avaliada?.valor_atual_centavos ?? 0;
      const aplicado_centavos = avaliada?.aplicado_centavos ?? 0;
      const ganho = valor_atual_centavos - aplicado_centavos;

      const isencao = pos.categoria === "acao" ? ISENCAO_ACOES_MES : ISENCAO_CRIPTO_MES;
      const motivoIsencao =
        pos.categoria === "acao"
          ? "vendas no mês até R$ 20.000,00 são isentas"
          : "alienações no mês até R$ 35.000,00 são isentas";

      let isento = false;
      let motivo: string | null = null;
      let ir_estimado_centavos = 0;
      let aliquota_pct = "0.00";

      if (ganho <= 0) {
        isento = false;
        motivo = "sem ganho a tributar";
        ir_estimado_centavos = 0;
        aliquota_pct = "0.00";
      } else if (valor_atual_centavos <= isencao) {
        isento = true;
        motivo = motivoIsencao;
        ir_estimado_centavos = 0;
        aliquota_pct = "0.00";
      } else {
        isento = false;
        motivo = null;
        ir_estimado_centavos = new DecimalCalc(ganho)
          .mul(15)
          .div(100)
          .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
          .toNumber();
        aliquota_pct = "15.00";
      }

      return {
        posicao_id: pos.id,
        nome: pos.nome,
        categoria: pos.categoria,
        regime: pos.categoria,
        base_centavos: ganho,
        aliquota_pct,
        ir_estimado_centavos,
        isento,
        motivo,
        data_referencia: HOJE,
        // Sem imposto devido (isenção ou sem ganho), não há DARF a pagar.
        data_pagamento: ir_estimado_centavos > 0 ? "2026-11-30" : null,
        forma:
          ir_estimado_centavos > 0
            ? "DARF até 30/11/2026, se a venda acontecer em outubro"
            : "sem DARF a pagar nesta estimativa",
      };
    });

    const total_ir_estimado_centavos = itens.reduce(
      (s, it) => s + it.ir_estimado_centavos,
      0,
    );

    investimentosObj = {
      itens,
      total_ir_estimado_centavos,
    };
  }

  // -------------------------------------------------------------------------
  // IRPF
  // -------------------------------------------------------------------------
  let irpfObj: Irpf | null = null;

  if (escopo !== "investimentos" && (temReceitaHistorico || temRendaInformada)) {
    let origem: "historico" | "informado";
    let rendimento_mensal_centavos: number;
    let meses_base: number;
    let tipo_renda: "salario" | "autonomo";

    if (pedido.rendimento_mensal_centavos !== undefined) {
      origem = "informado";
      rendimento_mensal_centavos = pedido.rendimento_mensal_centavos;
      meses_base = 0;
      const temSalarioHistorico = persona.historico.some(
        (l) => l.tipo === "entrada" && l.meio === "salario",
      );
      tipo_renda = temSalarioHistorico ? "salario" : "autonomo";
    } else {
      origem = "historico";
      const mesesDistintos = new Set(entradasReceita.map((l) => l.data.slice(0, 7)));
      meses_base = mesesDistintos.size;
      const somaReceitas = entradasReceita.reduce((s, l) => s + l.valor_centavos, 0);
      rendimento_mensal_centavos = new DecimalCalc(somaReceitas)
        .div(meses_base)
        .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
        .toNumber();
      tipo_renda = entradasReceita.every((l) => l.meio === "salario") ? "salario" : "autonomo";
    }

    const forma_mensal =
      tipo_renda === "salario"
        ? "retido na fonte pelo empregador"
        : "carnê-leão (DARF mensal) sobre recebimentos de pessoa física";

    const M = rendimento_mensal_centavos;
    const baseMensal = Math.max(0, M - DESCONTO_SIMPLIFICADO_MENSAL);
    const impostoTabelaMensalCentavos = impostoTabelaMensal(baseMensal);
    const reducaoMensalCentavos = reducaoMensal(M, impostoTabelaMensalCentavos);
    const impostoMensalCentavos = impostoTabelaMensalCentavos - reducaoMensalCentavos;

    const R = 12 * M;
    const descontoSimplificadoCalculado = new DecimalCalc(R)
      .mul(20)
      .div(100)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    const desconto_simplificado_centavos = Math.min(
      descontoSimplificadoCalculado,
      DESCONTO_SIMPLIFICADO_ANUAL_MAX,
    );
    const base_calculo_centavos = R - desconto_simplificado_centavos;
    const imposto_tabela_centavos = impostoTabelaAnual(base_calculo_centavos);
    const reducao_centavos = reducaoAnual(R, imposto_tabela_centavos);
    const imposto_devido_centavos = imposto_tabela_centavos - reducao_centavos;

    const retido_ou_recolhido_anual_centavos = 12 * impostoMensalCentavos;
    const a_pagar_centavos = Math.max(0, imposto_devido_centavos - retido_ou_recolhido_anual_centavos);
    const a_restituir_centavos = Math.max(0, retido_ou_recolhido_anual_centavos - imposto_devido_centavos);

    const premissas = [
      "renda mensal constante no ano",
      "desconto simplificado",
      "sem dependentes, deduções ou outros rendimentos",
      "tabelas de 2026 da Receita Federal e redução da Lei 15.270/2025",
    ];
    if (origem === "historico") {
      premissas.push(
        meses_base === 3
          ? "renda estimada pela média do histórico de 3 meses"
          : `renda estimada pela média do histórico de ${meses_base} meses`,
      );
    }

    irpfObj = {
      origem,
      tipo_renda,
      rendimento_mensal_centavos,
      meses_base,
      rendimento_anual_centavos: R,
      desconto_simplificado_centavos,
      base_calculo_centavos,
      imposto_tabela_centavos,
      reducao_centavos,
      imposto_devido_centavos,
      mensal: {
        base_centavos: baseMensal,
        imposto_tabela_centavos: impostoTabelaMensalCentavos,
        reducao_centavos: reducaoMensalCentavos,
        imposto_centavos: impostoMensalCentavos,
      },
      retido_ou_recolhido_anual_centavos,
      a_pagar_centavos,
      a_restituir_centavos,
      forma_mensal,
      prazo_declaracao: "2027-05-31",
      premissas,
    };
  }

  return {
    ok: true,
    ano_calendario: 2026,
    exercicio: 2027,
    investimentos: escopo === "irpf" ? null : investimentosObj,
    irpf: escopo === "investimentos" ? null : irpfObj,
    fontes: [
      "Receita Federal — Tributação de 2026",
      "Lei 15.270/2025 (redução do IR)",
    ],
    rotulo: "estimativa; não substitui a declaração nem orientação profissional",
  };
}
