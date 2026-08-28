import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { parseIngestaoEnvelope, assertIngestToken, INGEST_TOKEN_HEADER, INGEST_TOKEN_ENV } from "./ingestao"

describe("parseIngestaoEnvelope", () => {
  it("aceita envelope CAMPANHA_DIARIO válido", () => {
    const result = parseIngestaoEnvelope({
      fonte: "ads-script-1",
      tipo: "CAMPANHA_DIARIO",
      periodo: { inicio: "2026-08-01", fim: "2026-08-07" },
      campanhasCobertas: [{ googleAdsCustomerId: "123", nomeCampanhaGoogleAds: "Campanha A" }],
      linhas: [],
    })
    expect(result.ok).toBe(true)
  })

  it("rejeita tipo desconhecido", () => {
    const result = parseIngestaoEnvelope({
      fonte: "ads-script-1",
      tipo: "FOO_BAR",
      periodo: { inicio: "2026-08-01", fim: "2026-08-07" },
      linhas: [],
    })
    expect(result.ok).toBe(false)
  })

  it("rejeita corpo não-objeto", () => {
    expect(parseIngestaoEnvelope(null).ok).toBe(false)
    expect(parseIngestaoEnvelope("string").ok).toBe(false)
  })

  it("aceita payload de falha sem linhas[]", () => {
    const result = parseIngestaoEnvelope({
      fonte: "ads-script-1",
      tipo: "CAMPANHA_DIARIO",
      status: "FALHA",
      erro: "timeout",
    })
    expect(result.ok).toBe(true)
    if (result.ok && "erro" in result.envelope) {
      expect(result.envelope.erro).toBe("timeout")
    } else {
      throw new Error("esperava envelope de falha")
    }
  })

  it("não confunde um envelope de falha com sucesso de zero linhas", () => {
    const result = parseIngestaoEnvelope({
      fonte: "ads-script-1",
      tipo: "CAMPANHA_DIARIO",
      status: "FALHA",
      erro: "timeout",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect("erro" in result.envelope).toBe(true)
      expect("linhas" in result.envelope).toBe(false)
    }
  })
})

describe("assertIngestToken", () => {
  const original = process.env[INGEST_TOKEN_ENV]

  beforeEach(() => {
    process.env[INGEST_TOKEN_ENV] = "secret-token"
  })

  afterEach(() => {
    if (original === undefined) delete process.env[INGEST_TOKEN_ENV]
    else process.env[INGEST_TOKEN_ENV] = original
  })

  function makeReq(headerValue?: string): Request {
    const headers = new Headers()
    if (headerValue !== undefined) headers.set(INGEST_TOKEN_HEADER, headerValue)
    return new Request("http://localhost/api/afiliados/ingestao", { headers })
  }

  it("401 quando o header está ausente", async () => {
    const res = assertIngestToken(makeReq())
    expect(res?.status).toBe(401)
  })

  it("401 quando o token está incorreto", async () => {
    const res = assertIngestToken(makeReq("wrong"))
    expect(res?.status).toBe(401)
  })

  it("null (OK) quando o token bate", async () => {
    const res = assertIngestToken(makeReq("secret-token"))
    expect(res).toBeNull()
  })

  it("503 quando a env var não está configurada", async () => {
    delete process.env[INGEST_TOKEN_ENV]
    const res = assertIngestToken(makeReq("anything"))
    expect(res?.status).toBe(503)
  })
})
