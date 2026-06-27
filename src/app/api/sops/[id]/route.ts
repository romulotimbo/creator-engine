import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const passoSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  ferramenta: z.string().optional().nullable(),
})

const updateSchema = z.object({
  titulo: z.string().min(1).optional(),
  categoria: z.enum(["ONBOARDING", "ANTI_BAN", "ESCALADA", "PRODUCAO", "GERACAO_IMAGEM", "MONETIZACAO"]).optional(),
  versao: z.string().min(1).optional(),
  status: z.enum(["RASCUNHO", "ATIVO", "DEPRECIADO"]).optional(),
  descricao: z.string().optional().nullable(),
  passos: z.array(passoSchema).optional(),
  mudanca: z.string().optional().nullable(), // entrada de changelog opcional
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { passos, mudanca, ...d } = updateSchema.parse(await req.json())
    const patch: any = { ...d }
    if (d.descricao !== undefined) patch.descricao = d.descricao || null

    const updated = await db.$transaction(async (tx) => {
      await tx.sop.update({ where: { id }, data: patch })
      if (passos) {
        await tx.sopPasso.deleteMany({ where: { sopId: id } })
        if (passos.length) await tx.sopPasso.createMany({ data: passos.map((p, i) => ({ sopId: id, ordem: i, titulo: p.titulo, descricao: p.descricao || null, ferramenta: p.ferramenta || null })) })
      }
      if (mudanca && d.versao) {
        await tx.sopHistorico.create({ data: { sopId: id, versao: d.versao, mudanca } })
      }
      return tx.sop.findUnique({ where: { id }, include: { passos: { orderBy: { ordem: "asc" } }, historico: { orderBy: { data: "desc" } } } })
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
  await db.sop.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
