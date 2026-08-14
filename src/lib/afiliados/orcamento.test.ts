import { describe, it, expect } from "vitest"
import { orcamentoPeriodoSchema, produtoUpdateSchema } from "@/lib/afiliados"

describe("orcamentoPeriodoSchema", () => {
  it("aceita YYYY-MM e rejeita período inválido", () => {
    expect(orcamentoPeriodoSchema.parse({ periodo: "2026-08", capitalTotalDisponivel: 5000 }).periodo).toBe("2026-08")
    expect(() => orcamentoPeriodoSchema.parse({ periodo: "agosto", capitalTotalDisponivel: 1 })).toThrow()
    expect(() => orcamentoPeriodoSchema.parse({ periodo: "2026-13", capitalTotalDisponivel: 1 })).toThrow()
  })

  it("percentuais ficam em 0–100", () => {
    expect(() =>
      orcamentoPeriodoSchema.parse({ periodo: "2026-08", capitalTotalDisponivel: 10, limitePctPorProduto: 101 }),
    ).toThrow()
  })
})

describe("produtoUpdateSchema", () => {
  it("não persiste campos de rollup enviados no body", () => {
    const parsed = produtoUpdateSchema.parse({ budgetTesteAlocado: 400, gastoTotalAcumulado: 12, dataUltimaAtualizacaoDados: "2026-08-14" })
    expect(parsed.budgetTesteAlocado).toBe(400)
    expect(parsed).not.toHaveProperty("gastoTotalAcumulado")
    expect(parsed).not.toHaveProperty("dataUltimaAtualizacaoDados")
  })
})
