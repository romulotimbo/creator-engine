import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") ?? "md"

  const sop = await db.sop.findUnique({
    where: { id },
    include: { passos: { orderBy: { ordem: "asc" } } },
  })
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (format === "md") {
    const lines = [
      `# ${sop.titulo}`,
      ``,
      `**Categoria:** ${sop.categoria} · **Versão:** ${sop.versao} · **Status:** ${sop.status}`,
      sop.descricao ? `\n${sop.descricao}\n` : "",
      ``,
      `## Passos`,
      ...sop.passos.map((p, i) => `${i + 1}. **${p.titulo}**${p.ferramenta ? ` (${p.ferramenta})` : ""}\n   ${p.descricao ?? ""}`),
    ]
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${sop.titulo.replace(/\s+/g, "-")}.md"`,
      },
    })
  }

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()
    let y = 20
    doc.setFontSize(16)
    doc.text(sop.titulo, 14, y)
    y += 10
    doc.setFontSize(10)
    doc.text(`${sop.categoria} · v${sop.versao} · ${sop.status}`, 14, y)
    y += 12
    sop.passos.forEach((p, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.text(`${i + 1}. ${p.titulo}`, 14, y)
      y += 6
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(p.descricao ?? "", 180)
      doc.text(lines, 18, y)
      y += lines.length * 5 + 4
    })
    const buf = Buffer.from(doc.output("arraybuffer"))
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sop.titulo.replace(/\s+/g, "-")}.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: "format must be md or pdf" }, { status: 400 })
}
