import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { serializeFerramenta } from "@/lib/ferramentas"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const ferramentaSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  categoria: z.enum(["GERACAO_IMAGEM", "ANTI_DETECCAO", "PROXY", "VOZ", "VIDEO", "PRODUTIVIDADE", "PLATAFORMA"]),
  urlAcesso: z.string().optional().nullable(),
  versaoAtual: z.string().optional().nullable(),
  statusAssinatura: z.enum(["ATIVA", "PAUSADA", "TRIAL", "CANCELADA"]).default("ATIVA"),
  custoMensal: z.coerce.number().min(0).optional().nullable(),
  dataRenovacao: z.string().optional().nullable(),
  responsavelConta: z.string().optional().nullable(),
  documentacao: z.string().optional().nullable(),
  configuracaoPadrao: z.record(z.unknown()).optional().nullable(),
  tags: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ferramentas = await db.ferramenta.findMany({ orderBy: { nome: "asc" } })
  return NextResponse.json(ferramentas.map(serializeFerramenta))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const d = ferramentaSchema.parse(await req.json())
    const ferramenta = await db.ferramenta.create({
      data: {
        nome: d.nome, categoria: d.categoria, urlAcesso: d.urlAcesso || null,
        versaoAtual: d.versaoAtual || null, statusAssinatura: d.statusAssinatura,
        custoMensal: d.custoMensal ?? null,
        dataRenovacao: d.dataRenovacao ? new Date(d.dataRenovacao) : null,
        responsavelConta: d.responsavelConta || null, documentacao: d.documentacao || null,
        configuracaoPadrao: d.configuracaoPadrao != null ? (d.configuracaoPadrao as Prisma.InputJsonValue) : undefined,
        tags: d.tags,
      },
    })
    return NextResponse.json(serializeFerramenta(ferramenta), { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
