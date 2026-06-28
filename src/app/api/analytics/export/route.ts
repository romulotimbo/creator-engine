import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import ExcelJS from "exceljs"
import { formatCurrency, PILAR_LABELS } from "@/lib/utils"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") ?? "xlsx"

  const personas = await db.persona.findMany({ select: { id: true, slug: true } })
  const slugById = Object.fromEntries(personas.map((p) => [p.id, p.slug]))

  const [receitasGrp, custosGrp, pilaresGrp] = await Promise.all([
    db.receita.groupBy({ by: ["personaId"], _sum: { valor: true } }),
    db.custo.groupBy({ by: ["personaId"], _sum: { valor: true } }),
    db.post.groupBy({ by: ["pilar"], _count: true }),
  ])

  const roi = personas.map((p) => {
    const receita = Number(receitasGrp.find((r) => r.personaId === p.id)?._sum.valor ?? 0)
    const custo = Number(custosGrp.find((c) => c.personaId === p.id)?._sum.valor ?? 0)
    return { slug: p.slug, receita, custo, roi: custo > 0 ? receita / custo : null }
  })

  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook()
    const roiSheet = wb.addWorksheet("ROI")
    roiSheet.addRow(["Persona", "Receita", "Custo", "ROI"])
    roi.forEach((r) => roiSheet.addRow([r.slug, r.receita, r.custo, r.roi ?? ""]))

    const pilSheet = wb.addWorksheet("Pilares")
    pilSheet.addRow(["Pilar", "Posts"])
    pilaresGrp.forEach((g) => pilSheet.addRow([PILAR_LABELS[g.pilar] ?? g.pilar, g._count]))

    const buf = Buffer.from(await wb.xlsx.writeBuffer())
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=analytics.xlsx",
      },
    })
  }

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Analytics Global — Creator Engine", 14, 20)
    doc.setFontSize(10)
    let y = 32
    doc.text("ROI por persona:", 14, y)
    y += 8
    roi.forEach((r) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(`@${r.slug}: rec ${formatCurrency(r.receita)} / custo ${formatCurrency(r.custo)}`, 18, y)
      y += 6
    })
    const buf = Buffer.from(doc.output("arraybuffer"))
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=analytics.pdf",
      },
    })
  }

  return NextResponse.json({ error: "format must be xlsx or pdf" }, { status: 400 })
}
