import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { findSnapshotOnDay, parseMetricaDate, syncSeguidoresAtual, todayDateString } from "@/lib/metricas"

const postSchema = z.object({
  contaId: z.string(),
  seguidores: z.coerce.number().int().min(0),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  engajamento: z.coerce.number().min(0).max(100).optional().nullable(),
  receitaDia: z.coerce.number().min(0).optional().nullable(),
  postsPublicados: z.coerce.number().int().min(0).optional().default(0),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get("personaId")
  const contaId = searchParams.get("contaId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!personaId && !contaId) {
    return NextResponse.json({ error: "personaId ou contaId obrigatório" }, { status: 400 })
  }

  const where: Prisma.MetricaHistoricaWhereInput = {
    ...(contaId ? { contaId } : { conta: { personaId: personaId! } }),
    ...(from || to
      ? {
          data: {
            ...(from ? { gte: parseMetricaDate(from) } : {}),
            ...(to ? { lt: new Date(parseMetricaDate(to).getTime() + 86400000) } : {}),
          },
        }
      : {}),
  }

  const metricas = await db.metricaHistorica.findMany({
    where,
    include: { conta: { select: { plataforma: true, handle: true, personaId: true } } },
    orderBy: { data: "desc" },
  })

  return NextResponse.json(metricas)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = postSchema.parse(await req.json())
    const data = parseMetricaDate(body.data ?? todayDateString())

    const conta = await db.contaPlataforma.findUnique({ where: { id: body.contaId } })
    if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })

    let wasUpdate = false
    const metrica = await db.$transaction(async (tx) => {
      const existing = await findSnapshotOnDay(body.contaId, data, tx)
      wasUpdate = !!existing

      const payload = {
        seguidores: body.seguidores,
        engajamento: body.engajamento ?? null,
        receitaDia: body.receitaDia ?? null,
        postsPublicados: body.postsPublicados ?? 0,
        data,
      }

      const saved = existing
        ? await tx.metricaHistorica.update({ where: { id: existing.id }, data: payload })
        : await tx.metricaHistorica.create({ data: { contaId: body.contaId, ...payload } })

      await syncSeguidoresAtual(body.contaId, tx)
      return saved
    })

    return NextResponse.json(metrica, { status: wasUpdate ? 200 : 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
