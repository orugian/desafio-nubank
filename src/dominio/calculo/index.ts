import Decimal from "decimal.js";
import { erro, type ResultadoCalculo, type ResultadoDominio } from "@/contratos";

// Calculadora do motor para valores informados pela pessoa. Parser próprio por
// descida recursiva (sem eval/Function), em Decimal (precision 50).
//
// Gramática:
//   expressao := termo (("+" | "-") termo)*
//   termo     := unario (("*" | "/") unario)*
//   unario    := ("+" | "-") unario | posfixo
//   posfixo   := primario "%"*          ("%" divide por 100: "2500*10%" = 250)
//   primario  := numero | "(" expressao ")"
//   numero    := \d+ ("." \d+)?         (ponto decimal, sem separador de milhar)

const D = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const MAX_CARACTERES = 200;
const MAX_NUMEROS = 50;
const MAX_PROFUNDIDADE = 50;
const ROTULO = "cálculo do motor sobre os valores informados";

type Token = { tipo: "numero"; valor: string } | { tipo: "op"; valor: "+" | "-" | "*" | "/" | "%" | "(" | ")" };

class ErroExpressao extends Error {}

function tokenizar(texto: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < texto.length) {
    const c = texto[pos]!;
    if (c === " " || c === "\t") {
      pos++;
      continue;
    }
    if ("+-*/%()".includes(c)) {
      tokens.push({ tipo: "op", valor: c as "+" | "-" | "*" | "/" | "%" | "(" | ")" });
      pos++;
      continue;
    }
    const m = /^\d+(\.\d+)?/.exec(texto.slice(pos));
    if (m) {
      const depois = texto[pos + m[0].length];
      if (depois === "." || depois === ",") {
        throw new ErroExpressao("Use ponto decimal e não use separador de milhar (ex.: 1234.56).");
      }
      tokens.push({ tipo: "numero", valor: m[0] });
      pos += m[0].length;
      continue;
    }
    if (c === ",") throw new ErroExpressao("Use ponto decimal e não use separador de milhar (ex.: 1234.56).");
    throw new ErroExpressao(`Caractere não permitido na expressão: "${c}".`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  private profundidade = 0;
  constructor(private readonly tokens: Token[]) {}

  analisar(): Decimal {
    const v = this.expressao();
    if (this.pos < this.tokens.length) throw new ErroExpressao("Expressão malformada.");
    return v;
  }

  private espiar(): Token | undefined {
    return this.tokens[this.pos];
  }

  private ehOp(valor: string): boolean {
    const t = this.espiar();
    return t?.tipo === "op" && t.valor === valor;
  }

  private expressao(): Decimal {
    let v = this.termo();
    while (this.ehOp("+") || this.ehOp("-")) {
      const op = this.tokens[this.pos++]!.valor;
      const d = this.termo();
      v = op === "+" ? v.plus(d) : v.minus(d);
    }
    return v;
  }

  private termo(): Decimal {
    let v = this.unario();
    while (this.ehOp("*") || this.ehOp("/")) {
      const op = this.tokens[this.pos++]!.valor;
      const d = this.unario();
      if (op === "*") {
        v = v.times(d);
      } else {
        if (d.isZero()) throw new ErroExpressao("Divisão por zero.");
        v = v.div(d);
      }
    }
    return v;
  }

  private unario(): Decimal {
    if (this.ehOp("-") || this.ehOp("+")) {
      const op = this.tokens[this.pos++]!.valor;
      this.entrar();
      const v = this.unario();
      this.profundidade--;
      return op === "-" ? v.negated() : v;
    }
    return this.posfixo();
  }

  private posfixo(): Decimal {
    let v = this.primario();
    while (this.ehOp("%")) {
      this.pos++;
      v = v.div(100);
    }
    return v;
  }

  private primario(): Decimal {
    const t = this.espiar();
    if (!t) throw new ErroExpressao("Expressão incompleta.");
    if (t.tipo === "numero") {
      this.pos++;
      return new D(t.valor);
    }
    if (t.valor === "(") {
      this.pos++;
      this.entrar();
      const v = this.expressao();
      this.profundidade--;
      if (!this.ehOp(")")) throw new ErroExpressao("Parêntese sem fechamento.");
      this.pos++;
      return v;
    }
    throw new ErroExpressao("Expressão malformada.");
  }

  private entrar(): void {
    this.profundidade++;
    if (this.profundidade > MAX_PROFUNDIDADE) throw new ErroExpressao("Expressão aninhada demais.");
  }
}

export function calcularExpressao(expressao: string): ResultadoDominio<ResultadoCalculo> {
  if (typeof expressao !== "string" || expressao.trim().length === 0) {
    return erro("ARGUMENTOS_INVALIDOS", "Informe uma expressão para calcular.", ["expressao"]);
  }
  if (expressao.length > MAX_CARACTERES) {
    return erro("ARGUMENTOS_INVALIDOS", `A expressão pode ter no máximo ${MAX_CARACTERES} caracteres.`, ["expressao"]);
  }
  try {
    const tokens = tokenizar(expressao);
    if (tokens.filter((t) => t.tipo === "numero").length > MAX_NUMEROS) {
      throw new ErroExpressao(`A expressão pode ter no máximo ${MAX_NUMEROS} números.`);
    }
    const valor = new Parser(tokens).analisar();
    const arredondado = valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    // `+ 0` normaliza -0 para 0.
    const resultado_centavos = arredondado.times(100).toNumber() + 0;
    if (!Number.isSafeInteger(resultado_centavos)) {
      throw new ErroExpressao("Resultado grande demais.");
    }
    // "-0.00" vira "0.00".
    const resultado = arredondado.isZero() ? "0.00" : arredondado.toFixed(2);
    return { ok: true, expressao, resultado, resultado_centavos, rotulo: ROTULO };
  } catch (e) {
    if (e instanceof ErroExpressao) return erro("ARGUMENTOS_INVALIDOS", e.message, ["expressao"]);
    throw e;
  }
}
