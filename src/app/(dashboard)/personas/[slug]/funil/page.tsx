import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import FunilClient from "./FunilClient"

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
      <p style={{ color: "#7d899c", fontSize: 13, marginBottom: 8 }}>
        <Link href={`/personas/${slug}`} style={{ color: "#7c3aed" }}>@{slug}</Link>{" / Funil"}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 32 }}>Funil de Monetização</h1>
      <FunilClient slug={slug} funil={serialized} disclosureIa={persona.disclosureIa} />
    </div>
  )
}
