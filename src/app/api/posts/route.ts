import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const postSchema = z.object({
  personaId: z.string(),
  tipo: z.enum(["IMAGEM","REEL","STORY","ENSAIO","CARROSSEL"]),
  pilar: z.enum(["IDENTIDADE","LIFESTYLE","SENSUALIDADE","BASTIDORES"]),
  titulo: z.string().min(1),
  cenario: z.string().optional(),
  figurino: z.string().optional(),
  hook: z.string().optional(),
  roteiro: z.string().optional(),
  copyLegenda: z.string().optional(),
  promptIa: z.string().optional(),
  musicaSugerida: z.string().optional(),
  hashtags: z.string().optional(),
  recursos: z.string().optional(),
  edicao: z.string().optional(),
  posicaoElementos: z.string().optional(),
  obsProducao: z.string().optional(),
  status: z.enum(["PENDENTE","APROVADO","AGENDADO","PUBLICADO","REJEITADO"]).default("PENDENTE"),
  dataPublicacao: z.string().optional().nullable(),
  contaId: z.string().optional().nullable(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get("personaId")
  const status = searchParams.get("status")
  const tipo = searchParams.get("tipo")
  const contaId = searchParams.get("contaId")
  const semData = searchParams.get("semData") === "true"

  const posts = await db.post.findMany({
    where: {
      ...(personaId ? { personaId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(tipo ? { tipo: tipo as any } : {}),
      ...(contaId ? { contaId } : {}),
      ...(semData ? { dataPublicacao: null } : {}),
    },
    include: { persona: { select: { id: true, slug: true, nomeArtistico: true } } },
    orderBy: { dataPublicacao: "asc" },
  })
  return NextResponse.json(posts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const data = postSchema.parse(body)

    // RN-04: persona BANIDA não pode ter posts agendados
    if (data.status === "AGENDADO") {
      const persona = await db.persona.findUnique({ where: { id: data.personaId }, select: { status: true } })
      if (persona?.status === "BANIDA") {
        return NextResponse.json({ error: "Persona BANIDA não pode agendar posts (RN-04)." }, { status: 400 })
      }
    }

    const { dataPublicacao, ...rest } = data
    const post = await db.post.create({
      data: {
        ...rest,
        dataPublicacao: dataPublicacao ? new Date(dataPublicacao) : null,
      } as any,
    })
    return NextResponse.json(post, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
