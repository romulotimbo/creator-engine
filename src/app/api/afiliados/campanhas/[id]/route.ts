import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { campanhaUpdateSchema, decimalNum } from "@/lib/afiliados"
import { recomputeProdutoRollups } from "@/lib/afiliados/rollups"

type Params = { params: Promise<{ id: string }> }

function serialize(c: {
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

  const { id } = await params
  const campanha = await db.campanha.findUnique({
    where: { id },
    include: {
      snapshots: { orderBy: { dataSnapshot: "desc" } },
      contaTrafego: { select: { id: true, slug: true, nome: true } },
    },
  })
  if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })
  return NextResponse.json(serialize(campanha))
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const existing = await db.campanha.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

    const body = campanhaUpdateSchema.parse(await req.json())
    const updated = await db.campanha.update({
      where: { id },
      data: {
        ...(body.nomeCampanhaGoogleAds !== undefined ? { nomeCampanhaGoogleAds: body.nomeCampanhaGoogleAds } : {}),
        ...(body.contaTrafegoId !== undefined ? { contaTrafegoId: body.contaTrafegoId || null } : {}),
        ...(body.nomeContaAds !== undefined ? { nomeContaAds: body.nomeContaAds || null } : {}),
        ...(body.geo !== undefined ? { geo: body.geo || null } : {}),
        ...(body.estrategia !== undefined ? { estrategia: body.estrategia ?? null } : {}),
        ...(body.papelConta !== undefined ? { papelConta: body.papelConta } : {}),
        ...(body.dataInicio !== undefined ? { dataInicio: body.dataInicio } : {}),
        ...(body.dataFim !== undefined ? { dataFim: body.dataFim } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.budgetDiarioDefinido !== undefined ? { budgetDiarioDefinido: body.budgetDiarioDefinido } : {}),
        ...(body.budgetTesteAlocado !== undefined ? { budgetTesteAlocado: body.budgetTesteAlocado } : {}),
        ...(body.linkPainelGoogleAds !== undefined ? { linkPainelGoogleAds: body.linkPainelGoogleAds || null } : {}),
        ...(body.moeda !== undefined ? { moeda: body.moeda || null } : {}),
      },
    })
    return NextResponse.json(serialize(updated))
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar campanha" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.campanha.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

  await db.campanha.delete({ where: { id } })
  await recomputeProdutoRollups(db, existing.produtoId)
  return NextResponse.json({ ok: true })
}
