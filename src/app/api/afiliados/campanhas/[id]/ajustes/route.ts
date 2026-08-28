import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ajusteCampanhaManualSchema } from "@/lib/afiliados/ajustes"
import { avaliarRegrasCampanha } from "@/lib/afiliados/regras"

type Params = { params: Promise<{ id: string }> }

/** Lista os ajustes de uma campanha (mais recente primeiro). */
export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ajustes = await db.ajusteCampanha.findMany({ where: { campanhaId: id }, orderBy: { data: "desc" } })
  return NextResponse.json(ajustes)
}

/** Registro manual de ajuste, fora da fila (origem=MANUAL) — só aqui `data` retroativa é aceita. */
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const campanha = await db.campanha.findUnique({ where: { id }, select: { id: true } })
    if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

    const body = ajusteCampanhaManualSchema.parse(await req.json())
    const created = await db.ajusteCampanha.create({
      data: {
        campanhaId: id,
        origem: "MANUAL",
        tipo: body.tipo,
        valorAnterior: body.valorAnterior ?? null,
        valorNovo: body.valorNovo ?? null,
        data: body.data ?? new Date(),
        motivo: body.motivo || null,
      },
    })

    await avaliarRegrasCampanha(db, id)

    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao registrar ajuste" }, { status: 400 })
  }
}
