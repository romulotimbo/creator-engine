import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { assertPublishToken } from "@/lib/publicacao"

type Params = { params: Promise<{ id: string }> }

const erroSchema = z.object({
  mensagem: z.string().min(1),
  zernioPostId: z.string().optional().nullable(),
})

export async function POST(req: Request, { params }: Params) {
  const authErr = assertPublishToken(req)
  if (authErr) return authErr

  const { id } = await params
  const existing = await db.post.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const data = erroSchema.parse(await req.json())
    const updated = await db.post.update({
      where: { id },
      data: {
        status: "AGENDADO",
        publicacaoStatus: "ERRO",
        publicacaoErro: data.mensagem,
        ...(data.zernioPostId ? { zernioPostId: data.zernioPostId } : {}),
      },
    })

    return NextResponse.json({
      postId: updated.id,
      status: updated.status,
      publicacaoStatus: updated.publicacaoStatus,
      publicacaoErro: updated.publicacaoErro,
    })
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 422 })
    }
    const msg = e instanceof Error ? e.message : "Erro ao registrar falha"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
