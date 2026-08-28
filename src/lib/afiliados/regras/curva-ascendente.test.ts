import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { avaliarCurvaAscendente, derivarJanelasDeSerie, avaliarRegraCurvaAscendente } from "./curva-ascendente"

const PISO_MAGNITUDE = 40
const PISO_VOLUME = 300

describe("avaliarCurvaAscendente", () => {
  it("busca caindo exclui sempre, mesmo com rede subindo", () => {
    const r = avaliarCurvaAscendente({
      threeMonthChangePct: -0.5,
      yoyChangePct: -0.3,
      volumeAbsolutoMensal: 1000,
      trafficGrowthRedePct: 0.85, // rede subindo bastante — não importa, portão fechado
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(r.elegivel).toBe(false)
    expect(r.prioridade).toBeNull()
  })

  it("busca subindo abaixo do piso de magnitude também exclui", () => {
    const r = avaliarCurvaAscendente({
      threeMonthChangePct: 0.1, // 10%, abaixo do piso de 40%
      yoyChangePct: null,
      volumeAbsolutoMensal: 1000,
      trafficGrowthRedePct: null,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(r.elegivel).toBe(false)
  })

  it("saída-do-zero (YoY=Infinity) ignora o piso de magnitude, mas ainda exige volume mínimo", () => {
    const semVolume = avaliarCurvaAscendente({
      threeMonthChangePct: null,
      yoyChangePct: Infinity,
      volumeAbsolutoMensal: 50, // abaixo do piso de 300
      trafficGrowthRedePct: null,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(semVolume.elegivel).toBe(false) // piso de volume ainda vale

    const comVolume = avaliarCurvaAscendente({
      threeMonthChangePct: null,
      yoyChangePct: Infinity,
      volumeAbsolutoMensal: 300,
      trafficGrowthRedePct: null,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(comVolume.elegivel).toBe(true)
    expect(comVolume.saidaDoZero).toBe(true)
  })

  it("busca↑ + rede↓ = prioridade ALTA", () => {
    const r = avaliarCurvaAscendente({
      threeMonthChangePct: 0.5,
      yoyChangePct: null,
      volumeAbsolutoMensal: 400,
      trafficGrowthRedePct: -0.2,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(r.elegivel).toBe(true)
    expect(r.prioridade).toBe("ALTA")
  })

  it("busca↑ + rede↑ = prioridade MEDIA", () => {
    const r = avaliarCurvaAscendente({
      threeMonthChangePct: 0.5,
      yoyChangePct: null,
      volumeAbsolutoMensal: 400,
      trafficGrowthRedePct: 0.3,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(r.prioridade).toBe("MEDIA")
  })

  it("rede indisponível → MEDIA por padrão (sem penalidade nem bônus)", () => {
    const r = avaliarCurvaAscendente({
      threeMonthChangePct: 0.5,
      yoyChangePct: null,
      volumeAbsolutoMensal: 400,
      trafficGrowthRedePct: null,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(r.prioridade).toBe("MEDIA")
  })

  it("sem volume mínimo exclui mesmo com busca subindo forte", () => {
    const r = avaliarCurvaAscendente({
      threeMonthChangePct: 1.0,
      yoyChangePct: null,
      volumeAbsolutoMensal: 100,
      trafficGrowthRedePct: null,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(r.elegivel).toBe(false)
  })

  it("janela disparadora reporta AMBAS quando 3-month e YoY sobem juntas", () => {
    const r = avaliarCurvaAscendente({
      threeMonthChangePct: 0.5,
      yoyChangePct: 0.6,
      volumeAbsolutoMensal: 400,
      trafficGrowthRedePct: null,
      pisoMagnitudePct: PISO_MAGNITUDE,
      pisoVolumeMensal: PISO_VOLUME,
    })
    expect(r.janelaDisparadora).toBe("AMBAS")
  })
})

describe("derivarJanelasDeSerie", () => {
  it("nunca mistura fonte/unidade diferentes ao comparar", () => {
    const serie = [
      { data: new Date("2026-08-01"), valor: 100, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
      { data: new Date("2026-05-01"), valor: 50, fonte: "GLIMPSE", unidade: "INDICE_0_100" }, // não deve entrar na comparação
    ]
    const r = derivarJanelasDeSerie(serie)
    expect(r.threeMonthChangePct).toBeNull()
  })

  it("volumeAbsolutoMensal só é lido quando a unidade é ABSOLUTO", () => {
    const serieIndice = [{ data: new Date("2026-08-01"), valor: 80, fonte: "MANUAL", unidade: "INDICE_0_100" }]
    expect(derivarJanelasDeSerie(serieIndice).volumeAbsolutoMensal).toBeNull()

    const serieAbsoluta = [{ data: new Date("2026-08-01"), valor: 500, fonte: "MANUAL", unidade: "ABSOLUTO" }]
    expect(derivarJanelasDeSerie(serieAbsoluta).volumeAbsolutoMensal).toBe(500)
  })
})

function makeFakeDb(opts: {
  statusDecisao: string
  termos: Array<{ id: string; termo: string }>
  seriesPorTermo: Record<string, Array<{ data: Date; valor: number | null; fonte: string; unidade: string }>>
  tendenciaTrafego30d: number | null
}) {
  const itens: Array<{ id: string; regra: string; tipoAlvo: string; alvoId: string; prioridade: string; status: string }> = []
  let nextId = 1
  const client = {
    ofertaDecisao: {
      findUnique: async () => ({ id: "o1", statusDecisao: opts.statusDecisao, tendenciaTrafego30d: opts.tendenciaTrafego30d }),
    },
    termo: { findMany: async () => opts.termos },
    serieTermo: { findMany: async ({ where }: { where: { termoId: string } }) => opts.seriesPorTermo[where.termoId] ?? [] },
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

describe("avaliarRegraCurvaAscendente (trigger)", () => {
  it("gera um único ItemFila por oferta mesmo com múltiplos termos disparando", async () => {
    const { client, itens } = makeFakeDb({
      statusDecisao: "ANALISE",
      termos: [{ id: "t1", termo: "termo a" }, { id: "t2", termo: "termo b" }],
      seriesPorTermo: {
        t1: [
          { data: new Date("2026-08-01"), valor: 500, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
          { data: new Date("2026-05-03"), valor: 200, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
        ],
        t2: [
          { data: new Date("2026-08-01"), valor: 400, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
          { data: new Date("2026-05-03"), valor: 150, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
        ],
      },
      tendenciaTrafego30d: null,
    })
    await avaliarRegraCurvaAscendente(client, "o1")
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe("radar.curvaAscendente")
    expect(itens[0].tipoAlvo).toBe("OFERTA")
  })

  it("não roda para oferta já convertida (EM_EXECUCAO)", async () => {
    const { client, itens } = makeFakeDb({
      statusDecisao: "EM_EXECUCAO",
      termos: [{ id: "t1", termo: "termo a" }],
      seriesPorTermo: {
        t1: [
          { data: new Date("2026-08-01"), valor: 500, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
          { data: new Date("2026-05-03"), valor: 200, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
        ],
      },
      tendenciaTrafego30d: null,
    })
    await avaliarRegraCurvaAscendente(client, "o1")
    expect(itens).toHaveLength(0)
  })
})
