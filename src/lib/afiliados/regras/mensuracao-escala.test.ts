import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import {
  mesReferenciaFechado,
  calcularRoiJanela,
  avaliarRitmoEntrega,
  avaliarMensuracaoMensal,
  roiSemanalAuxiliar,
  avaliarRegraRitmoAjuste,
  avaliarRegraRecuo,
} from "./mensuracao-escala"

describe("mesReferenciaFechado", () => {
  it("retorna o mês calendário anterior, fechado", () => {
    const ref = mesReferenciaFechado(new Date("2026-08-27T12:00:00Z"))
    expect(ref.chave).toBe("2026-07")
    expect(ref.inicio.toISOString()).toBe("2026-07-01T00:00:00.000Z")
    expect(ref.fim.toISOString()).toBe("2026-07-31T23:59:59.999Z")
  })

  it("janeiro volta pro ano anterior", () => {
    const ref = mesReferenciaFechado(new Date("2026-01-15T00:00:00Z"))
    expect(ref.chave).toBe("2025-12")
  })
})

describe("calcularRoiJanela", () => {
  it("roi = (receita-gasto)/gasto", () => {
    expect(calcularRoiJanela(100, 150).roi).toBeCloseTo(0.5)
  })
  it("gasto zero → roi nulo (não divide por zero)", () => {
    expect(calcularRoiJanela(0, 0).roi).toBeNull()
  })
})

describe("avaliarRitmoEntrega — informativo, nunca gera item", () => {
  it("abaixo de 50% do budget diário", () => {
    expect(avaliarRitmoEntrega(20, 100)).toBe("ABAIXO")
  })
  it("dentro da faixa normal", () => {
    expect(avaliarRitmoEntrega(100, 100)).toBe("NORMAL")
  })
  it("acima de 150% do budget diário — overdelivery", () => {
    expect(avaliarRitmoEntrega(200, 100)).toBe("ACIMA")
  })
  it("sem budget definido", () => {
    expect(avaliarRitmoEntrega(50, null)).toBe("SEM_BUDGET")
  })
})

function makeFakeDb(opts: {
  status: string
  snapshotsPorPeriodo: Record<string, number> // "YYYY-MM-DD" -> gasto
  vendasPorPeriodo: Array<{ data: string; valorComissao: number }>
  ajustes?: Array<{ id: string; data: Date; tipo: string }>
  logsEscalada?: Array<{ data: Date }>
}) {
  const itens: Array<{ id: string; regra: string; status: string }> = []
  let nextId = 1
  const client = {
    campanha: {
      findUnique: async () => ({ id: "c1", status: opts.status, produtoId: "p1" }),
    },
    campanhaSnapshot: {
      findMany: async ({ where }: { where: { dataSnapshot: { gte: Date; lte: Date } } }) =>
        Object.entries(opts.snapshotsPorPeriodo)
          .filter(([data]) => {
            const t = new Date(`${data}T12:00:00Z`).getTime()
            return t >= where.dataSnapshot.gte.getTime() && t <= where.dataSnapshot.lte.getTime()
          })
          .map(([, gasto]) => ({ gasto })),
    },
    vendaAfiliado: {
      findMany: async ({ where }: { where: { data: { gte: Date; lte: Date } } }) =>
        opts.vendasPorPeriodo
          .filter((v) => {
            const t = new Date(`${v.data}T12:00:00Z`).getTime()
            return t >= where.data.gte.getTime() && t <= where.data.lte.getTime()
          })
          .map((v) => ({ valorComissao: v.valorComissao })),
    },
    produtoAfiliado: { findUnique: async () => ({ limiaresOverride: null }) },
    limiarGlobal: { findUnique: async () => null },
    ajusteCampanha: {
      findFirst: async () => (opts.ajustes?.length ? opts.ajustes[opts.ajustes.length - 1] : null),
    },
    campanhaStatusLog: {
      findFirst: async () => (opts.logsEscalada?.length ? opts.logsEscalada[opts.logsEscalada.length - 1] : null),
    },
    itemFila: {
      findFirst: async ({ where }: { where: { regra?: string; regra_startsWith?: string } }) => {
        // suporta tanto igualdade exata quanto o prefixo de recuo
        return itens.find((i) => i.regra === where.regra) ?? null
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const item = { id: `i${nextId++}`, status: "ABERTO", ...data } as (typeof itens)[number]
        itens.push(item)
        return item
      },
    },
  }
  return { client: client as unknown as PrismaClient, itens }
}

describe("avaliarMensuracaoMensal", () => {
  it("não roda fora de ESCALANDO", async () => {
    const { client, itens } = makeFakeDb({
      status: "TESTANDO",
      snapshotsPorPeriodo: { "2026-07-15": 1000 },
      vendasPorPeriodo: [],
    })
    await avaliarMensuracaoMensal(client, "c1", new Date("2026-08-27"))
    expect(itens).toHaveLength(0)
  })

  it("ROI mensal abaixo do limiar gera item de diagnóstico, com o mês na chave da regra", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: { "2026-07-10": 1000 },
      vendasPorPeriodo: [{ data: "2026-07-12", valorComissao: 500 }], // roi = (500-1000)/1000 = -0.5, abaixo do default 0.15
    })
    await avaliarMensuracaoMensal(client, "c1", new Date("2026-08-27"))
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe("escala.mensuracaoMensal:2026-07")
  })

  it("ROI mensal acima do limiar não gera item", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: { "2026-07-10": 1000 },
      vendasPorPeriodo: [{ data: "2026-07-12", valorComissao: 2000 }], // roi = 1.0
    })
    await avaliarMensuracaoMensal(client, "c1", new Date("2026-08-27"))
    expect(itens).toHaveLength(0)
  })

  it("sem gasto no mês fechado não gera item (nada a diagnosticar)", async () => {
    const { client, itens } = makeFakeDb({ status: "ESCALANDO", snapshotsPorPeriodo: {}, vendasPorPeriodo: [] })
    await avaliarMensuracaoMensal(client, "c1", new Date("2026-08-27"))
    expect(itens).toHaveLength(0)
  })
})

describe("roiSemanalAuxiliar — nunca gera ItemFila, só leitura", () => {
  it("calcula ROI da semana corrente sem side-effect", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: { "2026-08-25": 100 },
      vendasPorPeriodo: [{ data: "2026-08-25", valorComissao: 200 }],
    })
    const roi = await roiSemanalAuxiliar(client, "c1", new Date("2026-08-27T12:00:00Z"))
    expect(roi.gasto).toBe(100)
    expect(roi.receita).toBe(200)
    expect(itens).toHaveLength(0) // confirma: nunca gera item de fila
  })
})

describe("avaliarRegraRitmoAjuste — regra dos 5-10%", () => {
  it("não sugere antes de 24h desde a entrada em escala", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: {},
      vendasPorPeriodo: [],
      logsEscalada: [{ data: new Date("2026-08-27T10:00:00Z") }],
    })
    await avaliarRegraRitmoAjuste(client, "c1", new Date("2026-08-27T20:00:00Z")) // 10h depois
    expect(itens).toHaveLength(0)
  })

  it("sugere depois de 24h desde a entrada em escala (sem ajuste ainda)", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: {},
      vendasPorPeriodo: [],
      logsEscalada: [{ data: new Date("2026-08-26T10:00:00Z") }],
    })
    await avaliarRegraRitmoAjuste(client, "c1", new Date("2026-08-27T11:00:00Z")) // 25h depois
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe("escala.ajuste5a10")
  })

  it("âncora troca pro último ajuste quando existe", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: {},
      vendasPorPeriodo: [],
      logsEscalada: [{ data: new Date("2026-08-01T00:00:00Z") }],
      ajustes: [{ id: "aj1", data: new Date("2026-08-27T10:00:00Z"), tipo: "BUDGET" }],
    })
    await avaliarRegraRitmoAjuste(client, "c1", new Date("2026-08-27T20:00:00Z")) // 10h desde o ajuste
    expect(itens).toHaveLength(0) // ainda não passaram 24h do ajuste, mesmo com log de escalada antigo
  })
})

describe("avaliarRegraRecuo", () => {
  it("não dispara antes da janela de 3 dias pós-ajuste fechar", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: { "2026-08-25": 500 },
      vendasPorPeriodo: [],
      ajustes: [{ id: "aj1", data: new Date("2026-08-25T00:00:00Z"), tipo: "BUDGET" }],
    })
    // só 1 dia se passou desde o ajuste — janela de 3 dias ainda não fechou
    await avaliarRegraRecuo(client, "c1", new Date("2026-08-26T00:00:00Z"))
    expect(itens).toHaveLength(0)
  })

  it("dispara quando o ROI pós-ajuste vira negativo e o pré-ajuste não era", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: {
        "2026-08-23": 100, // pré-ajuste (positivo)
        "2026-08-26": 500, // pós-ajuste (negativo)
      },
      vendasPorPeriodo: [
        { data: "2026-08-23", valorComissao: 200 }, // pré: roi = (200-100)/100 = +1.0
        { data: "2026-08-26", valorComissao: 100 }, // pós: roi = (100-500)/500 = -0.8
      ],
      ajustes: [{ id: "aj1", data: new Date("2026-08-25T00:00:00Z"), tipo: "BUDGET" }],
    })
    await avaliarRegraRecuo(client, "c1", new Date("2026-08-28T00:00:01Z")) // janela de 3 dias já fechou
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe("escala.recuo:aj1")
  })

  it("não dispara quando o pré-ajuste já era negativo (não é 'virou' prejuízo)", async () => {
    const { client, itens } = makeFakeDb({
      status: "ESCALANDO",
      snapshotsPorPeriodo: { "2026-08-23": 500, "2026-08-26": 500 },
      vendasPorPeriodo: [
        { data: "2026-08-23", valorComissao: 100 }, // pré: roi negativo
        { data: "2026-08-26", valorComissao: 100 }, // pós: também negativo
      ],
      ajustes: [{ id: "aj1", data: new Date("2026-08-25T00:00:00Z"), tipo: "BUDGET" }],
    })
    await avaliarRegraRecuo(client, "c1", new Date("2026-08-28T00:00:01Z"))
    expect(itens).toHaveLength(0)
  })
})
