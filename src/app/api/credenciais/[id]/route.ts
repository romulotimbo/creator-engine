import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
import { credSelect, credUpdateSchema, serializeCredencial } from "@/lib/credenciais"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const existing = await db.credencial.findUnique({ where: { id } })
    if (!existing) {
      const total = await db.credencial.count()
      return NextResponse.json({ error: `Credencial não encontrada (id=${id}, total=${total})` }, { status: 404 })
    }

    const d = credUpdateSchema.parse(await req.json())
    const patch: Record<string, unknown> = {}
    if (d.categoria !== undefined) patch.categoria = d.categoria
    if (d.chave !== undefined) patch.chave = d.chave
    if (d.notas !== undefined) patch.notas = d.notas || null
    if (d.valor !== undefined) patch.valorEnc = encrypt(d.valor)

    if (d.ferramentaId !== undefined || d.servico !== undefined) {
      if (!existing.global) {
        return NextResponse.json({ error: "ferramentaId/servico só em credenciais globais" }, { status: 422 })
      }
      if (d.ferramentaId !== undefined) {
        let fid = d.ferramentaId || null
        if (fid) {
          const existe = await db.ferramenta.findUnique({ where: { id: fid }, select: { id: true } })
          if (!existe) fid = null
        }
        patch.ferramentaId = fid
      }
      if (d.servico !== undefined) patch.servico = d.servico?.trim() || null
    }

    const cred = await db.credencial.update({
      where: { id },
      data: patch,
      select: credSelect,
    })
    await db.credencialLog.create({
      data: { credencialId: id, acao: "EDITADA", credencialChave: cred.chave, usuarioEmail: session.user.email },
    })
    return NextResponse.json(serializeCredencial(cred))
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro" }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const cred = await db.credencial.findUnique({ where: { id } })
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.credencialLog.create({
    data: { credencialId: id, acao: "EXCLUIDA", credencialChave: cred.chave, usuarioEmail: session.user.email },
  })
  await db.credencial.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
