import { describe, expect, it } from "vitest"
import {
  credCreateSchema,
  orfasPersonaWhere,
  restaurarEscopoContaTrafegoWhere,
  servicoDisplayLabel,
  whereCredenciaisContaTrafego,
  whereCredenciaisPersona,
} from "./credenciais"
import { contaTrafegoCreateSchema, vendaAfiliadoSchema } from "./afiliados"

describe("credCreateSchema", () => {
  it("aceita credencial global com servico", () => {
    const r = credCreateSchema.safeParse({
      global: true,
      categoria: "proxy",
      chave: "user",
      valor: "secret",
      servico: "IPRoyal",
    })
    expect(r.success).toBe(true)
  })

  it("rejeita personaId em global", () => {
    const r = credCreateSchema.safeParse({
      global: true,
      personaId: "x",
      categoria: "proxy",
      chave: "user",
      valor: "secret",
    })
    expect(r.success).toBe(false)
  })

  it("rejeita contaTrafegoId em global", () => {
    const r = credCreateSchema.safeParse({
      global: true,
      contaTrafegoId: "ct1",
      categoria: "proxy",
      chave: "user",
      valor: "secret",
    })
    expect(r.success).toBe(false)
  })

  it("exige personaId em credencial de persona", () => {
    const r = credCreateSchema.safeParse({
      global: false,
      categoria: "instagram",
      chave: "user",
      valor: "secret",
    })
    expect(r.success).toBe(false)
  })

  it("aceita escopo ContaTrafego", () => {
    const r = credCreateSchema.safeParse({
      global: false,
      contaTrafegoId: "ct1",
      categoria: "braip",
      chave: "login",
      valor: "secret",
    })
    expect(r.success).toBe(true)
  })

  it("rejeita personaId + contaTrafegoId juntos", () => {
    const r = credCreateSchema.safeParse({
      global: false,
      personaId: "p1",
      contaTrafegoId: "ct1",
      categoria: "braip",
      chave: "login",
      valor: "secret",
    })
    expect(r.success).toBe(false)
  })
})

describe("escopo ContaTrafego vs persona", () => {
  it("reparo de órfãs não inclui credencial com contaTrafegoId", () => {
    expect(orfasPersonaWhere.contaTrafegoId).toBeNull()
    expect(orfasPersonaWhere.personaId).toBeNull()
    expect(orfasPersonaWhere.global).toBe(false)
    const cats = orfasPersonaWhere.categoria
    expect(cats && typeof cats === "object" && "in" in cats && Array.isArray(cats.in) && cats.in.includes("braip")).toBe(true)
  })

  it("restauração zera personaId só quando contaTrafegoId está preenchido", () => {
    expect(restaurarEscopoContaTrafegoWhere.contaTrafegoId).toEqual({ not: null })
    expect(restaurarEscopoContaTrafegoWhere.personaId).toEqual({ not: null })
  })

  it("listagem de afiliados não exige personaId null (credencial roubada pelo reparo antigo ainda aparece)", () => {
    const where = whereCredenciaisContaTrafego("ct1")
    expect(where).toEqual({ contaTrafegoId: "ct1", global: false })
    expect(where).not.toHaveProperty("personaId")
  })

  it("listagem de persona exclui ContaTrafego", () => {
    expect(whereCredenciaisPersona("p1")).toEqual({
      personaId: "p1",
      global: false,
      contaTrafegoId: null,
    })
  })
})

describe("servicoDisplayLabel", () => {
  it("prioriza servico sobre ferramentaNome", () => {
    expect(servicoDisplayLabel({ servico: "IPRoyal", ferramentaNome: "Outro" })).toBe("IPRoyal")
  })

  it("usa ferramentaNome se servico vazio", () => {
    expect(servicoDisplayLabel({ servico: null, ferramentaNome: "Midjourney" })).toBe("Midjourney")
  })
})

describe("contaTrafegoCreateSchema", () => {
  it("aceita criação mínima", () => {
    const r = contaTrafegoCreateSchema.safeParse({
      slug: "meta-power",
      nome: "Meta Power",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.plataforma).toBe("META")
      expect(r.data.status).toBe("ATIVA")
    }
  })
})

describe("vendaAfiliadoSchema", () => {
  it("exige contaTrafegoId e valores", () => {
    const r = vendaAfiliadoSchema.safeParse({
      contaTrafegoId: "ct1",
      data: "2026-07-23",
      valorVenda: 197,
      valorComissao: 98.5,
      plataformaAfil: "BRAIP",
    })
    expect(r.success).toBe(true)
  })
})
