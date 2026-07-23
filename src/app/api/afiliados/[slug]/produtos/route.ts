import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { vinculoProdutoSchema, decimalNum } from "@/lib/afiliados"

type Params = { params: Promise<{ slug: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const conta = await db.contaTrafego.findUnique({ where: { slug }, select: { id: true } })
  if (!conta) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const vinculos = await db.contaTrafegoProduto.findMany({
    where: { contaTrafegoId: conta.id },
    include: { produto: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(
    vinculos.map((v) => ({
      ...v,
      produto: {
        ...v.produto,
        preco: v.produto.preco != null ? decimalNum(v.produto.preco) : null,
        comissaoPercent: v.produto.comissaoPercent != null ? decimalNum(v.produto.comissaoPercent) : null,
      },
    })),
  )
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { slug } = await params
    const conta = await db.contaTrafego.findUnique({ where: { slug }, select: { id: true } })
    if (!conta) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = vinculoProdutoSchema.parse(await req.json())
    const produto = await db.produtoAfiliado.findUnique({ where: { id: body.produtoId } })
    if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

    const vinculo = await db.contaTrafegoProduto.create({
      data: {
        contaTrafegoId: conta.id,
        produtoId: body.produtoId,
        linkTracking: body.linkTracking || null,
        ativo: body.ativo,
      },
      include: { produto: true },
    })
    return NextResponse.json(vinculo, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    if (err.code === "P2002") return NextResponse.json({ error: "Produto já associado a esta conta" }, { status: 409 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
