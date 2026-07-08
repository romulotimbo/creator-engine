import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const assetSchema = z.object({
  tag: z.string().min(1).regex(/^[a-z0-9-]+$/, "use apenas minúsculas, números e hífens"),
  nome: z.string().min(1),
  tipo: z.enum(["imagem", "overlay", "lockup", "cta"]).default("imagem"),
  arquivo: z.string().min(1),
  descricao: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const assets = await db.assetEstilizacao.findMany({ orderBy: { tag: "asc" } })
  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = assetSchema.parse(await req.json())
    const existe = await db.assetEstilizacao.findUnique({ where: { tag: data.tag } })
    if (existe) return NextResponse.json({ error: `Tag "${data.tag}" já existe.` }, { status: 409 })
    const asset = await db.assetEstilizacao.create({ data })
    return NextResponse.json(asset, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 422 })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 400 })
  }
}
