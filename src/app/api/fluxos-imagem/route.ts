import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const fluxoSchema = z.object({
  personaId: z.string().optional().nullable(),
  ferramentaId: z.string().optional().nullable(),
  nome: z.string().min(1),
  ferramenta: z.string().min(1),
  objetivo: z.string().min(1),
  confianca: z.coerce.number().int().min(1).max(5).default(3),
  instrucoes: z.string().min(1),
  ativo: z.boolean().default(true),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get("personaId")

  const fluxos = await db.fluxoImagem.findMany({
    where: personaId ? { personaId } : {},
    include: { ferramentaRef: { select: { id: true, nome: true } } },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(fluxos)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = fluxoSchema.parse(await req.json())
    const fluxo = await db.fluxoImagem.create({ data: body })
    return NextResponse.json(fluxo, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
