import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { vinculoProdutoUpdateSchema } from "@/lib/afiliados"

type Params = { params: Promise<{ slug: string; id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { slug, id } = await params
    const conta = await db.contaTrafego.findUnique({ where: { slug }, select: { id: true } })
    if (!conta) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const existing = await db.contaTrafegoProduto.findFirst({ where: { id, contaTrafegoId: conta.id } })
    if (!existing) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 })

    const body = vinculoProdutoUpdateSchema.parse(await req.json())
    const updated = await db.contaTrafegoProduto.update({
      where: { id },
      data: {
        ...(body.linkTracking !== undefined ? { linkTracking: body.linkTracking || null } : {}),
        ...(body.ativo !== undefined ? { ativo: body.ativo } : {}),
      },
      include: { produto: true },
    })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug, id } = await params
  const conta = await db.contaTrafego.findUnique({ where: { slug }, select: { id: true } })
  if (!conta) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await db.contaTrafegoProduto.findFirst({ where: { id, contaTrafegoId: conta.id } })
  if (!existing) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 })

  await db.contaTrafegoProduto.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
