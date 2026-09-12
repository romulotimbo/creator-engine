import { beforeEach, describe, expect, it, vi } from "vitest"

const { auth, db } = vi.hoisted(() => {
  const auth = vi.fn()
  const db = {
    campanha: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    campanhaStatusLog: { create: vi.fn() },
    itemFila: { findMany: vi.fn() },
    produtoAfiliado: { findUnique: vi.fn(), update: vi.fn() },
    indiceCampanha: { create: vi.fn() },
    $transaction: vi.fn(),
  }
  return { auth, db }
})

vi.mock("@/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/afiliados/rollups", () => ({ recomputeProdutoRollups: vi.fn() }))

import { GET, PATCH } from "@/app/api/afiliados/campanhas/[id]/route"
import { POST as postCampanha } from "@/app/api/afiliados/produtos/[id]/campanhas/route"

const paramsCampanha = { params: Promise.resolve({ id: "c1" }) }
const paramsProduto = { params: Promise.resolve({ id: "p1" }) }

function jsonReq(method: string, body: unknown) {
  return new Request("http://localhost/api", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const campanhaExistente = {
  id: "c1",
  produtoId: "p1",
  status: "TESTANDO",
  budgetDiarioDefinido: null,
  budgetTesteAlocado: null,
  bridgeObservacoes: "pixel na thank-you",
  observacoes: "plano antigo",
  snapshots: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "u1" } })
  db.campanha.findUnique.mockResolvedValue(campanhaExistente)
  db.itemFila.findMany.mockResolvedValue([])
})

describe("auth", () => {
  it("PATCH observações sem sessão → 401 e não persiste", async () => {
    auth.mockResolvedValue(null)
    const res = await PATCH(jsonReq("PATCH", { observacoes: "plano + copy" }), paramsCampanha)
    expect(res.status).toBe(401)
    expect(db.campanha.update).not.toHaveBeenCalled()
  })
})

describe("PATCH observacoes", () => {
  it("grava o texto e devolve o campo", async () => {
    db.campanha.update.mockResolvedValue({
      ...campanhaExistente,
      observacoes: "plano + copy",
    })
    const res = await PATCH(jsonReq("PATCH", { observacoes: "plano + copy" }), paramsCampanha)
    expect(res.status).toBe(200)
    expect(db.campanha.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ observacoes: "plano + copy" }),
    }))
    const body = await res.json()
    expect(body.observacoes).toBe("plano + copy")
  })

  it("string vazia persiste null", async () => {
    db.campanha.update.mockResolvedValue({
      ...campanhaExistente,
      observacoes: null,
    })
    const res = await PATCH(jsonReq("PATCH", { observacoes: "" }), paramsCampanha)
    expect(res.status).toBe(200)
    expect(db.campanha.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ observacoes: null }),
    }))
    const body = await res.json()
    expect(body.observacoes).toBeNull()
  })

  it("não mexe em bridgeObservacoes ao gravar observacoes", async () => {
    db.campanha.update.mockResolvedValue({
      ...campanhaExistente,
      observacoes: "plano + copy",
    })
    await PATCH(jsonReq("PATCH", { observacoes: "plano + copy" }), paramsCampanha)
    const data = db.campanha.update.mock.calls[0][0].data as Record<string, unknown>
    expect(data.bridgeObservacoes).toBeUndefined()
    expect(data.observacoes).toBe("plano + copy")
  })
})

describe("GET devolve observacoes", () => {
  it("inclui o documento vivo no payload", async () => {
    const res = await GET(new Request("http://localhost/api"), paramsCampanha)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.observacoes).toBe("plano antigo")
    expect(body.bridgeObservacoes).toBe("pixel na thank-you")
  })
})

describe("POST sem herança", () => {
  it("campanha nova nasce com observacoes null mesmo se o body e o produto tiverem texto", async () => {
    db.produtoAfiliado.findUnique.mockResolvedValue({
      id: "p1",
      status: "ATIVO",
      dataInicioTeste: new Date(),
      observacoes: "particularidade do produto",
    })
    const created = {
      id: "c-new",
      budgetDiarioDefinido: null,
      budgetTesteAlocado: null,
      observacoes: null,
    }
    const tx = {
      campanha: { create: vi.fn().mockResolvedValue(created) },
      indiceCampanha: { create: vi.fn() },
      produtoAfiliado: { update: vi.fn() },
    }
    db.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx))

    const res = await postCampanha(jsonReq("POST", {
      nomeCampanhaGoogleAds: "US | TSL | keto",
      observacoes: "não deveria herdar",
      campanhaOrigemId: "c1",
    }), paramsProduto)
    expect(res.status).toBe(201)
    const data = tx.campanha.create.mock.calls[0][0].data as Record<string, unknown>
    expect(data.observacoes).toBeNull()
    expect(data.campanhaOrigemId).toBeUndefined()
    const body = await res.json()
    expect(body.observacoes).toBeNull()
  })
})
