import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { networkUpdateSchema } from "@/lib/afiliados"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const network = await db.network.findUnique({ where: { id } })
  if (!network) return NextResponse.json({ error: "Rede não encontrada" }, { status: 404 })

  return NextResponse.json(network)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const existing = await db.network.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Rede não encontrada" }, { status: 404 })

    const body = networkUpdateSchema.parse(await req.json())

    const scoreChanged =
      body.paymentReliabilityScore !== undefined &&
      body.paymentReliabilityScore !== existing.paymentReliabilityScore

    const updated = await db.network.update({
      where: { id },
      data: {
        ...body,
        // reliabilityUpdatedAt é atualizado automaticamente sempre que o score muda
        reliabilityUpdatedAt: scoreChanged ? new Date() : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar rede" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.network.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Rede não encontrada" }, { status: 404 })

  await db.network.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
