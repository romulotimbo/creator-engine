import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  personaUsada: z.string().optional().nullable(),
  passosConcluidos: z.array(z.string()).default([]),
  concluida: z.boolean().default(false),
})

// Registra uma execução do SOP (modo guiado) com os passos marcados (RF-CE03)
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const d = schema.parse(await req.json())
    const execucao = await db.execucaoSop.create({
      data: {
        sopId: id,
        personaUsada: d.personaUsada || null,
        passosConcluidos: d.passosConcluidos,
        status: d.concluida ? "concluida" : "em_andamento",
        concluidaEm: d.concluida ? new Date() : null,
      },
    })
    return NextResponse.json(execucao, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors[0]?.message || "Dados inválidos" }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
