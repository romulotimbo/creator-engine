import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import ImagensClient from "./ImagensClient"

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
      <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 8 }}>
        <Link href={`/personas/${slug}`} style={{ color: "#7c3aed" }}>@{slug}</Link>{" / Imagens"}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 32 }}>Imagens Geradas ({imagens.length})</h1>
      <ImagensClient
        personaId={persona.id}
        slug={slug}
        imagens={imagens.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))}
        fluxos={fluxos}
      />
    </div>
  )
}
