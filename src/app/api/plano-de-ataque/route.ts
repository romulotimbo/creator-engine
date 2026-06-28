import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const DEFAULT_ITENS = [
  { fase: "Fase 0 — Setup", ordem: 1, titulo: "Banco de dev local", descricao: "docker-compose.dev.yml + schemas" },
  { fase: "Fase 0 — Setup", ordem: 2, titulo: "Variáveis de ambiente", descricao: "DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY" },
  { fase: "Fase 0 — Setup", ordem: 3, titulo: "Renomear PersonaForge → Creator Engine", descricao: "layout, sidebar, package.json" },
  { fase: "Fase 0 — Setup", ordem: 4, titulo: "Plano de ataque na app", descricao: "Página /plano-de-ataque operacional" },
  { fase: "Fase 1 — PersonaForge", ordem: 10, titulo: "Formulário persona com contas", descricao: "PF-01 — transação única" },
  { fase: "Fase 1 — PersonaForge", ordem: 11, titulo: "Modal CRUD de posts", descricao: "PF-04 — todos os campos" },
  { fase: "Fase 1 — PersonaForge", ordem: 12, titulo: "Importação XLSX roteiros", descricao: "519+ posts veesemfiltro" },
  { fase: "Fase 1 — PersonaForge", ordem: 13, titulo: "Calendário interativo", descricao: "PF-03 — drag-drop" },
  { fase: "Fase 1 — PersonaForge", ordem: 14, titulo: "Funil interativo", descricao: "PF-05 — CRUD + checklist" },
  { fase: "Fase 1 — PersonaForge", ordem: 15, titulo: "Discovery CRUD + kanban", descricao: "PF-08" },
  { fase: "Fase 1 — PersonaForge", ordem: 16, titulo: "Imagens IA + FluxoImagem", descricao: "PF-07" },
  { fase: "Fase 2 — Creator Engine", ordem: 20, titulo: "Ferramentas + assinaturas", descricao: "CE-01" },
  { fase: "Fase 2 — Creator Engine", ordem: 21, titulo: "Templates de conteúdo", descricao: "CE-02" },
  { fase: "Fase 2 — Creator Engine", ordem: 22, titulo: "SOPs com execução guiada", descricao: "CE-03" },
  { fase: "Fase 2 — Creator Engine", ordem: 23, titulo: "Prompts globais", descricao: "CE-04 — import dos roteiros" },
  { fase: "Fase 2 — Creator Engine", ordem: 24, titulo: "Analytics cross-persona", descricao: "CE-05 — heatmap + exports" },
  { fase: "Segurança", ordem: 30, titulo: "MFA/TOTP", descricao: "RNF-01 — login e reveal credenciais" },
  { fase: "Segurança", ordem: 31, titulo: "Rate limiting APIs", descricao: "100 req/min por IP" },
]

async function ensureSeed() {
  const count = await db.planoAtaqueItem.count()
  if (count === 0) {
    await db.planoAtaqueItem.createMany({ data: DEFAULT_ITENS })
  }
}

const createSchema = z.object({
  fase: z.string().min(1),
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  ordem: z.coerce.number().int().optional(),
})

async function nextOrdem(fase: string) {
  const max = await db.planoAtaqueItem.aggregate({
    where: { fase },
    _max: { ordem: true },
  })
  return (max._max.ordem ?? 0) + 1
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await ensureSeed()
  const itens = await db.planoAtaqueItem.findMany({ orderBy: [{ fase: "asc" }, { ordem: "asc" }] })
  return NextResponse.json(itens)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = createSchema.parse(await req.json())
    const ordem = body.ordem ?? await nextOrdem(body.fase)

    const item = await db.planoAtaqueItem.create({
      data: {
        fase: body.fase,
        titulo: body.titulo,
        descricao: body.descricao ?? null,
        ordem,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: unknown; message?: string }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: err.message ?? "Erro ao criar item" }, { status: 400 })
  }
}
