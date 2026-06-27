import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import CalendarioClient from "./CalendarioClient"

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
      <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 8 }}>
        <Link href={`/personas/${slug}`} style={{ color: "#7c3aed" }}>@{slug}</Link>{" / Calendário"}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 24 }}>Calendário</h1>

      <CalendarioClient initialPosts={posts as any} />
    </div>
  )
}
