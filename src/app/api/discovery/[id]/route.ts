import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const entrySchema = z.object({
  tipo: z.enum(["IDEIA", "EXPERIMENTO", "PROJETO", "TENDENCIA", "APRENDIZADO"]).optional(),
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional().nullable(),
  status: z.enum(["EM_ABERTO", "EM_ANDAMENTO", "CONCLUIDO", "DESCARTADO"]).optional(),
  tags: z.array(z.string()).optional(),
  personaId: z.string().optional().nullable(),
  data: z.coerce.date().optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const body = entrySchema.parse(await req.json())
    const entry = await db.discoveryEntry.update({ where: { id }, data: body })
    return NextResponse.json(entry)
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
    await db.discoveryEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
