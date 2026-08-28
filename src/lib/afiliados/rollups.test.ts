import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { computeProdutoRollups, alertaOrcamentoEstourado, computeCampanhaRollups, recomputeCampanhaRollups } from "./rollups"

describe("computeProdutoRollups", () => {
  it("soma o latest snapshot de duas campanhas", () => {
    const result = computeProdutoRollups(
      [
        { snapshots: [{ gasto: 400, receitaConfirmada: 800, conversoes: 4, dataSnapshot: "2026-08-14" }] },
        { snapshots: [{ gasto: 250, receitaConfirmada: 100, conversoes: 1, dataSnapshot: "2026-08-14" }] },
      ],
      1000,
    )
    expect(result.gastoTotalAcumulado).toBe(650)
    expect(result.receitaConfirmadaAcumulada).toBe(900)
    expect(result.roiReal).toBeCloseTo((900 - 650) / 650)
    expect(result.cpaReal).toBeCloseTo(650 / 5)
    expect(result.percentualBudgetConsumido).toBeCloseTo(0.65)
  })

  it("ignora snapshot antigo da mesma campanha", () => {
    const result = computeProdutoRollups([
      {
        snapshots: [
          { gasto: 100, receitaConfirmada: 0, conversoes: 0, dataSnapshot: "2026-08-01" },
          { gasto: 400, receitaConfirmada: 200, conversoes: 2, dataSnapshot: "2026-08-14" },
        ],
      },
    ])
    expect(result.gastoTotalAcumulado).toBe(400)
    expect(result.receitaConfirmadaAcumulada).toBe(200)
  })

  it("produto sem campanhas retorna null (não ROI zero)", () => {
    const result = computeProdutoRollups([])
    expect(result.gastoTotalAcumulado).toBeNull()
    expect(result.roiReal).toBeNull()
    expect(result.cpaReal).toBeNull()
    expect(result.dataUltimaAtualizacaoDados).toBeNull()
  })
})

describe("computeCampanhaRollups", () => {
  it("gasto = SOMA de todos os snapshots (grão diário); receita = soma das comissões já filtradas por APROVADA", () => {
    const result = computeCampanhaRollups(
      [
        { gasto: 100, receitaConfirmada: null, conversoes: null, dataSnapshot: "2026-08-01" },
        { gasto: 400, receitaConfirmada: null, conversoes: null, dataSnapshot: "2026-08-14" },
      ],
      [{ valorComissao: 300 }, { valorComissao: 200 }],
    )
    expect(result.gastoTotalAcumulado).toBe(500)
    expect(result.receitaConfirmadaAcumulada).toBe(500)
    expect(result.roiReal).toBeCloseTo((500 - 500) / 500)
    expect(result.cpaReal).toBeCloseTo(500 / 2)
  })

  it("sem snapshots retorna null (não zero)", () => {
    const result = computeCampanhaRollups([], [{ valorComissao: 100 }])
    expect(result.gastoTotalAcumulado).toBeNull()
    expect(result.roiReal).toBeNull()
  })
})

function makeFakeCampanhaDb(opts: {
  campanhaId: string
  snapshots: Array<{ gasto: number; dataSnapshot: string }>
  vendas: Array<{ status: string; campanhaId: string | null; valorComissao: number }>
  campanhaStatus?: string
}) {
  let updateData: Record<string, unknown> | null = null
  const client = {
    campanha: {
      findUnique: async () => ({
        snapshots: opts.snapshots.map((s) => ({ ...s, receitaConfirmada: null, conversoes: null })),
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateData = data
        return { id: opts.campanhaId, status: opts.campanhaStatus ?? "ESCALANDO", ...data }
      },
    },
    vendaAfiliado: {
      findMany: async ({ where }: { where: { campanhaId: string; status: string } }) =>
        opts.vendas.filter((v) => v.campanhaId === where.campanhaId && v.status === where.status),
    },
  }
  return { client: client as unknown as PrismaClient, getUpdateData: () => updateData }
}

describe("recomputeCampanhaRollups", () => {
  it("exclui vendas PENDENTE/CANCELADA/ESTORNADA da receita — só soma APROVADA", async () => {
    const { client, getUpdateData } = makeFakeCampanhaDb({
      campanhaId: "c1",
      snapshots: [{ gasto: 400, dataSnapshot: "2026-08-14" }],
      vendas: [
        { status: "APROVADA", campanhaId: "c1", valorComissao: 300 },
        { status: "PENDENTE", campanhaId: "c1", valorComissao: 999 },
        { status: "CANCELADA", campanhaId: "c1", valorComissao: 999 },
        { status: "ESTORNADA", campanhaId: "c1", valorComissao: 999 },
      ],
    })
    const result = await recomputeCampanhaRollups(client, "c1")
    expect(result.receitaConfirmadaAcumulada).toBe(300)
    expect(getUpdateData()).toMatchObject({ receitaConfirmadaAcumulada: 300 })
  })

  it("estorno pós-ESCALANDO recalcula o rollup sem tocar Campanha.status", async () => {
    const { client, getUpdateData } = makeFakeCampanhaDb({
      campanhaId: "c1",
      campanhaStatus: "ESCALANDO",
      snapshots: [{ gasto: 400, dataSnapshot: "2026-08-14" }],
      // venda que era APROVADA virou ESTORNADA — já não entra na soma
      vendas: [{ status: "ESTORNADA", campanhaId: "c1", valorComissao: 300 }],
    })
    const result = await recomputeCampanhaRollups(client, "c1")
    expect(result.receitaConfirmadaAcumulada).toBe(0)
    const data = getUpdateData()
    expect(data).not.toHaveProperty("status")
  })
})

describe("alertaOrcamentoEstourado", () => {
  it("alerta quando TESTANDO e gasto > budget", () => {
    expect(alertaOrcamentoEstourado({ gasto: 1200, budget: 1000, statusOperacional: "TESTANDO" })).toBe(true)
  })

  it("não alerta quando ESCALANDO", () => {
    expect(alertaOrcamentoEstourado({ gasto: 1200, budget: 1000, statusOperacional: "ESCALANDO" })).toBe(false)
  })
})
