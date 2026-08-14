import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { produtoUpdateSchema, decimalNum } from "@/lib/afiliados"
import { calcularCpaAlvoBreakeven, serializeProdutoOperacional } from "@/lib/afiliados/produto"
import { assertBudgetGuardrails } from "@/lib/afiliados/orcamento"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const produto = await db.produtoAfiliado.findUnique({
    where: { id },
    include: {
      contas: { include: { contaTrafego: { select: { id: true, slug: true, nome: true } } } },
      ofertaDecisao: { select: { id: true, nome: true, vertical: true, domainLogs: { where: { usedUntil: null }, take: 1 } } },
      campanhas: {
        include: {
          contaTrafego: { select: { id: true, nome: true, slug: true } },
          snapshots: { orderBy: { dataSnapshot: "desc" }, take: 5 },
        },
      },
    },
  })
  if (!produto) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(serializeProdutoOperacional(produto))
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

    if (body.budgetTesteAlocado != null) {
      const guard = await assertBudgetGuardrails({ produtoId: id, newBudget: body.budgetTesteAlocado })
      if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    const cpaAlvoManual = body.cpaAlvoManual ?? existing.cpaAlvoManual
    const comissaoValor =
      body.comissaoValor !== undefined ? body.comissaoValor : decimalNum(existing.comissaoValor)
    const margem =
      body.margemDesejadaPct !== undefined ? body.margemDesejadaPct : decimalNum(existing.margemDesejadaPct)
    const cpaAtual =
      body.cpaAlvoBreakeven !== undefined ? body.cpaAlvoBreakeven : decimalNum(existing.cpaAlvoBreakeven)
    const cpaAlvoBreakeven = calcularCpaAlvoBreakeven({
      comissaoValor,
      margemDesejadaPct: margem,
      cpaAlvoManual: body.cpaAlvoBreakeven !== undefined ? true : cpaAlvoManual,
      cpaAlvoBreakeven: cpaAtual,
    })
    const manualFlag = body.cpaAlvoBreakeven !== undefined ? true : cpaAlvoManual

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
        ...(body.conversionPoint !== undefined ? { conversionPoint: body.conversionPoint } : {}),
        ...(body.tipoProduto !== undefined ? { tipoProduto: body.tipoProduto } : {}),
        ...(body.ltvEstimadoRebill !== undefined ? { ltvEstimadoRebill: body.ltvEstimadoRebill } : {}),
        ...(body.comissaoValor !== undefined ? { comissaoValor: body.comissaoValor } : {}),
        ...(body.budgetTesteAlocado !== undefined ? { budgetTesteAlocado: body.budgetTesteAlocado } : {}),
        ...(body.criterioPausa !== undefined ? { criterioPausa: body.criterioPausa || null } : {}),
        ...(body.criterioEscala !== undefined ? { criterioEscala: body.criterioEscala || null } : {}),
        ...(body.statusOperacional !== undefined ? { statusOperacional: body.statusOperacional } : {}),
        ...(body.dataInicioTeste !== undefined ? { dataInicioTeste: body.dataInicioTeste } : {}),
        ...(body.domainUsed !== undefined ? { domainUsed: body.domainUsed || null } : {}),
        ...(body.nextReviewAt !== undefined ? { nextReviewAt: body.nextReviewAt } : {}),
        ...(body.moeda !== undefined ? { moeda: body.moeda || null } : {}),
        ...(body.margemDesejadaPct !== undefined ? { margemDesejadaPct: body.margemDesejadaPct } : {}),
        cpaAlvoBreakeven,
        cpaAlvoManual: manualFlag,
      },
    })
    return NextResponse.json(serializeProdutoOperacional(updated))
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
