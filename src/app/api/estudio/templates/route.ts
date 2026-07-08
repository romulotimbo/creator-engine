import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const FORMATOS = ["VERTICAL_9_16", "QUADRADO_1_1", "RETRATO_4_5"] as const

const templateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "use apenas minúsculas, números e hífens"),
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  composicao: z.string().min(1),
  formatos: z.array(z.enum(FORMATOS)).min(1).default(["VERTICAL_9_16"]),
  ativo: z.boolean().default(true),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const templates = await db.templateVideo.findMany({ orderBy: { nome: "asc" } })
  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = templateSchema.parse(await req.json())
    const existe = await db.templateVideo.findUnique({ where: { slug: data.slug } })
    if (existe) return NextResponse.json({ error: `Slug "${data.slug}" já existe.` }, { status: 409 })
    const template = await db.templateVideo.create({ data })
    return NextResponse.json(template, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 422 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 400 })
  }
}
