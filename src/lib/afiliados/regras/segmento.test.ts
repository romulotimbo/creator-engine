import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { detectarSegmentosDivergentes, avaliarRegraSegmento } from "./segmento"

describe("detectarSegmentosDivergentes", () => {
  it("detecta geo com CPA divergente acima do volume mínimo", () => {
    const achados = detectarSegmentosDivergentes({
      segmentos: [{ dimensao: "GEO", valor: "CA", gasto: 30, conversoes: 3 }], // cpa=10
      cpaMedioCampanha: 20, // diferença de 50%
      volumeMinimoConversoes: 3,
      diferencaCpaMinimaPct: 25,
    })
    expect(achados).toHaveLength(1)
    expect(achados[0].valor).toBe("CA")
    expect(achados[0].diferencaPct).toBeCloseTo(50)
  })

  it("ignora quando abaixo do volume mínimo de conversões", () => {
    const achados = detectarSegmentosDivergentes({
      segmentos: [{ dimensao: "GEO", valor: "CA", gasto: 20, conversoes: 2 }], // abaixo do mínimo de 3
      cpaMedioCampanha: 20,
      volumeMinimoConversoes: 3,
      diferencaCpaMinimaPct: 25,
    })
    expect(achados).toHaveLength(0)
  })

  it("ignora quando a diferença de CPA está abaixo do mínimo", () => {
    const achados = detectarSegmentosDivergentes({
      segmentos: [{ dimensao: "GEO", valor: "CA", gasto: 95, conversoes: 5 }], // cpa=19, ~5% de diferença
      cpaMedioCampanha: 20,
      volumeMinimoConversoes: 3,
      diferencaCpaMinimaPct: 25,
    })
    expect(achados).toHaveLength(0)
  })

  it("filtra dispositivo para os 3 valores acionáveis — ignora CONNECTED_TV/OTHER/UNKNOWN/UNSPECIFIED", () => {
    const achados = detectarSegmentosDivergentes({
      segmentos: [
        { dimensao: "DISPOSITIVO", valor: "DESKTOP", gasto: 30, conversoes: 3 },
        { dimensao: "DISPOSITIVO", valor: "CONNECTED_TV", gasto: 30, conversoes: 3 },
        { dimensao: "DISPOSITIVO", valor: "UNKNOWN", gasto: 30, conversoes: 3 },
      ],
      cpaMedioCampanha: 20,
      volumeMinimoConversoes: 3,
      diferencaCpaMinimaPct: 25,
    })
    expect(achados).toHaveLength(1)
    expect(achados[0].valor).toBe("DESKTOP")
  })

  it("sem conversões no segmento não divide por zero", () => {
    const achados = detectarSegmentosDivergentes({
      segmentos: [{ dimensao: "GEO", valor: "CA", gasto: 30, conversoes: 0 }],
      cpaMedioCampanha: 20,
      volumeMinimoConversoes: 3,
      diferencaCpaMinimaPct: 25,
    })
    expect(achados).toHaveLength(0)
  })
})

function makeFakeDb(opts: {
  status: string
  segmentos: Array<{ dimensao: string; valor: string; gasto: number; conversoes: number }>
  campanhaSnapshots: Array<{ gasto: number; conversoes: number }>
}) {
  const itens: Array<{ id: string; regra: string; status: string }> = []
  let nextId = 1
  const client = {
    campanha: { findUnique: async () => ({ id: "c1", status: opts.status, produtoId: "p1" }) },
    segmentoCampanhaSnapshot: { findMany: async () => opts.segmentos },
    campanhaSnapshot: { findMany: async () => opts.campanhaSnapshots },
    produtoAfiliado: { findUnique: async () => ({ limiaresOverride: null }) },
    limiarGlobal: { findUnique: async () => null },
    itemFila: {
      findFirst: async ({ where }: { where: { regra: string } }) =>
        itens.find((i) => i.regra === where.regra) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const item = { id: `i${nextId++}`, status: "ABERTO", ...data } as (typeof itens)[number]
        itens.push(item)
        return item
      },
    },
  }
  return { client: client as unknown as PrismaClient, itens }
}

describe("avaliarRegraSegmento (trigger)", () => {
  it("não roda fora de ESCALANDO", async () => {
    const { client, itens } = makeFakeDb({
      status: "TESTANDO",
      segmentos: [{ dimensao: "GEO", valor: "CA", gasto: 30, conversoes: 5 }],
      campanhaSnapshots: [{ gasto: 200, conversoes: 10 }],
    })
    await avaliarRegraSegmento(client, "c1")
    expect(itens).toHaveLength(0)
  })

  it("gera um único ItemFila combinando geo e dispositivo no mesmo mês", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      segmentos: [
        { dimensao: "GEO", valor: "CA", gasto: 15, conversoes: 3 }, // cpa=5, campanha cpa=20 → 75% diferença
        { dimensao: "DISPOSITIVO", valor: "MOBILE", gasto: 90, conversoes: 3 }, // cpa=30 → 50% diferença
      ],
      campanhaSnapshots: [{ gasto: 200, conversoes: 10 }], // cpa médio = 20
    })
    await avaliarRegraSegmento(client, "c1")
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toMatch(/^escala\.otimizacaoSegmento:\d{4}-\d{2}$/)
  })

  it("não duplica o item do mesmo mês em avaliações repetidas (item único por mês)", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      segmentos: [{ dimensao: "GEO", valor: "CA", gasto: 15, conversoes: 3 }],
      campanhaSnapshots: [{ gasto: 200, conversoes: 10 }],
    })
    await avaliarRegraSegmento(client, "c1")
    await avaliarRegraSegmento(client, "c1")
    expect(itens).toHaveLength(1)
  })

  it("sem segmentos divergentes não gera item", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      segmentos: [{ dimensao: "GEO", valor: "CA", gasto: 19, conversoes: 1 }], // abaixo do volume mínimo
      campanhaSnapshots: [{ gasto: 200, conversoes: 10 }],
    })
    await avaliarRegraSegmento(client, "c1")
    expect(itens).toHaveLength(0)
  })
})
