import { describe, it, expect, vi } from "vitest"
import { recordTermsVerification } from "./terms"
import type { Prisma } from "@prisma/client"

function createMockTx() {
  return {
    ofertaDecisao: {
      update: vi.fn().mockResolvedValue({}),
    },
    termsVersion: {
      create: vi.fn().mockResolvedValue({ id: "tv-1" }),
    },
  } as unknown as Prisma.TransactionClient
}

describe("recordTermsVerification", () => {
  it("cria um TermsVersion quando hasChanged é true", async () => {
    const tx = createMockTx()

    const result = await recordTermsVerification(tx, "oferta-1", {
      hasChanged: true,
      changesSummary: "Comissão de refund mudou de 30 para 45 dias",
    })

    expect(tx.ofertaDecisao.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "oferta-1" }, data: { termsVerifiedAt: expect.any(Date) } }),
    )
    expect(tx.termsVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ofertaId: "oferta-1", changesSummary: "Comissão de refund mudou de 30 para 45 dias" }) }),
    )
    expect(result.termsVersion).not.toBeNull()
  })

  it("não cria TermsVersion quando hasChanged é false, mas sempre atualiza termsVerifiedAt", async () => {
    const tx = createMockTx()

    const result = await recordTermsVerification(tx, "oferta-1", { hasChanged: false })

    expect(tx.ofertaDecisao.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "oferta-1" }, data: { termsVerifiedAt: expect.any(Date) } }),
    )
    expect(tx.termsVersion.create).not.toHaveBeenCalled()
    expect(result.termsVersion).toBeNull()
  })
})
