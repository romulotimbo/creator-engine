import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  categoria: z.string().min(1).optional(),
  chave: z.string().min(1).optional(),
  valor: z.string().min(1).optional(), // se presente, re-criptografa
  notas: z.string().optional().nullable(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const d = updateSchema.parse(await req.json())
    const patch: any = {}
    if (d.categoria !== undefined) patch.categoria = d.categoria
    if (d.chave !== undefined) patch.chave = d.chave
    if (d.notas !== undefined) patch.notas = d.notas || null
    if (d.valor !== undefined) patch.valorEnc = encrypt(d.valor) // RN-03: re-criptografa, nunca plaintext

    const cred = await db.credencial.update({ where: { id }, data: patch })
    await db.credencialLog.create({
      data: { credencialId: id, acao: "EDITADA", credencialChave: cred.chave, usuarioEmail: session.user.email },
    })
    const { valorEnc, ...safe } = cred
    return NextResponse.json(safe)
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const cred = await db.credencial.findUnique({ where: { id } })
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // registra a exclusão ANTES de apagar (credencialId vira null via SetNull, mas o log fica)
  await db.credencialLog.create({
    data: { credencialId: id, acao: "EXCLUIDA", credencialChave: cred.chave, usuarioEmail: session.user.email },
  })
  await db.credencial.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
