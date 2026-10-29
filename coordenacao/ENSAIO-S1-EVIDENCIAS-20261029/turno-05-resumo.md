# Turno 5 — sessão A / p1

Mensagem: Desfaça só a possibilidade em que o salário chega em 9 de novembro; mantenha a separação hipotética e a correção das contas.

Resposta: H2 removida. Continuam ativos:

**Situação atual:** saldo mínimo de R$ 325,00 em 15/11, sem falta. Saldo final de R$ 3.325,00.

**H1 (separar R$ 420 hoje, salário em 19/11):** falta de R$ 95,00 em 15/11, nas Contas da casa. Saldo final de R$ 2.905,00. Sem o recebimento previsto, o saldo final fica em -R$ 95,00 e a falta continua.

A correção das contas da casa para R$ 175,00 segue registrada. Tudo é simulação, nada foi movimentado.

Latência: 4914 ms. Visível no chat: true.

## Estado antes
```json
{
  "persona_id": "p1",
  "versao": 4,
  "declaracoes": [
    {
      "id": "D1",
      "mensagem_id": "msg-1793300913447-3",
      "alteracao": {
        "operacao": "alterar_evento",
        "evento_id": "C",
        "valor": "175"
      }
    }
  ],
  "hipoteses": [
    {
      "id": "H1",
      "nome": "Separar R$ 420 hoje",
      "a_partir_de": "atual",
      "mensagem_id": "msg-1793300891183-1",
      "alteracoes": [
        {
          "id": "H1.1",
          "copiado_de": null,
          "alteracao": {
            "operacao": "separar",
            "valor": "420",
            "data": "2026-10-30"
          }
        }
      ]
    },
    {
      "id": "H2",
      "nome": "Salário em 09/11",
      "a_partir_de": "H1",
      "mensagem_id": "msg-1793300903129-2",
      "alteracoes": [
        {
          "id": "H2.1",
          "copiado_de": "H1.1",
          "alteracao": {
            "operacao": "separar",
            "valor": "420",
            "data": "2026-10-30"
          }
        },
        {
          "id": "H2.2",
          "copiado_de": null,
          "alteracao": {
            "operacao": "alterar_evento",
            "evento_id": "R1",
            "data": "2026-11-09"
          }
        }
      ]
    }
  ],
  "operacao_pendente": null,
  "operacoes": [],
  "contadores": {
    "D": 1,
    "H": 2,
    "OP": 0
  }
}
```

## Estado depois
```json
{
  "persona_id": "p1",
  "versao": 5,
  "declaracoes": [
    {
      "id": "D1",
      "mensagem_id": "msg-1793300913447-3",
      "alteracao": {
        "operacao": "alterar_evento",
        "evento_id": "C",
        "valor": "175"
      }
    }
  ],
  "hipoteses": [
    {
      "id": "H1",
      "nome": "Separar R$ 420 hoje",
      "a_partir_de": "atual",
      "mensagem_id": "msg-1793300891183-1",
      "alteracoes": [
        {
          "id": "H1.1",
          "copiado_de": null,
          "alteracao": {
            "operacao": "separar",
            "valor": "420",
            "data": "2026-10-30"
          }
        }
      ]
    }
  ],
  "operacao_pendente": null,
  "operacoes": [],
  "contadores": {
    "D": 1,
    "H": 2,
    "OP": 0
  }
}
```

## Saldo, rastro e cartões
```json
{
  "saldo_conta": 180000,
  "rastro": [
    {
      "chamada": 1,
      "ferramenta": "desfazer",
      "argumentos": {
        "alvo_id": "H2"
      },
      "resultado": {
        "ok": true,
        "removido": "H2",
        "cenarios": [
          "atual",
          "H1"
        ],
        "valores_formatados": {}
      }
    }
  ],
  "cartoes": [
    {
      "tipo": "comparacao",
      "cenarios": [
        {
          "cenario_id": "atual",
          "indicadores": {
            "saldo_inicial_centavos": 180000,
            "saldo_minimo_centavos": 32500,
            "data_saldo_minimo": "2026-11-15",
            "primeira_falta": null,
            "insuficiencia_centavos": 0,
            "margem_hoje_centavos": 32500,
            "saldo_final_centavos": 332500,
            "sem_recebimentos": {
              "insuficiencia_centavos": 0,
              "primeira_falta": null,
              "saldo_final_centavos": 32500
            }
          },
          "datas_ordem_relevante": [],
          "faturas_afetadas": [],
          "avisos": []
        },
        {
          "cenario_id": "H1",
          "indicadores": {
            "saldo_inicial_centavos": 180000,
            "saldo_minimo_centavos": -9500,
            "data_saldo_minimo": "2026-11-15",
            "primeira_falta": {
              "data": "2026-11-15",
              "valor_descoberto_centavos": 9500,
              "saidas_do_dia": [
                "C"
              ]
            },
            "insuficiencia_centavos": 9500,
            "margem_hoje_centavos": 0,
            "saldo_final_centavos": 290500,
            "sem_recebimentos": {
              "insuficiencia_centavos": 9500,
              "primeira_falta": {
                "data": "2026-11-15",
                "valor_descoberto_centavos": 9500,
                "saidas_do_dia": [
                  "C"
                ]
              },
              "saldo_final_centavos": -9500
            }
          },
          "datas_ordem_relevante": [],
          "faturas_afetadas": [],
          "avisos": [
            "saldo_final_positivo_com_falta"
          ]
        }
      ]
    }
  ],
  "avisos": []
}
```

## Eventos HTTP do turno
```json
[
  {
    "evento": "tentativa",
    "id": "16fc4e1b-3b61-4ebe-bc79-ea35054f4f9d",
    "em": "2026-10-29T19:09:05.343Z",
    "provedor": "openrouter"
  },
  {
    "evento": "resultado",
    "id": "16fc4e1b-3b61-4ebe-bc79-ea35054f4f9d",
    "em": "2026-10-29T19:09:07.662Z",
    "status": 200,
    "duracao_ms": 2319
  },
  {
    "evento": "tentativa",
    "id": "9fdcc3b1-22a9-4632-9ee3-4ec3d34cbec7",
    "em": "2026-10-29T19:09:07.675Z",
    "provedor": "openrouter"
  },
  {
    "evento": "resultado",
    "id": "9fdcc3b1-22a9-4632-9ee3-4ec3d34cbec7",
    "em": "2026-10-29T19:09:08.643Z",
    "status": 200,
    "duracao_ms": 968
  }
]
```
