import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import RoteirosClient from "./RoteirosClient"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"

export default async function RoteirosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({
    where: { slug },
    include: { contas: { select: { id: true, plataforma: true, handle: true } } },
  })
  if (!persona) notFound()

  const posts = await db.post.findMany({
    where: { personaId: persona.id },
    orderBy: [{ dataPublicacao: "asc" }, { createdAt: "desc" }],
  })

  return (
    <div>
      <PersonaSectionHeader slug={slug} title={`Roteiros (${posts.length})`} activeSegment="roteiros" />
      <RoteirosClient
        personaId={persona.id}
        personaSlug={slug}
        contas={persona.contas}
        initialPosts={posts as any}
      />
    </div>
  )
}
