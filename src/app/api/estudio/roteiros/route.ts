import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { validarRoteiroContraDb } from "@/lib/estudio/validate-server"

const FORMATOS = ["VERTICAL_9_16", "QUADRADO_1_1", "RETRATO_4_5"] as const

const roteiroSchema = z.object({
  nome: z.string().min(1),
  personaId: z.string().optional().nullable(),
  formato: z.enum(FORMATOS).default("VERTICAL_9_16"),
  fonteVideoId: z.string().optional().nullable(),
  templateVideoId: z.string().optional().nullable(),
  timeline: z.unknown(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get("personaId")
  const roteiros = await db.roteiroEstilizacao.findMany({
    where: { ...(personaId ? { personaId } : {}) },
    include: { fonteVideo: true, templateVideo: true },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(
    roteiros.map((r) => ({
      ...r,
      fonteVideo: r.fonteVideo ? { ...r.fonteVideo, tamanhoBytes: undefined } : null,
    }))
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = roteiroSchema.parse(await req.json())
    const validacao = await validarRoteiroContraDb(data.timeline, { fonteVideoId: data.fonteVideoId })
    if (!validacao.ok) {
      return NextResponse.json({ error: "Roteiro inválido", detalhes: validacao.erros }, { status: 422 })
    }
    const roteiro = await db.roteiroEstilizacao.create({
      data: {
        nome: data.nome,
        personaId: data.personaId ?? null,
        formato: data.formato,
        fonteVideoId: data.fonteVideoId ?? null,
        templateVideoId: data.templateVideoId ?? null,
        timeline: validacao.data as object,
      },
    })
    return NextResponse.json(roteiro, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 422 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 400 })
  }
}
