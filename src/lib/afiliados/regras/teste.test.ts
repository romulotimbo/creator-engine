import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { avaliarRegraTeste, avaliarRegraTesteCampanha, tetoTesteUsd, checkoutsMinimosParaFaixa } from "./teste"

describe("tetoTesteUsd", () => {
  it("100% da comissão até US$100", () => {
    expect(tetoTesteUsd(40)).toBe(40)
    expect(tetoTesteUsd(60)).toBe(60)
    expect(tetoTesteUsd(80)).toBe(80)
    expect(tetoTesteUsd(100)).toBe(100)
  })

  it("teto fixo em US$100 acima de US$100", () => {
    expect(tetoTesteUsd(250)).toBe(100)
    expect(tetoTesteUsd(101)).toBe(100)
  })
})

describe("checkoutsMinimosParaFaixa — faixas cumulativas com herança", () => {
  it("≤US$40 não exige checkout", () => {
    expect(checkoutsMinimosParaFaixa(40)).toBe(0)
    expect(checkoutsMinimosParaFaixa(20)).toBe(0)
  })

  it("US$40–60 exige ≥1", () => {
    expect(checkoutsMinimosParaFaixa(41)).toBe(1)
    expect(checkoutsMinimosParaFaixa(60)).toBe(1)
  })

  it("US$60–80 exige ≥2", () => {
    expect(checkoutsMinimosParaFaixa(61)).toBe(2)
    expect(checkoutsMinimosParaFaixa(80)).toBe(2)
  })

  it("US$80–100 herda o mínimo de 2 (sem número próprio declarado)", () => {
    expect(checkoutsMinimosParaFaixa(90)).toBe(2)
    expect(checkoutsMinimosParaFaixa(100)).toBe(2)
  })

  it(">US$100 mantém o mínimo herdado de 2", () => {
    expect(checkoutsMinimosParaFaixa(300)).toBe(2)
  })
})

describe("avaliarRegraTeste", () => {
  it("teto atingido com checkout suficiente", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 60, gastoAcumuladoUsd: 60, checkoutsCount: 1 })
    expect(r.tetoAtingido).toBe(true)
    expect(r.checkoutsSuficientes).toBe(true)
  })

  it("teto atingido sem checkout suficiente — ainda gera o item (evidência, não segundo teto)", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 60, gastoAcumuladoUsd: 60, checkoutsCount: 0 })
    expect(r.tetoAtingido).toBe(true)
    expect(r.checkoutsSuficientes).toBe(false)
  })

  it("gasto abaixo do teto não dispara", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 60, gastoAcumuladoUsd: 30, checkoutsCount: 0 })
    expect(r.tetoAtingido).toBe(false)
  })

  it("alerta de faixa alta antes do teto — comissão >100, 50-60% gasto, sem checkout", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 300, gastoAcumuladoUsd: 55, checkoutsCount: 0 })
    expect(r.alertaFaixaAlta).toBe(true)
    expect(r.tetoAtingido).toBe(false)
  })

  it("sem alerta abaixo de 50% do teto", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 300, gastoAcumuladoUsd: 40, checkoutsCount: 0 })
    expect(r.alertaFaixaAlta).toBe(false)
  })

  it("sem alerta quando já há checkout", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 300, gastoAcumuladoUsd: 55, checkoutsCount: 1 })
    expect(r.alertaFaixaAlta).toBe(false)
  })

  it("sem alerta para comissão ≤US$100 (alerta é só faixa alta)", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 80, gastoAcumuladoUsd: 45, checkoutsCount: 0 })
    expect(r.alertaFaixaAlta).toBe(false)
  })

  it("alerta não dispara mais depois que o teto é atingido (evita item duplicado com o de teto)", () => {
    const r = avaliarRegraTeste({ comissaoValorUsd: 300, gastoAcumuladoUsd: 100, checkoutsCount: 0 })
    expect(r.tetoAtingido).toBe(true)
    expect(r.alertaFaixaAlta).toBe(false)
  })
})

function makeFakeDb(opts: {
  campanhaId: string
  status: string
  comissaoValor: number | null
  gastoTotalAcumulado: number | null
  checkoutsCount: number | null
}) {
  const itens: Array<{ id: string; regra: string; tipoAlvo: string; alvoId: string; prioridade: string; status: string }> = []
  let nextId = 1
  const client = {
    campanha: {
      findUnique: async () => ({
        id: opts.campanhaId,
        status: opts.status,
        gastoTotalAcumulado: opts.gastoTotalAcumulado,
        produto: { comissaoValor: opts.comissaoValor },
        snapshots: [{ checkoutsCount: opts.checkoutsCount }],
      }),
    },
    itemFila: {
      findFirst: async ({
        where,
      }: {
        where: { regra: string; tipoAlvo: string; alvoId: string; status: { notIn: string[] } }
      }) =>
        itens.find(
          (i) =>
            i.regra === where.regra &&
            i.tipoAlvo === where.tipoAlvo &&
            i.alvoId === where.alvoId &&
            !where.status.notIn.includes(i.status),
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const item = { id: `i${nextId++}`, status: "ABERTO", ...data } as (typeof itens)[number]
        itens.push(item)
        return item
      },
    },
  }
  return { client: client as unknown as PrismaClient, itens }
}

describe("avaliarRegraTesteCampanha (trigger)", () => {
  it("não roda para campanha fora de TESTANDO", async () => {
    const { client, itens } = makeFakeDb({
      campanhaId: "c1",
      status: "ESCALANDO",
      comissaoValor: 60,
      gastoTotalAcumulado: 60,
      checkoutsCount: 0,
    })
    await avaliarRegraTesteCampanha(client, "c1")
    expect(itens).toHaveLength(0)
  })

  it("gera ItemFila de teto quando TESTANDO e teto atingido", async () => {
    const { client, itens } = makeFakeDb({
      campanhaId: "c1",
      status: "TESTANDO",
      comissaoValor: 60,
      gastoTotalAcumulado: 60,
      checkoutsCount: 0,
    })
    await avaliarRegraTesteCampanha(client, "c1")
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe("teste.tetoComissao")
    expect(itens[0].tipoAlvo).toBe("CAMPANHA")
    expect(itens[0].alvoId).toBe("c1")
  })

  it("não duplica o item de teto em avaliações repetidas", async () => {
    const { client, itens } = makeFakeDb({
      campanhaId: "c1",
      status: "TESTANDO",
      comissaoValor: 60,
      gastoTotalAcumulado: 60,
      checkoutsCount: 0,
    })
    await avaliarRegraTesteCampanha(client, "c1")
    await avaliarRegraTesteCampanha(client, "c1")
    expect(itens).toHaveLength(1)
  })

  it("gera o item de alerta de faixa alta separado do teto", async () => {
    const { client, itens } = makeFakeDb({
      campanhaId: "c1",
      status: "TESTANDO",
      comissaoValor: 300,
      gastoTotalAcumulado: 55,
      checkoutsCount: 0,
    })
    await avaliarRegraTesteCampanha(client, "c1")
    expect(itens).toHaveLength(1)
    expect(itens[0].regra).toBe("teste.alertaFaixaAlta")
  })
})
