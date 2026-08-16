import { describe, it, expect } from "vitest"
import { campanhaGastoSnapshotSchema } from "@/lib/afiliados"
import { upsertCampanhaGastoSnapshot, CampanhaNotFoundError, startOfDayUtc } from "./snapshot"
import type { PrismaClient } from "@prisma/client"

function day(iso: string): Date {
  return startOfDayUtc(new Date(`${iso}T00:00:00.000Z`))
}

function makeFakeDb(opts: { campanhaId?: string; produtoId?: string; budget?: number | null } = {}) {
  const campanhaId = opts.campanhaId ?? "c1"
  const produtoId = opts.produtoId ?? "p1"
  const snaps: Array<{
    id: string
    campanhaId: string
    dataSnapshot: Date
    gasto: number
    receitaConfirmada: number | null
    conversoes: number | null
  }> = []
  let produtoUpdate: Record<string, unknown> | null = null
  let campanhaUpdate: Record<string, unknown> | null = null
  let nextId = 1

  const keyOf = (cid: string, d: Date) => `${cid}|${d.toISOString().slice(0, 10)}`

  const client = {
    campanha: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        id === campanhaId ? { id: campanhaId, produtoId } : null,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        campanhaUpdate = data
        return { id: campanhaId, ...data }
      },
      findMany: async () => [
        {
          snapshots: snaps
            .filter((s) => s.campanhaId === campanhaId)
            .map((s) => ({
              gasto: s.gasto,
              receitaConfirmada: s.receitaConfirmada,
              conversoes: s.conversoes,
              dataSnapshot: s.dataSnapshot,
            })),
        },
      ],
    },
    campanhaSnapshot: {
      findUnique: async ({
        where: { campanhaId_dataSnapshot },
      }: {
        where: { campanhaId_dataSnapshot: { campanhaId: string; dataSnapshot: Date } }
      }) => {
        const k = keyOf(campanhaId_dataSnapshot.campanhaId, campanhaId_dataSnapshot.dataSnapshot)
        return snaps.find((s) => keyOf(s.campanhaId, s.dataSnapshot) === k) ?? null
      },
      upsert: async ({
        where: { campanhaId_dataSnapshot },
        create,
        update,
      }: {
        where: { campanhaId_dataSnapshot: { campanhaId: string; dataSnapshot: Date } }
        create: { campanhaId: string; dataSnapshot: Date; gasto: number }
        update: { gasto: number }
      }) => {
        const k = keyOf(campanhaId_dataSnapshot.campanhaId, campanhaId_dataSnapshot.dataSnapshot)
        const existing = snaps.find((s) => keyOf(s.campanhaId, s.dataSnapshot) === k)
        if (existing) {
          existing.gasto = update.gasto
          return existing
        }
        const row = {
          id: `s${nextId++}`,
          campanhaId: create.campanhaId,
          dataSnapshot: create.dataSnapshot,
          gasto: create.gasto,
          receitaConfirmada: null,
          conversoes: null,
        }
        snaps.push(row)
        return row
      },
    },
    produtoAfiliado: {
      findUnique: async () => ({ budgetTesteAlocado: opts.budget ?? 1000 }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        produtoUpdate = data
        return data
      },
    },
  }

  return {
    client: client as unknown as PrismaClient,
    snaps,
    getProdutoUpdate: () => produtoUpdate,
    getCampanhaUpdate: () => campanhaUpdate,
  }
}

describe("campanhaGastoSnapshotSchema", () => {
  it("aceita gasto zero e data opcional", () => {
    expect(campanhaGastoSnapshotSchema.parse({ gasto: 0 }).gasto).toBe(0)
    expect(campanhaGastoSnapshotSchema.parse({ gasto: 250, dataSnapshot: "2026-08-15" }).gasto).toBe(250)
  })

  it("rejeita gasto negativo", () => {
    expect(() => campanhaGastoSnapshotSchema.parse({ gasto: -1 })).toThrow()
  })
})

describe("upsertCampanhaGastoSnapshot", () => {
  it("404 conceitual quando a campanha não existe", async () => {
    const { client } = makeFakeDb()
    await expect(
      upsertCampanhaGastoSnapshot(client, "missing", { gasto: 10, dataSnapshot: day("2026-08-15") }),
    ).rejects.toBeInstanceOf(CampanhaNotFoundError)
  })

  it("primeiro gasto cria snapshot e rollup", async () => {
    const fake = makeFakeDb()
    const result = await upsertCampanhaGastoSnapshot(fake.client, "c1", {
      gasto: 250,
      dataSnapshot: day("2026-08-15"),
    })
    expect(result.created).toBe(true)
    expect(fake.snaps).toHaveLength(1)
    expect(fake.snaps[0].gasto).toBe(250)
    expect(fake.getCampanhaUpdate()).toEqual({ dataUltimaAtualizacao: day("2026-08-15") })
    expect(fake.getProdutoUpdate()).toMatchObject({ gastoTotalAcumulado: 250 })
  })

  it("regravação do mesmo dia substitui o snapshot e o rollup", async () => {
    const fake = makeFakeDb()
    await upsertCampanhaGastoSnapshot(fake.client, "c1", { gasto: 250, dataSnapshot: day("2026-08-15") })
    const result = await upsertCampanhaGastoSnapshot(fake.client, "c1", {
      gasto: 400,
      dataSnapshot: day("2026-08-15"),
    })
    expect(result.created).toBe(false)
    expect(fake.snaps).toHaveLength(1)
    expect(fake.snaps[0].gasto).toBe(400)
    expect(fake.getProdutoUpdate()).toMatchObject({ gastoTotalAcumulado: 400 })
  })

  it("datas distintas preservam histórico e o rollup usa o latest", async () => {
    const fake = makeFakeDb()
    await upsertCampanhaGastoSnapshot(fake.client, "c1", { gasto: 100, dataSnapshot: day("2026-08-01") })
    await upsertCampanhaGastoSnapshot(fake.client, "c1", { gasto: 400, dataSnapshot: day("2026-08-15") })
    expect(fake.snaps).toHaveLength(2)
    expect(fake.getProdutoUpdate()).toMatchObject({ gastoTotalAcumulado: 400 })
  })
})
