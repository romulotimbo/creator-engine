import { db } from "@/lib/db"
import DiscoveryClient from "./DiscoveryClient"

export default async function DiscoveryPage() {
  const entries = await db.discoveryEntry.findMany({ orderBy: { data: "desc" } })

  const serialized = entries.map((e) => ({
    ...e,
    data: e.data.toISOString(),
  }))

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Discovery</h1>
        <p style={{ color: "#7d899c", fontSize: 14 }}>Hub de ideias, experimentos e aprendizados</p>
      </div>
      <DiscoveryClient initial={serialized} />
    </div>
  )
}
