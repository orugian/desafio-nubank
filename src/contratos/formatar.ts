// Formatação pura, sem Intl nem ponto flutuante, para o texto sair igual no
// servidor, no navegador e nos testes.

/** 123456 → "R$ 1.234,56"; -20000 → "-R$ 200,00". */
export function formatarReais(centavos: number): string {
  if (!Number.isInteger(centavos)) throw new Error("centavos deve ser inteiro");
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const reais = Math.floor(abs / 100).toString();
  const cent = (abs % 100).toString().padStart(2, "0");
  const milhar = reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negativo ? "-" : ""}R$ ${milhar},${cent}`;
}

/** "2026-11-15" → "15/11". */
export function formatarDiaMes(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

/** "2026-11-15" → "15/11/2026". */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "2026-10-27T18:00:00-03:00" → "27/10 18:00" (hora local do texto, sem conversão de fuso). */
export function formatarDiaMesHora(dataHora: string): string {
  const [data, resto = ""] = dataHora.split("T");
  return `${formatarDiaMes(data)} ${resto.slice(0, 5)}`.trim();
}

/** "1.01" → "1,01%". */
export function formatarPercentual(pct: string): string {
  return `${pct.replace(".", ",")}%`;
}
