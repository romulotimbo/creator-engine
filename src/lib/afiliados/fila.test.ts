import { describe, it, expect } from "vitest"
import { criarItemFilaComDedup, itemFilaAcaoSchema } from "./fila"

type FakeItem = {
  id: string
  tipoAlvo: string
  alvoId: string
  regra: string
  prioridade: string
  resumo: string
  status: string
  evidencia?: unknown
}

function makeFakeDb() {
  const itens: FakeItem[] = []
  let nextId = 1
  const client = {
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
      create: async ({ data }: { data: Omit<FakeItem, "id" | "status"> }) => {
        const item: FakeItem = { id: `i${nextId++}`, status: "ABERTO", ...data }
        itens.push(item)
        return item
      },
    },
  }
  return { client, itens }
}

describe("criarItemFilaComDedup", () => {
  it("cria o primeiro item normalmente", async () => {
    const { client, itens } = makeFakeDb()
    const result = await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: "c1",
      regra: "teste.tetoComissao",
      prioridade: "ALTA",
      resumo: "Teto de teste atingido",
    })
    expect(result.created).toBe(true)
    expect(itens).toHaveLength(1)
  })

  it("não duplica enquanto o item existente não está terminal (dedup por regra/tipoAlvo/alvoId)", async () => {
    const { client, itens } = makeFakeDb()
    await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: "c1",
      regra: "teste.tetoComissao",
      prioridade: "ALTA",
      resumo: "Primeira vez",
    })
    const second = await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: "c1",
      regra: "teste.tetoComissao",
      prioridade: "BAIXA", // tentativa de mudar a prioridade
      resumo: "Segunda vez",
    })
    expect(second.created).toBe(false)
    expect(itens).toHaveLength(1)
    // prioridade não é recalculada pela fila — o item original permanece intacto
    expect(itens[0].prioridade).toBe("ALTA")
    expect(itens[0].resumo).toBe("Primeira vez")
  })

  it("cria um novo item depois que o anterior chega a estado terminal", async () => {
    const { client, itens } = makeFakeDb()
    const first = await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: "c1",
      regra: "teste.tetoComissao",
      prioridade: "ALTA",
      resumo: "Primeira vez",
    })
    itens.find((i) => i.id === first.itemId)!.status = "APLICADO"

    const second = await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: "c1",
      regra: "teste.tetoComissao",
      prioridade: "MEDIA",
      resumo: "Reteste",
    })
    expect(second.created).toBe(true)
    expect(itens).toHaveLength(2)
  })

  it("regras diferentes para o mesmo alvo não colidem", async () => {
    const { client, itens } = makeFakeDb()
    await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: "c1",
      regra: "teste.tetoComissao",
      prioridade: "ALTA",
      resumo: "A",
    })
    await criarItemFilaComDedup(client, {
      tipoAlvo: "CAMPANHA",
      alvoId: "c1",
      regra: "escala.gatilho",
      prioridade: "MEDIA",
      resumo: "B",
    })
    expect(itens).toHaveLength(2)
  })
})

describe("itemFilaAcaoSchema", () => {
  it("aceita adiar/dispensar sem campos extras", () => {
    expect(() => itemFilaAcaoSchema.parse({ acao: "adiar" })).not.toThrow()
    expect(() => itemFilaAcaoSchema.parse({ acao: "dispensar", motivo: "não aplicável" })).not.toThrow()
  })

  it("confirmar sem ajuste não exige valorAplicado", () => {
    expect(() => itemFilaAcaoSchema.parse({ acao: "confirmar" })).not.toThrow()
  })

  it("confirmar com tipoAjuste exige valorAplicado", () => {
    expect(() => itemFilaAcaoSchema.parse({ acao: "confirmar", tipoAjuste: "BUDGET" })).toThrow()
    expect(() =>
      itemFilaAcaoSchema.parse({ acao: "confirmar", tipoAjuste: "BUDGET", valorAplicado: 500 }),
    ).not.toThrow()
  })
})
