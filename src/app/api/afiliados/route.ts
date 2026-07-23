import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { contaTrafegoCreateSchema, decimalNum } from "@/lib/afiliados"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contas = await db.contaTrafego.findMany({
    include: {
      _count: { select: { contasVinculadas: true, produtos: true, vendas: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(
    contas.map((c) => ({
      ...c,
      metaGasto: c.metaGasto != null ? decimalNum(c.metaGasto) : null,
      metaRoas: c.metaRoas != null ? decimalNum(c.metaRoas) : null,
    })),
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = contaTrafegoCreateSchema.parse(await req.json())
    const dup = await db.contaTrafego.findUnique({ where: { slug: body.slug } })
    if (dup) return NextResponse.json({ error: "Slug já em uso" }, { status: 409 })

    const created = await db.contaTrafego.create({
      data: {
        slug: body.slug,
        nome: body.nome,
        plataforma: body.plataforma,
        status: body.status,
        observacoes: body.observacoes || null,
        metaGasto: body.metaGasto ?? null,
        metaRoas: body.metaRoas ?? null,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
