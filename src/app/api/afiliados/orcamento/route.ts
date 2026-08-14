import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { orcamentoPeriodoSchema } from "@/lib/afiliados"
import { currentPeriodo, ensureOrcamentoPeriodo } from "@/lib/afiliados/orcamento"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const periodo = currentPeriodo()
  const orc = await ensureOrcamentoPeriodo(periodo)
  if (!orc) {
    return NextResponse.json({
      periodo,
      capitalTotalDisponivel: 0,
      moedaBase: "USD",
      limitePctPorProduto: null,
      reservaMinimaPct: 0,
    })
  }
  return NextResponse.json(orc)
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = orcamentoPeriodoSchema.parse(await req.json())
    const updated = await db.orcamentoPeriodo.upsert({
      where: { periodo: body.periodo },
      create: {
        periodo: body.periodo,
        capitalTotalDisponivel: body.capitalTotalDisponivel,
        moedaBase: body.moedaBase,
        limitePctPorProduto: body.limitePctPorProduto ?? null,
        reservaMinimaPct: body.reservaMinimaPct,
      },
      update: {
        capitalTotalDisponivel: body.capitalTotalDisponivel,
        moedaBase: body.moedaBase,
        limitePctPorProduto: body.limitePctPorProduto ?? null,
        reservaMinimaPct: body.reservaMinimaPct,
      },
    })

    await db.portfolioConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        totalAvailableCapital: body.capitalTotalDisponivel,
        currency: body.moedaBase,
      },
      update: {
        totalAvailableCapital: body.capitalTotalDisponivel,
        currency: body.moedaBase,
      },
    })

    return NextResponse.json({
      id: updated.id,
      periodo: updated.periodo,
      capitalTotalDisponivel: Number(updated.capitalTotalDisponivel),
      moedaBase: updated.moedaBase,
      limitePctPorProduto: updated.limitePctPorProduto != null ? Number(updated.limitePctPorProduto) : null,
      reservaMinimaPct: Number(updated.reservaMinimaPct),
    })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao salvar orçamento" }, { status: 400 })
  }
}
