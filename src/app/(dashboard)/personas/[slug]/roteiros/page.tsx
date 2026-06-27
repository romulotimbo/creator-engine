import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import RoteirosClient from "./RoteirosClient"

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
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: "#7d899c", fontSize: 13 }}>
          <Link href={`/personas/${slug}`} style={{ color: "#7c3aed" }}>@{slug}</Link>
          {" / Roteiros"}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginTop: 4 }}>
          Roteiros ({posts.length})
        </h1>
      </div>

      <RoteirosClient
        personaId={persona.id}
        personaSlug={slug}
        contas={persona.contas}
        initialPosts={posts as any}
      />
    </div>
  )
}
