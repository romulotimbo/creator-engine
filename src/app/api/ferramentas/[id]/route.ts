import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

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
  tags: z.array(z.string()).optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const d = updateSchema.parse(await req.json())
    const patch: any = { ...d }
    if (d.dataRenovacao !== undefined) patch.dataRenovacao = d.dataRenovacao ? new Date(d.dataRenovacao) : null
    const ferramenta = await db.ferramenta.update({ where: { id }, data: patch })
    return NextResponse.json(ferramenta)
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.ferramenta.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
