import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { STATUS_ITEM_FILA_TERMINAIS } from "@/lib/afiliados/fila"

const PRIORIDADE_ORDEM: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 }

/** Lista os itens de fila não-terminais, ordenados por prioridade. */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const itens = await db.itemFila.findMany({
    where: { status: { notIn: [...STATUS_ITEM_FILA_TERMINAIS] } },
    orderBy: { createdAt: "desc" },
  })
  itens.sort((a, b) => PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade])

  return NextResponse.json(itens)
}
