import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const passoSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  ferramenta: z.string().optional().nullable(),
})

const sopSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório"),
  categoria: z.enum(["ONBOARDING", "ANTI_BAN", "ESCALADA", "PRODUCAO", "GERACAO_IMAGEM", "MONETIZACAO"]),
  versao: z.string().min(1).default("1.0.0"),
  status: z.enum(["RASCUNHO", "ATIVO", "DEPRECIADO"]).default("RASCUNHO"),
  descricao: z.string().optional().nullable(),
  passos: z.array(passoSchema).default([]),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categoria = new URL(req.url).searchParams.get("categoria")
  const sops = await db.sop.findMany({
    where: categoria ? { categoria: categoria as any } : {},
    include: {
      passos: { orderBy: { ordem: "asc" } },
      historico: { orderBy: { data: "desc" } },
      _count: { select: { execucoes: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(sops)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { passos, ...d } = sopSchema.parse(await req.json())
    const created = await db.sop.create({
      data: {
        titulo: d.titulo, categoria: d.categoria, versao: d.versao, status: d.status,
        descricao: d.descricao || null,
        passos: passos.length ? { create: passos.map((p, i) => ({ ordem: i, titulo: p.titulo, descricao: p.descricao || null, ferramenta: p.ferramenta || null })) } : undefined,
        historico: { create: { versao: d.versao, mudanca: "Criação do SOP" } },
      },
      include: { passos: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
