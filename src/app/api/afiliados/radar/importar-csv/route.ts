import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseProdutosCsv } from "@/lib/afiliados/csv-parser"
import type { Prisma } from "@prisma/client"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    let csvText = ""
    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File | Blob | null
      if (file && typeof (file as Blob).text === "function") {
        csvText = await (file as Blob).text()
      } else {
        const rawText = formData.get("csvText") || formData.get("csv") || formData.get("text")
        if (typeof rawText === "string") csvText = rawText
      }
    } else if (contentType.includes("application/json")) {
      try {
        const json = await req.json()
        csvText = json.csvText || json.csv || json.content || ""
      } catch {
        // Se req.json() falhar (ex: enviaram texto com header de json por engano)
        csvText = await req.text()
      }
    } else {
      // Se for text/csv, text/plain ou sem header de json
      csvText = await req.text()
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: "Conteúdo do CSV está vazio ou ilegível" }, { status: 400 })
    }

    const parsedItems = parseProdutosCsv(csvText)
    if (parsedItems.length === 0) {
      return NextResponse.json({ error: "Nenhuma oferta válida encontrada no CSV. Verifique se a primeira linha contém os cabeçalhos (ex: name;platforms...)" }, { status: 400 })
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
            scoreBreakdown: item.scoreBreakdown as unknown as Prisma.InputJsonValue,
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
            scoreBreakdown: item.scoreBreakdown as unknown as Prisma.InputJsonValue,
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
