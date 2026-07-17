import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  batchCuradoriaSchema,
  batchUpdateCuradoriaDms,
  isN8nPostgresConfigured,
} from "@/lib/curadoria-dms"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isN8nPostgresConfigured()) {
    return NextResponse.json(
      { error: "Conexão n8n não configurada (N8N_POSTGRES_URL)" },
      { status: 503 },
    )
  }

  try {
    const body = batchCuradoriaSchema.parse(await req.json())
    const result = await batchUpdateCuradoriaDms(body)
    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }
    console.error("[curadoria-dms] batch", err)
    return NextResponse.json({ error: "Falha no processamento em lote" }, { status: 500 })
  }
}
