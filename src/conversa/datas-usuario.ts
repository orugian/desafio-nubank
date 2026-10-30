// Detecção de menção de data pelo usuário na conversa.

const PADROES_DATA: readonly RegExp[] = [
  /\d{1,2}\/\d{1,2}/,
  /\d{4}-\d{2}-\d{2}/,
  /\bdia\s+\d{1,2}\b/i,
  /\bat[eé]\s+(?:[oa]\s+)?(dia|sal[áa]rio|fim|final|vencimento|pr[óo]xim)/i,
  /\b(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i,
  /(?:\bamanh[ãa]\b|\bamanh[ãa](?![a-zà-ÿ]))/i,
  /\bsemana\b/i,
];

export function mencionaData(texto: string): boolean {
  if (!texto || typeof texto !== "string") {
    return false;
  }
  return PADROES_DATA.some((padrao) => padrao.test(texto));
}
