import { describe, it, expect, vi, beforeEach } from "vitest"

const findUnique = vi.fn()
const findMany = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    portfolioConfig: { findUnique: (...args: unknown[]) => findUnique(...args) },
    ofertaDecisao: { findMany: (...args: unknown[]) => findMany(...args) },
  },
}))

import { getActiveCapitalAllocation } from "./capital"

describe("getActiveCapitalAllocation", () => {
  beforeEach(() => {
    findUnique.mockReset()
    findMany.mockReset()
  })

  it("soma budgetTesteAlocado apenas das ofertas APROVADO_TESTE/EM_EXECUCAO", async () => {
    findUnique.mockResolvedValue({ totalAvailableCapital: 5000, currency: "USD" })
    findMany.mockResolvedValue([
      { id: "1", nome: "Oferta A", statusDecisao: "APROVADO_TESTE", budgetTesteAlocado: 500 },
      { id: "2", nome: "Oferta B", statusDecisao: "APROVADO_TESTE", budgetTesteAlocado: 800 },
      { id: "3", nome: "Oferta C", statusDecisao: "APROVADO_TESTE", budgetTesteAlocado: 200 },
      { id: "4", nome: "Oferta D", statusDecisao: "EM_EXECUCAO", budgetTesteAlocado: 1000 },
    ])

    const result = await getActiveCapitalAllocation()

    expect(result.totalAvailableCapital).toBe(5000)
    expect(result.totalAllocated).toBe(2500)
    expect(result.totalFree).toBe(2500)
    expect(result.allocations).toHaveLength(4)

    // Garante que a query já filtra pelo statusDecisao correto (não soma GARIMPO/PAUSADO/DESCARTADO)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statusDecisao: { in: ["APROVADO_TESTE", "EM_EXECUCAO"] } },
      }),
    )
  })

  it("trata budgetTesteAlocado null como zero", async () => {
    findUnique.mockResolvedValue({ totalAvailableCapital: 1000, currency: "USD" })
    findMany.mockResolvedValue([
      { id: "1", nome: "Oferta A", statusDecisao: "EM_EXECUCAO", budgetTesteAlocado: null },
    ])

    const result = await getActiveCapitalAllocation()

    expect(result.totalAllocated).toBe(0)
    expect(result.totalFree).toBe(1000)
  })

  it("usa totalAvailableCapital = 0 quando PortfolioConfig ainda não foi configurado", async () => {
    findUnique.mockResolvedValue(null)
    findMany.mockResolvedValue([])

    const result = await getActiveCapitalAllocation()

    expect(result.totalAvailableCapital).toBe(0)
    expect(result.totalAllocated).toBe(0)
    expect(result.totalFree).toBe(0)
  })
})
