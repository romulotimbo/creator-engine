import { describe, expect, it } from "vitest"
import { formatCurrency } from "./utils"

describe("formatCurrency", () => {
  it("formata BRL", () => {
    expect(formatCurrency(1234.5)).toMatch(/1\.234,50/)
  })

  it("null retorna zero", () => {
    expect(formatCurrency(null)).toBe("R$ 0,00")
  })
})
