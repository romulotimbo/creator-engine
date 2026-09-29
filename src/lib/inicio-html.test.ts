import { describe, expect, it } from "vitest"
import { inicioHtml } from "./inicio-html"

describe("inicioHtml", () => {
  const html = inicioHtml()

  it("é a página pública da raiz, sem assets do app", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true)
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain("<title>Creator Engine</title>")
    expect(html).toContain("<h1>Creator Engine</h1>")
    expect(html).not.toContain("/_next/")
  })

  it("aponta para o aplicativo, a privacidade e os termos", () => {
    expect(html).toContain('href="https://romulohub.cloud/creator-engine"')
    expect(html).toContain('href="https://romulohub.cloud/privacidade"')
    expect(html).toContain('href="https://romulohub.cloud/termos"')
    expect(html).toContain("Google Ads")
    expect(html).toContain("Merchant Center")
  })
})
