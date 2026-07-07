import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import ExcelJS from "exceljs"

const TIPO_REV: Record<string, string> = { IMAGEM: "imagem", REEL: "reel", STORY: "story", ENSAIO: "ensaio", CARROSSEL: "carrossel" }
const STATUS_REV: Record<string, string> = { PENDENTE: "pendente", APROVADO: "aprovado", AGENDADO: "agendado", PUBLICADO: "publicado", REJEITADO: "rejeitado" }

function pilarLabel(p: string) {
  const m: Record<string, string> = { IDENTIDADE: "Identidade", LIFESTYLE: "Lifestyle", SENSUALIDADE: "Sensualidade", BASTIDORES: "Bastidores" }
  return m[p] ?? p
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get("personaId")
  const status = searchParams.get("status")
  const tipo = searchParams.get("tipo")

  if (!personaId) return NextResponse.json({ error: "personaId obrigatório" }, { status: 400 })

  const posts = await db.post.findMany({
    where: {
      personaId,
      ...(status ? { status: status as any } : {}),
      ...(tipo ? { tipo: tipo as any } : {}),
    },
    orderBy: { ordem: "asc" },
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Roteiros")
  const headers = ["Nr", "Tipo", "Pilar", "Titulo", "Cenario", "Figurino", "Hook", "Roteiro", "Copy", "Musica", "Recursos", "Edicao", "Posicao", "Hashtags", "Obs", "Status", "DataStatus", "Prompt"]
  ws.getRow(3).values = headers

  posts.forEach((p, i) => {
    ws.getRow(4 + i).values = [
      i + 1,
      TIPO_REV[p.tipo] ?? p.tipo,
      pilarLabel(p.pilar),
      p.titulo,
      p.cenario,
      p.figurino,
      p.hook,
      p.roteiro,
      p.copyLegenda,
      p.musicaSugerida,
      p.recursos,
      p.edicao,
      p.posicaoElementos,
      p.hashtags,
      p.obsProducao,
      STATUS_REV[p.status] ?? p.status,
      p.dataStatus?.toISOString() ?? "",
      p.promptIa,
    ]
  })

  const buf = Buffer.from(await wb.xlsx.writeBuffer())
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="roteiros-export.xlsx"`,
    },
  })
}
