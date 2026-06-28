import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import ImagensClient from "./ImagensClient"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"

export default async function ImagensPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) notFound()

  const [imagens, fluxos] = await Promise.all([
    db.imagemGerada.findMany({ where: { personaId: persona.id }, orderBy: { createdAt: "desc" } }),
    db.fluxoImagem.findMany({
      where: { personaId: persona.id },
      include: { ferramentaRef: { select: { id: true, nome: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return (
    <div>
      <PersonaSectionHeader slug={slug} title={`Imagens Geradas (${imagens.length})`} activeSegment="imagens" />
      <ImagensClient
        personaId={persona.id}
        slug={slug}
        imagens={imagens.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))}
        fluxos={fluxos}
      />
    </div>
  )
}
