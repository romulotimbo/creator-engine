import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { termoUpdateSchema, serieTermoManualSchema } from "@/lib/afiliados/termos"
import { avaliarRegraCurvaAscendente } from "@/lib/afiliados/regras/curva-ascendente"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const existing = await db.termo.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Termo não encontrado" }, { status: 404 })

    const body = termoUpdateSchema.parse(await req.json())
    const updated = await db.termo.update({ where: { id }, data: { ...(body.termo !== undefined ? { termo: body.termo } : {}) } })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar termo" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.termo.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Termo não encontrado" }, { status: 404 })

  await db.termo.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

/** Entrada manual de SerieTermo (origem="manual") para este Termo. */
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const existing = await db.termo.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Termo não encontrado" }, { status: 404 })

    const body = serieTermoManualSchema.parse(await req.json())
    const created = await db.serieTermo.upsert({
      where: { termoId_geo_fonte_data: { termoId: id, geo: body.geo, fonte: body.fonte, data: body.data } },
      update: { valor: body.valor ?? null, unidade: body.unidade, origem: "manual" },
      create: { termoId: id, geo: body.geo, fonte: body.fonte, data: body.data, valor: body.valor ?? null, unidade: body.unidade, origem: "manual" },
    })
    if (existing.ofertaDecisaoId) {
      await avaliarRegraCurvaAscendente(db, existing.ofertaDecisaoId)
    }
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao registrar série" }, { status: 400 })
  }
}
