import { db } from "@/lib/db"
import TemplatesClient from "./TemplatesClient"

export default async function TemplatesPage() {
  const [templates, personas] = await Promise.all([
    db.templateConteudo.findMany({
      include: { variaveis: true, _count: { select: { exemplos: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.persona.findMany({ select: { slug: true, nomeArtistico: true, nicho: true }, orderBy: { nomeArtistico: "asc" } }),
  ])

  const data = templates.map((t) => ({
    id: t.id, titulo: t.titulo, categoria: t.categoria, nicho: t.nicho,
    plataforma: t.plataforma, pilar: t.pilar, conteudo: t.conteudo, tags: t.tags,
    usos: t.usos, exemplos: t._count.exemplos,
    variaveis: t.variaveis.map((v) => ({ nome: v.nome, descricao: v.descricao, valorPadrao: v.valorPadrao })),
  }))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Templates</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Playbooks reutilizáveis com variáveis — instancie para qualquer persona</p>
      </div>
      <TemplatesClient initial={data} personas={personas} />
    </div>
  )
}
