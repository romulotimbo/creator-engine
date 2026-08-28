import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/** Bandeja de linhas do envelope de ingestão que não casaram com nenhuma Campanha. */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const itens = await db.campanhaNaoReconciliada.findMany({
    where: { resolvidoEm: null },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(itens)
}
