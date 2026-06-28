import { db } from "@/lib/db"
import DiscoveryClient from "./DiscoveryClient"
import { PageHeader } from "@/components/ui/primitives"

export default async function DiscoveryPage() {
  const entries = await db.discoveryEntry.findMany({ orderBy: { data: "desc" } })

  const serialized = entries.map((e) => ({
    ...e,
    data: e.data.toISOString(),
  }))

  return (
    <div>
      <PageHeader
        kicker="PersonaForge"
        title="Discovery"
        description="Hub de ideias, experimentos e aprendizados"
      />
      <DiscoveryClient initial={serialized} />
    </div>
  )
}
