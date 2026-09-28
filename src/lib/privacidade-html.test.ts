import { describe, expect, it } from "vitest"
import { privacidadeHtml } from "./privacidade-html"

describe("privacidadeHtml", () => {
  const html = privacidadeHtml()

  it("é um documento público em português, sem depender de assets do app", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true)
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain("<title>Política de privacidade — Creator Engine</title>")
    expect(html).toContain('rel="canonical" href="https://romulohub.cloud/privacidade"')
    expect(html).not.toContain("/_next/")
  })

  it("declara o uso das APIs do Google e o Limited Use", () => {
    expect(html).toContain("romulotsilva@gmail.com")
    expect(html).toContain("planejador de palavras-chave")
    expect(html).toContain("Google Analytics (GA4)")
    expect(html).toContain("Google Search Console")
    expect(html).toContain("Google Tag Manager")
    expect(html).toContain("Google Merchant Center")
    expect(html).toContain("Não pedimos acesso a Gmail, Drive, Contatos nem Calendar.")
    expect(html).toContain("https://developers.google.com/terms/api-services-user-data-policy")
    expect(html).toContain("Limited Use")
    expect(html).toContain("Última atualização: 27 de setembro de 2026.")
  })
})
