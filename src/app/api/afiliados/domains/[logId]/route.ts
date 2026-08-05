import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { reputationStatusEnum } from "@/lib/afiliados"
import { z } from "zod"

const patchSchema = z.object({
  reputationStatus: reputationStatusEnum,
})

export async function PATCH(req: Request, { params }: { params: Promise<{ logId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { logId } = await params

  try {
    const existing = await db.domainUsageLog.findUnique({ where: { id: logId } })
    if (!existing) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })

    const { reputationStatus } = patchSchema.parse(await req.json())

    const updated = await db.domainUsageLog.update({
      where: { id: logId },
      data: { reputationStatus },
    })

    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao atualizar registro" }, { status: 400 })
  }
}
