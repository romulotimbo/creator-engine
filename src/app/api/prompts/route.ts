import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const exemploSchema = z.object({
  url: z.string().min(1),
  personaUsada: z.string().optional().nullable(),
})

const promptSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório"),
  ferramenta: z.string().optional().nullable(),
  categoria: z.enum(["PERSONAGEM", "CENARIO", "PRODUTO", "VIDEO", "UPSCALE"]),
  prompt: z.string().min(1, "Prompt obrigatório"),
  negativoPrompt: z.string().optional().nullable(),
  parametros: z.any().optional().nullable(),
  estiloBase: z.string().optional().nullable(),
  avaliacaoMedia: z.coerce.number().min(0).max(5).optional().nullable(),
  tags: z.array(z.string()).default([]),
  imagens: z.array(exemploSchema).default([]),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get("categoria")
  const ferramenta = searchParams.get("ferramenta")

  const prompts = await db.promptGlobal.findMany({
    where: {
      ...(categoria ? { categoria: categoria as any } : {}),
      ...(ferramenta ? { ferramenta } : {}),
    },
    include: { imagens: true },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(prompts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { imagens, ...d } = promptSchema.parse(await req.json())
    const created = await db.promptGlobal.create({
      data: {
        titulo: d.titulo, ferramenta: d.ferramenta || null, categoria: d.categoria,
        prompt: d.prompt, negativoPrompt: d.negativoPrompt || null,
        parametros: d.parametros ?? undefined, estiloBase: d.estiloBase || null,
        avaliacaoMedia: d.avaliacaoMedia ?? null, tags: d.tags,
        imagens: imagens.length ? { create: imagens.map((i) => ({ url: i.url, personaUsada: i.personaUsada || null })) } : undefined,
      },
      include: { imagens: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
