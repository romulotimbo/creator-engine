import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { processarCampanhaDiario, processarSegmento, processarSerieTermo } from "./ingestao-processar"
import type { EnvelopeCampanhaDiario, EnvelopeSegmento, EnvelopeSerieTermo } from "./ingestao"

type Snap = {
  id: string
  campanhaId: string
  dataSnapshot: Date
  gasto: number | null
  updatedAt: Date
  [k: string]: unknown
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function makeFakeDb() {
  const contas = [{ id: "conta1", googleAdsCustomerId: "cid-123" }]
  const campanhas = [{ id: "camp1", contaTrafegoId: "conta1", nomeCampanhaGoogleAds: "Campanha A" }]
  const snaps: Snap[] = []
  const segmentos: Array<Record<string, unknown>> = []
  const naoReconciliados: Array<Record<string, unknown>> = []
  const termos = [{ id: "termo1" }]
  const series: Array<Record<string, unknown>> = []
  let nextId = 1

  const client = {
    contaTrafego: {
      findMany: async ({ where }: { where: { googleAdsCustomerId: { in: string[] } } }) =>
        contas.filter((c) => where.googleAdsCustomerId.in.includes(c.googleAdsCustomerId)),
    },
    campanha: {
      findMany: async ({
        where,
      }: {
        where: { contaTrafegoId: { in: string[] }; nomeCampanhaGoogleAds: { in: string[] } }
      }) =>
        campanhas.filter(
          (c) =>
            where.contaTrafegoId.in.includes(c.contaTrafegoId) &&
            where.nomeCampanhaGoogleAds.in.includes(c.nomeCampanhaGoogleAds),
        ),
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const c = campanhas.find((x) => x.id === id)
        if (!c) return null
        return {
          ...c,
          status: "PAUSADO", // regras de teste testadas isoladamente em regras/teste.test.ts
          gastoTotalAcumulado: null,
          produto: { comissaoValor: null },
          snapshots: snaps
            .filter((s) => s.campanhaId === id)
            .map((s) => ({ gasto: s.gasto, receitaConfirmada: null, conversoes: null, dataSnapshot: s.dataSnapshot, checkoutsCount: null })),
        }
      },
      update: async () => ({}),
    },
    vendaAfiliado: { findMany: async () => [] as Array<{ valorComissao: number }> },
    itemFila: {
      findFirst: async () => null,
      create: async () => ({ id: "if1" }),
    },
    campanhaSnapshot: {
      findMany: async ({
        where,
      }: {
        where: { campanhaId: string; dataSnapshot: { gte: Date; lte: Date } }
      }) =>
        snaps.filter(
          (s) =>
            s.campanhaId === where.campanhaId &&
            s.dataSnapshot.getTime() >= where.dataSnapshot.gte.getTime() &&
            s.dataSnapshot.getTime() <= where.dataSnapshot.lte.getTime(),
        ),
      upsert: async ({
        where: { campanhaId_dataSnapshot },
        create,
        update,
      }: {
        where: { campanhaId_dataSnapshot: { campanhaId: string; dataSnapshot: Date } }
        create: Record<string, unknown>
        update: Record<string, unknown>
      }) => {
        const existing = snaps.find(
          (s) =>
            s.campanhaId === campanhaId_dataSnapshot.campanhaId &&
            dateKey(s.dataSnapshot) === dateKey(campanhaId_dataSnapshot.dataSnapshot),
        )
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() })
          return existing
        }
        const row = { id: `s${nextId++}`, updatedAt: new Date(), ...create } as Snap
        snaps.push(row)
        return row
      },
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        for (const d of data) {
          snaps.push({ id: `s${nextId++}`, updatedAt: new Date(), ...d } as Snap)
        }
        return { count: data.length }
      },
    },
    campanhaNaoReconciliada: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `nr${nextId++}`, createdAt: new Date(), resolvidoEm: null, ...data }
        naoReconciliados.push(row)
        return row
      },
    },
    segmentoCampanhaSnapshot: {
      upsert: async ({
        where: { campanhaId_dimensao_valor_data },
        create,
        update,
      }: {
        where: {
          campanhaId_dimensao_valor_data: { campanhaId: string; dimensao: string; valor: string; data: Date }
        }
        create: Record<string, unknown>
        update: Record<string, unknown>
      }) => {
        const key = campanhaId_dimensao_valor_data
        const existing = segmentos.find(
          (s) =>
            s.campanhaId === key.campanhaId &&
            s.dimensao === key.dimensao &&
            s.valor === key.valor &&
            dateKey(s.data as Date) === dateKey(key.data),
        )
        if (existing) {
          Object.assign(existing, update)
          return existing
        }
        const row = { id: `sg${nextId++}`, ...create }
        segmentos.push(row)
        return row
      },
    },
    termo: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        termos.filter((t) => where.id.in.includes(t.id)),
    },
    serieTermo: {
      upsert: async ({
        create,
      }: {
        where: unknown
        create: Record<string, unknown>
        update: Record<string, unknown>
      }) => {
        const row = { id: `st${nextId++}`, ...create }
        series.push(row)
        return row
      },
    },
  }

  return {
    client: client as unknown as PrismaClient,
    snaps,
    segmentos,
    naoReconciliados,
    series,
  }
}

describe("processarCampanhaDiario", () => {
  it("materializa dias sem linha como zero, sem tocar dias já cobertos", async () => {
    const { client, snaps } = makeFakeDb()
    const envelope: EnvelopeCampanhaDiario = {
      fonte: "ads-script",
      tipo: "CAMPANHA_DIARIO",
      periodo: { inicio: new Date("2026-08-01T00:00:00Z"), fim: new Date("2026-08-03T00:00:00Z") },
      campanhasCobertas: [{ googleAdsCustomerId: "cid-123", nomeCampanhaGoogleAds: "Campanha A" }],
      linhas: [
        {
          googleAdsCustomerId: "cid-123",
          nomeCampanhaGoogleAds: "Campanha A",
          dataSnapshot: new Date("2026-08-02T00:00:00Z"),
          gasto: 50,
        },
      ],
    }

    const resumo = await processarCampanhaDiario(client, "ads-script", envelope)

    expect(resumo.snapshotsUpsertados).toBe(1)
    expect(resumo.naoReconciliados).toBe(0)
    expect(resumo.materializados).toBe(2) // dia 01 e 03, zerados
    expect(snaps).toHaveLength(3)

    const dia1 = snaps.find((s) => dateKey(s.dataSnapshot) === "2026-08-01")
    const dia2 = snaps.find((s) => dateKey(s.dataSnapshot) === "2026-08-02")
    const dia3 = snaps.find((s) => dateKey(s.dataSnapshot) === "2026-08-03")
    expect(dia1?.gasto).toBe(0)
    expect(dia2?.gasto).toBe(50)
    expect(dia3?.gasto).toBe(0)
  })

  it("upsert é last-write-wins — segunda chegada sobrescreve sem duplicar", async () => {
    const { client, snaps } = makeFakeDb()
    const base: EnvelopeCampanhaDiario = {
      fonte: "ads-script",
      tipo: "CAMPANHA_DIARIO",
      periodo: { inicio: new Date("2026-08-02T00:00:00Z"), fim: new Date("2026-08-02T00:00:00Z") },
      campanhasCobertas: [],
      linhas: [
        {
          googleAdsCustomerId: "cid-123",
          nomeCampanhaGoogleAds: "Campanha A",
          dataSnapshot: new Date("2026-08-02T00:00:00Z"),
          gasto: 50,
        },
      ],
    }
    await processarCampanhaDiario(client, "ads-script", base)
    await processarCampanhaDiario(client, "ads-script", {
      ...base,
      linhas: [{ ...base.linhas[0], gasto: 75 }],
    })

    expect(snaps).toHaveLength(1)
    expect(snaps[0].gasto).toBe(75)
  })

  it("linha sem Campanha correspondente vai para a bandeja de não-reconciliados", async () => {
    const { client, snaps, naoReconciliados } = makeFakeDb()
    const envelope: EnvelopeCampanhaDiario = {
      fonte: "ads-script",
      tipo: "CAMPANHA_DIARIO",
      periodo: { inicio: new Date("2026-08-02T00:00:00Z"), fim: new Date("2026-08-02T00:00:00Z") },
      campanhasCobertas: [],
      linhas: [
        {
          googleAdsCustomerId: "cid-999",
          nomeCampanhaGoogleAds: "Campanha Desconhecida",
          dataSnapshot: new Date("2026-08-02T00:00:00Z"),
          gasto: 10,
        },
      ],
    }
    const resumo = await processarCampanhaDiario(client, "ads-script", envelope)
    expect(resumo.naoReconciliados).toBe(1)
    expect(snaps).toHaveLength(0)
    expect(naoReconciliados).toHaveLength(1)
    expect(naoReconciliados[0].fonte).toBe("ads-script")
  })

  it("campanha existente fora do escopo do envelope não é tocada", async () => {
    const { client, snaps } = makeFakeDb()
    snaps.push({
      id: "existing",
      campanhaId: "camp1",
      dataSnapshot: new Date("2026-08-05T00:00:00Z"),
      gasto: 999,
      updatedAt: new Date(),
    })
    const envelope: EnvelopeCampanhaDiario = {
      fonte: "ads-script",
      tipo: "CAMPANHA_DIARIO",
      periodo: { inicio: new Date("2026-08-01T00:00:00Z"), fim: new Date("2026-08-01T00:00:00Z") },
      campanhasCobertas: [],
      linhas: [],
    }
    await processarCampanhaDiario(client, "ads-script", envelope)
    expect(snaps).toHaveLength(1)
    expect(snaps[0].gasto).toBe(999)
  })
})

describe("processarSegmento", () => {
  it("upsert por (campanhaId, dimensao, valor, data)", async () => {
    const { client, segmentos } = makeFakeDb()
    const envelope: EnvelopeSegmento = {
      fonte: "ads-script",
      tipo: "SEGMENTO",
      periodo: { inicio: new Date("2026-08-02T00:00:00Z"), fim: new Date("2026-08-02T00:00:00Z") },
      campanhasCobertas: [],
      linhas: [
        {
          googleAdsCustomerId: "cid-123",
          nomeCampanhaGoogleAds: "Campanha A",
          dimensao: "GEO",
          valor: "BR",
          data: new Date("2026-08-02T00:00:00Z"),
          conversoes: 4,
        },
      ],
    }
    const resumo = await processarSegmento(client, "ads-script", envelope)
    expect(resumo.snapshotsUpsertados).toBe(1)
    expect(segmentos).toHaveLength(1)
    expect(segmentos[0].valor).toBe("BR")
  })
})

describe("processarSerieTermo", () => {
  it("upsert quando termoId existe; conta como não-resolvida quando não existe", async () => {
    const { client, series } = makeFakeDb()
    const envelope: EnvelopeSerieTermo = {
      fonte: "keyword-planner",
      tipo: "SERIE_TERMO",
      periodo: { inicio: new Date("2026-08-01T00:00:00Z"), fim: new Date("2026-08-01T00:00:00Z") },
      linhas: [
        { termoId: "termo1", geo: "BR", fonte: "GOOGLE_KEYWORD_PLANNER", data: new Date("2026-08-01T00:00:00Z"), valor: 100, unidade: "ABSOLUTO" },
        { termoId: "termo-inexistente", geo: "BR", fonte: "GOOGLE_KEYWORD_PLANNER", data: new Date("2026-08-01T00:00:00Z"), valor: 50, unidade: "ABSOLUTO" },
      ],
    }
    const resumo = await processarSerieTermo(client, envelope)
    expect(resumo.seriesUpsertadas).toBe(1)
    expect(resumo.seriesNaoResolvidas).toBe(1)
    expect(series).toHaveLength(1)
  })
})
