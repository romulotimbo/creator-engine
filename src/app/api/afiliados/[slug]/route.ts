import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { contaTrafegoUpdateSchema, decimalNum } from "@/lib/afiliados"

type Params = { params: Promise<{ slug: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const conta = await db.contaTrafego.findUnique({
    where: { slug },
    include: {
      contasVinculadas: { orderBy: { tipo: "asc" } },
      produtos: { include: { produto: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { vendas: true, credenciais: true } },
    },
  })
  if (!conta) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...conta,
    metaGasto: conta.metaGasto != null ? decimalNum(conta.metaGasto) : null,
    metaRoas: conta.metaRoas != null ? decimalNum(conta.metaRoas) : null,
    produtos: conta.produtos.map((v) => ({
      ...v,
      produto: {
        ...v.produto,
        preco: v.produto.preco != null ? decimalNum(v.produto.preco) : null,
        comissaoPercent: v.produto.comissaoPercent != null ? decimalNum(v.produto.comissaoPercent) : null,
      },
    })),
  })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { slug } = await params
    const existing = await db.contaTrafego.findUnique({ where: { slug } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = contaTrafegoUpdateSchema.parse(await req.json())
    if (body.slug && body.slug !== slug) {
      const dup = await db.contaTrafego.findUnique({ where: { slug: body.slug } })
      if (dup) return NextResponse.json({ error: "Slug já em uso" }, { status: 409 })
    }

    const updated = await db.contaTrafego.update({
      where: { id: existing.id },
      data: {
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.nome !== undefined ? { nome: body.nome } : {}),
        ...(body.plataforma !== undefined ? { plataforma: body.plataforma } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.observacoes !== undefined ? { observacoes: body.observacoes || null } : {}),
        ...(body.metaGasto !== undefined ? { metaGasto: body.metaGasto } : {}),
        ...(body.metaRoas !== undefined ? { metaRoas: body.metaRoas } : {}),
      },
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

  const { slug } = await params
  const existing = await db.contaTrafego.findUnique({ where: { slug } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.contaTrafego.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
