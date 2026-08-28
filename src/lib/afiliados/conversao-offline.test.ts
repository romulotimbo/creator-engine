import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import {
  estaForaDaJanela,
  gerarCsvConversoesOffline,
  gerarConversoesOfflineElegiveis,
  REDES_INTEGRACAO_NATIVA,
} from "./conversao-offline"

describe("estaForaDaJanela", () => {
  it("dentro dos 90 dias", () => {
    const clique = new Date("2026-08-01")
    const agora = new Date("2026-08-27") // 26 dias
    expect(estaForaDaJanela(clique, agora)).toBe(false)
  })

  it("exatamente na borda dos 90 dias ainda vale", () => {
    const clique = new Date("2026-01-01T00:00:00Z")
    const agora = new Date(clique.getTime() + 90 * 86_400_000)
    expect(estaForaDaJanela(clique, agora)).toBe(false)
  })

  it("além de 90 dias fica fora da janela", () => {
    const clique = new Date("2026-01-01T00:00:00Z")
    const agora = new Date(clique.getTime() + 91 * 86_400_000)
    expect(estaForaDaJanela(clique, agora)).toBe(true)
  })
})

describe("REDES_INTEGRACAO_NATIVA", () => {
  it("ClickBank é config declarativa de exclusão", () => {
    expect(REDES_INTEGRACAO_NATIVA.has("CLICKBANK")).toBe(true)
    expect(REDES_INTEGRACAO_NATIVA.has("BRAIP")).toBe(false)
  })
})

describe("gerarCsvConversoesOffline", () => {
  it("inclui a linha Parameters:TimeZone= e o cabeçalho de colunas", () => {
    const csv = gerarCsvConversoesOffline([], "America/Sao_Paulo")
    const linhas = csv.split("\n")
    expect(linhas[0]).toBe("Parameters:TimeZone=America/Sao_Paulo")
    expect(linhas[1]).toContain("Google Click ID")
    expect(linhas[1]).toContain("order_id")
    expect(linhas[1]).toContain("Conversion Name")
    expect(linhas[1]).toContain("Conversion Time")
  })

  it("GCLID vai pra coluna Google Click ID; outros identificadores vão pra order_id", () => {
    const csv = gerarCsvConversoesOffline(
      [
        { identificadorTipo: "GCLID", identificadorValor: "abc123", conversionTime: new Date("2026-08-01T12:00:00Z"), retraction: false },
        { identificadorTipo: "ORDER_ID", identificadorValor: "ord-999", conversionTime: new Date("2026-08-01T12:00:00Z"), retraction: false },
      ],
      "UTC",
    )
    const linhas = csv.split("\n")
    expect(linhas[2].startsWith("abc123,")).toBe(true)
    expect(linhas[3].startsWith(",ord-999,")).toBe(true)
  })

  it("marca Retraction=TRUE para linhas de estorno", () => {
    const csv = gerarCsvConversoesOffline(
      [{ identificadorTipo: "ORDER_ID", identificadorValor: "ord-1", conversionTime: new Date(), retraction: true }],
      "UTC",
    )
    expect(csv.split("\n")[2].endsWith(",TRUE")).toBe(true)
  })
})

function makeFakeDb(opts: {
  vendasElegiveis: Array<{
    id: string
    campanhaId: string | null
    data: Date
    tipoIdentificador: string | null
    valorIdentificador: string | null
    plataformaAfil: string
  }>
  campanhaStatus?: string
  ativoPorFase?: { TESTANDO?: boolean; ESCALANDO?: boolean } | null
  vendasParaRetratar?: Array<{ id: string; data: Date; orderId: string | null; tipoIdentificador: string | null; valorIdentificador: string | null }>
}) {
  const updates: Record<string, string> = {}
  const client = {
    vendaAfiliado: {
      findMany: async ({ where }: { where: { status: string } }) =>
        where.status === "ESTORNADA" ? opts.vendasParaRetratar ?? [] : opts.vendasElegiveis,
      update: async ({ where, data }: { where: { id: string }; data: { statusUploadAds: string } }) => {
        updates[where.id] = data.statusUploadAds
        return {}
      },
    },
    campanha: { findUnique: async () => ({ status: opts.campanhaStatus ?? "ESCALANDO", produtoId: "p1" }) },
    produtoAfiliado: { findUnique: async () => ({ limiaresOverride: null }) },
    limiarGlobal: {
      findUnique: async () => (opts.ativoPorFase !== undefined ? { valor: opts.ativoPorFase } : null),
    },
  }
  return { client: client as unknown as PrismaClient, updates }
}

describe("gerarConversoesOfflineElegiveis (integração)", () => {
  it("exclui vendas de rede com integração nativa e marca EXCLUIDA_REDE_NATIVA", async () => {
    const { client, updates } = makeFakeDb({
      vendasElegiveis: [
        { id: "v1", campanhaId: "c1", data: new Date(), tipoIdentificador: "GCLID", valorIdentificador: "x", plataformaAfil: "CLICKBANK" },
      ],
    })
    const resultado = await gerarConversoesOfflineElegiveis(client, new Date())
    expect(resultado.excluidasRedeNativa).toEqual(["v1"])
    expect(updates.v1).toBe("EXCLUIDA_REDE_NATIVA")
    expect(resultado.enviadas).toHaveLength(0)
  })

  it("marca FORA_DA_JANELA para venda além de 90 dias do clique", async () => {
    const antiga = new Date(Date.now() - 100 * 86_400_000)
    const { client, updates } = makeFakeDb({
      vendasElegiveis: [
        { id: "v1", campanhaId: "c1", data: antiga, tipoIdentificador: "GCLID", valorIdentificador: "x", plataformaAfil: "BRAIP" },
      ],
      campanhaStatus: "ESCALANDO",
    })
    const resultado = await gerarConversoesOfflineElegiveis(client)
    expect(resultado.foraDaJanela).toEqual(["v1"])
    expect(updates.v1).toBe("FORA_DA_JANELA")
  })

  it("toggle por fase: TESTANDO desligado por padrão não inclui a venda", async () => {
    const { client, updates } = makeFakeDb({
      vendasElegiveis: [
        { id: "v1", campanhaId: "c1", data: new Date(), tipoIdentificador: "GCLID", valorIdentificador: "x", plataformaAfil: "BRAIP" },
      ],
      campanhaStatus: "TESTANDO",
    })
    const resultado = await gerarConversoesOfflineElegiveis(client)
    expect(resultado.enviadas).toHaveLength(0)
    expect(updates.v1).toBeUndefined() // fica PENDENTE, nem toca
  })

  it("toggle por fase: ESCALANDO ligado por padrão inclui a venda", async () => {
    const { client, updates } = makeFakeDb({
      vendasElegiveis: [
        { id: "v1", campanhaId: "c1", data: new Date(), tipoIdentificador: "GCLID", valorIdentificador: "x", plataformaAfil: "BRAIP" },
      ],
      campanhaStatus: "ESCALANDO",
    })
    const resultado = await gerarConversoesOfflineElegiveis(client)
    expect(resultado.enviadas).toEqual(["v1"])
    expect(updates.v1).toBe("ENVIADA")
    expect(resultado.csv).toContain("x,")
  })

  it("retratação com order_id presente usa order_id", async () => {
    const { client, updates } = makeFakeDb({
      vendasElegiveis: [],
      vendasParaRetratar: [{ id: "v2", data: new Date(), orderId: "ord-42", tipoIdentificador: "GCLID", valorIdentificador: "x" }],
    })
    const resultado = await gerarConversoesOfflineElegiveis(client)
    expect(resultado.retratadas).toEqual(["v2"])
    expect(updates.v2).toBe("RETRATADA")
    expect(resultado.csv).toContain("ord-42")
  })

  it("retratação sem order_id cai no fallback (tipoIdentificador, valorIdentificador)", async () => {
    const { client, updates } = makeFakeDb({
      vendasElegiveis: [],
      vendasParaRetratar: [{ id: "v3", data: new Date(), orderId: null, tipoIdentificador: "GCLID", valorIdentificador: "gclid-xyz" }],
    })
    const resultado = await gerarConversoesOfflineElegiveis(client)
    expect(resultado.retratadas).toEqual(["v3"])
    expect(updates.v3).toBe("RETRATADA")
    expect(resultado.csv).toContain("gclid-xyz")
  })
})
