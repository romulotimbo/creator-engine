import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  assertPublishToken,
  buildMediaUrl,
  zernioContentType,
  zernioMediaItemType,
} from "@/lib/publicacao"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const authErr = assertPublishToken(req)
  if (authErr) return authErr

  const { id } = await params
  const post = await db.post.findUnique({
    where: { id },
    include: {
      persona: { select: { slug: true, status: true, nomeArtistico: true } },
      conta: { select: { id: true, handle: true, plataforma: true } },
    },
  })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const contentType = zernioContentType({
    publicacaoTipo: post.publicacaoTipo,
    tipo: post.tipo,
  })

  return NextResponse.json({
    postId: post.id,
    ordem: post.ordem,
    titulo: post.titulo,
    tipo: post.tipo,
    publicacaoTipo: post.publicacaoTipo,
    publicacaoStatus: post.publicacaoStatus,
    status: post.status,
    copyLegenda: post.copyLegenda,
    hashtags: post.hashtags,
    personaSlug: post.persona.slug,
    personaNome: post.persona.nomeArtistico,
    contaPlataforma: post.conta?.plataforma ?? null,
    contaHandle: post.conta?.handle ?? null,
    zernioContentType: contentType,
    zernioMediaType: zernioMediaItemType(post.midiaMime),
    mediaUrl: post.midiaToken ? buildMediaUrl(post.id, post.midiaToken) : null,
    midiaMime: post.midiaMime,
    dataPublicacao: post.dataPublicacao?.toISOString() ?? null,
    zernioPostId: post.zernioPostId,
    platformPostUrl: post.platformPostUrl,
    publicacaoErro: post.publicacaoErro,
    publicacaoEnviadaEm: post.publicacaoEnviadaEm?.toISOString() ?? null,
  })
}
