import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  tipo: z.enum(["IMAGEM", "REEL", "STORY", "ENSAIO", "CARROSSEL"]).optional(),
  pilar: z.enum(["IDENTIDADE", "LIFESTYLE", "SENSUALIDADE", "BASTIDORES"]).optional(),
  titulo: z.string().min(1).optional(),
  cenario: z.string().optional().nullable(),
  figurino: z.string().optional().nullable(),
  hook: z.string().optional().nullable(),
  roteiro: z.string().optional().nullable(),
  copyLegenda: z.string().optional().nullable(),
  promptIa: z.string().optional().nullable(),
  musicaSugerida: z.string().optional().nullable(),
  hashtags: z.string().optional().nullable(),
  recursos: z.string().optional().nullable(),
  edicao: z.string().optional().nullable(),
  posicaoElementos: z.string().optional().nullable(),
  obsProducao: z.string().optional().nullable(),
  status: z.enum(["PENDENTE", "APROVADO", "AGENDADO", "PUBLICADO", "REJEITADO"]).optional(),
  dataPublicacao: z.string().optional().nullable(),
  contaId: z.string().optional().nullable(),
})

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const post = await db.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(post)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const existing = await db.post.findUnique({ where: { id }, include: { persona: true } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const data = updateSchema.parse(await req.json())

    // RN-04: persona BANIDA não pode ter posts agendados
    if (data.status === "AGENDADO" && existing.persona.status === "BANIDA") {
      return NextResponse.json(
        { error: "Persona BANIDA não pode agendar posts (RN-04)." },
        { status: 400 },
      )
    }

    const patch: any = { ...data }
    if (data.dataPublicacao !== undefined) {
      patch.dataPublicacao = data.dataPublicacao ? new Date(data.dataPublicacao) : null
    }
    // marca a data da transição quando o status muda
    if (data.status && data.status !== existing.status) {
      patch.dataStatus = new Date()
      if (data.status === "PUBLICADO" && !data.dataPublicacao && !existing.dataPublicacao) {
        patch.dataPublicacao = new Date()
      }
    }

    const post = await db.post.update({ where: { id }, data: patch })
    return NextResponse.json(post)
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.post.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
