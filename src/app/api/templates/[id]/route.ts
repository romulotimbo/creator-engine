import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const varSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  valorPadrao: z.string().optional().nullable(),
})

const updateSchema = z.object({
  titulo: z.string().min(1).optional(),
  categoria: z.enum(["ROTEIRO", "COPY", "HOOK", "ESTRATEGIA", "CALENDARIO"]).optional(),
  nicho: z.string().optional().nullable(),
  plataforma: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE", "FANVUE", "FACEBOOK"]).optional().nullable(),
  pilar: z.enum(["IDENTIDADE", "LIFESTYLE", "SENSUALIDADE", "BASTIDORES"]).optional().nullable(),
  conteudo: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  variaveis: z.array(varSchema).optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { variaveis, ...d } = updateSchema.parse(await req.json())
    const patch: any = { ...d }
    if (d.nicho !== undefined) patch.nicho = d.nicho || null
    if (d.plataforma !== undefined) patch.plataforma = d.plataforma || null
    if (d.pilar !== undefined) patch.pilar = d.pilar || null

    const updated = await db.$transaction(async (tx) => {
      await tx.templateConteudo.update({ where: { id }, data: patch })
      if (variaveis) {
        await tx.variavelTemplate.deleteMany({ where: { templateId: id } })
        if (variaveis.length) await tx.variavelTemplate.createMany({ data: variaveis.map((v) => ({ templateId: id, nome: v.nome, descricao: v.descricao || null, valorPadrao: v.valorPadrao || null })) })
      }
      return tx.templateConteudo.findUnique({ where: { id }, include: { variaveis: true } })
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
  await db.templateConteudo.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
