import { describe, expect, test } from "vitest";
import { criarCalendario } from "@/dominio/calendario";

// B0 · comportamento 3: calendário da spec §3.

describe("calendário de hoje em diante (spec §3)", () => {
  const cal = criarCalendario();

  test("pedido hoje (sexta, 30/10): D+0, D+1 e D+2 úteis são 30/10, 03/11 e 04/11", () => {
    expect(cal.somarDiasUteis("2026-10-30", 0)).toBe("2026-10-30");
    expect(cal.somarDiasUteis("2026-10-30", 1)).toBe("2026-11-03");
    expect(cal.somarDiasUteis("2026-10-30", 2)).toBe("2026-11-04");
  });

  test("13 dias úteis de 30/10 a 18/11, contando hoje ≤ d < 19/11 (CR-32)", () => {
    expect(cal.diasUteisEntre("2026-10-30", "2026-11-19")).toBe(13);
  });
});

describe("calendário antes de hoje: dia útil é o que está na série de CDI (spec §3)", () => {
  // CDI de teste da spec §11.4: todo dia útil de outubro, com 12/10 ausente.
  const outubro = Array.from({ length: 29 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
  const diasDaSerie = outubro.filter((d) => {
    const dia = Number(d.slice(8));
    const fimDeSemana = [3, 4, 10, 11, 17, 18, 24, 25].includes(dia);
    return !fimDeSemana && d !== "2026-10-12";
  });

  test("aporte em 01/10: 20 dias úteis até hoje, sem 12/10 (CR-30)", () => {
    const cal = criarCalendario({ datas_cdi: diasDaSerie });
    expect(cal.ehDiaUtil("2026-10-12")).toBe(false);
    expect(cal.diasUteisEntre("2026-10-01", "2026-10-30")).toBe(20);
  });

  test("dias entre o fim da série e hoje valem pela regra de seg–sex (suposição do B0)", () => {
    const cal = criarCalendario({ datas_cdi: diasDaSerie.filter((d) => d <= "2026-10-27") });
    expect(cal.ehDiaUtil("2026-10-28")).toBe(true);
    expect(cal.ehDiaUtil("2026-10-29")).toBe(true);
    expect(cal.diasUteisEntre("2026-10-01", "2026-10-30")).toBe(20);
  });
});
