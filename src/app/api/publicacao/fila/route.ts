import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  assertPublishToken,
  toFilaItem,
} from "@/lib/publicacao"
import type { Plataforma } from "@prisma/client"

export async function GET(req: Request) {
  const authErr = assertPublishToken(req)
  if (authErr) return authErr

  const url = new URL(req.url)
  const plataforma = url.searchParams.get("plataforma") as Plataforma | null
  const limiteRaw = url.searchParams.get("limite")
  const limite = limiteRaw ? Math.min(Math.max(Number(limiteRaw) || 1, 1), 100) : 50

  const now = new Date()
  const posts = await db.post.findMany({
    where: {
      status: "AGENDADO",
      publicacaoStatus: "PRONTA",
      midiaPath: { not: null },
      midiaToken: { not: null },
      dataPublicacao: { lte: now },
      contaId: { not: null },
      persona: { status: { not: "BANIDA" } },
      ...(plataforma ? { conta: { plataforma } } : {}),
    },
    include: {
      persona: { select: { slug: true, status: true } },
      conta: { select: { handle: true, plataforma: true } },
    },
    orderBy: [{ dataPublicacao: "asc" }, { ordem: "asc" }],
    take: limite,
  })

  const items = posts
    .map((post) => toFilaItem(post))
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return NextResponse.json({ items })
}
