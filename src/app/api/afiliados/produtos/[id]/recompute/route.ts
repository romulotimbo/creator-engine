import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { recomputeProdutoRollups } from "@/lib/afiliados/rollups"

type Params = { params: Promise<{ id: string }> }

export async function POST(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: produtoId } = await params
  const produto = await db.produtoAfiliado.findUnique({ where: { id: produtoId }, select: { id: true } })
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })

  const rollups = await recomputeProdutoRollups(db, produtoId)
  return NextResponse.json({ ok: true, rollups })
}
