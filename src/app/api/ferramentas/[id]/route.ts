import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { serializeFerramenta } from "@/lib/ferramentas"
import { z } from "zod"
import { Prisma } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  categoria: z.enum(["GERACAO_IMAGEM", "ANTI_DETECCAO", "PROXY", "VOZ", "VIDEO", "PRODUTIVIDADE", "PLATAFORMA"]).optional(),
  urlAcesso: z.string().optional().nullable(),
  versaoAtual: z.string().optional().nullable(),
  statusAssinatura: z.enum(["ATIVA", "PAUSADA", "TRIAL", "CANCELADA"]).optional(),
  custoMensal: z.coerce.number().min(0).optional().nullable(),
  dataRenovacao: z.string().optional().nullable(),
  responsavelConta: z.string().optional().nullable(),
  documentacao: z.string().optional().nullable(),
  configuracaoPadrao: z.record(z.unknown()).optional().nullable(),
  tags: z.array(z.string()).optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const d = updateSchema.parse(await req.json())
    const patch: Prisma.FerramentaUpdateInput = {}
    if (d.nome !== undefined) patch.nome = d.nome
    if (d.categoria !== undefined) patch.categoria = d.categoria
    if (d.urlAcesso !== undefined) patch.urlAcesso = d.urlAcesso || null
    if (d.versaoAtual !== undefined) patch.versaoAtual = d.versaoAtual || null
    if (d.statusAssinatura !== undefined) patch.statusAssinatura = d.statusAssinatura
    if (d.custoMensal !== undefined) patch.custoMensal = d.custoMensal
    if (d.dataRenovacao !== undefined) patch.dataRenovacao = d.dataRenovacao ? new Date(d.dataRenovacao) : null
    if (d.responsavelConta !== undefined) patch.responsavelConta = d.responsavelConta || null
    if (d.documentacao !== undefined) patch.documentacao = d.documentacao || null
    if (d.configuracaoPadrao !== undefined) {
      patch.configuracaoPadrao = d.configuracaoPadrao != null ? (d.configuracaoPadrao as Prisma.InputJsonValue) : Prisma.JsonNull
    }
    if (d.tags !== undefined) patch.tags = d.tags

    const ferramenta = await db.ferramenta.update({ where: { id }, data: patch })
    return NextResponse.json(serializeFerramenta(ferramenta))
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.ferramenta.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
