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
