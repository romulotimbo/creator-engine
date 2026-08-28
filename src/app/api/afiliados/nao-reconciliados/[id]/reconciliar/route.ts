import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { linhaCampanhaDiarioSchema, linhaSegmentoSchema } from "@/lib/afiliados/ingestao"
import { upsertCampanhaDiarioLinha, upsertSegmentoLinha } from "@/lib/afiliados/ingestao-processar"

type Params = { params: Promise<{ id: string }> }

const bodySchema = z.object({ campanhaId: z.string().min(1) })

/** Vincula manualmente uma linha da bandeja a uma Campanha — processa como se tivesse casado originalmente. */
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const { campanhaId } = bodySchema.parse(await req.json())

    const item = await db.campanhaNaoReconciliada.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    if (item.resolvidoEm) return NextResponse.json({ error: "Já reconciliado" }, { status: 409 })

    const campanha = await db.campanha.findUnique({ where: { id: campanhaId } })
    if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

    if (item.tipo === "CAMPANHA_DIARIO") {
      const linha = linhaCampanhaDiarioSchema.parse(item.linhaBruta)
      await upsertCampanhaDiarioLinha(db, campanhaId, linha)
    } else if (item.tipo === "SEGMENTO") {
      const linha = linhaSegmentoSchema.parse(item.linhaBruta)
      await upsertSegmentoLinha(db, campanhaId, linha)
    } else {
      return NextResponse.json({ error: `Reconciliação manual não suportada para ${item.tipo}` }, { status: 422 })
    }

    const updated = await db.campanhaNaoReconciliada.update({
      where: { id },
      data: { resolvidoEm: new Date(), resolvidoCampanhaId: campanhaId },
    })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao reconciliar" }, { status: 400 })
  }
}
