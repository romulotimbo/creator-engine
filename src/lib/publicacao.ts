/**
 * Publicação Instagram via n8n/Zernio — helpers compartilhados (API + scripts).
 */
import { randomBytes, timingSafeEqual } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"
import type { Plataforma, PublicacaoTipo, TipoPost } from "@prisma/client"
import { getBasePath } from "@/lib/base-path"

export const PUBLISH_TOKEN_HEADER = "X-Publish-Token"

const ZERNIO_BY_PUBLICACAO_TIPO: Record<PublicacaoTipo, string> = {
  STORY: "story",
  REEL: "reels",
  FEED: "feed",
  CARROSSEL: "carousel",
}

const ZERNIO_BY_TIPO_POST: Partial<Record<TipoPost, string>> = {
  STORY: "story",
  REEL: "reels",
  IMAGEM: "feed",
  CARROSSEL: "carousel",
}

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
}

const ALLOWED_MIME = new Set(Object.values(EXT_MIME))

export function getPublicacaoDataDir(): string {
  return process.env.PUBLICACAO_DATA_DIR ?? "/data/publicacao"
}

export function getPostMediaDir(postId: string): string {
  const dir = path.join(getPublicacaoDataDir(), postId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function generateMidiaToken(): string {
  return randomBytes(24).toString("hex")
}

export function mimeFromFilename(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase()
  return EXT_MIME[ext] ?? null
}

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime)
}

export function zernioContentType(input: {
  publicacaoTipo: PublicacaoTipo | null
  tipo: TipoPost
}): string {
  if (input.publicacaoTipo) return ZERNIO_BY_PUBLICACAO_TIPO[input.publicacaoTipo]
  return ZERNIO_BY_TIPO_POST[input.tipo] ?? "feed"
}

export function zernioMediaItemType(mime: string | null | undefined): "image" | "video" {
  if (mime?.startsWith("video/")) return "video"
  return "image"
}

function defaultMediaBaseUrl(): string {
  const configured = process.env.PUBLICACAO_MEDIA_BASE_URL?.replace(/\/$/, "")
  if (configured) return configured

  const base = getBasePath()
  return `${base}/api/publicacao/media`.replace(/^\/\//, "/")
}

/** URL pública HTTPS para o Zernio buscar a mídia. */
export function buildMediaUrl(postId: string, midiaToken: string): string {
  const base = defaultMediaBaseUrl().replace(/\/$/, "")
  const qs = `token=${encodeURIComponent(midiaToken)}`
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return `${base}/${postId}?${qs}`
  }
  return `${base}/${postId}?${qs}`
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function validateMidiaToken(provided: string | null, expected: string | null): boolean {
  if (!provided || !expected) return false
  return safeEqual(provided, expected)
}

export function getPublishToken(): string | undefined {
  return process.env.N8N_PUBLISH_TOKEN
}

/** Retorna NextResponse 401 se o token estiver ausente/incorreto; null se OK. */
export function assertPublishToken(req: Request): NextResponse | null {
  const expected = getPublishToken()
  if (!expected) {
    return NextResponse.json({ error: "N8N_PUBLISH_TOKEN not configured" }, { status: 503 })
  }
  const provided = req.headers.get(PUBLISH_TOKEN_HEADER)
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export function resolveMediaAbsolutePath(relativePath: string): string {
  const dataDir = path.resolve(getPublicacaoDataDir())
  const abs = path.resolve(dataDir, relativePath)
  if (abs !== dataDir && !abs.startsWith(dataDir + path.sep)) {
    throw new Error("midiaPath fora do volume de publicação")
  }
  return abs
}

/** copyFrom: path relativo ao cwd do projeto (ex.: scripts/nano-banana-batch/...). */
export function resolveCopyFromSource(copyFrom: string): string {
  const normalized = copyFrom.replace(/\\/g, "/")
  if (path.isAbsolute(copyFrom)) {
    throw new Error("copyFrom absoluto não permitido")
  }
  if (normalized.includes("..")) {
    throw new Error("copyFrom inválido")
  }

  const dataDir = path.resolve(getPublicacaoDataDir())
  const abs = path.resolve(process.cwd(), copyFrom)
  const allowedRoots = [
    dataDir,
    path.resolve(process.cwd(), "scripts/nano-banana-batch"),
  ]
  const ok = allowedRoots.some((root) => abs === root || abs.startsWith(root + path.sep))
  if (!ok) throw new Error("copyFrom fora dos diretórios permitidos")
  if (!fs.existsSync(abs)) throw new Error("Arquivo copyFrom não encontrado")
  return abs
}

export function relativeMediaPath(postId: string, filename: string): string {
  return path.posix.join(postId, filename)
}

export type FilaItem = {
  postId: string
  ordem: number | null
  titulo: string
  personaSlug: string
  contaHandle: string
  plataforma: Plataforma
  zernioContentType: string
  mediaUrl: string
  dataPublicacao: string
}

export function toFilaItem(post: {
  id: string
  ordem: number | null
  titulo: string
  tipo: TipoPost
  publicacaoTipo: PublicacaoTipo | null
  midiaToken: string | null
  dataPublicacao: Date | null
  persona: { slug: string; status: string }
  conta: { handle: string; plataforma: Plataforma } | null
}): FilaItem | null {
  if (!post.conta || !post.midiaToken || !post.dataPublicacao) return null
  return {
    postId: post.id,
    ordem: post.ordem,
    titulo: post.titulo,
    personaSlug: post.persona.slug,
    contaHandle: post.conta.handle,
    plataforma: post.conta.plataforma,
    zernioContentType: zernioContentType({
      publicacaoTipo: post.publicacaoTipo,
      tipo: post.tipo,
    }),
    mediaUrl: buildMediaUrl(post.id, post.midiaToken),
    dataPublicacao: post.dataPublicacao.toISOString(),
  }
}
