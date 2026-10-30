import { describe, expect, test } from "vitest";
import { esquemaResultadoCalculo } from "@/contratos";
import { calcularExpressao } from "@/dominio/calculo";

function ok(expr: string): { resultado: string; resultado_centavos: number } {
  const r = calcularExpressao(expr);
  if (!r.ok) throw new Error(`${expr}: ${r.erro.mensagem}`);
  const { ok: _, ...resto } = r;
  void _;
  esquemaResultadoCalculo.parse(resto);
  return r;
}

describe("calcularExpressao", () => {
  test("somas e exemplos da descrição", () => {
    expect(ok("120+85.5+230")).toMatchObject({ resultado: "435.50", resultado_centavos: 43550 });
    expect(ok("25000*0.2")).toMatchObject({ resultado: "5000.00", resultado_centavos: 500000 });
    expect(ok("3000-1250")).toMatchObject({ resultado: "1750.00", resultado_centavos: 175000 });
    // Sem ponto flutuante binário: 0.1 + 0.2 = 0.30 exatos.
    expect(ok("0.1+0.2").resultado).toBe("0.30");
  });

  test("precedência: * e / antes de + e −; mesma prioridade da esquerda para a direita", () => {
    expect(ok("2+3*4").resultado).toBe("14.00");
    expect(ok("10-4-3").resultado).toBe("3.00");
    expect(ok("100/4/5").resultado).toBe("5.00");
    expect(ok("2*3+4*5").resultado).toBe("26.00");
  });

  test("parênteses", () => {
    expect(ok("(2+3)*4").resultado).toBe("20.00");
    expect(ok("((1+1)*(2+2))/8").resultado).toBe("1.00");
    expect(ok(" ( 1500 - 300 ) / 3 ").resultado).toBe("400.00");
  });

  test("menos unário e resultado negativo", () => {
    expect(ok("-5+3")).toMatchObject({ resultado: "-2.00", resultado_centavos: -200 });
    expect(ok("2*-3").resultado).toBe("-6.00");
    expect(ok("-(2+3)").resultado).toBe("-5.00");
    expect(ok("--4").resultado).toBe("4.00");
    expect(ok("1250-3000").resultado_centavos).toBe(-175000);
  });

  test("% pós-fixo divide por 100", () => {
    expect(ok("2500*10%")).toMatchObject({ resultado: "250.00", resultado_centavos: 25000 });
    expect(ok("50%").resultado).toBe("0.50");
    expect(ok("3000+3000*5%").resultado).toBe("3150.00");
  });

  test("arredondamento a 2 casas, meio para cima", () => {
    expect(ok("10/3").resultado).toBe("3.33");
    expect(ok("20/3").resultado).toBe("6.67");
    expect(ok("0.125").resultado).toBe("0.13");
    expect(ok("0.005").resultado_centavos).toBe(1);
    expect(ok("-0.125").resultado).toBe("-0.13");
    expect(ok("0.004-0.004")).toMatchObject({ resultado: "0.00", resultado_centavos: 0 });
  });

  test("erros tipados: letras, vazio, divisão por zero, longo demais, vírgula, malformada", () => {
    const casos = [
      "2+abc",
      "",
      "   ",
      "10/0",
      "10/(5-5)",
      "1+".padEnd(201, "1"),
      "1.234,56",
      "1.234.567",
      "2+",
      "(2+3",
      "2+3)",
      "2**3",
      "Math.max(1)",
      Array.from({ length: 51 }, () => "1").join("+"),
    ];
    for (const expr of casos) {
      const r = calcularExpressao(expr);
      expect(r.ok, expr).toBe(false);
      if (!r.ok) {
        expect(r.erro.codigo).toBe("ARGUMENTOS_INVALIDOS");
        expect(r.erro.campos).toEqual(["expressao"]);
      }
    }
    // Limites aceitos: 200 caracteres e 50 números.
    expect(calcularExpressao("1+1".padEnd(200, " ")).ok).toBe(true);
    expect(calcularExpressao(Array.from({ length: 50 }, () => "1").join("+"))).toMatchObject({ ok: true, resultado: "50.00" });
  });

  test("rótulo e expressão ecoada", () => {
    const r = calcularExpressao("1+1");
    expect(r).toMatchObject({ ok: true, expressao: "1+1", rotulo: "cálculo do motor sobre os valores informados" });
  });
});
