import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const fluxoSchema = z.object({
  ferramentaId: z.string().optional().nullable(),
  nome: z.string().min(1).optional(),
  ferramenta: z.string().min(1).optional(),
  objetivo: z.string().min(1).optional(),
  confianca: z.coerce.number().int().min(1).max(5).optional(),
  instrucoes: z.string().min(1).optional(),
  ativo: z.boolean().optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const body = fluxoSchema.parse(await req.json())
    const fluxo = await db.fluxoImagem.update({ where: { id }, data: body })
    return NextResponse.json(fluxo)
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    await db.fluxoImagem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
