import { db } from "@/lib/db"
import SopsClient from "./SopsClient"

export default async function SopsPage() {
  const [sops, personas] = await Promise.all([
    db.sop.findMany({
      include: {
        passos: { orderBy: { ordem: "asc" } },
        historico: { orderBy: { data: "desc" } },
        _count: { select: { execucoes: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.persona.findMany({ select: { slug: true }, orderBy: { nomeArtistico: "asc" } }),
  ])

  const data = sops.map((s) => ({
    id: s.id, titulo: s.titulo, categoria: s.categoria, versao: s.versao, status: s.status,
    descricao: s.descricao, execucoes: s._count.execucoes,
    passos: s.passos.map((p) => ({ id: p.id, titulo: p.titulo, descricao: p.descricao, ferramenta: p.ferramenta })),
    historico: s.historico.map((h) => ({ versao: h.versao, mudanca: h.mudanca, data: h.data.toISOString() })),
  }))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>SOPs</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Procedimentos operacionais versionados com execução guiada</p>
      </div>
      <SopsClient initial={data} personas={personas} />
    </div>
  )
}
