import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCuradoriaWindowSort } from "@/lib/curadoria-dms-shared"
import { isN8nPostgresConfigured, listCuradoriaDms } from "@/lib/curadoria-dms"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isN8nPostgresConfigured()) {
    return NextResponse.json(
      { error: "Conexão n8n não configurada (N8N_POSTGRES_URL)" },
      { status: 503 },
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page") ?? "1")
    const limit = Number(searchParams.get("limit") ?? "25")

    const result = await listCuradoriaDms({
      status: searchParams.get("status") ?? "pending_review",
      username: searchParams.get("username") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 25,
      sortWindow: parseCuradoriaWindowSort(searchParams.get("sortWindow")),
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[curadoria-dms] list", err)
    return NextResponse.json({ error: "Falha ao listar rascunhos" }, { status: 500 })
  }
}
