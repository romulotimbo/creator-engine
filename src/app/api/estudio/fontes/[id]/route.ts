import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSubdir } from "@/lib/estudio/fs-server"
import fs from "node:fs"
import path from "node:path"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const fonte = await db.fonteVideo.findUnique({ where: { id } })
  if (!fonte) return NextResponse.json({ ok: true })

  await db.fonteVideo.delete({ where: { id } })

  // Remove o arquivo do inbox (best-effort; não falha a exclusão do registro).
  try {
    const alvo = path.join(getSubdir("fontes"), fonte.arquivo)
    if (fs.existsSync(alvo)) fs.rmSync(alvo, { force: true })
  } catch {
    // ignora
  }
  return NextResponse.json({ ok: true })
}
