import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { produtoAfiliadoSchema } from "@/lib/afiliados"
import { serializeProdutoOperacional } from "@/lib/afiliados/produto"
import { alertaOrcamentoEstourado } from "@/lib/afiliados/rollups"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const produtos = await db.produtoAfiliado.findMany({
    include: {
      _count: { select: { contas: true, vendas: true, campanhas: true } },
      ofertaDecisao: { select: { id: true, nome: true, vertical: true } },
      campanhas: {
        select: {
          id: true,
          nomeContaAds: true,
          nomeCampanhaGoogleAds: true,
          geo: true,
          papelConta: true,
          status: true,
          contaTrafego: { select: { id: true, nome: true, slug: true } },
          budgetTesteAlocado: true,
          snapshots: { orderBy: { dataSnapshot: "desc" }, take: 1, select: { gasto: true } },
        },
      },
    },
    orderBy: { nome: "asc" },
  })

  return NextResponse.json(
    produtos.map((p) => {
      const serialized = serializeProdutoOperacional(p)
      const campanhas = p.campanhas.map((c) => ({
        ...c,
        alertaOrcamentoEstourado: alertaOrcamentoEstourado({
          gasto: c.snapshots[0]?.gasto ?? null,
          budget: c.budgetTesteAlocado,
          statusOperacional: c.status,
        }),
      }))
      return { ...serialized, campanhas }
    }),
  )
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
        conversionPoint: body.conversionPoint ?? null,
        tipoProduto: body.tipoProduto ?? null,
        ltvEstimadoRebill: body.ltvEstimadoRebill ?? null,
        comissaoValor: body.comissaoValor ?? null,
        budgetTesteAlocado: body.budgetTesteAlocado ?? null,
        cpaAlvoBreakeven: body.cpaAlvoBreakeven ?? null,
        cpaAlvoManual: body.cpaAlvoManual ?? false,
        margemDesejadaPct: body.margemDesejadaPct ?? null,
        criterioPausa: body.criterioPausa || null,
        criterioEscala: body.criterioEscala || null,
        statusOperacional: body.statusOperacional ?? null,
        dataInicioTeste: body.dataInicioTeste ?? null,
        domainUsed: body.domainUsed || null,
        nextReviewAt: body.nextReviewAt ?? null,
        moeda: body.moeda || null,
      },
    })
    return NextResponse.json(serializeProdutoOperacional(created), { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
