import type { PrismaClient } from "@prisma/client"
import { recomputeProdutoRollups, recomputeCampanhaRollups, type ProdutoRollups } from "@/lib/afiliados/rollups"
import { avaliarRegrasCampanha } from "@/lib/afiliados/regras"

const TZ = "America/Sao_Paulo"

export class CampanhaNotFoundError extends Error {
  constructor() {
    super("Campanha não encontrada")
    this.name = "CampanhaNotFoundError"
  }
}

export function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Hoje civil em America/Sao_Paulo, como Date UTC meia-noite. */
export function todayInSaoPaulo(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === "year")?.value)
  const month = Number(parts.find((p) => p.type === "month")?.value)
  const day = Number(parts.find((p) => p.type === "day")?.value)
  return new Date(Date.UTC(year, month - 1, day))
}

export async function upsertCampanhaGastoSnapshot(
  client: PrismaClient,
  campanhaId: string,
  input: { gasto: number; dataSnapshot?: Date | null },
  now: Date = new Date(),
): Promise<{ created: boolean; snapshotId: string; dataSnapshot: Date; rollups: ProdutoRollups }> {
  const campanha = await client.campanha.findUnique({
    where: { id: campanhaId },
    select: { id: true, produtoId: true },
  })
  if (!campanha) throw new CampanhaNotFoundError()

  const dataSnapshot = startOfDayUtc(input.dataSnapshot ?? todayInSaoPaulo(now))

  const existing = await client.campanhaSnapshot.findUnique({
    where: { campanhaId_dataSnapshot: { campanhaId, dataSnapshot } },
    select: { id: true },
  })

  const previous = existing
    ? null
    : await client.campanhaSnapshot.findFirst({
        where: { campanhaId },
        orderBy: { dataSnapshot: "desc" },
        select: {
          receitaConfirmada: true,
          conversoes: true,
          impressoes: true,
          cliques: true,
          ctr: true,
          cvr: true,
          cpcMedio: true,
          cpaReal: true,
        },
      })

  const snapshot = await client.campanhaSnapshot.upsert({
    where: { campanhaId_dataSnapshot: { campanhaId, dataSnapshot } },
    create: {
      campanhaId,
      dataSnapshot,
      gasto: input.gasto,
      receitaConfirmada: previous?.receitaConfirmada ?? null,
      conversoes: previous?.conversoes ?? null,
      impressoes: previous?.impressoes ?? null,
      cliques: previous?.cliques ?? null,
      ctr: previous?.ctr ?? null,
      cvr: previous?.cvr ?? null,
      cpcMedio: previous?.cpcMedio ?? null,
      cpaReal: previous?.cpaReal ?? null,
    },
    update: { gasto: input.gasto },
  })

  await client.campanha.update({
    where: { id: campanhaId },
    data: { dataUltimaAtualizacao: dataSnapshot },
  })

  const rollups = await recomputeProdutoRollups(client, campanha.produtoId)
  await recomputeCampanhaRollups(client, campanhaId)
  await avaliarRegrasCampanha(client, campanhaId)

  return {
    created: !existing,
    snapshotId: snapshot.id,
    dataSnapshot,
    rollups,
  }
}
