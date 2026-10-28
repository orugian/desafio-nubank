import type { SerieCdi } from "@/contratos";

export const URL_BCB_SGS12 =
  "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=03/11/2025&dataFinal=29/10/2026";
export const OBTIDO_EM_BCB = "2026-10-28T12:39:47-03:00";

type ItemBrutoBcb = { data: string; valor: string };

export function converterSerieBcb(
  bruto: unknown,
  meta?: { obtido_em?: string; url?: string },
): SerieCdi {
  if (!Array.isArray(bruto)) {
    throw new Error("Resposta do BCB deve ser uma lista");
  }
  const serie = (bruto as ItemBrutoBcb[])
    .map((item) => {
      const [dia, mes, ano] = item.data.split("/");
      return {
        data: `${ano}-${mes}-${dia}`,
        taxa_diaria_pct: String(item.valor).replace(",", "."),
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    fonte: "BCB SGS 12",
    url: meta?.url ?? URL_BCB_SGS12,
    obtido_em: meta?.obtido_em ?? OBTIDO_EM_BCB,
    serie,
  };
}
