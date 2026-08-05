import { describe, it, expect } from "vitest"
import { calcularScoreOferta } from "./scoring"

describe("calcularScoreOferta", () => {
  it("clampa o score em 0 quando a soma bruta dos fatores é negativa", () => {
    const result = calcularScoreOferta({
      epcRede: null,
      comissaoValor: null,
      refundPct: 100,
      tendenciaTrafego30d: -50,
    })

    expect(result.completudeDados).toBe("INCOMPLETO")
    expect(result.scoreCalculado).toBe(0)
    expect(result.scoreCalculado).toBeGreaterThanOrEqual(0)
  })

  it("nunca ultrapassa 100 mesmo com todos os fatores no valor máximo (clamp de segurança)", () => {
    const result = calcularScoreOferta({
      epcRede: 999,
      comissaoValor: 999,
      refundPct: 0,
      tendenciaTrafego30d: 100,
      cpcMedioEsperado: 1,
      volumeBuscaMensal: 1000,
    })

    expect(result.scoreCalculado).toBeLessThanOrEqual(100)
  })

  it("retorna scoreBreakdown com os fatores individuais", () => {
    const result = calcularScoreOferta({
      epcRede: 2.5,
      comissaoValor: 100,
      refundPct: 8.85,
      tendenciaTrafego30d: 10,
    })

    expect(result.scoreBreakdown).toHaveProperty("epcScore")
    expect(result.scoreBreakdown).toHaveProperty("refundScore")
    expect(result.scoreBreakdown).toHaveProperty("tendenciaScore")
    expect(result.scoreBreakdown).toHaveProperty("comissaoScore")
    expect(result.scoreBreakdown).toHaveProperty("penalidade")
  })

  it("paymentReliabilityScore da rede não é um input aceito pelo cálculo — não influencia o score", () => {
    const input = { epcRede: 2.5, comissaoValor: 100, refundPct: 5, tendenciaTrafego30d: 10 }

    // Mesmo se alguém tentasse "injetar" um campo extra (ex: paymentReliabilityScore),
    // calcularScoreOferta ignora qualquer propriedade fora de OfertaScoringInput.
    const withExtra = calcularScoreOferta({ ...input, paymentReliabilityScore: 5 } as never)
    const withoutExtra = calcularScoreOferta(input)

    expect(withExtra.scoreCalculado).toBe(withoutExtra.scoreCalculado)
  })
})
