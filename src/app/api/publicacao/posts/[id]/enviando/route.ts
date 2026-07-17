import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { assertPublishToken } from "@/lib/publicacao"

type Params = { params: Promise<{ id: string }> }

export async function POST(_: Request, { params }: Params) {
  const authErr = assertPublishToken(_)
  if (authErr) return authErr

  const { id } = await params
  const post = await db.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (post.publicacaoStatus !== "PRONTA") {
    return NextResponse.json(
      { error: `Post não está PRONTA (atual: ${post.publicacaoStatus})` },
      { status: 409 },
    )
  }

  const updated = await db.post.update({
    where: { id },
    data: { publicacaoStatus: "ENVIANDO" },
  })

  return NextResponse.json({
    postId: updated.id,
    publicacaoStatus: updated.publicacaoStatus,
  })
}
