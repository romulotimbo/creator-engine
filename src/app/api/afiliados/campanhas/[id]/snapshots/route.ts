import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { campanhaGastoSnapshotSchema } from "@/lib/afiliados"
import { CampanhaNotFoundError, upsertCampanhaGastoSnapshot } from "@/lib/afiliados/snapshot"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campanhaId } = await params

  try {
    const body = campanhaGastoSnapshotSchema.parse(await req.json())
    const result = await upsertCampanhaGastoSnapshot(db, campanhaId, {
      gasto: body.gasto,
      dataSnapshot: body.dataSnapshot,
    })

    return NextResponse.json({
      ok: true,
      created: result.created,
      snapshotId: result.snapshotId,
      dataSnapshot: result.dataSnapshot.toISOString().slice(0, 10),
      gastoTotalAcumulado: result.rollups.gastoTotalAcumulado,
    }, { status: result.created ? 201 : 200 })
  } catch (e: unknown) {
    if (e instanceof CampanhaNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao gravar gasto" }, { status: 400 })
  }
}
