import { describe, it, expect, vi } from "vitest"
import {
  cascatearPausaProduto,
  deveCascatearPausaProduto,
  leituraTrafegoDeOferta,
  leituraTrafegoDeProduto,
  produtoAceitaCampanhaNova,
} from "./pausa-produto"

describe("produtoAceitaCampanhaNova", () => {
  it("só ATIVO", () => {
    expect(produtoAceitaCampanhaNova("ATIVO")).toBe(true)
    expect(produtoAceitaCampanhaNova("PAUSADO")).toBe(false)
    expect(produtoAceitaCampanhaNova("ARQUIVADO")).toBe(false)
  })
})

describe("deveCascatearPausaProduto", () => {
  it("pausa e arquivo cascateiam; ATIVO não religa", () => {
    expect(deveCascatearPausaProduto("PAUSADO")).toBe(true)
    expect(deveCascatearPausaProduto("ARQUIVADO")).toBe(true)
    expect(deveCascatearPausaProduto("ATIVO")).toBe(false)
    expect(deveCascatearPausaProduto(undefined)).toBe(false)
  })
})

describe("leituraTrafegoDeProduto", () => {
  it("NO_AR quando há TESTANDO", () => {
    const l = leituraTrafegoDeProduto({
      id: "p1",
      slug: "pawlax",
      status: "ATIVO",
      gastoTotalAcumulado: 96.57,
      budgetTesteAlocado: 40,
      campanhas: [{ id: "c1", status: "TESTANDO" }],
    })
    expect(l.trafego).toBe("NO_AR")
    expect(l.campanhaId).toBe("c1")
    expect(l.gasto).toBe(96.57)
  })

  it("SEM_TRAFEGO com produto pausado", () => {
    const l = leituraTrafegoDeProduto({
      id: "p1",
      slug: "pawlax",
      status: "PAUSADO",
      gastoTotalAcumulado: 96.57,
      budgetTesteAlocado: 40,
      campanhas: [{ id: "c1", status: "PAUSADO" }],
    })
    expect(l.trafego).toBe("SEM_TRAFEGO")
    expect(l.produtoStatus).toBe("PAUSADO")
  })
})

describe("leituraTrafegoDeOferta", () => {
  it("só em EM_EXECUCAO com produto", () => {
    expect(leituraTrafegoDeOferta({ statusDecisao: "ANALISE", produtosGerados: [] })).toBeNull()
    const l = leituraTrafegoDeOferta({
      statusDecisao: "EM_EXECUCAO",
      produtosGerados: [{
        id: "p1",
        slug: "pawlax",
        status: "PAUSADO",
        gastoTotalAcumulado: 96.57,
        budgetTesteAlocado: 40,
        campanhas: [{ id: "c1", status: "PAUSADO" }],
      }],
    })
    expect(l?.trafego).toBe("SEM_TRAFEGO")
    expect(l?.produtoStatus).toBe("PAUSADO")
  })
})

describe("cascatearPausaProduto", () => {
  it("pausa TESTANDO/ESCALANDO, ignora ENCERRADO e expira fila", async () => {
    const updateMany = vi.fn()
    const campanhaUpdate = vi.fn()
    const logCreate = vi.fn()
    const findMany = vi.fn(async () => [{ id: "c-test" }, { id: "c-esc" }])
    const client = {
      campanha: {
        findMany,
        findUnique: async ({ where }: { where: { id: string } }) => ({
          status: where.id === "c-esc" ? "ESCALANDO" : "TESTANDO",
        }),
        update: campanhaUpdate,
      },
      campanhaStatusLog: { create: logCreate },
      itemFila: { updateMany },
    }
    const ids = await cascatearPausaProduto(client as never, "p1", "produto pausado")
    expect(ids).toEqual(["c-test", "c-esc"])
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ produtoId: "p1", status: { in: ["TESTANDO", "ESCALANDO"] } }),
      }),
    )
    expect(campanhaUpdate).toHaveBeenCalledTimes(2)
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ alvoId: { in: ["c-test", "c-esc"] } }),
        data: expect.objectContaining({ status: "EXPIRADO" }),
      }),
    )
  })
})
