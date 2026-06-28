import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { getISOWeek, getISOWeekYear } from "date-fns"
import PlanoClient from "./PlanoClient"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"

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
      <PersonaSectionHeader slug={slug} title="Plano Semanal" activeSegment="plano" />
      <PlanoClient personaId={persona.id} currentWeek={currentWeek} initialPlanos={planos as any} />
    </div>
  )
}
