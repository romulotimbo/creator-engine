import { describe, it, expect } from "vitest"
import { computeViabilidadeProduto } from "./produto"

describe("computeViabilidadeProduto", () => {
  it("um produto com campanhas em fases diferentes reflete cada uma, sem status único do produto (D8)", () => {
    const v = computeViabilidadeProduto([
      { status: "TESTANDO" },
      { status: "ESCALANDO" },
      { status: "PAUSADO" },
    ])
    expect(v.porStatus).toEqual({ TESTANDO: 1, ESCALANDO: 1, PAUSADO: 1 })
  })

  it("conta Falha de Execução vs Falha de Mercado só entre campanhas ENCERRADO", () => {
    const v = computeViabilidadeProduto([
      { status: "ENCERRADO", motivoEncerramento: "FALHA_EXECUCAO" },
      { status: "ENCERRADO", motivoEncerramento: "FALHA_MERCADO" },
      { status: "ENCERRADO", motivoEncerramento: "FALHA_MERCADO" },
      { status: "TESTANDO" }, // não conta pro breakdown de motivo
    ])
    expect(v.falhaExecucao).toBe(1)
    expect(v.falhaMercado).toBe(2)
    expect(v.porStatus.ENCERRADO).toBe(3)
  })

  it("sem campanhas retorna vazio, sem quebrar", () => {
    const v = computeViabilidadeProduto([])
    expect(v.porStatus).toEqual({})
    expect(v.falhaExecucao).toBe(0)
    expect(v.falhaMercado).toBe(0)
  })

  it("campanha pausada não afeta a leitura das demais (produto ATIVO com campanha PAUSADO)", () => {
    const v = computeViabilidadeProduto([{ status: "PAUSADO" }, { status: "ESCALANDO" }])
    expect(v.porStatus.PAUSADO).toBe(1)
    expect(v.porStatus.ESCALANDO).toBe(1)
  })
})
