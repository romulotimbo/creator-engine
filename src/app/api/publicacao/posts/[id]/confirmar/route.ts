import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { assertPublishToken } from "@/lib/publicacao"

type Params = { params: Promise<{ id: string }> }

const confirmSchema = z.object({
  zernioPostId: z.string().min(1),
  platformPostUrl: z.string().url().optional().nullable(),
})

export async function POST(req: Request, { params }: Params) {
  const authErr = assertPublishToken(req)
  if (authErr) return authErr

  const { id } = await params
  const existing = await db.post.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (existing.status === "PUBLICADO" && existing.publicacaoStatus === "PUBLICADA") {
    return NextResponse.json({
      postId: existing.id,
      status: existing.status,
      publicacaoStatus: existing.publicacaoStatus,
      idempotent: true,
    })
  }

  try {
    const data = confirmSchema.parse(await req.json())
    const now = new Date()
    const updated = await db.post.update({
      where: { id },
      data: {
        status: "PUBLICADO",
        dataStatus: now,
        publicacaoStatus: "PUBLICADA",
        publicacaoEnviadaEm: now,
        zernioPostId: data.zernioPostId,
        platformPostUrl: data.platformPostUrl ?? null,
        publicacaoErro: null,
      },
    })

    return NextResponse.json({
      postId: updated.id,
      status: updated.status,
      publicacaoStatus: updated.publicacaoStatus,
      zernioPostId: updated.zernioPostId,
      platformPostUrl: updated.platformPostUrl,
    })
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 422 })
    }
    const msg = e instanceof Error ? e.message : "Erro ao confirmar"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
