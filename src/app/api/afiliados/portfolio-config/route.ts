import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { portfolioConfigSchema, decimalNum } from "@/lib/afiliados"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const config = await db.portfolioConfig.findUnique({ where: { id: "default" } })

  if (!config) {
    return NextResponse.json({ id: "default", totalAvailableCapital: 0, currency: "USD", updatedAt: null })
  }

  return NextResponse.json({ ...config, totalAvailableCapital: decimalNum(config.totalAvailableCapital) })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = portfolioConfigSchema.parse(await req.json())

    const updated = await db.portfolioConfig.upsert({
      where: { id: "default" },
      create: { id: "default", totalAvailableCapital: body.totalAvailableCapital, currency: body.currency },
      update: { totalAvailableCapital: body.totalAvailableCapital, currency: body.currency },
    })

    return NextResponse.json({ ...updated, totalAvailableCapital: decimalNum(updated.totalAvailableCapital) })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar configuração de portfólio" }, { status: 400 })
  }
}
