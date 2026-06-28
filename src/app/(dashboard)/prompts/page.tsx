import { db } from "@/lib/db"
import PromptsClient from "./PromptsClient"

export default async function PromptsPage() {
  const [prompts, personas] = await Promise.all([
    db.promptGlobal.findMany({
      include: { imagens: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.persona.findMany({ select: { id: true, slug: true }, orderBy: { slug: "asc" } }),
  ])

  const data = prompts.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    ferramenta: p.ferramenta,
    categoria: p.categoria,
    prompt: p.prompt,
    negativoPrompt: p.negativoPrompt,
    parametros: p.parametros,
    estiloBase: p.estiloBase,
    avaliacaoMedia: p.avaliacaoMedia != null ? Number(p.avaliacaoMedia) : null,
    usos: p.usos,
    tags: p.tags,
    imagens: p.imagens.map((i) => ({ url: i.url, personaUsada: i.personaUsada })),
  }))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Prompts Globais</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Biblioteca de prompts de imagem reutilizável — independente de persona</p>
      </div>
      <PromptsClient initial={data} personas={personas} />
    </div>
  )
}
