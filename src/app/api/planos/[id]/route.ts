import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const kpiSchema = z.object({
  metrica: z.string().min(1),
  valorInicio: z.string().optional().nullable(),
  valorMeta: z.string().optional().nullable(),
  valorFinal: z.string().optional().nullable(),
})

const updateSchema = z.object({
  objetivo: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  kpis: z.array(kpiSchema).optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { objetivo, observacoes, kpis } = updateSchema.parse(await req.json())

    // Atualiza o plano e, se kpis vierem, substitui o conjunto (replace) em transação
    const updated = await db.$transaction(async (tx) => {
      await tx.planoSemanal.update({ where: { id }, data: { objetivo: objetivo ?? null, observacoes: observacoes ?? null } })
      if (kpis) {
        await tx.kpiSemana.deleteMany({ where: { planoId: id } })
        if (kpis.length) await tx.kpiSemana.createMany({ data: kpis.map((k) => ({ ...k, planoId: id })) })
      }
      return tx.planoSemanal.findUnique({ where: { id }, include: { kpis: true } })
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.planoSemanal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
