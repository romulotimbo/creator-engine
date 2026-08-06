import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { termsVersionCreateSchema } from "@/lib/afiliados"
import { recordTermsVerification } from "@/lib/afiliados/terms"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const versions = await db.termsVersion.findMany({
    where: { ofertaId: id },
    orderBy: { verifiedAt: "desc" },
  })

  return NextResponse.json(versions)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const existing = await db.ofertaDecisao.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 })

    const body = termsVersionCreateSchema.parse(await req.json())

    const result = await db.$transaction((tx) =>
      recordTermsVerification(tx, id, {
        ...body,
        capturedBy: body.capturedBy ?? session.user?.email ?? null,
      }),
    )

    return NextResponse.json(result, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao registrar verificação de termos" }, { status: 400 })
  }
}
