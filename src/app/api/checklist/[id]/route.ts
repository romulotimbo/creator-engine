import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  concluido: z.boolean(),
})

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { concluido } = patchSchema.parse(await req.json())

  const item = await db.checklistItem.findUnique({
    where: { id },
    include: { funil: true },
  })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // RN-05: Bloco B2 (FanVue) exige disclosure_ia
  if (concluido && item.bloco.toUpperCase().startsWith("B2")) {
    const persona = await db.persona.findUnique({ where: { id: item.funil.personaId } })
    if (persona && !persona.disclosureIa) {
      return NextResponse.json(
        { error: "Bloco B2 (FanVue) só pode ser concluído com disclosure de IA ativo (RN-05)." },
        { status: 400 },
      )
    }
  }

  const updated = await db.checklistItem.update({
    where: { id },
    data: {
      concluido,
      dataConcl: concluido ? new Date() : null,
    },
  })
  return NextResponse.json(updated)
}
