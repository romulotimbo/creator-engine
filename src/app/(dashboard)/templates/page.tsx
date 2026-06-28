import { db } from "@/lib/db"
import TemplatesClient from "./TemplatesClient"
import { PageHeader } from "@/components/ui/primitives"

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
      <PageHeader
        kicker="Creator Engine"
        title="Templates"
        description="Playbooks reutilizáveis com variáveis — instancie para qualquer persona"
      />
      <TemplatesClient initial={data} personas={personas} />
    </div>
  )
}
