import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  tipo: z.enum(["imagem", "overlay", "lockup", "cta"]).optional(),
  arquivo: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const data = updateSchema.parse(await req.json())
    const asset = await db.assetEstilizacao.update({ where: { id }, data })
    return NextResponse.json(asset)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 422 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await db.assetEstilizacao.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
