import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const kpiSchema = z.object({
  metrica: z.string().min(1),
  valorInicio: z.string().optional().nullable(),
  valorMeta: z.string().optional().nullable(),
  valorFinal: z.string().optional().nullable(),
})

const planoSchema = z.object({
  personaId: z.string().min(1),
  semana: z.string().regex(/^\d{4}-W\d{2}$/, "Formato esperado: 2026-W25"),
  objetivo: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  kpis: z.array(kpiSchema).default([]),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const personaId = new URL(req.url).searchParams.get("personaId")
  const planos = await db.planoSemanal.findMany({
    where: personaId ? { personaId } : {},
    include: { kpis: true },
    orderBy: { semana: "desc" },
  })
  return NextResponse.json(planos)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { kpis, ...plano } = planoSchema.parse(await req.json())
    const created = await db.planoSemanal.create({
      data: { ...plano, kpis: kpis.length ? { create: kpis } : undefined },
      include: { kpis: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Já existe um plano para esta semana." }, { status: 409 })
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
