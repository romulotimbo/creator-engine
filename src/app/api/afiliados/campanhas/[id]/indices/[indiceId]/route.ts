import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { indiceFlagsSchema, serializeIndice } from "@/lib/afiliados/indices"

type Params = { params: Promise<{ id: string; indiceId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campanhaId, indiceId } = await params
  try {
    const existing = await db.indiceCampanha.findFirst({
      where: { id: indiceId, campanhaId },
      include: { linhas: true },
    })
    if (!existing) return NextResponse.json({ error: "Índice não encontrado" }, { status: 404 })

    const body = indiceFlagsSchema.parse(await req.json())
    const updated = await db.indiceCampanha.update({
      where: { id: indiceId },
      data: {
        ...(body.validadoVisualmente !== undefined ? { validadoVisualmente: body.validadoVisualmente } : {}),
        ...(body.negativado !== undefined ? { negativado: body.negativado } : {}),
      },
      include: { linhas: true },
    })

    return NextResponse.json(serializeIndice(updated))
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; issues?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || err.issues?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar índice" }, { status: 400 })
  }
}
