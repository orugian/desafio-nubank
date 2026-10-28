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

/** Carrega a persona e valida esquema e invariantes. */
export function carregarPersona(id: string): ResultadoDominio<{ persona: Persona }> {
  const bruta = BRUTAS[id];
  if (bruta === undefined) return erro("ARGUMENTOS_INVALIDOS", `persona ${id} não existe`, ["persona_id"]);
  const r = esquemaPersona.safeParse(bruta);
  if (!r.success) {
    return erro("ESTADO_INVALIDO", `persona ${id} fora do esquema`, [], {
      problemas: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  return { ok: true, persona: r.data };
}
