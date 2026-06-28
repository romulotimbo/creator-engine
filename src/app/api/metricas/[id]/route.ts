import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { findSnapshotOnDay, parseMetricaDate, syncSeguidoresAtual } from "@/lib/metricas"

const putSchema = z.object({
  seguidores: z.coerce.number().int().min(0),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  engajamento: z.coerce.number().min(0).max(100).optional().nullable(),
  receitaDia: z.coerce.number().min(0).optional().nullable(),
  postsPublicados: z.coerce.number().int().min(0).optional().default(0),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const body = putSchema.parse(await req.json())
    const data = parseMetricaDate(body.data)

    const current = await db.metricaHistorica.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: "Snapshot não encontrado" }, { status: 404 })

    const metrica = await db.$transaction(async (tx) => {
      const conflict = await findSnapshotOnDay(current.contaId, data, tx)
      if (conflict && conflict.id !== id) {
        throw new Error("Já existe snapshot nesta data para esta conta")
      }

      const saved = await tx.metricaHistorica.update({
        where: { id },
        data: {
          seguidores: body.seguidores,
          data,
          engajamento: body.engajamento ?? null,
          receitaDia: body.receitaDia ?? null,
          postsPublicados: body.postsPublicados ?? 0,
        },
      })

      await syncSeguidoresAtual(current.contaId, tx)
      return saved
    })

    return NextResponse.json(metrica)
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const current = await db.metricaHistorica.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: "Snapshot não encontrado" }, { status: 404 })

  await db.$transaction(async (tx) => {
    await tx.metricaHistorica.delete({ where: { id } })
    await syncSeguidoresAtual(current.contaId, tx)
  })

  return NextResponse.json({ ok: true })
}
