import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const bodySchema = z.object({
  postId: z.string(),
})

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { postId } = bodySchema.parse(await req.json())

  const prompt = await db.promptGlobal.findUnique({ where: { id } })
  if (!prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 })

  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })

  const updated = await db.post.update({
    where: { id: postId },
    data: { promptIa: prompt.prompt },
  })

  await db.promptGlobal.update({
    where: { id },
    data: { usos: { increment: 1 } },
  })

  return NextResponse.json(updated)
}
