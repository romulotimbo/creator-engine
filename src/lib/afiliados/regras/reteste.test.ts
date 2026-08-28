import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { avaliarTendenciaTermo, decidirReteste, aplicarFolego, avaliarRegraReteste, type PontoSerie } from "./reteste"

function dias(n: number, de: Date = new Date("2026-08-27T00:00:00Z")): Date {
  return new Date(de.getTime() - n * 86_400_000)
}

describe("avaliarTendenciaTermo", () => {
  it("sem pontos → indisponível", () => {
    expect(avaliarTendenciaTermo([]).tendencia).toBe("INDISPONIVEL")
  })

  it("compara contra o ponto de 7 dias atrás quando disponível (prioridade mais granular)", () => {
    const pontos: PontoSerie[] = [
      { data: dias(0), valor: 150, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
      { data: dias(7), valor: 100, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
    ]
    const r = avaliarTendenciaTermo(pontos)
    expect(r.tendencia).toBe("CRESCENDO")
    expect(r.janelaDias).toBe(7)
    expect(r.percentual).toBeCloseTo(0.5)
  })

  it("cai para janela mais agregada quando a mais granular não existe (fallback)", () => {
    const pontos: PontoSerie[] = [
      { data: dias(0), valor: 80, fonte: "GLIMPSE", unidade: "INDICE_0_100" },
      { data: dias(90), valor: 100, fonte: "GLIMPSE", unidade: "INDICE_0_100" },
    ]
    const r = avaliarTendenciaTermo(pontos)
    expect(r.tendencia).toBe("QUEDA")
    expect(r.janelaDias).toBe(90)
  })

  it("nunca mistura índice com volume, nem fontes diferentes — usa o grupo mais recente", () => {
    const pontos: PontoSerie[] = [
      { data: dias(0), valor: 100, fonte: "GOOGLE_KEYWORD_PLANNER", unidade: "ABSOLUTO" },
      { data: dias(7), valor: 40, fonte: "GLIMPSE", unidade: "INDICE_0_100" }, // fonte/unidade diferente — não deve ser usado como comparação
    ]
    const r = avaliarTendenciaTermo(pontos)
    // não há ponto na mesma fonte+unidade pra comparar — indisponível, não mistura
    expect(r.tendencia).toBe("INDISPONIVEL")
  })

  it("estável dentro de ±10%", () => {
    const pontos: PontoSerie[] = [
      { data: dias(0), valor: 105, fonte: "MANUAL", unidade: "ABSOLUTO" },
      { data: dias(30), valor: 100, fonte: "MANUAL", unidade: "ABSOLUTO" },
    ]
    expect(avaliarTendenciaTermo(pontos).tendencia).toBe("ESTAVEL")
  })

  it("valor mais recente nulo → indisponível", () => {
    const pontos: PontoSerie[] = [
      { data: dias(0), valor: null, fonte: "MANUAL", unidade: "ABSOLUTO" },
      { data: dias(7), valor: 100, fonte: "MANUAL", unidade: "ABSOLUTO" },
    ]
    expect(avaliarTendenciaTermo(pontos).tendencia).toBe("INDISPONIVEL")
  })
})

describe("decidirReteste", () => {
  it("indisponível → extensão default de 1 comissão", () => {
    expect(decidirReteste("INDISPONIVEL")).toEqual({ tipo: "EXTENSAO", comissoesMin: 1, comissoesMax: 1 })
  })

  it("estável ou crescendo → extensão de 1-2 comissões", () => {
    expect(decidirReteste("ESTAVEL")).toEqual({ tipo: "EXTENSAO", comissoesMin: 1, comissoesMax: 2 })
    expect(decidirReteste("CRESCENDO")).toEqual({ tipo: "EXTENSAO", comissoesMin: 1, comissoesMax: 2 })
  })

  it("queda → reduzir CPA 5-10%, sem estender", () => {
    expect(decidirReteste("QUEDA")).toEqual({ tipo: "REDUZIR_CPA", faixaMinPct: 5, faixaMaxPct: 10 })
  })
})

describe("aplicarFolego", () => {
  it("usa o menor entre a extensão calculada e o restante do teto do perfil", () => {
    expect(aplicarFolego({ extensaoCalculadaUsd: 250, tetoPerfilUsd: 200, folegoJaConsumidoUsd: 0 })).toBe(200)
    expect(aplicarFolego({ extensaoCalculadaUsd: 100, tetoPerfilUsd: 200, folegoJaConsumidoUsd: 0 })).toBe(100)
  })

  it("desconta o fôlego já consumido antes de comparar", () => {
    expect(aplicarFolego({ extensaoCalculadaUsd: 100, tetoPerfilUsd: 200, folegoJaConsumidoUsd: 150 })).toBe(50)
  })

  it("nunca fica negativo quando o fôlego já foi todo consumido", () => {
    expect(aplicarFolego({ extensaoCalculadaUsd: 100, tetoPerfilUsd: 200, folegoJaConsumidoUsd: 300 })).toBe(0)
  })
})

function makeFakeDb(opts: {
  status: string
  comissaoValor: number | null
  gastoTotalAcumulado: number | null
  roiReal: number | null
  vendas: Array<{ status: string }>
}) {
  const itens: Array<{ id: string; regra: string; alvoId: string; tipoAlvo: string; status: string }> = []
  let nextId = 1
  const client = {
    campanha: {
      findUnique: async () => ({
        id: "c1",
        status: opts.status,
        produtoId: "p1",
        gastoTotalAcumulado: opts.gastoTotalAcumulado,
        roiReal: opts.roiReal,
        produto: { comissaoValor: opts.comissaoValor },
      }),
      findMany: async () => [],
    },
    vendaAfiliado: {
      count: async ({ where }: { where: { status: { in: string[] } } }) =>
        opts.vendas.filter((v) => where.status.in.includes(v.status)).length,
    },
    termo: { findMany: async () => [] },
    serieTermo: { findMany: async () => [] },
    portfolioConfig: { findUnique: async () => ({ id: "default", perfilFolego: "INICIAL" }) },
    limiarGlobal: { findUnique: async () => null },
    itemFila: {
      findFirst: async ({
        where,
      }: {
        where: { regra: string; tipoAlvo: string; alvoId: string; status: { notIn: string[] } }
      }) => itens.find((i) => i.regra === where.regra && i.alvoId === where.alvoId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const item = { id: `i${nextId++}`, status: "ABERTO", ...data } as (typeof itens)[number]
        itens.push(item)
        return item
      },
    },
  }
  return { client: client as unknown as PrismaClient, itens }
}

describe("avaliarRegraReteste (trigger, pré-condição composta)", () => {
  it("não gera item quando teto não foi batido", async () => {
    const { client, itens } = makeFakeDb({
      status: "TESTANDO",
      comissaoValor: 60,
      gastoTotalAcumulado: 30, // abaixo do teto de 60
      roiReal: 0,
      vendas: [{ status: "APROVADA" }],
    })
    await avaliarRegraReteste(client, "c1")
    expect(itens).toHaveLength(0)
  })

  it("não gera item quando há 0 ou mais de 3 vendas", async () => {
    const { client, itens } = makeFakeDb({
      status: "TESTANDO",
      comissaoValor: 60,
      gastoTotalAcumulado: 60,
      roiReal: 0,
      vendas: [],
    })
    await avaliarRegraReteste(client, "c1")
    expect(itens).toHaveLength(0)
  })

  it("não gera item quando ROI está fora da faixa de empate (±10%)", async () => {
    const { client, itens } = makeFakeDb({
      status: "TESTANDO",
      comissaoValor: 60,
      gastoTotalAcumulado: 60,
      roiReal: -0.5, // claramente perdendo — kill normal, não re-teste
      vendas: [{ status: "APROVADA" }],
    })
    await avaliarRegraReteste(client, "c1")
    expect(itens).toHaveLength(0)
  })

  it("pré-condição completa gera item de extensão (Trends indisponível → default)", async () => {
    const { client, itens } = makeFakeDb({
      status: "TESTANDO",
      comissaoValor: 60,
      gastoTotalAcumulado: 60,
      roiReal: 0.05,
      vendas: [{ status: "APROVADA" }, { status: "PENDENTE" }],
    })
    await avaliarRegraReteste(client, "c1")
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe("reteste.extensao")
  })

  it("teto de fôlego vence a extensão calculada em comissões quando o fôlego já foi majoritariamente consumido", async () => {
    const itens: Array<Record<string, unknown>> = []
    let nextId = 1
    const client = {
      campanha: {
        findUnique: async ({ where: { id } }: { where: { id: string } }) =>
          id === "c1"
            ? {
                id: "c1",
                status: "TESTANDO",
                produtoId: "p1",
                gastoTotalAcumulado: 60, // teto (US$60) batido
                roiReal: 0.05, // empatando
                produto: { comissaoValor: 60 },
                campanhaOrigemId: null,
              }
            : null,
        // usado tanto para achar filhos (campanhaOrigemId) quanto pra somar gasto da cadeia (id in [...])
        findMany: async (args: { where: { campanhaOrigemId?: string; id?: { in: string[] } } }) => {
          if (args.where.campanhaOrigemId !== undefined) return []
          if (args.where.id) return [{ gastoTotalAcumulado: 250 }] // já gastou US$250 (US$190 além do teto de US$60)
          return []
        },
      },
      vendaAfiliado: {
        count: async () => 2, // dentro de 1-3
      },
      termo: { findMany: async () => [{ id: "t1" }] },
      serieTermo: {
        findMany: async () => [
          { data: new Date("2026-08-27"), valor: 105, fonte: "MANUAL", unidade: "ABSOLUTO" },
          { data: new Date("2026-07-28"), valor: 100, fonte: "MANUAL", unidade: "ABSOLUTO" },
        ],
      },
      portfolioConfig: { findUnique: async () => ({ id: "default", perfilFolego: "INICIAL" }) }, // teto US$200
      limiarGlobal: { findUnique: async () => null },
      itemFila: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const item = { id: `i${nextId++}`, status: "ABERTO", ...data }
          itens.push(item)
          return item
        },
      },
    }

    await avaliarRegraReteste(client as unknown as PrismaClient, "c1")

    expect(itens).toHaveLength(1)
    const evidencia = itens[0].evidencia as {
      extensaoCalculadaUsd: number
      tetoPerfilUsd: number
      folegoJaConsumidoUsd: number
      extensaoFinalUsd: number
    }
    // Trends estável → decisão de 1-2 comissões → extensaoCalculadaUsd = 2 * 60 = 120
    expect(evidencia.extensaoCalculadaUsd).toBe(120)
    expect(evidencia.tetoPerfilUsd).toBe(200)
    expect(evidencia.folegoJaConsumidoUsd).toBe(190) // 250 - teto(60)
    // restante do fôlego (200-190=10) é menor que a extensão calculada (120) — fôlego vence
    expect(evidencia.extensaoFinalUsd).toBe(10)
  })
})
