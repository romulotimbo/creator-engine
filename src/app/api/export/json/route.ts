import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [personas, posts, receitas, custos, ferramentas, prompts] = await Promise.all([
    db.persona.findMany({ include: { contas: true } }),
    db.post.findMany(),
    db.receita.findMany(),
    db.custo.findMany(),
    db.ferramenta.findMany(),
    db.promptGlobal.findMany({ select: { id: true, titulo: true, categoria: true, usos: true } }),
  ])

  const snapshot = {
    exportedAt: new Date().toISOString(),
    personas,
    posts,
    receitas,
    custos,
    ferramentas,
    prompts,
  }

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="creator-engine-snapshot-${Date.now()}.json"`,
    },
  })
}
