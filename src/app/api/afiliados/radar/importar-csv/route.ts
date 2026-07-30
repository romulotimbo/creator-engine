import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseProdutosCsv } from "@/lib/afiliados/csv-parser"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    let csvText = ""
    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File | null
      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
      }
      csvText = await file.text()
    } else {
      const json = await req.json()
      csvText = json.csvText || ""
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: "Conteúdo do CSV está vazio" }, { status: 400 })
    }

    const parsedItems = parseProdutosCsv(csvText)
    if (parsedItems.length === 0) {
      return NextResponse.json({ error: "Nenhuma oferta válida encontrada no CSV" }, { status: 400 })
    }

    let inseridos = 0
    let atualizados = 0

    for (const item of parsedItems) {
      const existing = await db.ofertaDecisao.findUnique({
        where: { nome: item.nome },
      })

      if (existing) {
        atualizados++
        await db.ofertaDecisao.update({
          where: { id: existing.id },
          data: {
            plataformas: item.plataformas,
            visitasTotais: item.visitasTotais,
            tendenciaTrafego30d: item.tendenciaTrafego30d,
            tendenciaTrafego60d: item.tendenciaTrafego60d,
            tendenciaTrafego90d: item.tendenciaTrafego90d,
            statusTendencia: item.statusTendencia,
            comissaoValor: item.comissaoValor,
            epcRede: item.epcRede,
            cvrRede: item.cvrRede,
            refundPct: item.refundPct,
            bounceRate: item.bounceRate,
            cbGravity: item.cbGravity,
            cbScore: item.cbScore,
            scoreCalculado: item.scoreCalculado,
            completudeDados: item.completudeDados,
          },
        })
      } else {
        inseridos++
        await db.ofertaDecisao.create({
          data: {
            nome: item.nome,
            plataformas: item.plataformas,
            visitasTotais: item.visitasTotais,
            tendenciaTrafego30d: item.tendenciaTrafego30d,
            tendenciaTrafego60d: item.tendenciaTrafego60d,
            tendenciaTrafego90d: item.tendenciaTrafego90d,
            statusTendencia: item.statusTendencia,
            comissaoValor: item.comissaoValor,
            epcRede: item.epcRede,
            cvrRede: item.cvrRede,
            refundPct: item.refundPct,
            bounceRate: item.bounceRate,
            cbGravity: item.cbGravity,
            cbScore: item.cbScore,
            scoreCalculado: item.scoreCalculado,
            completudeDados: item.completudeDados,
            statusDecisao: "GARIMPO",
          },
        })
      }
    }

    return NextResponse.json({
      total: parsedItems.length,
      inseridos,
      atualizados,
    })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json({ error: err.message || "Erro ao processar CSV" }, { status: 500 })
  }
}
