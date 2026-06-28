import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const imagemSchema = z.object({
  personaId: z.string(),
  postId: z.string().optional().nullable(),
  fluxoId: z.string().optional().nullable(),
  ferramenta: z.string().min(1),
  prompt: z.string().min(1),
  resultado: z.string().optional().nullable(),
  status: z.enum(["pendente", "aprovada", "descartada"]).default("pendente"),
  notas: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = imagemSchema.parse(await req.json())
    const imagem = await db.imagemGerada.create({ data: body })
    return NextResponse.json(imagem, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
