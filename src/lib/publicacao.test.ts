import { afterEach, describe, expect, it } from "vitest"
import {
  assertPublishToken,
  buildMediaUrl,
  validateMidiaToken,
  zernioContentType,
} from "./publicacao"

describe("assertPublishToken", () => {
  const orig = process.env.N8N_PUBLISH_TOKEN

  afterEach(() => {
    if (orig === undefined) delete process.env.N8N_PUBLISH_TOKEN
    else process.env.N8N_PUBLISH_TOKEN = orig
  })

  it("rejeita requisição sem header", () => {
    process.env.N8N_PUBLISH_TOKEN = "secret-token"
    const res = assertPublishToken(new Request("http://localhost/api/publicacao/fila"))
    expect(res?.status).toBe(401)
  })

  it("aceita token correto", () => {
    process.env.N8N_PUBLISH_TOKEN = "secret-token"
    const req = new Request("http://localhost/api/publicacao/fila", {
      headers: { "X-Publish-Token": "secret-token" },
    })
    expect(assertPublishToken(req)).toBeNull()
  })
})

describe("zernioContentType", () => {
  it("prioriza publicacaoTipo sobre tipo do post", () => {
    expect(
      zernioContentType({ publicacaoTipo: "STORY", tipo: "REEL" }),
    ).toBe("story")
  })

  it("deriva de tipo quando publicacaoTipo é null", () => {
    expect(zernioContentType({ publicacaoTipo: null, tipo: "REEL" })).toBe("reels")
    expect(zernioContentType({ publicacaoTipo: null, tipo: "IMAGEM" })).toBe("feed")
    expect(zernioContentType({ publicacaoTipo: null, tipo: "CARROSSEL" })).toBe("carousel")
  })
})

describe("buildMediaUrl", () => {
  const origBase = process.env.PUBLICACAO_MEDIA_BASE_URL

  afterEach(() => {
    if (origBase === undefined) delete process.env.PUBLICACAO_MEDIA_BASE_URL
    else process.env.PUBLICACAO_MEDIA_BASE_URL = origBase
  })

  it("monta URL com base configurada", () => {
    process.env.PUBLICACAO_MEDIA_BASE_URL =
      "https://romulohub.cloud/creator-engine/api/publicacao/media"
    const url = buildMediaUrl("post123", "tokabc")
    expect(url).toBe(
      "https://romulohub.cloud/creator-engine/api/publicacao/media/post123?token=tokabc",
    )
  })
})

describe("validateMidiaToken", () => {
  it("valida token igual", () => {
    expect(validateMidiaToken("abc", "abc")).toBe(true)
  })

  it("rejeita token diferente", () => {
    expect(validateMidiaToken("abc", "xyz")).toBe(false)
  })
})
