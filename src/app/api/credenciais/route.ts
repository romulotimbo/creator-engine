import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
import { credCreateSchema, credSelect, CATEGORIAS_PERSONA, globalCredenciaisWhere, serializeCredencial } from "@/lib/credenciais"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = req.nextUrl.searchParams
  const globalParam = params.get("global")
  const personaId = params.get("personaId")
  const ferramentaId = params.get("ferramentaId")
  const slug = params.get("slug")

  let resolvedPersonaId = personaId
  if (!resolvedPersonaId && slug) {
    const persona = await db.persona.findUnique({ where: { slug }, select: { id: true } })
    resolvedPersonaId = persona?.id ?? null
  }

  const isGlobal = globalParam === "true"

  if (isGlobal && resolvedPersonaId) {
    return NextResponse.json({ error: "Use global=true ou personaId, não ambos" }, { status: 422 })
  }
  if (!isGlobal && !resolvedPersonaId) {
    return NextResponse.json({ error: "personaId, slug ou global=true obrigatório" }, { status: 422 })
  }

  if (resolvedPersonaId && (await db.persona.count()) === 1) {
    await db.credencial.updateMany({
      where: {
        personaId: null,
        global: false,
        categoria: { in: [...CATEGORIAS_PERSONA] },
      },
      data: { personaId: resolvedPersonaId },
    })
  }

  const where = isGlobal
    ? {
        ...globalCredenciaisWhere,
        ...(ferramentaId ? { ferramentaId } : {}),
      }
    : {
        personaId: resolvedPersonaId!,
        global: false,
      }

  const credenciais = await db.credencial.findMany({
    where,
    select: credSelect,
    orderBy: { categoria: "asc" },
  })

  return NextResponse.json(
    credenciais.map(serializeCredencial),
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const d = credCreateSchema.parse(await req.json())

    // Validar ferramentaId — ignorar se não existe (evita FK constraint failure)
    let resolvedFerramentaId: string | null = d.global ? d.ferramentaId || null : null
    if (resolvedFerramentaId) {
      const existe = await db.ferramenta.findUnique({ where: { id: resolvedFerramentaId }, select: { id: true } })
      if (!existe) resolvedFerramentaId = null
    }

    const cred = await db.credencial.create({
      data: {
        personaId: d.global ? null : d.personaId || null,
        ferramentaId: resolvedFerramentaId,
        servico: d.global ? d.servico?.trim() || null : null,
        global: d.global,
        categoria: d.categoria,
        chave: d.chave,
        valorEnc: encrypt(d.valor),
        notas: d.notas || null,
      },
      select: credSelect,
    })
    await db.credencialLog.create({
      data: { credencialId: cred.id, acao: "CRIADA", credencialChave: cred.chave, usuarioEmail: session.user.email },
    })

    return NextResponse.json(serializeCredencial(cred), { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}
