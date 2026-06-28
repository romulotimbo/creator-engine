import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { Prisma } from "@prisma/client"

type Params = { params: Promise<{ slug: string }> }

const funilSchema = z.object({
  urlLandingPage: z.string().optional().nullable(),
  statusDeploy: z.enum(["planejada", "em_construcao", "no_ar", "offline"]).default("planejada"),
  linkAfiliado: z.string().optional().nullable(),
  plataformaAfil: z.string().optional().nullable(),
  precoBaixo: z.coerce.number().optional().nullable(),
  precoAlto: z.coerce.number().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  checklistItems: z.array(z.object({
    bloco: z.string(),
    descricao: z.string(),
    ordem: z.number().int().default(0),
  })).optional(),
})

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const funil = await db.funilMonetizacao.findUnique({
    where: { personaId: persona.id },
    include: { checklistItems: { orderBy: { ordem: "asc" } } },
  })
  return NextResponse.json(funil)
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await db.funilMonetizacao.findUnique({ where: { personaId: persona.id } })
  if (existing) return NextResponse.json({ error: "Funil já existe. Use PUT." }, { status: 409 })

  try {
    const body = funilSchema.parse(await req.json())
    const { checklistItems, precoBaixo, precoAlto, ...rest } = body

    const funil = await db.funilMonetizacao.create({
      data: {
        personaId: persona.id,
        ...rest,
        precoBaixo: precoBaixo != null ? new Prisma.Decimal(precoBaixo) : null,
        precoAlto: precoAlto != null ? new Prisma.Decimal(precoAlto) : null,
        checklistItems: checklistItems?.length
          ? { create: checklistItems }
          : {
              create: [
                { bloco: "A1", descricao: "Definir landing page e copy", ordem: 1 },
                { bloco: "B1", descricao: "Configurar link afiliado Braip", ordem: 2 },
                { bloco: "B2", descricao: "Lançamento FanVue (exige disclosure IA)", ordem: 3 },
              ],
            },
      },
      include: { checklistItems: { orderBy: { ordem: "asc" } } },
    })
    return NextResponse.json(funil, { status: 201 })
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const body = funilSchema.parse(await req.json())
    const { checklistItems, precoBaixo, precoAlto, ...rest } = body

    const funil = await db.funilMonetizacao.upsert({
      where: { personaId: persona.id },
      create: {
        personaId: persona.id,
        ...rest,
        precoBaixo: precoBaixo != null ? new Prisma.Decimal(precoBaixo) : null,
        precoAlto: precoAlto != null ? new Prisma.Decimal(precoAlto) : null,
      },
      update: {
        ...rest,
        precoBaixo: precoBaixo != null ? new Prisma.Decimal(precoBaixo) : null,
        precoAlto: precoAlto != null ? new Prisma.Decimal(precoAlto) : null,
      },
      include: { checklistItems: { orderBy: { ordem: "asc" } } },
    })
    return NextResponse.json(funil)
  } catch (e: any) {
    if (e.name === "ZodError") return NextResponse.json({ error: e.errors }, { status: 422 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
