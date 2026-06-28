import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  concluido: z.boolean(),
})

const updateSchema = z.object({
  fase: z.string().min(1),
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  ordem: z.coerce.number().int(),
})

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { concluido } = patchSchema.parse(await req.json())

    const item = await db.planoAtaqueItem.update({
      where: { id },
      data: { concluido },
    })
    return NextResponse.json(item)
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; errors?: unknown; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 422 })
    if (err.code === "P2025") return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar" }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = updateSchema.parse(await req.json())

    const item = await db.planoAtaqueItem.update({
      where: { id },
      data: {
        fase: body.fase,
        titulo: body.titulo,
        descricao: body.descricao ?? null,
        ordem: body.ordem,
      },
    })
    return NextResponse.json(item)
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; errors?: unknown; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 422 })
    if (err.code === "P2025") return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    await db.planoAtaqueItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    if (err.code === "P2025") return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
    return NextResponse.json({ error: err.message ?? "Erro ao excluir" }, { status: 400 })
  }
}
