import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { validarRoteiroContraDb } from "@/lib/estudio/validate-server"

const jobSchema = z.object({
  roteiroId: z.string().min(1),
  postId: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get("personaId")
  const status = searchParams.get("status")
  const jobs = await db.jobRender.findMany({
    where: {
      ...(personaId ? { personaId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      roteiro: { select: { id: true, nome: true } },
      templateVideo: { select: { slug: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(jobs)
}

// Enfileira um render a partir de um roteiro (que carrega fonte/template/formato).
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { roteiroId, postId } = jobSchema.parse(await req.json())
    const roteiro = await db.roteiroEstilizacao.findUnique({ where: { id: roteiroId } })
    if (!roteiro) return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 })
    if (!roteiro.fonteVideoId) {
      return NextResponse.json({ error: "Roteiro sem fonte de vídeo associada." }, { status: 400 })
    }

    // Revalida os insumos antes de enfileirar (contrato da esteira).
    const validacao = await validarRoteiroContraDb(roteiro.timeline, { fonteVideoId: roteiro.fonteVideoId })
    if (!validacao.ok) {
      return NextResponse.json({ error: "Roteiro inválido", detalhes: validacao.erros }, { status: 422 })
    }

    const job = await db.jobRender.create({
      data: {
        roteiroId: roteiro.id,
        fonteVideoId: roteiro.fonteVideoId,
        templateVideoId: roteiro.templateVideoId,
        formato: roteiro.formato,
        personaId: roteiro.personaId,
        postId: postId ?? null,
        status: "FILA",
      },
    })
    return NextResponse.json(job, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 422 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 400 })
  }
}
