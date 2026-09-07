import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  indiceLinhaCreateSchema,
  resolverMetricasLinha,
  serializeIndice,
  serializeLinha,
  vigenteDeLinhas,
} from "@/lib/afiliados/indices"
import { decimalNum } from "@/lib/afiliados"

type Params = { params: Promise<{ id: string; indiceId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campanhaId, indiceId } = await params
  try {
    const indice = await db.indiceCampanha.findFirst({
      where: { id: indiceId, campanhaId },
      include: { linhas: true },
    })
    if (!indice) return NextResponse.json({ error: "Índice não encontrado" }, { status: 404 })

    const body = indiceLinhaCreateSchema.parse(await req.json())
    const vigente = vigenteDeLinhas(indice.linhas)
    const metricas = resolverMetricasLinha(body, vigente ? {
      cpc: vigente.cpc != null ? decimalNum(vigente.cpc) : null,
      cliques: vigente.cliques,
      impressoes: vigente.impressoes,
      vendasConversao: vigente.vendasConversao != null ? decimalNum(vigente.vendasConversao) : null,
      custoConversao: vigente.custoConversao != null ? decimalNum(vigente.custoConversao) : null,
      roi: vigente.roi != null ? decimalNum(vigente.roi) : null,
    } : null)

    const linha = await db.indiceCampanhaLinha.create({
      data: {
        indiceId,
        capturadaEm: body.capturadaEm ?? new Date(),
        origem: body.origem,
        status: body.status,
        ajusteLancePct: body.ajusteLancePct,
        ...metricas,
      },
    })

    const atualizado = await db.indiceCampanha.findUnique({
      where: { id: indiceId },
      include: { linhas: true },
    })

    return NextResponse.json({
      linha: serializeLinha(linha),
      indice: atualizado ? serializeIndice(atualizado) : null,
    }, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; issues?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || err.issues?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao registrar linha" }, { status: 400 })
  }
}
