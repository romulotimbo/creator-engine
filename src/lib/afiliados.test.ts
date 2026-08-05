import { describe, it, expect } from "vitest"
import { ofertaDecisaoSchema, discoverySourceEnum } from "./afiliados"

describe("discoverySourceEnum", () => {
  it("aceita os 6 valores mapeados", () => {
    for (const value of ["search_from", "network_direct", "glimpse", "keyword_planner", "indicacao", "outro"]) {
      expect(discoverySourceEnum.parse(value)).toBe(value)
    }
  })

  it("rejeita valores não mapeados", () => {
    expect(() => discoverySourceEnum.parse("instagram_dm")).toThrow()
  })
})

describe("ofertaDecisaoSchema.discoverySource", () => {
  it("aceita discoverySource ausente (campo opcional)", () => {
    const parsed = ofertaDecisaoSchema.parse({ nome: "Oferta Teste" })
    expect(parsed.discoverySource).toBeUndefined()
  })

  it("aceita null explicitamente", () => {
    const parsed = ofertaDecisaoSchema.parse({ nome: "Oferta Teste", discoverySource: null })
    expect(parsed.discoverySource).toBeNull()
  })

  it("retorna erro de validação para valor não permitido", () => {
    expect(() => ofertaDecisaoSchema.parse({ nome: "Oferta Teste", discoverySource: "instagram_dm" })).toThrow()
  })
})
