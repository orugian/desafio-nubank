#!/usr/bin/env python3
"""
Conferência independente das personas geradas (plano B2 · comportamento 5).
Recalcula saldo, faturas, gasto diário, conta estimada e valores de investimento
a partir dos arquivos JSON em `dados/personas/` e das séries gravadas em
`dados/mercado/`, sem importar código TypeScript.
"""

from __future__ import annotations

import datetime as dt
import json
import math
import sys
from decimal import Decimal, ROUND_HALF_UP, localcontext
from pathlib import Path

HOJE = "2026-10-30"
INICIO_HISTORICO = "2026-04-30"
FIM_HISTORICO = "2026-10-29"
DIAS_HISTORICO = 183

FERIADOS = {
    "2026-11-02",
    "2026-11-15",
    "2026-11-20",
    "2026-12-25",
    "2027-01-01",
}

CATEGORIAS_VARIAVEIS = {
    "mercado",
    "restaurante",
    "delivery",
    "transporte",
    "lazer",
    "compras",
    "outros",
}


def somar_dias(data_iso: str, n: int) -> str:
    d = dt.date.fromisoformat(data_iso) + dt.timedelta(days=n)
    return d.isoformat()


def eh_dia_util(data_iso: str, datas_cdi: set[str], fim_serie: str) -> bool:
    if data_iso < HOJE and data_iso <= fim_serie:
        return data_iso in datas_cdi
    d = dt.date.fromisoformat(data_iso)
    # weekday(): 0 = Monday ... 5 = Saturday, 6 = Sunday
    return d.weekday() < 5 and data_iso not in FERIADOS


def somar_dias_uteis(data_iso: str, n: int, datas_cdi: set[str], fim_serie: str) -> str:
    atual = data_iso
    while not eh_dia_util(atual, datas_cdi, fim_serie):
        atual = somar_dias(atual, 1)
    for _ in range(n):
        atual = somar_dias(atual, 1)
        while not eh_dia_util(atual, datas_cdi, fim_serie):
            atual = somar_dias(atual, 1)
    return atual


def formatar_pct_2_casas(numerador: Decimal, denominador: Decimal) -> str:
    if denominador == 0:
        return "0.00"
    with localcontext() as ctx:
        ctx.prec = 50
        ctx.rounding = ROUND_HALF_UP
        val = (numerador * Decimal(100) / denominador).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return f"{val:.2f}"


def data_disponivel(pos: dict, datas_cdi: set[str], fim_serie: str) -> str:
    regra = pos["liquidez"]["regra"]
    if regra == "imediata":
        return HOJE
    if regra == "d_mais_uteis":
        return somar_dias_uteis(HOJE, int(pos["liquidez"]["dias"]), datas_cdi, fim_serie)
    if regra == "no_vencimento":
        return pos["vencimento"]
    raise ValueError(f"regra desconhecida: {regra}")


def classificar_posicao(pos: dict, valor_atual: int, disp: str, ate_data: str) -> tuple[str, int, int, int]:
    prot = pos.get("protecao")
    if prot and prot.get("tipo") == "integral":
        return ("protegida", valor_atual, 0, 0)
    parcial = min(int(prot["valor_centavos"]), valor_atual) if (prot and prot.get("tipo") == "parcial") else 0
    livre = max(0, valor_atual - parcial)
    if disp > ate_data:
        return ("nao_resgatavel_ate_data", parcial, livre, 0)
    return ("resgatavel_ate_data", parcial, 0, livre)


def ate_data_default_sessao_nova(persona_id: str) -> str:
    # Em sessão nova: P1 saldo mínimo em 15/11; P2 primeira falta em 08/11; P3 saldo mínimo em 13/11.
    return {
        "p1": "2026-11-15",
        "p2": "2026-11-08",
        "p3": "2026-11-13",
    }[persona_id]


def conferir_persona(
    persona: dict,
    serie_cdi: list[dict],
    fechamentos: dict[str, list[dict]],
) -> tuple[dict, list[str]]:
    erros: list[str] = []
    pid = persona["id"]

    # 1. Saldo no início de hoje a partir de saldo_30_07 (checkpoint) + movimentos desde 30/07
    mov_desde_3007 = sum(
        (l["valor_centavos"] if l["tipo"] == "entrada" else -l["valor_centavos"])
        for l in persona["historico"]
        if l["meio"] != "cartao_credito" and l["data"] >= "2026-07-30"
    )
    saldo_recalculado = int(persona["conta"]["saldo_30_07_centavos"]) + mov_desde_3007
    if saldo_recalculado != int(persona["conta"]["saldo_inicio_hoje_centavos"]):
        erros.append(
            f"{pid}: saldo_inicio_hoje {persona['conta']['saldo_inicio_hoje_centavos']} != recalculado {saldo_recalculado} (a partir de saldo_30_07)"
        )

    if persona["conta"].get("saldo_inicio_historico_centavos") is not None:
        mov_total = sum(
            (l["valor_centavos"] if l["tipo"] == "entrada" else -l["valor_centavos"])
            for l in persona["historico"]
            if l["meio"] != "cartao_credito"
        )
        saldo_total = int(persona["conta"]["saldo_inicio_historico_centavos"]) + mov_total
        if saldo_total != int(persona["conta"]["saldo_inicio_hoje_centavos"]):
            erros.append(
                f"{pid}: saldo_inicio_hoje {persona['conta']['saldo_inicio_hoje_centavos']} != recalculado {saldo_total} (a partir de saldo_inicio_historico)"
            )

    # 2. Faturas
    faturas_recalc = []
    if persona.get("cartao"):
        for f in persona["cartao"]["faturas"]:
            soma_itens = sum(int(i["valor_centavos"]) for i in f["itens"])
            if soma_itens != int(f["valor_centavos"]):
                erros.append(f"{pid}: fatura {f['id']} valor {f['valor_centavos']} != soma itens {soma_itens}")
            faturas_recalc.append(
                {
                    "id": f["id"],
                    "vencimento": f["vencimento"],
                    "valor_centavos": soma_itens,
                }
            )

    # 3. Gasto diário
    total_var = sum(
        int(l["valor_centavos"])
        for l in persona["historico"]
        if l["tipo"] == "saida"
        and l["meio"] in ("pix", "debito")
        and l["categoria"] in CATEGORIAS_VARIAVEIS
    )
    base_dias = int(persona.get("gasto_diario", {}).get("base", {}).get("dias", DIAS_HISTORICO))
    gasto_diario_recalc = (total_var + base_dias - 1) // base_dias
    if gasto_diario_recalc != int(persona["gasto_diario"]["valor_centavos"]):
        erros.append(
            f"{pid}: gasto_diario {persona['gasto_diario']['valor_centavos']} != recalculado {gasto_diario_recalc}"
        )

    # 4. Contas estimadas (H-05)
    contas_estimadas = []
    for c in persona["compromissos"]:
        if c.get("estimativa") is not None:
            ocs = c["estimativa"]["ocorrencias"]
            media_teto = math.ceil(sum(int(o["valor_centavos"]) for o in ocs) / 3)
            if media_teto != int(c["valor_centavos"]):
                erros.append(f"{pid}: conta estimada {c['id']} {c['valor_centavos']} != {media_teto}")
            contas_estimadas.append({"id": c["id"], "valor_centavos": media_teto})

    # 5. Investimentos com séries reais
    ordenada_cdi = sorted(serie_cdi, key=lambda x: x["data"])
    por_data_cdi = {x["data"]: x["taxa_diaria_pct"] for x in ordenada_cdi}
    datas_cdi = set(por_data_cdi.keys())
    fim_serie = ordenada_cdi[-1]["data"]

    def taxa_no_dia(d: str) -> str:
        if d in por_data_cdi:
            return por_data_cdi[d]
        for item in reversed(ordenada_cdi):
            if item["data"] <= d:
                return item["taxa_diaria_pct"]
        return ordenada_cdi[0]["taxa_diaria_pct"]

    ate_data = ate_data_default_sessao_nova(pid)
    posicoes_recalc = []
    totais = {
        "valor_total_centavos": 0,
        "protegido_centavos": 0,
        "nao_resgatavel_centavos": 0,
        "resgatavel_centavos": 0,
    }

    with localcontext() as ctx:
        ctx.prec = 50
        ctx.rounding = ROUND_HALF_UP

        for pos in persona["posicoes"]:
            cat = pos["categoria"]
            disp = data_disponivel(pos, datas_cdi, fim_serie)
            valor_izacao_pct = None

            if cat == "saldo_separado":
                aplicado = sum(int(a["valor_centavos"]) for a in pos["aportes"])
                valor_atual = aplicado
            elif cat in ("caixinha", "cdb_liquidez_diaria", "cdb_vencimento", "fundo"):
                pct = Decimal(str(pos["cdi_pct"])) / Decimal(100)
                aplicado = 0
                acumulado = Decimal(0)
                for ap in pos["aportes"]:
                    aplicado += int(ap["valor_centavos"])
                    fator = Decimal(1)
                    d = ap["data"]
                    while d < HOJE:
                        if eh_dia_util(d, datas_cdi, fim_serie):
                            taxa_dia = Decimal(taxa_no_dia(d)) / Decimal(100)
                            fator = fator * (Decimal(1) + taxa_dia * pct)
                        d = somar_dias(d, 1)
                    acumulado += Decimal(int(ap["valor_centavos"])) * fator
                valor_atual = int(acumulado.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
            else:
                ticker = pos["ticker"]
                serie_ativo = sorted(fechamentos[ticker], key=lambda x: x["data"])
                preco_atual = int(serie_ativo[-1]["preco_centavos"])
                base_3007 = next(
                    (int(x["preco_centavos"]) for x in serie_ativo if x["data"] >= INICIO_HISTORICO),
                    int(serie_ativo[0]["preco_centavos"]),
                )
                qtd_total = Decimal(0)
                custo_acum = Decimal(0)
                for comp in pos["compras"]:
                    q = Decimal(comp["quantidade"])
                    qtd_total += q
                    custo_acum += q * Decimal(int(comp["preco_centavos"]))
                    # Confere também que a compra usou o fechamento gravado da data
                    fech_compra = next((int(x["preco_centavos"]) for x in serie_ativo if x["data"] == comp["data"]), None)
                    if fech_compra != int(comp["preco_centavos"]):
                        erros.append(f"{pid}: {pos['id']} compra {comp['data']} != fechamento {fech_compra}")
                aplicado = int(custo_acum.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                valor_atual = int((qtd_total * Decimal(preco_atual)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                valor_izacao_pct = formatar_pct_2_casas(Decimal(preco_atual - base_3007), Decimal(base_3007))

            resultado = valor_atual - aplicado
            rentabilidade_pct = formatar_pct_2_casas(Decimal(resultado), Decimal(aplicado))
            _, protegido, nao_resg, resg = classificar_posicao(pos, valor_atual, disp, ate_data)

            totais["valor_total_centavos"] += valor_atual
            totais["protegido_centavos"] += protegido
            totais["nao_resgatavel_centavos"] += nao_resg
            totais["resgatavel_centavos"] += resg

            posicoes_recalc.append(
                {
                    "posicao_id": pos["id"],
                    "aplicado_centavos": aplicado,
                    "valor_atual_centavos": valor_atual,
                    "resultado_centavos": resultado,
                    "rentabilidade_pct": rentabilidade_pct,
                    "valorizacao_periodo_pct": valor_izacao_pct,
                    "data_disponibilidade": disp,
                }
            )

    # 12. Invariante 12: Renda
    if "renda" in persona and persona["renda"]:
        renda = persona["renda"]
        bruto = int(renda["bruto_mensal_centavos"])
        liquido = int(renda["liquido_mensal_centavos"])
        if liquido > bruto:
            erros.append(f"{pid}: renda liquido {liquido} > bruto {bruto}")
        entradas_rec = [
            l
            for l in persona["historico"]
            if l.get("tipo") == "entrada" and l.get("categoria") == "receitas"
        ]
        if entradas_rec:
            meses_distintos = {l["data"][:7] for l in entradas_rec}
            soma_rec = sum(int(l["valor_centavos"]) for l in entradas_rec)
            media_rec = int(
                (Decimal(soma_rec) / Decimal(len(meses_distintos))).quantize(
                    Decimal("1"), rounding=ROUND_HALF_UP
                )
            )
            if media_rec != liquido:
                erros.append(
                    f"{pid}: renda liquido {liquido} != media receitas {media_rec}"
                )

    resumo = {
        "saldo_inicio_hoje_centavos": saldo_recalculado,
        "gasto_diario_centavos": gasto_diario_recalc,
        "faturas": faturas_recalc,
        "contas_estimadas": contas_estimadas,
        "posicoes": posicoes_recalc,
        "totais": totais,
    }
    return resumo, erros


def main() -> int:
    raiz = Path(__file__).resolve().parents[2]
    pasta_personas = raiz / "dados" / "personas"
    pasta_mercado = raiz / "dados" / "mercado"

    cdi_json = json.loads((pasta_mercado / "cdi.json").read_text(encoding="utf-8"))
    petr4_json = json.loads((pasta_mercado / "fechamentos-PETR4.json").read_text(encoding="utf-8"))
    btc_json = json.loads((pasta_mercado / "fechamentos-BTC.json").read_text(encoding="utf-8"))

    fechamentos = {
        "PETR4": petr4_json["serie"],
        "BTC": btc_json["serie"],
    }

    todas_erros: list[str] = []
    relatorio_personas: dict[str, dict] = {}

    for pid in ("p1", "p2", "p3"):
        persona = json.loads((pasta_personas / f"{pid}.json").read_text(encoding="utf-8"))
        resumo, erros = conferir_persona(persona, cdi_json["serie"], fechamentos)
        relatorio_personas[pid] = resumo
        todas_erros.extend(erros)

    saida = {
        "diferencas": len(todas_erros),
        "erros": todas_erros,
        "personas": relatorio_personas,
    }

    caminho_saida = Path(__file__).resolve().parent / "conferencia.json"
    caminho_saida.write_text(json.dumps(saida, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if todas_erros:
        for e in todas_erros:
            print(f"ERRO: {e}", file=sys.stderr)
        return 1
    print("Conferência Python concluída: 0 diferenças.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
