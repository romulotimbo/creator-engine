import { db } from "@/lib/db"
import CalendarioGlobalClient from "./CalendarioGlobalClient"

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
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Calendário</h1>
      <p style={{ color: "#7d899c", fontSize: 14, marginBottom: 24 }}>
        Visão global de posts agendados e aprovados.
      </p>
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
