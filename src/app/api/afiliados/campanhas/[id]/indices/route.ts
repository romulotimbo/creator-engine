import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  indiceCreateSchema,
  isUniqueViolation,
  normalizarIdentidade,
  resolverMetricasLinha,
  serializeIndice,
} from "@/lib/afiliados/indices"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campanhaId } = await params
  const campanha = await db.campanha.findUnique({ where: { id: campanhaId }, select: { id: true } })
  if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

  const indices = await db.indiceCampanha.findMany({
    where: { campanhaId },
    include: { linhas: true },
    orderBy: [{ tipo: "asc" }, { chave: "asc" }],
  })

  return NextResponse.json(indices.map(serializeIndice))
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: campanhaId } = await params
  try {
    const campanha = await db.campanha.findUnique({ where: { id: campanhaId }, select: { id: true } })
    if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })

    const body = indiceCreateSchema.parse(await req.json())
    const identidade = normalizarIdentidade(body)

    const duplicado = await db.indiceCampanha.findUnique({
      where: {
        campanhaId_tipo_chave_correspondenciaKey: {
          campanhaId,
          tipo: identidade.tipo,
          chave: identidade.chave,
          correspondenciaKey: identidade.correspondenciaKey,
        },
      },
    })
    if (duplicado) {
      return NextResponse.json({ error: "Já existe índice com essa chave natural" }, { status: 422 })
    }

    const metricas = resolverMetricasLinha(body, null)
    const created = await db.indiceCampanha.create({
      data: {
        campanhaId,
        tipo: identidade.tipo,
        chave: identidade.chave,
        correspondencia: identidade.correspondencia,
        correspondenciaKey: identidade.correspondenciaKey,
        validadoVisualmente: body.validadoVisualmente ?? false,
        negativado: body.negativado ?? false,
        linhas: {
          create: {
            capturadaEm: body.capturadaEm ?? new Date(),
            origem: body.origem,
            status: body.status,
            ajusteLancePct: body.ajusteLancePct,
            ...metricas,
          },
        },
      },
      include: { linhas: true },
    })

    return NextResponse.json(serializeIndice(created), { status: 201 })
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: "Já existe índice com essa chave natural" }, { status: 422 })
    }
    const err = e as { name?: string; errors?: { message?: string }[]; issues?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || err.issues?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao criar índice" }, { status: 400 })
  }
}
