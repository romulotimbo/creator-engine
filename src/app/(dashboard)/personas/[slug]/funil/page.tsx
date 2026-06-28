import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import FunilClient from "./FunilClient"
import { PersonaSectionHeader } from "@/components/personas/persona-section-header"

export default async function FunilPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const persona = await db.persona.findUnique({ where: { slug } })
  if (!persona) notFound()

  const funil = await db.funilMonetizacao.findUnique({
    where: { personaId: persona.id },
    include: { checklistItems: { orderBy: { ordem: "asc" } } },
  })

  const serialized = funil
    ? {
        ...funil,
        precoBaixo: funil.precoBaixo?.toString() ?? null,
        precoAlto: funil.precoAlto?.toString() ?? null,
      }
    : null

  return (
    <div>
      <PersonaSectionHeader slug={slug} title="Funil de Monetização" activeSegment="funil" />
      <FunilClient slug={slug} funil={serialized} disclosureIa={persona.disclosureIa} />
    </div>
  )
}
