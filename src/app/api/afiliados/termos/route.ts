import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { termoSchema } from "@/lib/afiliados/termos"

/** Lista termos por produtoId ou ofertaDecisaoId (query param). */
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const produtoId = url.searchParams.get("produtoId")
  const ofertaDecisaoId = url.searchParams.get("ofertaDecisaoId")
  if (!produtoId && !ofertaDecisaoId) {
    return NextResponse.json({ error: "produtoId ou ofertaDecisaoId obrigatório" }, { status: 422 })
  }

  const termos = await db.termo.findMany({
    where: produtoId ? { produtoId } : { ofertaDecisaoId },
    include: { series: { orderBy: { data: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(termos)
}

/** Termo pertence a OfertaDecisao OU ProdutoAfiliado, nunca aos dois (afiliados-termo-demanda). */
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = termoSchema.parse(await req.json())
    const created = await db.termo.create({
      data: { termo: body.termo, produtoId: body.produtoId || null, ofertaDecisaoId: body.ofertaDecisaoId || null },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao criar termo" }, { status: 400 })
  }
}
