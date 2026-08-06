import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ofertaDecisaoUpdateSchema, decimalNum } from "@/lib/afiliados"
import { calcularScoreOferta } from "@/lib/afiliados/scoring"
import { recordDomainChange } from "@/lib/afiliados/domain-log"
import type { Prisma } from "@prisma/client"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const oferta = await db.ofertaDecisao.findUnique({
    where: { id },
    include: {
      decisoes: { orderBy: { createdAt: "desc" } },
      produtosGerados: { select: { id: true, nome: true, slug: true } },
      network: { select: { id: true, nome: true, paymentReliabilityScore: true, reliabilityUpdatedAt: true } },
      termsVersions: { orderBy: { verifiedAt: "desc" } },
    },
  })

  if (!oferta) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 })

  return NextResponse.json({
    ...oferta,
    tendenciaTrafego30d: oferta.tendenciaTrafego30d != null ? decimalNum(oferta.tendenciaTrafego30d) : null,
    tendenciaTrafego60d: oferta.tendenciaTrafego60d != null ? decimalNum(oferta.tendenciaTrafego60d) : null,
    tendenciaTrafego90d: oferta.tendenciaTrafego90d != null ? decimalNum(oferta.tendenciaTrafego90d) : null,
    comissaoValor: oferta.comissaoValor != null ? decimalNum(oferta.comissaoValor) : null,
    epcRede: oferta.epcRede != null ? decimalNum(oferta.epcRede) : null,
    cvrRede: oferta.cvrRede != null ? decimalNum(oferta.cvrRede) : null,
    refundPct: oferta.refundPct != null ? decimalNum(oferta.refundPct) : null,
    bounceRate: oferta.bounceRate != null ? decimalNum(oferta.bounceRate) : null,
    cbGravity: oferta.cbGravity != null ? decimalNum(oferta.cbGravity) : null,
    cbScore: oferta.cbScore != null ? decimalNum(oferta.cbScore) : null,
    cpcMinimo: oferta.cpcMinimo != null ? decimalNum(oferta.cpcMinimo) : null,
    cpcMaximo: oferta.cpcMaximo != null ? decimalNum(oferta.cpcMaximo) : null,
    cpcMedioEsperado: oferta.cpcMedioEsperado != null ? decimalNum(oferta.cpcMedioEsperado) : null,
    budgetTesteAlocado: oferta.budgetTesteAlocado != null ? decimalNum(oferta.budgetTesteAlocado) : null,
    cpaAlvoBreakeven: oferta.cpaAlvoBreakeven != null ? decimalNum(oferta.cpaAlvoBreakeven) : null,
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const existing = await db.ofertaDecisao.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 })

    const rawBody = await req.json()
    // termsVerifiedAt nunca é aceito aqui — gerido exclusivamente via /api/afiliados/ofertas/[id]/terms
    // (garante que toda mudança percebida nos termos gera um TermsVersion auditável)
    const { termsVerifiedAt: _ignoredTermsVerifiedAt, ...body } = ofertaDecisaoUpdateSchema.parse(rawBody)
    void _ignoredTermsVerifiedAt

    const merged = {
      epcRede: body.epcRede !== undefined ? body.epcRede : decimalNum(existing.epcRede),
      refundPct: body.refundPct !== undefined ? body.refundPct : decimalNum(existing.refundPct),
      tendenciaTrafego30d: body.tendenciaTrafego30d !== undefined ? body.tendenciaTrafego30d : decimalNum(existing.tendenciaTrafego30d),
      tendenciaTrafego60d: body.tendenciaTrafego60d !== undefined ? body.tendenciaTrafego60d : decimalNum(existing.tendenciaTrafego60d),
      tendenciaTrafego90d: body.tendenciaTrafego90d !== undefined ? body.tendenciaTrafego90d : decimalNum(existing.tendenciaTrafego90d),
      comissaoValor: body.comissaoValor !== undefined ? body.comissaoValor : decimalNum(existing.comissaoValor),
      cpcMedioEsperado: body.cpcMedioEsperado !== undefined ? body.cpcMedioEsperado : decimalNum(existing.cpcMedioEsperado),
      volumeBuscaMensal: body.volumeBuscaMensal !== undefined ? body.volumeBuscaMensal : existing.volumeBuscaMensal,
    }

    const { scoreCalculado, completudeDados, scoreBreakdown } = calcularScoreOferta(merged)

    // Se houve mudança de statusDecisao, registrar no DecisionLogOferta
    const statusMudou = body.statusDecisao && body.statusDecisao !== existing.statusDecisao
    const justificativa = rawBody.justificativaDecisao || (statusMudou ? `Status alterado para ${body.statusDecisao}` : null)

    const domainMudou = body.domainUsed !== undefined && body.domainUsed !== existing.domainUsed

    const updated = await db.$transaction(async (tx) => {
      const oferta = await tx.ofertaDecisao.update({
        where: { id },
        data: {
          ...body,
          scoreCalculado,
          completudeDados,
          scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
          decisoes: statusMudou && justificativa ? {
            create: {
              statusAnterior: existing.statusDecisao,
              statusNovo: body.statusDecisao!,
              justificativa,
              autor: session.user?.email || "Usuário",
            },
          } : undefined,
        },
      })

      if (domainMudou) {
        await recordDomainChange(tx, id, body.domainUsed)
      }

      return oferta
    })

    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar oferta" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.ofertaDecisao.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 })

  await db.ofertaDecisao.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
