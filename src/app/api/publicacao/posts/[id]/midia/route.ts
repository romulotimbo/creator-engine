import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { db } from "@/lib/db"
import {
  assertPublishToken,
  buildMediaUrl,
  generateMidiaToken,
  getPostMediaDir,
  isAllowedMime,
  mimeFromFilename,
  relativeMediaPath,
  resolveCopyFromSource,
} from "@/lib/publicacao"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const authErr = assertPublishToken(req)
  if (authErr) return authErr

  const { id } = await params
  const post = await db.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const contentType = req.headers.get("content-type") ?? ""
  let buffer: Buffer
  let filename: string
  let mime: string

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Campo file obrigatório" }, { status: 422 })
    }
    filename = file.name || "upload.jpg"
    mime = file.type || mimeFromFilename(filename) || "application/octet-stream"
    buffer = Buffer.from(await file.arrayBuffer())
  } else {
    const body = await req.json().catch(() => null)
    const copyFrom = body?.copyFrom as string | undefined
    if (!copyFrom) {
      return NextResponse.json(
        { error: "Envie multipart file ou JSON { copyFrom }" },
        { status: 422 },
      )
    }
    try {
      const source = resolveCopyFromSource(copyFrom)
      buffer = fs.readFileSync(source)
      filename = path.basename(source)
      mime = mimeFromFilename(filename) || "application/octet-stream"
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "copyFrom inválido"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  if (!isAllowedMime(mime)) {
    return NextResponse.json({ error: `MIME não permitido: ${mime}` }, { status: 422 })
  }

  const ext = path.extname(filename) || (mime.startsWith("video/") ? ".mp4" : ".jpg")
  const storedName = `v1${ext}`
  const dir = getPostMediaDir(id)
  const dest = path.join(dir, storedName)
  fs.writeFileSync(dest, buffer)

  const midiaToken = generateMidiaToken()
  const midiaPath = relativeMediaPath(id, storedName)

  const updated = await db.post.update({
    where: { id },
    data: {
      midiaPath,
      midiaMime: mime,
      midiaToken,
      publicacaoStatus: "PRONTA",
      publicacaoErro: null,
    },
  })

  return NextResponse.json({
    postId: updated.id,
    midiaPath,
    midiaMime: mime,
    publicacaoStatus: updated.publicacaoStatus,
    mediaUrl: buildMediaUrl(updated.id, midiaToken),
  })
}
