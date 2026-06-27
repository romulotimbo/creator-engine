import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const contaSchema = z.object({
  plataforma: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE", "FANVUE", "FACEBOOK"]),
  handle: z.string().min(1, "Handle obrigatório"),
  seguidoresAtual: z.coerce.number().int().min(0).default(0),
  metaSeguidores: z.coerce.number().int().min(0).optional(),
  statusConta: z.enum(["ATIVA", "SHADOW_BAN", "BANIDA", "PAUSADA"]).default("ATIVA"),
})

const personaSchema = z.object({
  slug: z.string().min(2).max(50),
  nomeArtistico: z.string().min(1),
  status: z.enum(["ATIVA", "TESTE", "SHADOW_BAN", "SUSPENSA", "BANIDA"]).default("TESTE"),
  nicho: z.string().min(1),
  aparencia: z.string().optional(),
  personalidade: z.string().optional(),
  backstory: z.string().optional(),
  incongruenciaCentral: z.string().optional(),
  disclosureIa: z.boolean().default(false),
  disclosureTexto: z.string().optional(),
  dolphinProfileId: z.string().optional(),
  proxyRef: z.string().optional(),
  contas: z.array(contaSchema).default([]),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const personas = await db.persona.findMany({
    include: { contas: true, _count: { select: { posts: true } } },
    orderBy: { dataCriacao: "desc" },
  })
  return NextResponse.json(personas)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { contas, ...persona } = personaSchema.parse(body)

    // RN-02: contas FanVue exigem disclosure de IA explícito
    const temFanvue = contas.some((c) => c.plataforma === "FANVUE")
    if (temFanvue && !persona.disclosureIa) {
      return NextResponse.json(
        { error: "Conta FanVue exige disclosure de IA ativo (RN-02)." },
        { status: 400 },
      )
    }

    // Contas duplicadas por plataforma violam @@unique([personaId, plataforma])
    const plataformas = contas.map((c) => c.plataforma)
    if (new Set(plataformas).size !== plataformas.length) {
      return NextResponse.json(
        { error: "Há mais de uma conta para a mesma plataforma." },
        { status: 400 },
      )
    }

    // Persona + contas em uma única operação atômica (nested create)
    const created = await db.persona.create({
      data: {
        ...persona,
        contas: contas.length ? { create: contas } : undefined,
      },
      include: { contas: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slug já existe" }, { status: 409 })
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
