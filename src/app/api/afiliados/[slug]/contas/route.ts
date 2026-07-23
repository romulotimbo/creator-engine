import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { contaVinculadaSchema } from "@/lib/afiliados"

type Params = { params: Promise<{ slug: string }> }

async function resolveConta(slug: string) {
  return db.contaTrafego.findUnique({ where: { slug }, select: { id: true } })
}

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const conta = await resolveConta(slug)
  if (!conta) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rows = await db.contaVinculadaTrafego.findMany({
    where: { contaTrafegoId: conta.id },
    orderBy: [{ tipo: "asc" }, { handle: "asc" }],
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { slug } = await params
    const conta = await resolveConta(slug)
    if (!conta) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = contaVinculadaSchema.parse(await req.json())
    const created = await db.contaVinculadaTrafego.create({
      data: {
        contaTrafegoId: conta.id,
        tipo: body.tipo,
        handle: body.handle,
        status: body.status,
        notas: body.notas || null,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    if (err.code === "P2002") return NextResponse.json({ error: "Conta vinculada já existe (tipo+handle)" }, { status: 409 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
