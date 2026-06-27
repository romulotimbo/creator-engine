import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { contaId, seguidores, engajamento, receitaDia } = await req.json()

  const [_, metrica] = await db.$transaction([
    db.contaPlataforma.update({
      where: { id: contaId },
      data: { seguidoresAtual: seguidores, ...(engajamento ? { engajamentoMedio: engajamento } : {}) },
    }),
    db.metricaHistorica.create({
      data: { contaId, data: new Date(), seguidores, engajamento, receitaDia },
    }),
  ])

  return NextResponse.json(metrica, { status: 201 })
}
