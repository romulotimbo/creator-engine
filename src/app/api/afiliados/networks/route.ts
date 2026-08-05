import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { networkCreateSchema } from "@/lib/afiliados"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const networks = await db.network.findMany({ orderBy: { nome: "asc" } })
  return NextResponse.json(networks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = networkCreateSchema.parse(await req.json())

    const dup = await db.network.findUnique({ where: { nome: body.nome } })
    if (dup) return NextResponse.json({ error: "Rede com este nome já cadastrada" }, { status: 409 })

    const created = await db.network.create({
      data: {
        nome: body.nome,
        paymentReliabilityScore: body.paymentReliabilityScore ?? null,
        reliabilityUpdatedAt: body.paymentReliabilityScore != null ? new Date() : null,
        prazoPagamentoDias: body.prazoPagamentoDias ?? null,
        notas: body.notas ?? null,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao criar rede" }, { status: 400 })
  }
}
