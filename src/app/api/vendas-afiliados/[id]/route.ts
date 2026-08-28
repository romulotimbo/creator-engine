import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { vendaUpdateSchema, decimalNum } from "@/lib/afiliados"
import { resolveCampanhaId } from "@/lib/afiliados/venda-campanha"
import { recomputeCampanhaRollups } from "@/lib/afiliados/rollups"
import { avaliarRegrasCampanha } from "@/lib/afiliados/regras"

type Params = { params: Promise<{ id: string }> }

function serialize(v: {
  valorVenda: { toString(): string }
  valorComissao: { toString(): string }
  data: Date
  createdAt: Date
  updatedAt: Date
  [k: string]: unknown
}) {
  return {
    ...v,
    valorVenda: decimalNum(v.valorVenda),
    valorComissao: decimalNum(v.valorComissao),
    data: v.data.toISOString(),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const existing = await db.vendaAfiliado.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = vendaUpdateSchema.parse(await req.json())

    if (body.produtoId) {
      const vinculo = await db.contaTrafegoProduto.findFirst({
        where: { contaTrafegoId: existing.contaTrafegoId, produtoId: body.produtoId },
      })
      if (!vinculo) {
        return NextResponse.json({ error: "Produto não vinculado a esta ContaTrafego" }, { status: 422 })
      }
    }

    let novoCampanhaId = existing.campanhaId
    if (body.campanhaId !== undefined) {
      novoCampanhaId = await resolveCampanhaId(db, {
        campanhaId: body.campanhaId,
        valorIdentificador: body.valorIdentificador ?? existing.valorIdentificador,
      })
    } else if (body.valorIdentificador !== undefined && !existing.campanhaId) {
      novoCampanhaId = await resolveCampanhaId(db, { valorIdentificador: body.valorIdentificador })
    }

    const updated = await db.vendaAfiliado.update({
      where: { id },
      data: {
        ...(body.produtoId !== undefined ? { produtoId: body.produtoId || null } : {}),
        ...(novoCampanhaId !== existing.campanhaId ? { campanhaId: novoCampanhaId } : {}),
        ...(body.data !== undefined ? { data: body.data } : {}),
        ...(body.valorVenda !== undefined ? { valorVenda: body.valorVenda } : {}),
        ...(body.valorComissao !== undefined ? { valorComissao: body.valorComissao } : {}),
        ...(body.plataformaAfil !== undefined ? { plataformaAfil: body.plataformaAfil } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.externalId !== undefined ? { externalId: body.externalId || null } : {}),
        ...(body.tipoIdentificador !== undefined ? { tipoIdentificador: body.tipoIdentificador || null } : {}),
        ...(body.valorIdentificador !== undefined ? { valorIdentificador: body.valorIdentificador || null } : {}),
        ...(body.orderId !== undefined ? { orderId: body.orderId || null } : {}),
        ...(body.observacoes !== undefined ? { observacoes: body.observacoes || null } : {}),
      },
      include: { produto: { select: { id: true, nome: true, slug: true } } },
    })

    // Recomputa rollup da(s) campanha(s) afetada(s) — criação/mudança de status/mudança de campanhaId.
    const campanhasAfetadas = new Set([existing.campanhaId, updated.campanhaId].filter(Boolean) as string[])
    for (const campanhaId of campanhasAfetadas) {
      await recomputeCampanhaRollups(db, campanhaId)
      await avaliarRegrasCampanha(db, campanhaId)
    }

    return NextResponse.json(serialize(updated))
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    if (err.code === "P2002") return NextResponse.json({ error: "externalId já existe para esta plataforma" }, { status: 409 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.vendaAfiliado.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.vendaAfiliado.delete({ where: { id } })
  if (existing.campanhaId) {
    await recomputeCampanhaRollups(db, existing.campanhaId)
    await avaliarRegrasCampanha(db, existing.campanhaId)
  }
  return NextResponse.json({ ok: true })
}
