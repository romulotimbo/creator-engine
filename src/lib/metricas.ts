import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

/** Interpreta YYYY-MM-DD como início do dia UTC. */
export function parseMetricaDate(input: string): Date {
  const [y, m, d] = input.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function utcDayRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export function todayDateString(): string {
  const n = new Date()
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`
}

/** Sincroniza seguidoresAtual / engajamentoMedio com o snapshot mais recente da conta. */
export async function syncSeguidoresAtual(contaId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? db
  const latest = await client.metricaHistorica.findFirst({
    where: { contaId },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
  })
  await client.contaPlataforma.update({
    where: { id: contaId },
    data: {
      seguidoresAtual: latest?.seguidores ?? 0,
      engajamentoMedio: latest?.engajamento ?? null,
    },
  })
}

export async function findSnapshotOnDay(contaId: string, day: Date, tx?: Prisma.TransactionClient) {
  const client = tx ?? db
  const { start, end } = utcDayRange(day)
  return client.metricaHistorica.findFirst({
    where: { contaId, data: { gte: start, lt: end } },
  })
}
