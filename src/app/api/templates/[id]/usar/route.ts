import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  personaUsada: z.string().optional().nullable(),
  conteudoFinal: z.string().min(1, "Conteúdo final obrigatório"),
})

// Registra uma instanciação real do template para uma persona (RF-CE02)
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const d = schema.parse(await req.json())
    const [exemplo] = await db.$transaction([
      db.exemploTemplate.create({ data: { templateId: id, personaUsada: d.personaUsada || null, conteudoFinal: d.conteudoFinal } }),
      db.templateConteudo.update({ where: { id }, data: { usos: { increment: 1 } } }),
    ])
    return NextResponse.json(exemplo, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
