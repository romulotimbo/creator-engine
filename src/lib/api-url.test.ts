import { afterEach, describe, expect, it } from "vitest"
import { apiUrl } from "./api-url"

describe("apiUrl", () => {
  const origPublic = process.env.NEXT_PUBLIC_BASE_PATH
  const origBase = process.env.BASE_PATH

  afterEach(() => {
    if (origPublic === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
    else process.env.NEXT_PUBLIC_BASE_PATH = origPublic
    if (origBase === undefined) delete process.env.BASE_PATH
    else process.env.BASE_PATH = origBase
  })

  it("prefixa NEXT_PUBLIC_BASE_PATH em produção", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/creator-engine"
    expect(apiUrl("/api/credenciais")).toBe("/creator-engine/api/credenciais")
  })

  it("base vazio em dev local", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = ""
    expect(apiUrl("/api/ferramentas")).toBe("/api/ferramentas")
  })
})
