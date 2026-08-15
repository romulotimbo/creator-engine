import { describe, it, expect } from "vitest"
import {
  ofertaDecisaoSchema,
  discoverySourceEnum,
  produtoAfiliadoSchema,
  produtoUpdateSchema,
} from "./afiliados"

const longUrl = `https://example.com/lp/${"x".repeat(80)}?aff=track&sub=1`

function produtoBase(overrides: Record<string, unknown> = {}) {
  return {
    slug: "produto-teste",
    nome: "Produto Teste",
    plataformaAfil: "BRAIP",
    ...overrides,
  }
}

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

describe("produtoAfiliadoSchema links e slug", () => {
  it("aceita URL de checkout e LP com mais de 50 caracteres", () => {
    expect(longUrl.length).toBeGreaterThan(50)
    const parsed = produtoAfiliadoSchema.parse(produtoBase({
      linkCheckout: longUrl,
      linkLanding: longUrl,
    }))
    expect(parsed.linkCheckout).toBe(longUrl)
    expect(parsed.linkLanding).toBe(longUrl)
  })

  it("converte URL vazia em null", () => {
    const parsed = produtoAfiliadoSchema.parse(produtoBase({
      linkCheckout: "",
      linkLanding: "   ",
    }))
    expect(parsed.linkCheckout).toBeNull()
    expect(parsed.linkLanding).toBeNull()
  })

  it("rejeita slug com mais de 50 caracteres", () => {
    expect(() => produtoAfiliadoSchema.parse(produtoBase({ slug: "a".repeat(51) }))).toThrow()
  })

  it("rejeita URL com mais de 2048 caracteres", () => {
    expect(() => produtoAfiliadoSchema.parse(produtoBase({
      linkCheckout: `https://example.com/${"x".repeat(2048)}`,
    }))).toThrow()
  })

  it("produtoUpdateSchema também aceita URL longa", () => {
    const parsed = produtoUpdateSchema.parse({ linkLanding: longUrl })
    expect(parsed.linkLanding).toBe(longUrl)
  })
})
