import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { validarRoteiroContraDb } from "@/lib/estudio/validate-server"

const FORMATOS = ["VERTICAL_9_16", "QUADRADO_1_1", "RETRATO_4_5"] as const

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  formato: z.enum(FORMATOS).optional(),
  fonteVideoId: z.string().optional().nullable(),
  templateVideoId: z.string().optional().nullable(),
  timeline: z.unknown().optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const data = updateSchema.parse(await req.json())
    const atual = await db.roteiroEstilizacao.findUnique({ where: { id } })
    if (!atual) return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 })

    if (data.timeline !== undefined) {
      const fonteVideoId = data.fonteVideoId !== undefined ? data.fonteVideoId : atual.fonteVideoId
      const validacao = await validarRoteiroContraDb(data.timeline, { fonteVideoId })
      if (!validacao.ok) {
        return NextResponse.json({ error: "Roteiro inválido", detalhes: validacao.erros }, { status: 422 })
      }
    }

    const roteiro = await db.roteiroEstilizacao.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome } : {}),
        ...(data.formato !== undefined ? { formato: data.formato } : {}),
        ...(data.fonteVideoId !== undefined ? { fonteVideoId: data.fonteVideoId } : {}),
        ...(data.templateVideoId !== undefined ? { templateVideoId: data.templateVideoId } : {}),
        ...(data.timeline !== undefined ? { timeline: data.timeline as object } : {}),
      },
    })
    return NextResponse.json(roteiro)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 422 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await db.roteiroEstilizacao.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
