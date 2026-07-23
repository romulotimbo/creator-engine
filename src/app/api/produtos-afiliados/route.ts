import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { produtoAfiliadoSchema, decimalNum } from "@/lib/afiliados"

function serializeProduto(p: {
  id: string
  slug: string
  nome: string
  plataformaAfil: string
  preco: { toString(): string } | null
  comissaoPercent: { toString(): string } | null
  linkCheckout: string | null
  linkLanding: string | null
  status: string
  observacoes: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { contas: number; vendas: number }
}) {
  return {
    ...p,
    preco: p.preco != null ? decimalNum(p.preco) : null,
    comissaoPercent: p.comissaoPercent != null ? decimalNum(p.comissaoPercent) : null,
  }
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const produtos = await db.produtoAfiliado.findMany({
    include: { _count: { select: { contas: true, vendas: true } } },
    orderBy: { nome: "asc" },
  })
  return NextResponse.json(produtos.map(serializeProduto))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = produtoAfiliadoSchema.parse(await req.json())
    const dup = await db.produtoAfiliado.findUnique({ where: { slug: body.slug } })
    if (dup) return NextResponse.json({ error: "Slug já em uso" }, { status: 409 })

    const created = await db.produtoAfiliado.create({
      data: {
        slug: body.slug,
        nome: body.nome,
        plataformaAfil: body.plataformaAfil,
        preco: body.preco ?? null,
        comissaoPercent: body.comissaoPercent ?? null,
        linkCheckout: body.linkCheckout || null,
        linkLanding: body.linkLanding || null,
        status: body.status,
        observacoes: body.observacoes || null,
      },
    })
    return NextResponse.json(serializeProduto(created), { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
