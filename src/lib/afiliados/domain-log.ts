import { Prisma } from "@prisma/client"

/**
 * Histórico de uso de domínio (domain-usage-history).
 *
 * A cada mudança de `OfertaDecisao.domainUsed`, fecha o log ativo (se houver)
 * e abre um novo — padrão bitemporal simples (ver design.md, decisão 4).
 * Deve ser chamado dentro de uma `$transaction` já em andamento no handler
 * que persiste a oferta, para garantir atomicidade com o update da oferta.
 */
export async function recordDomainChange(
  tx: Prisma.TransactionClient,
  ofertaId: string,
  newDomain: string | null | undefined,
): Promise<void> {
  const activeLog = await tx.domainUsageLog.findFirst({
    where: { ofertaId, usedUntil: null },
    orderBy: { usedFrom: "desc" },
  })

  // Sem mudança real — nada a fazer (evita duplicatas)
  if ((activeLog?.domain ?? null) === (newDomain ?? null)) return

  const now = new Date()

  if (activeLog) {
    await tx.domainUsageLog.update({
      where: { id: activeLog.id },
      data: { usedUntil: now },
    })
  }

  if (newDomain) {
    await tx.domainUsageLog.create({
      data: {
        ofertaId,
        domain: newDomain,
        usedFrom: now,
        usedUntil: null,
      },
    })
  }
}
