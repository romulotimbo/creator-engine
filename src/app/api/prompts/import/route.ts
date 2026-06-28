import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

function hashPrompt(text: string) {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex")
}

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const posts = await db.post.findMany({
    where: { promptIa: { not: null } },
    select: { promptIa: true, persona: { select: { slug: true } } },
  })

  const existing = await db.promptGlobal.findMany({ select: { prompt: true } })
  const existingHashes = new Set(existing.map((p) => hashPrompt(p.prompt)))

  let imported = 0
  let skipped = 0

  for (const post of posts) {
    const text = post.promptIa?.trim()
    if (!text) continue
    const h = hashPrompt(text)
    if (existingHashes.has(h)) {
      skipped++
      continue
    }
    existingHashes.add(h)
    const titulo = text.slice(0, 60) + (text.length > 60 ? "…" : "")
    await db.promptGlobal.create({
      data: {
        titulo,
        categoria: "PERSONAGEM",
        prompt: text,
        tags: ["importado"],
      },
    })
    imported++
  }

  return NextResponse.json({ imported, skipped, total: posts.length })
}
