# Turno 3 — sessão A / p1

Mensagem: Corrigindo o que sei: as contas da casa de 15 de novembro são R$ 175, não R$ 200.

Resposta: Correção registrada (D1): Contas da casa em 15/11 agora é R$ 175,00.

**Situação atual:** saldo mínimo de R$ 325,00 em 15/11, sem falta. Saldo final de R$ 3.325,00.

**H1 (separar R$ 420 hoje, salário em 19/11):** falta de R$ 95,00 em 15/11. Saldo final de R$ 2.905,00. Sem o recebimento previsto, o saldo final fica em -R$ 95,00 e a falta continua.

**H2 (separar R$ 420 hoje, salário em 09/11):** saldo mínimo de R$ 680,00 em 05/11, sem falta. Saldo final de R$ 2.905,00. A cobertura depende do recebimento previsto; sem ele, haveria falta de R$ 95,00 em 15/11.

Premissas: o salário é recebimento previsto, não confirmado. Tudo é simulação, nada foi movimentado.

Latência: 13514 ms. Visível no chat: true.

## Estado antes
```json
{
  "persona_id": "p1",
  "versao": 2,
  "declaracoes": [],
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
    "D": 0,
    "H": 2,
    "OP": 0
  }
}
```

## Estado depois
```json
{
  "persona_id": "p1",
  "versao": 3,
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

## Saldo, rastro e cartões
```json
{
  "saldo_conta": 180000,
  "rastro": [
    {
      "chamada": 1,
      "ferramenta": "registrar_declaracao",
      "argumentos": {
        "alteracao": {
          "operacao": "alterar_evento",
          "evento_id": "C",
          "valor": "175"
        }
      },
      "resultado": {
        "ok": true,
        "declaracao_id": "D1",
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
          },
          {
            "cenario_id": "H2",
            "indicadores": {
              "saldo_inicial_centavos": 180000,
              "saldo_minimo_centavos": 68000,
              "data_saldo_minimo": "2026-11-05",
              "primeira_falta": null,
              "insuficiencia_centavos": 0,
              "margem_hoje_centavos": 68000,
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
              "cobertura_depende_de_recebimento"
            ]
          }
        ],
        "valores_formatados": {
          "indicadores.saldo_inicial_centavos": "R$ 1.800,00",
          "indicadores.saldo_minimo_centavos": "R$ 325,00",
          "indicadores.insuficiencia_centavos": "R$ 0,00",
          "indicadores.margem_hoje_centavos": "R$ 325,00",
          "indicadores.saldo_final_centavos": "R$ 3.325,00",
          "indicadores.sem_recebimentos.insuficiencia_centavos": "R$ 0,00",
          "indicadores.sem_recebimentos.saldo_final_centavos": "R$ 325,00",
          "cenarios[0].linhas[0].valor_centavos": "R$ 700,00",
          "cenarios[0].linhas[0].saldo_apos_centavos": "R$ 1.100,00",
          "cenarios[0].linhas[1].valor_centavos": "R$ 600,00",
          "cenarios[0].linhas[1].saldo_apos_centavos": "R$ 500,00",
          "cenarios[0].linhas[2].valor_centavos": "R$ 175,00",
          "cenarios[0].linhas[2].saldo_apos_centavos": "R$ 325,00",
          "cenarios[0].linhas[2].original.valor_centavos": "R$ 200,00",
          "cenarios[0].linhas[3].valor_centavos": "R$ 3.000,00",
          "cenarios[0].linhas[3].saldo_apos_centavos": "R$ 3.325,00",
          "cenarios[0].indicadores.saldo_inicial_centavos": "R$ 1.800,00",
          "cenarios[0].indicadores.saldo_minimo_centavos": "R$ 325,00",
          "cenarios[0].indicadores.insuficiencia_centavos": "R$ 0,00",
          "cenarios[0].indicadores.margem_hoje_centavos": "R$ 325,00",
          "cenarios[0].indicadores.saldo_final_centavos": "R$ 3.325,00",
          "cenarios[0].indicadores.sem_recebimentos.insuficiencia_centavos": "R$ 0,00",
          "cenarios[0].indicadores.sem_recebimentos.saldo_final_centavos": "R$ 325,00",
          "cenarios[1].linhas[0].valor_centavos": "R$ 420,00",
          "cenarios[1].linhas[0].saldo_apos_centavos": "R$ 1.380,00",
          "cenarios[1].linhas[1].valor_centavos": "R$ 700,00",
          "cenarios[1].linhas[1].saldo_apos_centavos": "R$ 680,00",
          "cenarios[1].linhas[2].valor_centavos": "R$ 600,00",
          "cenarios[1].linhas[2].saldo_apos_centavos": "R$ 80,00",
          "cenarios[1].linhas[3].valor_centavos": "R$ 175,00",
          "cenarios[1].linhas[3].saldo_apos_centavos": "-R$ 95,00",
          "cenarios[1].linhas[3].original.valor_centavos": "R$ 200,00",
          "cenarios[1].linhas[4].valor_centavos": "R$ 3.000,00",
          "cenarios[1].linhas[4].saldo_apos_centavos": "R$ 2.905,00",
          "cenarios[1].indicadores.saldo_inicial_centavos": "R$ 1.800,00",
          "cenarios[1].indicadores.saldo_minimo_centavos": "-R$ 95,00",
          "cenarios[1].indicadores.primeira_falta.valor_descoberto_centavos": "R$ 95,00",
          "cenarios[1].indicadores.insuficiencia_centavos": "R$ 95,00",
          "cenarios[1].indicadores.margem_hoje_centavos": "R$ 0,00",
          "cenarios[1].indicadores.saldo_final_centavos": "R$ 2.905,00",
          "cenarios[1].indicadores.sem_recebimentos.insuficiencia_centavos": "R$ 95,00",
          "cenarios[1].indicadores.sem_recebimentos.primeira_falta.valor_descoberto_centavos": "R$ 95,00",
          "cenarios[1].indicadores.sem_recebimentos.saldo_final_centavos": "-R$ 95,00",
          "cenarios[2].linhas[0].valor_centavos": "R$ 420,00",
          "cenarios[2].linhas[0].saldo_apos_centavos": "R$ 1.380,00",
          "cenarios[2].linhas[1].valor_centavos": "R$ 700,00",
          "cenarios[2].linhas[1].saldo_apos_centavos": "R$ 680,00",
          "cenarios[2].linhas[2].valor_centavos": "R$ 3.000,00",
          "cenarios[2].linhas[2].saldo_apos_centavos": "R$ 3.680,00",
          "cenarios[2].linhas[2].original.valor_centavos": "R$ 3.000,00",
          "cenarios[2].linhas[3].valor_centavos": "R$ 600,00",
          "cenarios[2].linhas[3].saldo_apos_centavos": "R$ 3.080,00",
          "cenarios[2].linhas[4].valor_centavos": "R$ 175,00",
          "cenarios[2].linhas[4].saldo_apos_centavos": "R$ 2.905,00",
          "cenarios[2].linhas[4].original.valor_centavos": "R$ 200,00",
          "cenarios[2].indicadores.saldo_inicial_centavos": "R$ 1.800,00",
          "cenarios[2].indicadores.saldo_minimo_centavos": "R$ 680,00",
          "cenarios[2].indicadores.insuficiencia_centavos": "R$ 0,00",
          "cenarios[2].indicadores.margem_hoje_centavos": "R$ 680,00",
          "cenarios[2].indicadores.saldo_final_centavos": "R$ 2.905,00",
          "cenarios[2].indicadores.sem_recebimentos.insuficiencia_centavos": "R$ 95,00",
          "cenarios[2].indicadores.sem_recebimentos.primeira_falta.valor_descoberto_centavos": "R$ 95,00",
          "cenarios[2].indicadores.sem_recebimentos.saldo_final_centavos": "-R$ 95,00"
        }
      }
    }
  ],
  "cartoes": [
    {
      "tipo": "o_que_mudou",
      "alteracoes": [
        {
          "tipo": "declaracao_registrada",
          "id": "D1",
          "descricao": "Contas da casa (C) em 15/11: R$ 200,00 → R$ 175,00"
        }
      ],
      "cenarios": [
        {
          "cenario_id": "atual",
          "nome": "Situação atual",
          "situacao": "alterado",
          "diferencas": [
            {
              "indicador": "saldo_minimo_centavos",
              "antes": 30000,
              "depois": 32500
            },
            {
              "indicador": "margem_hoje_centavos",
              "antes": 30000,
              "depois": 32500
            },
            {
              "indicador": "saldo_final_centavos",
              "antes": 330000,
              "depois": 332500
            },
            {
              "indicador": "sem_recebimentos_saldo_final_centavos",
              "antes": 30000,
              "depois": 32500
            }
          ]
        },
        {
          "cenario_id": "H1",
          "nome": "Separar R$ 420 hoje",
          "situacao": "alterado",
          "diferencas": [
            {
              "indicador": "saldo_minimo_centavos",
              "antes": -12000,
              "depois": -9500
            },
            {
              "indicador": "primeira_falta_valor_centavos",
              "antes": 12000,
              "depois": 9500
            },
            {
              "indicador": "insuficiencia_centavos",
              "antes": 12000,
              "depois": 9500
            },
            {
              "indicador": "saldo_final_centavos",
              "antes": 288000,
              "depois": 290500
            },
            {
              "indicador": "sem_recebimentos_insuficiencia_centavos",
              "antes": 12000,
              "depois": 9500
            },
            {
              "indicador": "sem_recebimentos_saldo_final_centavos",
              "antes": -12000,
              "depois": -9500
            }
          ]
        },
        {
          "cenario_id": "H2",
          "nome": "Salário em 09/11",
          "situacao": "alterado",
          "diferencas": [
            {
              "indicador": "saldo_final_centavos",
              "antes": 288000,
              "depois": 290500
            },
            {
              "indicador": "sem_recebimentos_insuficiencia_centavos",
              "antes": 12000,
              "depois": 9500
            },
            {
              "indicador": "sem_recebimentos_saldo_final_centavos",
              "antes": -12000,
              "depois": -9500
            }
          ]
        }
      ]
    },
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
        },
        {
          "cenario_id": "H2",
          "indicadores": {
            "saldo_inicial_centavos": 180000,
            "saldo_minimo_centavos": 68000,
            "data_saldo_minimo": "2026-11-05",
            "primeira_falta": null,
            "insuficiencia_centavos": 0,
            "margem_hoje_centavos": 68000,
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
            "cobertura_depende_de_recebimento"
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
    "id": "bb239761-4be9-456f-b945-a6e67909d921",
    "em": "2026-10-29T19:08:33.485Z",
    "provedor": "openrouter"
  },
  {
    "evento": "resultado",
    "id": "bb239761-4be9-456f-b945-a6e67909d921",
    "em": "2026-10-29T19:08:35.238Z",
    "status": 200,
    "duracao_ms": 1753
  },
  {
    "evento": "tentativa",
    "id": "555e9af3-2e57-421e-911f-430dcabf3754",
    "em": "2026-10-29T19:08:45.480Z",
    "provedor": "openrouter"
  },
  {
    "evento": "resultado",
    "id": "555e9af3-2e57-421e-911f-430dcabf3754",
    "em": "2026-10-29T19:08:46.261Z",
    "status": 200,
    "duracao_ms": 781
  }
]
```
