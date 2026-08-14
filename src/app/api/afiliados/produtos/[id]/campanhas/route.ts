import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { campanhaCreateSchema, decimalNum } from "@/lib/afiliados"
import { recomputeProdutoRollups } from "@/lib/afiliados/rollups"

type Params = { params: Promise<{ id: string }> }

function serializeCampanha(c: {
  budgetDiarioDefinido: { toString(): string } | null
  budgetTesteAlocado: { toString(): string } | null
  [k: string]: unknown
}) {
  return {
    ...c,
    budgetDiarioDefinido: c.budgetDiarioDefinido != null ? decimalNum(c.budgetDiarioDefinido) : null,
    budgetTesteAlocado: c.budgetTesteAlocado != null ? decimalNum(c.budgetTesteAlocado) : null,
  }
}

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: produtoId } = await params
  const produto = await db.produtoAfiliado.findUnique({ where: { id: produtoId }, select: { id: true } })
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

  const campanhas = await db.campanha.findMany({
    where: { produtoId },
    include: {
      snapshots: { orderBy: { dataSnapshot: "desc" }, take: 1 },
      contaTrafego: { select: { id: true, slug: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(campanhas.map(serializeCampanha))
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: produtoId } = await params

  try {
    const produto = await db.produtoAfiliado.findUnique({ where: { id: produtoId } })
    if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

    const body = campanhaCreateSchema.parse(await req.json())

    const created = await db.$transaction(async (tx) => {
      const campanha = await tx.campanha.create({
        data: {
          produtoId,
          nomeCampanhaGoogleAds: body.nomeCampanhaGoogleAds,
          contaTrafegoId: body.contaTrafegoId || null,
          nomeContaAds: body.nomeContaAds || null,
          geo: body.geo || null,
          estrategia: body.estrategia ?? null,
          papelConta: body.papelConta,
          dataInicio: body.dataInicio ?? null,
          dataFim: body.dataFim ?? null,
          status: body.status,
          budgetDiarioDefinido: body.budgetDiarioDefinido ?? null,
          budgetTesteAlocado: body.budgetTesteAlocado ?? null,
          linkPainelGoogleAds: body.linkPainelGoogleAds || null,
          moeda: body.moeda || null,
        },
      })

      if (!produto.dataInicioTeste && body.dataInicio) {
        await tx.produtoAfiliado.update({
          where: { id: produtoId },
          data: { dataInicioTeste: body.dataInicio },
        })
      } else if (!produto.dataInicioTeste) {
        await tx.produtoAfiliado.update({
          where: { id: produtoId },
          data: { dataInicioTeste: new Date() },
        })
      }

      return campanha
    })

    await recomputeProdutoRollups(db, produtoId)
    return NextResponse.json(serializeCampanha(created), { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao criar campanha" }, { status: 400 })
  }
}
