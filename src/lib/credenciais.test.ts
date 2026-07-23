import { describe, expect, it } from "vitest"
import { credCreateSchema, servicoDisplayLabel } from "./credenciais"
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
