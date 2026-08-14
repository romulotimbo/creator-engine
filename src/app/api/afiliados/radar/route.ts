import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ofertaDecisaoSchema, decimalNum } from "@/lib/afiliados"
import { calcularScoreOferta } from "@/lib/afiliados/scoring"
import { recordDomainChange } from "@/lib/afiliados/domain-log"
import type { Prisma } from "@prisma/client"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ofertas = await db.ofertaDecisao.findMany({
    include: {
      decisoes: { orderBy: { createdAt: "desc" }, take: 5 },
      produtosGerados: { select: { id: true, nome: true, slug: true } },
      network: { select: { id: true, nome: true, paymentReliabilityScore: true, reliabilityUpdatedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    ofertas.map((o) => ({
      ...o,
      visitasTotais: o.visitasTotais,
      tendenciaTrafego30d: o.tendenciaTrafego30d != null ? decimalNum(o.tendenciaTrafego30d) : null,
      tendenciaTrafego60d: o.tendenciaTrafego60d != null ? decimalNum(o.tendenciaTrafego60d) : null,
      tendenciaTrafego90d: o.tendenciaTrafego90d != null ? decimalNum(o.tendenciaTrafego90d) : null,
      comissaoValor: o.comissaoValor != null ? decimalNum(o.comissaoValor) : null,
      epcRede: o.epcRede != null ? decimalNum(o.epcRede) : null,
      cvrRede: o.cvrRede != null ? decimalNum(o.cvrRede) : null,
      refundPct: o.refundPct != null ? decimalNum(o.refundPct) : null,
      bounceRate: o.bounceRate != null ? decimalNum(o.bounceRate) : null,
      cbGravity: o.cbGravity != null ? decimalNum(o.cbGravity) : null,
      cbScore: o.cbScore != null ? decimalNum(o.cbScore) : null,
      cpcMinimo: o.cpcMinimo != null ? decimalNum(o.cpcMinimo) : null,
      cpcMaximo: o.cpcMaximo != null ? decimalNum(o.cpcMaximo) : null,
      cpcMedioEsperado: o.cpcMedioEsperado != null ? decimalNum(o.cpcMedioEsperado) : null,
      budgetTesteAlocado: o.budgetTesteAlocado != null ? decimalNum(o.budgetTesteAlocado) : null,
      ltvEstimadoRebill: o.ltvEstimadoRebill != null ? decimalNum(o.ltvEstimadoRebill) : null,
    })),
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rawBody = await req.json()
    // scoreCalculado/scoreBreakdown nunca são aceitos do cliente — sempre recalculados no servidor
    const { termsVerifiedAt: _ignoredTermsVerifiedAt, ...body } = ofertaDecisaoSchema.parse(rawBody)
    void _ignoredTermsVerifiedAt // termsVerifiedAt é gerido exclusivamente via /api/afiliados/ofertas/[id]/terms

    const dup = await db.ofertaDecisao.findUnique({ where: { nome: body.nome } })
    if (dup) return NextResponse.json({ error: "Oferta com este nome já cadastrada" }, { status: 409 })

    const { scoreCalculado, completudeDados, scoreBreakdown } = calcularScoreOferta({
      epcRede: body.epcRede,
      refundPct: body.refundPct,
      tendenciaTrafego30d: body.tendenciaTrafego30d,
      tendenciaTrafego60d: body.tendenciaTrafego60d,
      tendenciaTrafego90d: body.tendenciaTrafego90d,
      comissaoValor: body.comissaoValor,
      cpcMedioEsperado: body.cpcMedioEsperado,
      volumeBuscaMensal: body.volumeBuscaMensal,
    })

    const created = await db.$transaction(async (tx) => {
      const oferta = await tx.ofertaDecisao.create({
        data: {
          ...body,
          scoreCalculado,
          completudeDados,
          scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
        },
      })

      if (body.domainUsed) {
        await recordDomainChange(tx, oferta.id, body.domainUsed)
      }

      return oferta
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao criar oferta" }, { status: 400 })
  }
}
