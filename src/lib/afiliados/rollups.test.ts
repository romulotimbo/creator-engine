import { describe, it, expect } from "vitest"
import { computeProdutoRollups, alertaOrcamentoEstourado } from "./rollups"

describe("computeProdutoRollups", () => {
  it("soma o latest snapshot de duas campanhas", () => {
    const result = computeProdutoRollups(
      [
        { snapshots: [{ gasto: 400, receitaConfirmada: 800, conversoes: 4, dataSnapshot: "2026-08-14" }] },
        { snapshots: [{ gasto: 250, receitaConfirmada: 100, conversoes: 1, dataSnapshot: "2026-08-14" }] },
      ],
      1000,
    )
    expect(result.gastoTotalAcumulado).toBe(650)
    expect(result.receitaConfirmadaAcumulada).toBe(900)
    expect(result.roiReal).toBeCloseTo((900 - 650) / 650)
    expect(result.cpaReal).toBeCloseTo(650 / 5)
    expect(result.percentualBudgetConsumido).toBeCloseTo(0.65)
  })

  it("ignora snapshot antigo da mesma campanha", () => {
    const result = computeProdutoRollups([
      {
        snapshots: [
          { gasto: 100, receitaConfirmada: 0, conversoes: 0, dataSnapshot: "2026-08-01" },
          { gasto: 400, receitaConfirmada: 200, conversoes: 2, dataSnapshot: "2026-08-14" },
        ],
      },
    ])
    expect(result.gastoTotalAcumulado).toBe(400)
    expect(result.receitaConfirmadaAcumulada).toBe(200)
  })

  it("produto sem campanhas retorna null (não ROI zero)", () => {
    const result = computeProdutoRollups([])
    expect(result.gastoTotalAcumulado).toBeNull()
    expect(result.roiReal).toBeNull()
    expect(result.cpaReal).toBeNull()
    expect(result.dataUltimaAtualizacaoDados).toBeNull()
  })
})

describe("alertaOrcamentoEstourado", () => {
  it("alerta quando TESTANDO e gasto > budget", () => {
    expect(alertaOrcamentoEstourado({ gasto: 1200, budget: 1000, statusOperacional: "TESTANDO" })).toBe(true)
  })

  it("não alerta quando ESCALANDO", () => {
    expect(alertaOrcamentoEstourado({ gasto: 1200, budget: 1000, statusOperacional: "ESCALANDO" })).toBe(false)
  })
})
