import type { PrismaClient, StatusOperacional } from "@prisma/client"

export class TransicaoInvalidaError extends Error {
  constructor(de: string, para: string) {
    super(`Campanha ${de} não pode transicionar para ${para}`)
    this.name = "TransicaoInvalidaError"
  }
}

/**
 * Muda `Campanha.status` e grava `CampanhaStatusLog` — reforça a mão-única
 * ESCALANDO → só PAUSADO/ENCERRADO (ticket 09, item 3). Usado tanto pelo
 * PATCH manual da ficha quanto pela confirmação do gatilho de escala na fila.
 */
export async function mudarStatusCampanha(
  client: PrismaClient,
  campanhaId: string,
  novoStatus: StatusOperacional,
  motivo?: string | null,
): Promise<void> {
  const existing = await client.campanha.findUnique({ where: { id: campanhaId }, select: { status: true } })
  if (!existing) throw new Error("Campanha não encontrada")
  if (existing.status === novoStatus) return

  if (existing.status === "ESCALANDO" && novoStatus === "TESTANDO") {
    throw new TransicaoInvalidaError(existing.status, novoStatus)
  }

  await client.campanha.update({ where: { id: campanhaId }, data: { status: novoStatus } })
  await client.campanhaStatusLog.create({
    data: { campanhaId, statusAnterior: existing.status, statusNovo: novoStatus, motivo: motivo || null },
  })
}
