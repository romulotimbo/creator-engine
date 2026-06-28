import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const entrySchema = z.object({
  tipo: z.enum(["IDEIA", "EXPERIMENTO", "PROJETO", "TENDENCIA", "APRENDIZADO"]),
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  status: z.enum(["EM_ABERTO", "EM_ANDAMENTO", "CONCLUIDO", "DESCARTADO"]).default("EM_ABERTO"),
  tags: z.array(z.string()).default([]),
  personaId: z.string().optional().nullable(),
  data: z.coerce.date().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo")
  const tag = searchParams.get("tag")

  const entries = await db.discoveryEntry.findMany({
    where: {
      ...(tipo ? { tipo: tipo as any } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: { data: "desc" },
  })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = entrySchema.parse(await req.json())
    const entry = await db.discoveryEntry.create({ data: body })
    return NextResponse.json(entry, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
