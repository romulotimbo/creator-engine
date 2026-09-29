import { describe, expect, it } from "vitest"
import { termosHtml } from "./termos-html"

describe("termosHtml", () => {
  const html = termosHtml()

  it("é um documento público em português, sem depender de assets do app", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true)
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain("<title>Termos de serviço — Creator Engine</title>")
    expect(html).toContain('rel="canonical" href="https://romulohub.cloud/termos"')
    expect(html).not.toContain("/_next/")
  })

  it("liga os termos à privacidade e ao Limited Use", () => {
    expect(html).toContain("romulotsilva@gmail.com")
    expect(html).toContain("https://romulohub.cloud/privacidade")
    expect(html).toContain("planejador de palavras-chave")
    expect(html).toContain("https://developers.google.com/terms/api-services-user-data-policy")
    expect(html).toContain("https://myaccount.google.com/permissions")
    expect(html).toContain("Limited Use")
    expect(html).toContain("República Federativa do Brasil")
    expect(html).toContain("Última atualização: 29 de setembro de 2026.")
  })
})
