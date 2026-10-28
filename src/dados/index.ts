// Personas (spec §6.1 `dados`). B0: só a P1 mínima; o B2 troca pelas personas geradas.

import {
  erro,
  esquemaPersona,
  type Persona,
  type ResultadoDominio,
  type ResumoPersona,
} from "@/contratos";
import p1 from "../../dados/personas/p1-minima.json";

const BRUTAS: Record<string, unknown> = { p1 };

export function listarPersonas(): ResumoPersona[] {
  return Object.values(BRUTAS).map((b) => {
    const p = b as Persona;
    return { id: p.id, nome: p.nome, resumo: p.resumo };
  });
}

export type ViolacaoInvariante = { invariante: number; mensagem: string };

/**
 * Invariantes da spec §4.2 aplicáveis aos dados presentes. Recebe o JSON bruto:
 * o esquema estrito cobre o invariante 11 (campos proibidos). Usado no
 * carregamento e pelo gerador de personas (B2).
 */
export function verificarInvariantes(bruta: unknown): ViolacaoInvariante[] {
  const r = esquemaPersona.safeParse(bruta);
  if (!r.success) {
    return r.error.issues.map((i) => ({ invariante: 11, mensagem: `${i.path.join(".")}: ${i.message}` }));
  }
  const p = r.data;
  const v: ViolacaoInvariante[] = [];

  // 1. Identificadores únicos.
  const ids = [
    ...p.historico.map((l) => l.id),
    ...p.compromissos.map((c) => c.id),
    ...(p.cartao?.faturas.map((f) => f.id) ?? []),
    ...(p.cartao?.parcelamentos.map((x) => x.id) ?? []),
    ...p.posicoes.map((x) => x.id),
  ];
  const vistos = new Set<string>();
  for (const id of ids) {
    if (vistos.has(id)) v.push({ invariante: 1, mensagem: `id repetido: ${id}` });
    vistos.add(id);
  }

  // 2. saldo_30_07 + lançamentos de conta (sem compras no cartão) = saldo no início de hoje.
  const movimento = p.historico
    .filter((l) => l.meio !== "cartao_credito")
    .reduce((s, l) => s + (l.tipo === "entrada" ? l.valor_centavos : -l.valor_centavos), 0);
  if (p.conta.saldo_30_07_centavos + movimento !== p.conta.saldo_inicio_hoje_centavos) {
    v.push({
      invariante: 2,
      mensagem: `saldo 30/07 ${p.conta.saldo_30_07_centavos} + movimento ${movimento} ≠ saldo hoje ${p.conta.saldo_inicio_hoje_centavos}`,
    });
  }

  // 3. Valor de cada fatura = soma dos itens. (Ciclos × compras do histórico: B2.)
  for (const f of p.cartao?.faturas ?? []) {
    const soma = f.itens.reduce((s, i) => s + i.valor_centavos, 0);
    if (soma !== f.valor_centavos) {
      v.push({ invariante: 3, mensagem: `fatura ${f.id}: valor ${f.valor_centavos} ≠ soma dos itens ${soma}` });
    }
  }

  return v;
}

/** Carrega a persona e valida esquema e invariantes. */
export function carregarPersona(id: string): ResultadoDominio<{ persona: Persona }> {
  const bruta = BRUTAS[id];
  if (bruta === undefined) return erro("ARGUMENTOS_INVALIDOS", `persona ${id} não existe`, ["persona_id"]);
  const violacoes = verificarInvariantes(bruta);
  if (violacoes.length > 0) {
    return erro("ESTADO_INVALIDO", `persona ${id} viola invariantes`, [], { violacoes });
  }
  return { ok: true, persona: esquemaPersona.parse(bruta) };
}
