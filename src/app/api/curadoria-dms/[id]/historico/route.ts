import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getCuradoriaHistorico,
  isN8nPostgresConfigured,
} from "@/lib/curadoria-dms"

type RouteContext = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isN8nPostgresConfigured()) {
    return NextResponse.json(
      { error: "Conexão n8n não configurada (N8N_POSTGRES_URL)" },
      { status: 503 },
    )
  }

  const { id: rawId } = await ctx.params
  const id = parseId(rawId)
  if (id == null) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  try {
    const historico = await getCuradoriaHistorico(id)
    if (!historico) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    }
    return NextResponse.json(historico)
  } catch (err) {
    console.error("[curadoria-dms] historico", err)
    return NextResponse.json({ error: "Falha ao carregar histórico" }, { status: 500 })
  }
}
