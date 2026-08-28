import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { avaliarGatilhoEscala, avaliarRegraEscala, REGRA_ESCALA_GATILHO } from "./escala"

describe("avaliarGatilhoEscala", () => {
  it("dispara com volume mínimo e ROI com folga real", () => {
    expect(
      avaliarGatilhoEscala({ numVendasAprovadas: 5, roiReal: 0.3, volumeMinimo: 5, roiMinimoFolga: 0.3 }),
    ).toBe(true)
  })

  it("não dispara com volume insuficiente mesmo com ROI alto", () => {
    expect(
      avaliarGatilhoEscala({ numVendasAprovadas: 2, roiReal: 1.0, volumeMinimo: 5, roiMinimoFolga: 0.3 }),
    ).toBe(false)
  })

  it("não dispara com ROI empatando (não é folga real)", () => {
    expect(
      avaliarGatilhoEscala({ numVendasAprovadas: 10, roiReal: 0.05, volumeMinimo: 5, roiMinimoFolga: 0.3 }),
    ).toBe(false)
  })

  it("roiReal nulo nunca dispara", () => {
    expect(
      avaliarGatilhoEscala({ numVendasAprovadas: 10, roiReal: null, volumeMinimo: 5, roiMinimoFolga: 0.3 }),
    ).toBe(false)
  })
})

function makeFakeDb(opts: { status: string; roiReal: number | null; numVendasAprovadas: number }) {
  const itens: Array<{ id: string; regra: string; alvoId: string; tipoAlvo: string; status: string }> = []
  let nextId = 1
  const client = {
    campanha: {
      findUnique: async () => ({ id: "c1", status: opts.status, roiReal: opts.roiReal, produtoId: "p1" }),
    },
    vendaAfiliado: { count: async () => opts.numVendasAprovadas },
    produtoAfiliado: { findUnique: async () => ({ limiaresOverride: null }) },
    limiarGlobal: { findUnique: async () => null },
    itemFila: {
      findFirst: async ({ where }: { where: { regra: string; alvoId: string } }) =>
        itens.find((i) => i.regra === where.regra && i.alvoId === where.alvoId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const item = { id: `i${nextId++}`, status: "ABERTO", ...data } as (typeof itens)[number]
        itens.push(item)
        return item
      },
    },
  }
  return { client: client as unknown as PrismaClient, itens }
}

describe("avaliarRegraEscala (trigger)", () => {
  it("não roda fora de TESTANDO", async () => {
    const { client, itens } = makeFakeDb({ status: "ESCALANDO", roiReal: 1, numVendasAprovadas: 20 })
    await avaliarRegraEscala(client, "c1")
    expect(itens).toHaveLength(0)
  })

  it("gera ItemFila quando as condições batem, usando os defaults do LimiarGlobal", async () => {
    const { client, itens } = makeFakeDb({ status: "TESTANDO", roiReal: 0.5, numVendasAprovadas: 6 })
    await avaliarRegraEscala(client, "c1")
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe(REGRA_ESCALA_GATILHO)
    expect(itens[0].tipoAlvo).toBe("CAMPANHA")
  })

  it("não gera item quando abaixo dos limiares default", async () => {
    const { client, itens } = makeFakeDb({ status: "TESTANDO", roiReal: 0.05, numVendasAprovadas: 1 })
    await avaliarRegraEscala(client, "c1")
    expect(itens).toHaveLength(0)
  })

  it("dedup — não duplica em avaliações repetidas", async () => {
    const { client, itens } = makeFakeDb({ status: "TESTANDO", roiReal: 0.5, numVendasAprovadas: 6 })
    await avaliarRegraEscala(client, "c1")
    await avaliarRegraEscala(client, "c1")
    expect(itens).toHaveLength(1)
  })
})
