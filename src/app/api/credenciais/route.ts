import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
import { z } from "zod"

const credSchema = z
  .object({
    personaId: z.string().optional().nullable(),
    global: z.boolean().default(false),
    categoria: z.string().min(1, "Categoria obrigatória"),
    chave: z.string().min(1, "Chave obrigatória"),
    valor: z.string().min(1, "Valor obrigatório"), // plaintext recebido por HTTPS; criptografado no servidor
    notas: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.global && !data.personaId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "personaId obrigatório", path: ["personaId"] })
    }
  })

const credSelect = {
  id: true,
  chave: true,
  categoria: true,
  notas: true,
  global: true,
  personaId: true,
  createdAt: true,
} as const

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const personaId = new URL(req.url).searchParams.get("personaId")
  if (!personaId) return NextResponse.json({ error: "personaId obrigatório" }, { status: 422 })

  const credenciais = await db.credencial.findMany({
    where: { personaId },
    select: credSelect,
    orderBy: { categoria: "asc" },
  })

  return NextResponse.json(
    credenciais.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const d = credSchema.parse(await req.json())

    // RN-03: nunca armazenar plaintext — o valor é criptografado aqui (AES-256-GCM)
    const cred = await db.credencial.create({
      data: {
        personaId: d.global ? null : d.personaId || null,
        global: d.global,
        categoria: d.categoria,
        chave: d.chave,
        valorEnc: encrypt(d.valor),
        notas: d.notas || null,
      },
    })
    await db.credencialLog.create({
      data: { credencialId: cred.id, acao: "CRIADA", credencialChave: cred.chave, usuarioEmail: session.user.email },
    })

    // não devolve valorEnc
    const { valorEnc, ...safe } = cred
    return NextResponse.json(safe, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
