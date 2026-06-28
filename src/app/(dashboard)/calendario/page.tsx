import { db } from "@/lib/db"
import CalendarioGlobalClient from "./CalendarioGlobalClient"
import { PageHeader } from "@/components/ui/primitives"

export default async function CalendarioGlobalPage() {
  const [posts, personas] = await Promise.all([
    db.post.findMany({
      where: { status: { in: ["AGENDADO", "APROVADO"] } },
      include: { persona: { select: { slug: true, status: true } } },
      orderBy: { dataPublicacao: "asc" },
    }),
    db.persona.findMany({
      where: { status: { not: "BANIDA" } },
      include: {
        contas: { select: { id: true, plataforma: true, handle: true } },
      },
      orderBy: { slug: "asc" },
    }),
  ])

  return (
    <div>
      <PageHeader
        kicker="PersonaForge"
        title="Calendário"
        description="Visão global de posts agendados e aprovados"
      />
      <CalendarioGlobalClient
        posts={posts.map((p) => ({
          id: p.id,
          titulo: p.titulo,
          tipo: p.tipo,
          status: p.status,
          dataPublicacao: p.dataPublicacao?.toISOString() ?? null,
          personaSlug: p.persona.slug,
          personaStatus: p.persona.status,
        }))}
        personas={personas.map((p) => ({
          id: p.id,
          slug: p.slug,
          status: p.status,
          contas: p.contas,
        }))}
      />
    </div>
  )
}
