// Calendário (spec §3). Funções puras sobre texto `AAAA-MM-DD`; sem relógio do sistema.

import { FERIADOS, HOJE, type Calendario, type DataISO } from "@/contratos";

/** Dias desde 1970-01-01 (algoritmo civil de Howard Hinnant), sem Date. */
export function diaJuliano(data: DataISO): number {
  const [a, m, d] = data.split("-").map(Number);
  const y = m <= 2 ? a - 1 : a;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverso de `diaJuliano`. */
export function deDiaJuliano(n: number): DataISO {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const a = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${String(a).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Soma dias corridos. */
export function somarDias(data: DataISO, n: number): DataISO {
  return deDiaJuliano(diaJuliano(data) + n);
}

/** 0 = domingo … 6 = sábado. 1970-01-01 foi quinta (4). */
export function diaDaSemana(data: DataISO): number {
  return (((diaJuliano(data) + 4) % 7) + 7) % 7;
}

export type OpcoesCalendario = {
  /** Feriados de hoje em diante (padrão: spec §3). */
  feriados?: readonly DataISO[];
  /**
   * Datas da série de CDI gravada. Antes de hoje, até a última data da série,
   * dia útil é o que está na série. Entre a última data e hoje (a série do BCB
   * sai com atraso), vale seg–sex sem feriados; I-03 usa a última taxa conhecida.
   */
  datas_cdi?: readonly DataISO[];
};

export function criarCalendario(opcoes: OpcoesCalendario = {}): Calendario {
  const feriados = new Set<string>(opcoes.feriados ?? FERIADOS);
  const datasCdi = new Set<string>(opcoes.datas_cdi ?? []);
  const fimSerie = opcoes.datas_cdi?.length ? [...datasCdi].sort().at(-1)! : null;

  const ehDiaUtil = (data: DataISO): boolean => {
    if (fimSerie !== null && data < HOJE && data <= fimSerie) return datasCdi.has(data);
    const dow = diaDaSemana(data);
    return dow !== 0 && dow !== 6 && !feriados.has(data);
  };

  const somarDiasUteis = (data: DataISO, n: number): DataISO => {
    let d = data;
    while (!ehDiaUtil(d)) d = somarDias(d, 1);
    for (let k = 0; k < n; k++) {
      d = somarDias(d, 1);
      while (!ehDiaUtil(d)) d = somarDias(d, 1);
    }
    return d;
  };

  const diasUteisEntre = (de: DataISO, ate: DataISO): number => {
    let total = 0;
    for (let d = de; d < ate; d = somarDias(d, 1)) if (ehDiaUtil(d)) total++;
    return total;
  };

  return { ehDiaUtil, somarDiasUteis, diasUteisEntre };
}
