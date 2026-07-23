import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { produtoUpdateSchema, decimalNum } from "@/lib/afiliados"

type Params = { params: Promise<{ id: string }> }

function serialize(p: {
  preco: { toString(): string } | null
  comissaoPercent: { toString(): string } | null
  [k: string]: unknown
}) {
  return {
    ...p,
    preco: p.preco != null ? decimalNum(p.preco) : null,
    comissaoPercent: p.comissaoPercent != null ? decimalNum(p.comissaoPercent) : null,
  }
}

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const produto = await db.produtoAfiliado.findUnique({
    where: { id },
    include: { contas: { include: { contaTrafego: { select: { id: true, slug: true, nome: true } } } } },
  })
  if (!produto) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(serialize(produto))
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const existing = await db.produtoAfiliado.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = produtoUpdateSchema.parse(await req.json())
    if (body.slug && body.slug !== existing.slug) {
      const dup = await db.produtoAfiliado.findUnique({ where: { slug: body.slug } })
      if (dup) return NextResponse.json({ error: "Slug já em uso" }, { status: 409 })
    }

    const updated = await db.produtoAfiliado.update({
      where: { id },
      data: {
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.nome !== undefined ? { nome: body.nome } : {}),
        ...(body.plataformaAfil !== undefined ? { plataformaAfil: body.plataformaAfil } : {}),
        ...(body.preco !== undefined ? { preco: body.preco } : {}),
        ...(body.comissaoPercent !== undefined ? { comissaoPercent: body.comissaoPercent } : {}),
        ...(body.linkCheckout !== undefined ? { linkCheckout: body.linkCheckout || null } : {}),
        ...(body.linkLanding !== undefined ? { linkLanding: body.linkLanding || null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.observacoes !== undefined ? { observacoes: body.observacoes || null } : {}),
      },
    })
    return NextResponse.json(serialize(updated))
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.produtoAfiliado.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.produtoAfiliado.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
