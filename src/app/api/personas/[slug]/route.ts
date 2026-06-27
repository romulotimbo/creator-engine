import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

type Params = { params: Promise<{ slug: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const persona = await db.persona.findUnique({
    where: { slug },
    include: { contas: true, _count: { select: { posts: true, receitas: true } } },
  })
  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(persona)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const body = await req.json()
  const persona = await db.persona.update({ where: { slug }, data: body })
  return NextResponse.json(persona)
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  await db.persona.delete({ where: { slug } })
  return NextResponse.json({ ok: true })
}
