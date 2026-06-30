import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { decryptTotpSecret, verifyTotp } from "@/lib/totp"
import bcrypt from "bcryptjs"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  senhaMestra: z.string().min(1, "Senha mestra obrigatória"),
  totpCode: z.string().optional(),
})

// RN-03: revelar uma credencial exige autenticação dupla — sessão ativa +
// re-digitar a senha da conta (senha mestra). Toda revelação é auditada.
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { senhaMestra, totpCode } = schema.parse(await req.json())

    const user = await db.user.findUnique({ where: { email: session.user.email } })
    if (!user?.password) return NextResponse.json({ error: "Usuário inválido" }, { status: 401 })

    const ok = await bcrypt.compare(senhaMestra, user.password)
    if (!ok) {
      // registra tentativa falha de revelação
      const credFail = await db.credencial.findUnique({ where: { id }, select: { chave: true } })
      await db.credencialLog.create({
        data: { credencialId: id, acao: "REVELACAO_NEGADA", credencialChave: credFail?.chave ?? "?", usuarioEmail: session.user.email },
      })
      return NextResponse.json({ error: "Senha mestra incorreta." }, { status: 403 })
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode || !verifyTotp(decryptTotpSecret(user.totpSecret), totpCode)) {
        const credFail = await db.credencial.findUnique({ where: { id }, select: { chave: true } })
        await db.credencialLog.create({
          data: { credencialId: id, acao: "REVELACAO_NEGADA", credencialChave: credFail?.chave ?? "?", usuarioEmail: session.user.email },
        })
        return NextResponse.json({ error: "Código TOTP inválido ou ausente." }, { status: 403 })
      }
    }

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
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
