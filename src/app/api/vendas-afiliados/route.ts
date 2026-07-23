import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { vendaAfiliadoSchema, decimalNum } from "@/lib/afiliados"
import { subDays } from "date-fns"

function serializeVenda(v: {
  id: string
  contaTrafegoId: string
  produtoId: string | null
  data: Date
  valorVenda: { toString(): string }
  valorComissao: { toString(): string }
  plataformaAfil: string
  status: string
  origem: string
  externalId: string | null
  observacoes: string | null
  createdAt: Date
  updatedAt: Date
  produto?: { id: string; nome: string; slug: string } | null
  contaTrafego?: { id: string; slug: string; nome: string } | null
}) {
  return {
    ...v,
    valorVenda: decimalNum(v.valorVenda),
    valorComissao: decimalNum(v.valorComissao),
    data: v.data.toISOString(),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = req.nextUrl.searchParams
  const contaTrafegoId = params.get("contaTrafegoId")
  const afiliadoSlug = params.get("afiliadoSlug")
  const resumo = params.get("resumo") === "true"
  const dias = Math.min(365, Math.max(1, Number(params.get("dias") || 30)))

  let resolvedId = contaTrafegoId
  if (!resolvedId && afiliadoSlug) {
    const ct = await db.contaTrafego.findUnique({ where: { slug: afiliadoSlug }, select: { id: true } })
    resolvedId = ct?.id ?? null
  }
  if (!resolvedId) {
    return NextResponse.json({ error: "contaTrafegoId ou afiliadoSlug obrigatório" }, { status: 422 })
  }

  if (resumo) {
    const desde = subDays(new Date(), dias)
    const [aprovadasPeriodo, aprovadasTotal, pendentes] = await Promise.all([
      db.vendaAfiliado.aggregate({
        where: { contaTrafegoId: resolvedId, status: "APROVADA", data: { gte: desde } },
        _sum: { valorComissao: true, valorVenda: true },
        _count: true,
      }),
      db.vendaAfiliado.aggregate({
        where: { contaTrafegoId: resolvedId, status: "APROVADA" },
        _sum: { valorComissao: true, valorVenda: true },
        _count: true,
      }),
      db.vendaAfiliado.count({ where: { contaTrafegoId: resolvedId, status: "PENDENTE" } }),
    ])
    return NextResponse.json({
      dias,
      periodo: {
        comissao: decimalNum(aprovadasPeriodo._sum.valorComissao),
        vendas: decimalNum(aprovadasPeriodo._sum.valorVenda),
        count: aprovadasPeriodo._count,
      },
      total: {
        comissao: decimalNum(aprovadasTotal._sum.valorComissao),
        vendas: decimalNum(aprovadasTotal._sum.valorVenda),
        count: aprovadasTotal._count,
      },
      pendentes,
    })
  }

  const vendas = await db.vendaAfiliado.findMany({
    where: { contaTrafegoId: resolvedId },
    include: {
      produto: { select: { id: true, nome: true, slug: true } },
    },
    orderBy: { data: "desc" },
  })
  return NextResponse.json(vendas.map(serializeVenda))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = vendaAfiliadoSchema.parse(await req.json())
    const conta = await db.contaTrafego.findUnique({ where: { id: body.contaTrafegoId } })
    if (!conta) return NextResponse.json({ error: "Conta de tráfego não encontrada" }, { status: 404 })

    if (body.produtoId) {
      const vinculo = await db.contaTrafegoProduto.findFirst({
        where: { contaTrafegoId: body.contaTrafegoId, produtoId: body.produtoId },
      })
      if (!vinculo) {
        return NextResponse.json({ error: "Produto não vinculado a esta ContaTrafego" }, { status: 422 })
      }
    }

    const created = await db.vendaAfiliado.create({
      data: {
        contaTrafegoId: body.contaTrafegoId,
        produtoId: body.produtoId || null,
        data: body.data,
        valorVenda: body.valorVenda,
        valorComissao: body.valorComissao,
        plataformaAfil: body.plataformaAfil,
        status: body.status,
        origem: "MANUAL",
        externalId: body.externalId || null,
        observacoes: body.observacoes || null,
      },
      include: { produto: { select: { id: true, nome: true, slug: true } } },
    })
    return NextResponse.json(serializeVenda(created), { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    if (err.code === "P2002") return NextResponse.json({ error: "externalId já existe para esta plataforma" }, { status: 409 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
