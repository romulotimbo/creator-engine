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

  const current = await db.persona.findUnique({ where: { slug } })
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (body.dolphinProfileId || body.proxyRef) {
    const dupDolphin = body.dolphinProfileId
      ? await db.persona.findFirst({ where: { dolphinProfileId: body.dolphinProfileId, NOT: { id: current.id } } })
      : null
    if (dupDolphin) return NextResponse.json({ error: `Dolphin profile já usado por @${dupDolphin.slug}` }, { status: 409 })
    const dupProxy = body.proxyRef
      ? await db.persona.findFirst({ where: { proxyRef: body.proxyRef, NOT: { id: current.id } } })
      : null
    if (dupProxy) return NextResponse.json({ error: `Proxy já usado por @${dupProxy.slug}` }, { status: 409 })
  }

  const persona = await db.persona.update({ where: { slug }, data: body })

  if (body.status && body.status !== current.status) {
    await db.personaStatusLog.create({
      data: {
        personaId: persona.id,
        status: body.status,
        motivo: body.motivoStatus ?? null,
      },
    })
  }

  return NextResponse.json(persona)
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  await db.persona.delete({ where: { slug } })
  return NextResponse.json({ ok: true })
}
