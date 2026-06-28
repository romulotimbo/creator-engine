import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import ExcelJS from "exceljs"

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw.trim() }
  const meta: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx > 0) meta[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
  }
  return { meta, body: match[2].trim() }
}

const TIPO_MAP: Record<string, string> = {
  ideia: "IDEIA", experimento: "EXPERIMENTO", projeto: "PROJETO", tendencia: "TENDENCIA", aprendizado: "APRENDIZADO",
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })

  const text = await file.text()
  const { meta, body } = parseFrontmatter(text)
  const tipoKey = (meta.tipo ?? meta.type ?? "ideia").toLowerCase()
  const tipo = TIPO_MAP[tipoKey] ?? "IDEIA"

  const entry = await db.discoveryEntry.create({
    data: {
      tipo: tipo as any,
      titulo: meta.titulo ?? meta.title ?? file.name.replace(/\.md$/i, ""),
      descricao: body || meta.descricao || null,
      tags: (meta.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      status: "EM_ABERTO",
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
