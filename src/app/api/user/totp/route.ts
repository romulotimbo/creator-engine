import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createTotpSecret, getOtpAuthUri, verifyTotp, encryptTotpSecret } from "@/lib/totp"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const secret = createTotpSecret()
  const uri = getOtpAuthUri(user.email, secret)
  return NextResponse.json({ secret, uri, enabled: user.totpEnabled })
}

const enableSchema = z.object({
  secret: z.string(),
  code: z.string().length(6),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { secret, code } = enableSchema.parse(await req.json())
  if (!verifyTotp(secret, code)) {
    return NextResponse.json({ error: "Código TOTP inválido" }, { status: 400 })
  }

  await db.user.update({
    where: { email: session.user.email },
    data: { totpSecret: encryptTotpSecret(secret), totpEnabled: true },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.user.update({
    where: { email: session.user.email },
    data: { totpSecret: null, totpEnabled: false },
  })
  return NextResponse.json({ ok: true })
}
