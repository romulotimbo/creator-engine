import { describe, it, expect, vi } from "vitest"
import { recordDomainChange } from "./domain-log"
import type { Prisma } from "@prisma/client"

function createMockTx(activeLog: { id: string; domain: string } | null) {
  return {
    domainUsageLog: {
      findFirst: vi.fn().mockResolvedValue(activeLog),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Prisma.TransactionClient
}

describe("recordDomainChange", () => {
  it("abre um novo log quando o domínio é definido pela primeira vez (sem log ativo)", async () => {
    const tx = createMockTx(null)

    await recordDomainChange(tx, "oferta-1", "domain-a.com")

    expect(tx.domainUsageLog.update).not.toHaveBeenCalled()
    expect(tx.domainUsageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ofertaId: "oferta-1", domain: "domain-a.com", usedUntil: null }),
      }),
    )
  })

  it("fecha o log anterior e abre um novo quando o domínio muda", async () => {
    const tx = createMockTx({ id: "log-1", domain: "domain-a.com" })

    await recordDomainChange(tx, "oferta-1", "domain-b.com")

    expect(tx.domainUsageLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "log-1" }, data: expect.objectContaining({ usedUntil: expect.any(Date) }) }),
    )
    expect(tx.domainUsageLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ domain: "domain-b.com" }) }),
    )
  })

  it("não cria nem atualiza nada quando o domínio não muda", async () => {
    const tx = createMockTx({ id: "log-1", domain: "domain-a.com" })

    await recordDomainChange(tx, "oferta-1", "domain-a.com")

    expect(tx.domainUsageLog.update).not.toHaveBeenCalled()
    expect(tx.domainUsageLog.create).not.toHaveBeenCalled()
  })

  it("fecha o log ativo e não abre novo quando domainUsed é setado para null", async () => {
    const tx = createMockTx({ id: "log-1", domain: "domain-a.com" })

    await recordDomainChange(tx, "oferta-1", null)

    expect(tx.domainUsageLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "log-1" } }),
    )
    expect(tx.domainUsageLog.create).not.toHaveBeenCalled()
  })
})
