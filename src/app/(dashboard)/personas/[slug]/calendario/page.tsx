import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import CalendarioClient from "./CalendarioClient"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"

export default async function CalendarioPersonaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) notFound()

  const posts = await db.post.findMany({
    where: { personaId: persona.id },
    select: { id: true, titulo: true, tipo: true, status: true, dataPublicacao: true },
    orderBy: { ordem: "asc" },
  })

  return (
    <div>
      <PersonaSectionHeader slug={slug} title="Calendário" activeSegment="calendario" />
      <CalendarioClient initialPosts={posts as any} />
    </div>
  )
}
