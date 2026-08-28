import { describe, it, expect } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { mudarStatusCampanha, TransicaoInvalidaError } from "./campanha-status"

function makeFakeDb(statusInicial: string) {
  let status = statusInicial
  const logs: Array<{ statusAnterior: string | null; statusNovo: string; motivo: string | null }> = []
  const client = {
    campanha: {
      findUnique: async () => ({ status }),
      update: async ({ data }: { data: { status: string } }) => {
        status = data.status
        return { status }
      },
    },
    campanhaStatusLog: {
      create: async ({ data }: { data: { statusAnterior: string | null; statusNovo: string; motivo: string | null } }) => {
        logs.push(data)
        return data
      },
    },
  }
  return { client: client as unknown as PrismaClient, logs, getStatus: () => status }
}

describe("mudarStatusCampanha", () => {
  it("muda status e grava log com anterior/novo", async () => {
    const { client, logs, getStatus } = makeFakeDb("TESTANDO")
    await mudarStatusCampanha(client, "c1", "ESCALANDO")
    expect(getStatus()).toBe("ESCALANDO")
    expect(logs).toEqual([{ campanhaId: "c1", statusAnterior: "TESTANDO", statusNovo: "ESCALANDO", motivo: null }])
  })

  it("mão única: rejeita ESCALANDO → TESTANDO", async () => {
    const { client, getStatus } = makeFakeDb("ESCALANDO")
    await expect(mudarStatusCampanha(client, "c1", "TESTANDO")).rejects.toBeInstanceOf(TransicaoInvalidaError)
    expect(getStatus()).toBe("ESCALANDO") // não mudou
  })

  it("ESCALANDO → PAUSADO e ESCALANDO → ENCERRADO continuam válidos", async () => {
    const a = makeFakeDb("ESCALANDO")
    await mudarStatusCampanha(a.client, "c1", "PAUSADO")
    expect(a.getStatus()).toBe("PAUSADO")

    const b = makeFakeDb("ESCALANDO")
    await mudarStatusCampanha(b.client, "c1", "ENCERRADO")
    expect(b.getStatus()).toBe("ENCERRADO")
  })

  it("no-op quando o status já é o mesmo — sem log", async () => {
    const { client, logs } = makeFakeDb("TESTANDO")
    await mudarStatusCampanha(client, "c1", "TESTANDO")
    expect(logs).toHaveLength(0)
  })
})
