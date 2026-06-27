import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getISOWeek, getISOWeekYear } from "date-fns"
import PlanoClient from "./PlanoClient"

export default async function PlanoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) notFound()

  const planos = await db.planoSemanal.findMany({
    where: { personaId: persona.id },
    include: { kpis: true },
    orderBy: { semana: "desc" },
  })

  const now = new Date()
  const currentWeek = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`

  return (
    <div>
      <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 8 }}>
        <Link href={`/personas/${slug}`} style={{ color: "#7c3aed" }}>@{slug}</Link>{" / Plano Semanal"}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 24 }}>Plano Semanal</h1>

      <PlanoClient personaId={persona.id} currentWeek={currentWeek} initialPlanos={planos as any} />
    </div>
  )
}
