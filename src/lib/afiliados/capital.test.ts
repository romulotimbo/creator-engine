import { describe, it, expect, vi, beforeEach } from "vitest"

const findUniquePortfolio = vi.fn()
const findUniqueOrcamento = vi.fn()
const findManyProduto = vi.fn()
const createOrcamento = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    portfolioConfig: { findUnique: (...args: unknown[]) => findUniquePortfolio(...args) },
    orcamentoPeriodo: {
      findUnique: (...args: unknown[]) => findUniqueOrcamento(...args),
      create: (...args: unknown[]) => createOrcamento(...args),
    },
    produtoAfiliado: { findMany: (...args: unknown[]) => findManyProduto(...args) },
  },
}))

import { getActiveCapitalAllocation } from "./capital"
import { previousPeriodo, currentPeriodo, assertBudgetGuardrails } from "./orcamento"
import { calcularCpaAlvoBreakeven } from "./produto"

describe("getActiveCapitalAllocation", () => {
  beforeEach(() => {
    findUniquePortfolio.mockReset()
    findUniqueOrcamento.mockReset()
    findManyProduto.mockReset()
    createOrcamento.mockReset()
  })

  it("soma budget de produtos TESTANDO/ESCALANDO e ignora oferta sem produto", async () => {
    findUniqueOrcamento.mockResolvedValue({
      id: "1",
      periodo: "2026-08",
      capitalTotalDisponivel: 5000,
      moedaBase: "USD",
      limitePctPorProduto: null,
      reservaMinimaPct: 0,
    })
    findManyProduto.mockResolvedValue([
      { id: "p1", nome: "A", statusOperacional: "TESTANDO", budgetTesteAlocado: 500, gastoTotalAcumulado: 200 },
      { id: "p2", nome: "B", statusOperacional: "TESTANDO", budgetTesteAlocado: 800, gastoTotalAcumulado: 0 },
      { id: "p3", nome: "C", statusOperacional: "ESCALANDO", budgetTesteAlocado: 1000, gastoTotalAcumulado: 350 },
    ])

    const result = await getActiveCapitalAllocation(new Date("2026-08-14T15:00:00-03:00"))

    expect(result.totalAvailableCapital).toBe(5000)
    expect(result.totalAllocated).toBe(2300)
    expect(result.totalSpent).toBe(550)
    expect(result.totalFree).toBe(2700)
    expect(result.pctConsumed).toBeCloseTo(550 / 5000)
    expect(findManyProduto).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statusOperacional: { in: ["TESTANDO", "ESCALANDO"] } },
      }),
    )
  })

  it("trata budget null como zero e alerta só em TESTANDO", async () => {
    findUniqueOrcamento.mockResolvedValue({
      id: "1",
      periodo: "2026-08",
      capitalTotalDisponivel: 1000,
      moedaBase: "USD",
      limitePctPorProduto: null,
      reservaMinimaPct: 0,
    })
    findManyProduto.mockResolvedValue([
      { id: "p1", nome: "A", statusOperacional: "TESTANDO", budgetTesteAlocado: null, gastoTotalAcumulado: null },
      { id: "p2", nome: "B", statusOperacional: "TESTANDO", budgetTesteAlocado: 100, gastoTotalAcumulado: 150 },
      { id: "p3", nome: "C", statusOperacional: "ESCALANDO", budgetTesteAlocado: 100, gastoTotalAcumulado: 200 },
    ])

    const result = await getActiveCapitalAllocation(new Date("2026-08-14T15:00:00-03:00"))
    expect(result.totalAllocated).toBe(200)
    expect(result.alerts).toHaveLength(1)
    expect(result.alerts[0].produtoId).toBe("p2")
  })

  it("usa capital 0 quando não há orçamento nem PortfolioConfig", async () => {
    findUniqueOrcamento.mockResolvedValue(null)
    findUniquePortfolio.mockResolvedValue(null)
    findManyProduto.mockResolvedValue([])

    const result = await getActiveCapitalAllocation(new Date("2026-08-14T15:00:00-03:00"))
    expect(result.totalAvailableCapital).toBe(0)
    expect(result.totalAllocated).toBe(0)
  })
})

describe("orcamento periodo helpers", () => {
  it("previousPeriodo volta um mês", () => {
    expect(previousPeriodo("2026-09")).toBe("2026-08")
    expect(previousPeriodo("2026-01")).toBe("2025-12")
    expect(previousPeriodo("agosto")).toBeNull()
  })

  it("currentPeriodo retorna YYYY-MM", () => {
    expect(currentPeriodo(new Date("2026-08-14T15:00:00-03:00"))).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
  })
})

describe("assertBudgetGuardrails", () => {
  it("rejeita budget acima do teto percentual", async () => {
    findUniqueOrcamento.mockResolvedValue({
      id: "1",
      periodo: "2026-08",
      capitalTotalDisponivel: 10000,
      moedaBase: "USD",
      limitePctPorProduto: 30,
      reservaMinimaPct: 0,
    })
    findManyProduto.mockResolvedValue([])
    const err = await assertBudgetGuardrails({ produtoId: "p-new", newBudget: 4000 })
    expect(err?.status).toBe(422)
  })

  it("rejeita alocação que come a reserva mínima", async () => {
    findUniqueOrcamento.mockResolvedValue({
      id: "1",
      periodo: "2026-08",
      capitalTotalDisponivel: 10000,
      moedaBase: "USD",
      limitePctPorProduto: null,
      reservaMinimaPct: 20,
    })
    findManyProduto.mockResolvedValue([
      { id: "p1", budgetTesteAlocado: 7000 },
    ])
    const err = await assertBudgetGuardrails({ produtoId: "p2", newBudget: 1500 })
    expect(err?.status).toBe(422)
  })
})

describe("mapHerancaOfertaParaProduto", () => {
  it("copia conversion point e congela scoreOrigem", async () => {
    const { mapHerancaOfertaParaProduto } = await import("./produto")
    const heranca = mapHerancaOfertaParaProduto({
      conversionPoint: "VALID_CC_SUBMIT",
      tipoProduto: "NUTRACEUTICO_TRIAL",
      ltvEstimadoRebill: 180,
      scoreCalculado: 82,
      comissaoValor: 83,
      budgetTesteAlocado: 500,
      cpaAlvoBreakeven: null,
      criterioPausa: "3x CPA",
      criterioEscala: "ROI > 1",
      domainUsed: "nothforge.com",
      nextReviewAt: null,
    })
    expect(heranca.scoreOrigem).toBe(82)
    expect(heranca.conversionPoint).toBe("VALID_CC_SUBMIT")
    expect(heranca.statusOperacional).toBe("TESTANDO")
    expect(heranca.cpaAlvoBreakeven).toBe(83)
  })
})

describe("calcularCpaAlvoBreakeven e strip conceitual de rollup", () => {
  it("calcula comissão / margem e respeita override manual", () => {
    expect(
      calcularCpaAlvoBreakeven({ comissaoValor: 83, margemDesejadaPct: 100, cpaAlvoManual: false, cpaAlvoBreakeven: null }),
    ).toBe(83)
    expect(
      calcularCpaAlvoBreakeven({ comissaoValor: 83, margemDesejadaPct: 100, cpaAlvoManual: true, cpaAlvoBreakeven: 50 }),
    ).toBe(50)
  })
})

describe("produtoUpdateSchema strip de rollups", () => {
  it("remove gasto/roi do parse de update", async () => {
    const { produtoUpdateSchema } = await import("@/lib/afiliados")
    const parsed = produtoUpdateSchema.parse({
      nome: "X",
      gastoTotalAcumulado: 999,
      roiReal: 1.5,
      scoreOrigem: 82,
    })
    expect(parsed.nome).toBe("X")
    expect("gastoTotalAcumulado" in parsed).toBe(false)
    expect("roiReal" in parsed).toBe(false)
    expect("scoreOrigem" in parsed).toBe(false)
  })
})
