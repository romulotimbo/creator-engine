import { NextResponse } from "next/server"
import fs from "node:fs"
import { db } from "@/lib/db"
import {
  resolveMediaAbsolutePath,
  validateMidiaToken,
} from "@/lib/publicacao"

type Params = { params: Promise<{ postId: string }> }

export async function GET(req: Request, { params }: Params) {
  const { postId } = await params
  const token = new URL(req.url).searchParams.get("token")

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { midiaPath: true, midiaMime: true, midiaToken: true },
  })

  if (!post?.midiaPath || !post.midiaToken || !validateMidiaToken(token, post.midiaToken)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let abs: string
  try {
    abs = resolveMediaAbsolutePath(post.midiaPath)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data = fs.readFileSync(abs)
  const mime = post.midiaMime ?? "application/octet-stream"

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(data.length),
    },
  })
}
