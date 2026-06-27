import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const receitaSchema = z.object({
  personaId: z.string().min(1, "Persona obrigatória"),
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  canal: z.string().min(1, "Canal obrigatório"),
  descricao: z.string().optional().nullable(),
  data: z.string().min(1, "Data obrigatória"),
})

const custoSchema = z.object({
  personaId: z.string().optional().nullable(),
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  ferramenta: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  data: z.string().min(1, "Data obrigatória"),
  global: z.boolean().default(false),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [receitas, custos] = await Promise.all([
    db.receita.findMany({ include: { persona: { select: { slug: true } } }, orderBy: { data: "desc" } }),
    db.custo.findMany({ include: { persona: { select: { slug: true } } }, orderBy: { data: "desc" } }),
  ])

  const receitaTotal = receitas.reduce((s, r) => s + Number(r.valor), 0)
  const custoTotal = custos.reduce((s, c) => s + Number(c.valor), 0)

  return NextResponse.json({ receitas, custos, receitaTotal, custoTotal, lucro: receitaTotal - custoTotal })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { tipo, ...body } = await req.json()

    if (tipo === "receita") {
      const d = receitaSchema.parse(body)
      const receita = await db.receita.create({
        data: { personaId: d.personaId, valor: d.valor, canal: d.canal, descricao: d.descricao || null, data: new Date(d.data) },
      })
      return NextResponse.json(receita, { status: 201 })
    }
    if (tipo === "custo") {
      const d = custoSchema.parse(body)
      const custo = await db.custo.create({
        data: {
          personaId: d.global ? null : d.personaId || null,
          valor: d.valor, categoria: d.categoria, ferramenta: d.ferramenta || null,
          descricao: d.descricao || null, data: new Date(d.data), global: d.global,
        },
      })
      return NextResponse.json(custo, { status: 201 })
    }
    return NextResponse.json({ error: "tipo deve ser receita ou custo" }, { status: 400 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
