import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const varSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  valorPadrao: z.string().optional().nullable(),
})

const templateSchema = z.object({
  titulo: z.string().min(1, "Título obrigatório"),
  categoria: z.enum(["ROTEIRO", "COPY", "HOOK", "ESTRATEGIA", "CALENDARIO"]),
  nicho: z.string().optional().nullable(),
  plataforma: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE", "FANVUE", "FACEBOOK"]).optional().nullable(),
  pilar: z.enum(["IDENTIDADE", "LIFESTYLE", "SENSUALIDADE", "BASTIDORES"]).optional().nullable(),
  conteudo: z.string().min(1, "Conteúdo obrigatório"),
  tags: z.array(z.string()).default([]),
  variaveis: z.array(varSchema).default([]),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get("categoria")
  const plataforma = searchParams.get("plataforma")

  const templates = await db.templateConteudo.findMany({
    where: {
      ...(categoria ? { categoria: categoria as any } : {}),
      ...(plataforma ? { plataforma: plataforma as any } : {}),
    },
    include: { variaveis: true, _count: { select: { exemplos: true } } },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { variaveis, ...d } = templateSchema.parse(await req.json())
    const created = await db.templateConteudo.create({
      data: {
        titulo: d.titulo, categoria: d.categoria, nicho: d.nicho || null,
        plataforma: d.plataforma || null, pilar: d.pilar || null,
        conteudo: d.conteudo, tags: d.tags,
        variaveis: variaveis.length ? { create: variaveis.map((v) => ({ nome: v.nome, descricao: v.descricao || null, valorPadrao: v.valorPadrao || null })) } : undefined,
      },
      include: { variaveis: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
