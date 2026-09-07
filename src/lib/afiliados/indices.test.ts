import { describe, it, expect } from "vitest"
import {
  alinharComparativo,
  correspondenciaKey,
  ehChaveDispositivo,
  indiceCreateSchema,
  indiceFlagsSchema,
  indiceLinhaCreateSchema,
  normalizarIdentidade,
  payloadSeedDispositivos,
  resolverMetricasLinha,
  TRIO_DISPOSITIVOS,
  vigenteDeLinhas,
} from "./indices"

describe("normalizarIdentidade", () => {
  it("palavra-chave única por correspondência — EXATA e AMPLA são identidades distintas", () => {
    const exata = normalizarIdentidade({ tipo: "PALAVRA_CHAVE", chave: "keto gummies", correspondencia: "EXATA" })
    const ampla = normalizarIdentidade({ tipo: "PALAVRA_CHAVE", chave: "keto gummies", correspondencia: "AMPLA" })
    expect(exata.correspondenciaKey).toBe("EXATA")
    expect(ampla.correspondenciaKey).toBe("AMPLA")
    expect(exata.correspondenciaKey).not.toBe(ampla.correspondenciaKey)
  })

  it("palavra-chave duplicada tem a mesma chave natural", () => {
    const a = normalizarIdentidade({ tipo: "PALAVRA_CHAVE", chave: "keto gummies", correspondencia: "EXATA" })
    const b = normalizarIdentidade({ tipo: "PALAVRA_CHAVE", chave: "keto gummies", correspondencia: "EXATA" })
    expect(a.chave).toBe(b.chave)
    expect(a.correspondenciaKey).toBe(b.correspondenciaKey)
    expect(correspondenciaKey(a.correspondencia)).toBe(correspondenciaKey(b.correspondencia))
  })

  it("local e público usam rótulo livre e correspondencia nula", () => {
    const local = normalizarIdentidade({ tipo: "LOCAL", chave: "Canadá" })
    const publico = normalizarIdentidade({ tipo: "PUBLICO", chave: "masculino 45-54" })
    expect(local.chave).toBe("Canadá")
    expect(local.correspondencia).toBeNull()
    expect(local.correspondenciaKey).toBe("")
    expect(publico.chave).toBe("masculino 45-54")
    expect(publico.correspondenciaKey).toBe("")
  })

  it("dispositivo fora do trio é rejeitado", () => {
    expect(() => normalizarIdentidade({ tipo: "DISPOSITIVO", chave: "CONNECTED_TV" })).toThrow()
    expect(indiceCreateSchema.safeParse({
      tipo: "DISPOSITIVO",
      chave: "CONNECTED_TV",
      status: "ATIVO",
      ajusteLancePct: 0,
    }).success).toBe(false)
  })

  it("trio de dispositivos é aceito", () => {
    for (const chave of TRIO_DISPOSITIVOS) {
      expect(ehChaveDispositivo(chave)).toBe(true)
      expect(normalizarIdentidade({ tipo: "DISPOSITIVO", chave }).chave).toBe(chave)
    }
  })
})

describe("vigenteDeLinhas", () => {
  it("troca de lance: vigente é a linha mais nova; a anterior permanece", () => {
    const dez = { id: "10", capturadaEm: new Date("2026-09-01T10:00:00Z"), createdAt: new Date("2026-09-01T10:00:00Z"), ajusteLancePct: 10 }
    const quinze = { id: "15", capturadaEm: new Date("2026-09-01T11:00:00Z"), createdAt: new Date("2026-09-01T11:00:00Z"), ajusteLancePct: 15 }
    const linhas = [dez, quinze]
    expect(vigenteDeLinhas(linhas)?.ajusteLancePct).toBe(15)
    expect(linhas).toHaveLength(2)
    expect(linhas.find((l) => l.ajusteLancePct === 10)).toBeDefined()
  })

  it("coleta mais nova vira vigente; linha manual permanece", () => {
    const manual = { origem: "MANUAL", capturadaEm: new Date("2026-09-01T10:00:00Z"), createdAt: new Date("2026-09-01T10:00:00Z"), ajusteLancePct: 15 }
    const coleta = { origem: "COLETA", capturadaEm: new Date("2026-09-02T10:00:00Z"), createdAt: new Date("2026-09-02T10:00:00Z"), ajusteLancePct: 10 }
    expect(vigenteDeLinhas([manual, coleta])?.ajusteLancePct).toBe(10)
  })

  it("empate em capturadaEm usa createdAt mais novo", () => {
    const t = new Date("2026-09-01T10:00:00Z")
    const a = { id: "a", capturadaEm: t, createdAt: new Date("2026-09-01T10:00:01Z") }
    const b = { id: "b", capturadaEm: t, createdAt: new Date("2026-09-01T10:00:02Z") }
    expect(vigenteDeLinhas([a, b])?.id).toBe("b")
  })
})

describe("resolverMetricasLinha", () => {
  it("ajuste sem métricas copia o acumulado vigente", () => {
    const nova = resolverMetricasLinha(
      {},
      { cpc: 1.2, cliques: 62, impressoes: 900, vendasConversao: 3, custoConversao: 40, roi: 0.2 },
    )
    expect(nova.cliques).toBe(62)
    expect(nova.cpc).toBe(1.2)
    expect(nova.impressoes).toBe(900)
  })

  it("métrica enviada substitui só aquele campo", () => {
    const nova = resolverMetricasLinha(
      { cliques: 80 },
      { cpc: 1.2, cliques: 62, impressoes: 900, vendasConversao: null, custoConversao: null, roi: null },
    )
    expect(nova.cliques).toBe(80)
    expect(nova.cpc).toBe(1.2)
  })
})

describe("indiceFlagsSchema", () => {
  it("aceita só flags — sem campos de linha/foto", () => {
    const parsed = indiceFlagsSchema.parse({ validadoVisualmente: true })
    expect(parsed.validadoVisualmente).toBe(true)
    expect("ajusteLancePct" in parsed).toBe(false)
    expect("cliques" in parsed).toBe(false)
  })
})

describe("payloadSeedDispositivos", () => {
  it("campanha nova nasce com o trio, lance 0 e métricas nulas", () => {
    const seed = payloadSeedDispositivos()
    expect(seed.map((s) => s.chave)).toEqual(["SMARTPHONE", "TABLET", "COMPUTADOR"])
    for (const s of seed) {
      expect(s.tipo).toBe("DISPOSITIVO")
      expect(s.linhas.create.ajusteLancePct).toBe(0)
      expect(s.linhas.create.origem).toBe("MANUAL")
      expect(s.linhas.create.status).toBe("ATIVO")
      expect(s.linhas.create.cliques).toBeNull()
    }
  })
})

describe("indiceLinhaCreateSchema", () => {
  it("origem default MANUAL; aceita COLETA", () => {
    expect(indiceLinhaCreateSchema.parse({ status: "ATIVO", ajusteLancePct: 15 }).origem).toBe("MANUAL")
    expect(indiceLinhaCreateSchema.parse({ status: "ATIVO", ajusteLancePct: 10, origem: "COLETA" }).origem).toBe("COLETA")
  })
})

describe("alinharComparativo", () => {
  it("linha presente numa campanha e ausente noutra fica vazia na coluna", () => {
    const rows = alinharComparativo([
      {
        id: "A",
        indices: [{ tipo: "PALAVRA_CHAVE", chave: "keto", correspondencia: "EXATA", vigente: { ajusteLancePct: 10 } }],
      },
      { id: "B", indices: [] },
    ])
    const keto = rows.find((r) => r.chave === "keto" && r.correspondencia === "EXATA")
    expect(keto?.celulas.A).toEqual({ ajusteLancePct: 10 })
    expect(keto?.celulas.B).toBeUndefined()
  })
})
