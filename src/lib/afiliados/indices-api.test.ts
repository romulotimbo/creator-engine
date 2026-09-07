import { beforeEach, describe, expect, it, vi } from "vitest"

const { auth, db } = vi.hoisted(() => {
  const auth = vi.fn()
  const db = {
    campanha: { findUnique: vi.fn(), create: vi.fn() },
    indiceCampanha: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    indiceCampanhaLinha: { create: vi.fn() },
    produtoAfiliado: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  }
  return { auth, db }
})

vi.mock("@/lib/auth", () => ({ auth: () => auth() }))
vi.mock("@/lib/db", () => ({ db }))
vi.mock("@/lib/afiliados/rollups", () => ({ recomputeProdutoRollups: vi.fn() }))

import { GET as getIndices, POST as postIndice } from "@/app/api/afiliados/campanhas/[id]/indices/route"
import { PATCH as patchFlags } from "@/app/api/afiliados/campanhas/[id]/indices/[indiceId]/route"
import { POST as postLinha } from "@/app/api/afiliados/campanhas/[id]/indices/[indiceId]/linhas/route"
import { POST as postCampanha } from "@/app/api/afiliados/produtos/[id]/campanhas/route"

const paramsCampanha = { params: Promise.resolve({ id: "c1" }) }
const paramsIndice = { params: Promise.resolve({ id: "c1", indiceId: "i1" }) }
const paramsProduto = { params: Promise.resolve({ id: "p1" }) }

function jsonReq(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: "u1" } })
})

describe("auth", () => {
  it("POST índices sem sessão → 401 e não persiste", async () => {
    auth.mockResolvedValue(null)
    const res = await postIndice(jsonReq("http://localhost/api", {
      tipo: "PALAVRA_CHAVE",
      chave: "keto gummies",
      correspondencia: "EXATA",
      status: "ATIVO",
      ajusteLancePct: 10,
    }), paramsCampanha)
    expect(res.status).toBe(401)
    expect(db.indiceCampanha.create).not.toHaveBeenCalled()
  })
})

describe("unicidade keyword+correspondência", () => {
  it("segunda EXATA na mesma campanha → 422", async () => {
    db.campanha.findUnique.mockResolvedValue({ id: "c1" })
    db.indiceCampanha.findUnique.mockResolvedValue({ id: "existente" })
    const res = await postIndice(jsonReq("http://localhost/api", {
      tipo: "PALAVRA_CHAVE",
      chave: "keto gummies",
      correspondencia: "EXATA",
      status: "ATIVO",
      ajusteLancePct: 10,
    }), paramsCampanha)
    expect(res.status).toBe(422)
    expect(db.indiceCampanha.create).not.toHaveBeenCalled()
  })
})

describe("append de linha", () => {
  it("10 → 15 insere linha nova; omitir métricas copia vigente", async () => {
    const vigente = {
      id: "l1",
      capturadaEm: new Date("2026-09-01T10:00:00Z"),
      createdAt: new Date("2026-09-01T10:00:00Z"),
      origem: "MANUAL",
      status: "ATIVO",
      ajusteLancePct: 10,
      cpc: null,
      cliques: 62,
      impressoes: null,
      vendasConversao: null,
      custoConversao: null,
      roi: null,
    }
    db.indiceCampanha.findFirst.mockResolvedValue({
      id: "i1",
      campanhaId: "c1",
      tipo: "PALAVRA_CHAVE",
      chave: "keto",
      correspondencia: "EXATA",
      validadoVisualmente: false,
      negativado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      linhas: [vigente],
    })
    const nova = {
      id: "l2",
      capturadaEm: new Date("2026-09-01T11:00:00Z"),
      createdAt: new Date("2026-09-01T11:00:00Z"),
      origem: "MANUAL",
      status: "ATIVO",
      ajusteLancePct: 15,
      cpc: null,
      cliques: 62,
      impressoes: null,
      vendasConversao: null,
      custoConversao: null,
      roi: null,
    }
    db.indiceCampanhaLinha.create.mockResolvedValue(nova)
    db.indiceCampanha.findUnique.mockResolvedValue({
      id: "i1",
      campanhaId: "c1",
      tipo: "PALAVRA_CHAVE",
      chave: "keto",
      correspondencia: "EXATA",
      validadoVisualmente: false,
      negativado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      linhas: [vigente, nova],
    })

    const res = await postLinha(jsonReq("http://localhost/api", {
      status: "ATIVO",
      ajusteLancePct: 15,
    }), paramsIndice)
    expect(res.status).toBe(201)
    expect(db.indiceCampanhaLinha.create).toHaveBeenCalledTimes(1)
    const data = db.indiceCampanhaLinha.create.mock.calls[0][0].data
    expect(data.ajusteLancePct).toBe(15)
    expect(data.cliques).toBe(62)
    const body = await res.json()
    expect(body.indice.vigente.ajusteLancePct).toBe(15)
  })
})

describe("flags sem foto", () => {
  it("PATCH validadoVisualmente não cria linha", async () => {
    const linhas = [{
      id: "l1",
      capturadaEm: new Date(),
      createdAt: new Date(),
      origem: "MANUAL",
      status: "ATIVO",
      ajusteLancePct: 10,
      cpc: null,
      cliques: 0,
      impressoes: null,
      vendasConversao: null,
      custoConversao: null,
      roi: null,
    }]
    db.indiceCampanha.findFirst.mockResolvedValue({
      id: "i1",
      campanhaId: "c1",
      tipo: "PALAVRA_CHAVE",
      chave: "keto",
      correspondencia: "EXATA",
      validadoVisualmente: false,
      negativado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      linhas,
    })
    db.indiceCampanha.update.mockResolvedValue({
      id: "i1",
      campanhaId: "c1",
      tipo: "PALAVRA_CHAVE",
      chave: "keto",
      correspondencia: "EXATA",
      validadoVisualmente: true,
      negativado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      linhas,
    })

    const res = await patchFlags(jsonReq("http://localhost/api", { validadoVisualmente: true }), paramsIndice)
    expect(res.status).toBe(200)
    expect(db.indiceCampanhaLinha.create).not.toHaveBeenCalled()
    expect(db.indiceCampanha.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { validadoVisualmente: true },
    }))
    const body = await res.json()
    expect(body.vigente).toBeTruthy()
  })
})

describe("seed no create de campanha", () => {
  it("transação cria o trio de dispositivos", async () => {
    db.produtoAfiliado.findUnique.mockResolvedValue({
      id: "p1",
      status: "ATIVO",
      dataInicioTeste: new Date(),
    })
    const created = {
      id: "c-new",
      budgetDiarioDefinido: null,
      budgetTesteAlocado: null,
    }
    const tx = {
      campanha: { create: vi.fn().mockResolvedValue(created) },
      indiceCampanha: { create: vi.fn() },
      produtoAfiliado: { update: vi.fn() },
    }
    db.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx))

    const res = await postCampanha(jsonReq("http://localhost/api", {
      nomeCampanhaGoogleAds: "US | TSL | keto",
    }), paramsProduto)
    expect(res.status).toBe(201)
    expect(tx.indiceCampanha.create).toHaveBeenCalledTimes(3)
    const chaves = tx.indiceCampanha.create.mock.calls.map((c) => c[0].data.chave)
    expect(chaves).toEqual(["SMARTPHONE", "TABLET", "COMPUTADOR"])
  })
})

describe("GET índices exige sessão", () => {
  it("401", async () => {
    auth.mockResolvedValue(null)
    const res = await getIndices(new Request("http://localhost/api"), paramsCampanha)
    expect(res.status).toBe(401)
  })
})
