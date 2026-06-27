import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import ExcelJS from "exceljs"

// Mapeamento das colunas da planilha (cabeçalho na linha 3, dados a partir da linha 4)
// A:Nr B:Tipo C:Pilar D:Titulo E:Cenario F:Figurino G:Hook H:Roteiro I:Copy
// J:Musica K:Recursos L:Edicao M:Posicao N:Hashtags O:Obs P:Status Q:DataStatus R:Prompt
const TIPO: Record<string, string> = { imagem: "IMAGEM", reel: "REEL", story: "STORY", ensaio: "ENSAIO", carrossel: "CARROSSEL" }
const STATUS: Record<string, string> = { pendente: "PENDENTE", aprovado: "APROVADO", agendado: "AGENDADO", publicado: "PUBLICADO", rejeitado: "REJEITADO" }

function pilarFrom(s: string): string {
  const t = (s || "").toLowerCase()
  if (t.includes("identidade")) return "IDENTIDADE"
  if (t.includes("lifestyle")) return "LIFESTYLE"
  if (t.includes("sensualidade")) return "SENSUALIDADE"
  if (t.includes("bastidores")) return "BASTIDORES"
  return "IDENTIDADE"
}

function cell(row: ExcelJS.Row, col: number): string {
  const v = row.getCell(col).text
  return (v ?? "").toString().trim()
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  const personaId = form.get("personaId") as string | null
  const replace = form.get("replace") === "true"

  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
  if (!personaId) return NextResponse.json({ error: "personaId obrigatório." }, { status: 400 })

  const persona = await db.persona.findUnique({ where: { id: personaId } })
  if (!persona) return NextResponse.json({ error: "Persona não encontrada." }, { status: 404 })

  try {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())

    const rows: any[] = []
    let ordem = 0
    for (const ws of wb.worksheets) {
      // só abas de conteúdo: têm o cabeçalho 'Nr' na coluna A da linha 3
      if (cell(ws.getRow(3), 1).toLowerCase() !== "nr") continue
      for (let r = 4; r <= ws.rowCount; r++) {
        const row = ws.getRow(r)
        const titulo = cell(row, 4)
        if (!titulo) continue
        const tipo = TIPO[cell(row, 2).toLowerCase()] || "IMAGEM"
        const statusRaw = cell(row, 16).toLowerCase()
        const dataStatusRaw = cell(row, 17)
        rows.push({
          personaId,
          ordem: ++ordem,
          tipo,
          pilar: pilarFrom(cell(row, 3)),
          titulo,
          cenario: cell(row, 5) || null,
          figurino: cell(row, 6) || null,
          hook: cell(row, 7) || null,
          roteiro: cell(row, 8) || null,
          copyLegenda: cell(row, 9) || null,
          musicaSugerida: cell(row, 10) || null,
          recursos: cell(row, 11) || null,
          edicao: cell(row, 12) || null,
          posicaoElementos: cell(row, 13) || null,
          hashtags: cell(row, 14) || null,
          obsProducao: cell(row, 15) || null,
          status: STATUS[statusRaw] || "PENDENTE",
          dataStatus: dataStatusRaw && !isNaN(Date.parse(dataStatusRaw)) ? new Date(dataStatusRaw) : null,
          promptIa: cell(row, 18) || null,
        })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha de roteiro encontrada na planilha." }, { status: 422 })
    }

    let removed = 0
    const result = await db.$transaction(async (tx) => {
      if (replace) {
        const del = await tx.post.deleteMany({ where: { personaId } })
        removed = del.count
      }
      const created = await tx.post.createMany({ data: rows })
      return created.count
    })

    return NextResponse.json({ imported: result, removed, replace })
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao processar a planilha: " + e.message }, { status: 400 })
  }
}
