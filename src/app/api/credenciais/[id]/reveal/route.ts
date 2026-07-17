import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

type Params = { params: Promise<{ id: string }> }

// Revelação auditada — exige sessão Authelia ativa (forward auth no Traefik).
export async function POST(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params

    const cred = await db.credencial.findUnique({ where: { id } })
    if (!cred) {
      const total = await db.credencial.count()
      return NextResponse.json({ error: `Credencial não encontrada (id=${id}, total=${total})` }, { status: 404 })
    }

    let valor: string
    try {
      valor = decrypt(cred.valorEnc)
    } catch {
      return NextResponse.json({ error: "Falha ao descriptografar (chave de criptografia mudou?)." }, { status: 500 })
    }

    await db.credencialLog.create({
      data: { credencialId: id, acao: "REVELADA", credencialChave: cred.chave, usuarioEmail: session.user.email },
    })
    return NextResponse.json({ valor })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
