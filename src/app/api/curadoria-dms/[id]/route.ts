import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  CuradoriaDmError,
  getCuradoriaDmById,
  isN8nPostgresConfigured,
  patchCuradoriaSchema,
  updateCuradoriaDm,
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
    const row = await getCuradoriaDmById(id)
    if (!row) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    return NextResponse.json(row)
  } catch (err) {
    console.error("[curadoria-dms] get", err)
    return NextResponse.json({ error: "Falha ao carregar registro" }, { status: 500 })
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
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
    const body = patchCuradoriaSchema.parse(await req.json())
    const updated = await updateCuradoriaDm(id, body)
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof CuradoriaDmError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus },
      )
    }
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }
    console.error("[curadoria-dms] patch", err)
    return NextResponse.json({ error: "Falha ao atualizar registro" }, { status: 500 })
  }
}
