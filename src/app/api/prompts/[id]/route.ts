import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const exemploSchema = z.object({
  url: z.string().min(1),
  personaUsada: z.string().optional().nullable(),
})

const updateSchema = z.object({
  titulo: z.string().min(1).optional(),
  ferramenta: z.string().optional().nullable(),
  categoria: z.enum(["PERSONAGEM", "CENARIO", "PRODUTO", "VIDEO", "UPSCALE"]).optional(),
  prompt: z.string().min(1).optional(),
  negativoPrompt: z.string().optional().nullable(),
  parametros: z.any().optional().nullable(),
  estiloBase: z.string().optional().nullable(),
  avaliacaoMedia: z.coerce.number().min(0).max(5).optional().nullable(),
  tags: z.array(z.string()).optional(),
  imagens: z.array(exemploSchema).optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { imagens, ...d } = updateSchema.parse(await req.json())

    const updated = await db.$transaction(async (tx) => {
      await tx.promptGlobal.update({
        where: { id },
        data: {
          ...d,
          ferramenta: d.ferramenta === undefined ? undefined : d.ferramenta || null,
          parametros: d.parametros === undefined ? undefined : d.parametros ?? undefined,
        },
      })
      if (imagens) {
        await tx.promptExemplo.deleteMany({ where: { promptGlobalId: id } })
        if (imagens.length) {
          await tx.promptExemplo.createMany({
            data: imagens.map((i) => ({ promptGlobalId: id, url: i.url, personaUsada: i.personaUsada || null })),
          })
        }
      }
      return tx.promptGlobal.findUnique({ where: { id }, include: { imagens: true } })
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.promptGlobal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
