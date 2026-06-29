import { describe, expect, it } from "vitest"
import { credCreateSchema, servicoDisplayLabel } from "./credenciais"

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

  it("exige personaId em credencial de persona", () => {
    const r = credCreateSchema.safeParse({
      global: false,
      categoria: "instagram",
      chave: "user",
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
